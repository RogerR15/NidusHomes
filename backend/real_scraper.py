import requests
from bs4 import BeautifulSoup
import json
import time
import random
from geopy.geocoders import Nominatim
from geopy.extra.rate_limiter import RateLimiter
from app.database import SessionLocal 
from app import models
from geoalchemy2.shape import from_shape
from shapely.geometry import Point
import re
from curl_cffi import requests as crequests
from playwright.sync_api import sync_playwright

# 1. Configurare Geocoder
# User-agent unic pentru a evita blocarea
geolocator = Nominatim(user_agent="ro_zillow_iasi_mvp_fix_v2")
geocode = RateLimiter(geolocator.geocode, min_delay_seconds=1.2)

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

TARGETS = [
    {
        "platform": "OLX",
        "type": "SALE",
        "url": "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/iasi_39939/"
    },
    {
        "platform": "OLX",
        "type": "RENT",
        "url": "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-inchiriat/iasi_39939/"
    },
    {
        "platform": "Storia",
        "type": "SALE",
        "url": "https://www.storia.ro/ro/rezultate/vanzare/apartament/iasi/iasi"
    },
    {
        "platform": "Storia",
        "type": "RENT",
        "url": "https://www.storia.ro/ro/rezultate/inchiriere/apartament/iasi/iasi"
    }
]

IASI_ZONES = {
    "palas": "Palas, Iasi",
    "iulius": "Iulius Mall, Iasi",
    "copou": "Copou, Iasi",
    "tatarasi": "Tatarasi, Iasi",
    "alexandru": "Alexandru cel Bun, Iasi",
    "dacia": "Dacia, Iasi",
    "pacurari": "Pacurari, Iasi",
    "canta": "Canta, Iasi",
    "nicolina": "Nicolina, Iasi",
    "cug": "CUG, Iasi",
    "galata": "Galata, Iasi",
    "bucium": "Bucium, Iasi",
    "socola": "Socola, Iasi",
    "bularga": "Bularga, Iasi",
    "zona industriala": "Zona Industriala, Iasi",
    "metalurgie": "Bulevardul Chimiei, Iasi",
    "podu ros": "Podu Ros, Iasi",
    "podu de fier": "Podu de Fier, Iasi",
    "tudor": "Tudor Vladimirescu, Iasi",
    "vladimirescu": "Tudor Vladimirescu, Iasi",
    "independent": "Bulevardul Independentei, Iasi",
    "unirii": "Piata Unirii, Iasi",
    "centru": "Centru, Iasi",
    "gara": "Gara Iasi, Iasi",
    "mircea": "Mircea cel Batran, Iasi",
    "moara de vant": "Moara de Vant, Iasi",
    "sorogari": "Sorogari, Iasi",
    "rediu": "Rediu, Iasi",
    "miroslava": "Miroslava, Iasi",
    "ciurea": "Ciurea, Iasi",
    "lunca cetatuii": "Lunca Cetatuii, Iasi",
    "valea lupului": "Valea Lupului, Iasi",
    "tomesti": "Tomesti, Iasi",
    "breazu": "Breazu, Iasi",
}

def extract_zone_from_text(text):
    """Cauta un cartier in text (titlu) si returneaza query-ul pentru harta."""
    if not text: return None
    text_lower = text.lower()
    
    # Cautam fiecare zona in text
    for key, search_query in IASI_ZONES.items():
        if key in text_lower:
            return search_query
    
    return None

def extract_details_from_text(text):
    """Extrage camere, etaj, an din text folosind Regex."""
    if not text:
        return {}
    
    text = text.lower()
    details = {}

    # 1. Camere (ex: "2 camere", "3 cam")
    rooms_match = re.search(r'(\d+)\s*(cam|camera|camere)', text)
    if rooms_match:
        try:
            details['rooms'] = int(rooms_match.group(1))
        except: pass

    # 2. Etaj (ex: "etaj 3", "etajul 1", "et. 2")
    floor_match = re.search(r'(?:etaj|et\.|etajul)\s*(\d+)', text)
    if floor_match:
        try:
            details['floor'] = int(floor_match.group(1))
        except: pass
    elif "parter" in text:
        details['floor'] = 0

    # 3. An Construcție (ex: "1980", "2022")
    # Căutăm ani plauzibili între 1900 și 2030
    year_match = re.search(r'\b(19\d{2}|20[0-2]\d)\b', text)
    if year_match:
        try:
            details['year_built'] = int(year_match.group(1))
        except: pass
        
    # 4. Compartimentare
    if "decomandat" in text and "semidecomandat" not in text:
        details['compartmentation'] = "Decomandat"
    elif "semidecomandat" in text:
        details['compartmentation'] = "Semidecomandat"
    elif "nedecomandat" in text:
        details['compartmentation'] = "Nedecomandat"

    return details

# Returnam sesiunea direct
def get_db_session():
    return SessionLocal()

#
# STORIA SCRAPER (JSON API)
#
def scrape_storia(target):
    url = target["url"]
    trans_type = target["type"]
    print(f"\nIncepem colectarea STORIA pentru: {trans_type}...")
    
    try:
        response = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(response.text, 'html.parser')
        script_tag = soup.find("script", {"id": "__NEXT_DATA__"})
        
        if not script_tag:
            print("Nu am gasit datele structurate pe Storia.")
            return

        data = json.loads(script_tag.string)
        
        items = []
        try:
            items = data['props']['pageProps']['data']['searchAds']['items']
        except KeyError:
            print("Structura JSON Storia s-a schimbat sau nu sunt anunturi.")
            return

        print(f"Storia: Gasite {len(items)} anunturi.")

        # Incepem procesarea anunturilor
        db = get_db_session()
        count = 0

        for item in items:
            if not item: continue

            title = item.get('title')
            if not title: continue

            description = item.get('description', '')

            params = item.get('parameters', [])
            
            # Verificare duplicate
            if db.query(models.Listing).filter(models.Listing.title == title).first():
                continue

            # Extragere date cu protectie la null
            price_data = item.get('totalPrice') or {} 
            price = price_data.get('value')

            area = item.get('areaInSquareMeters', 0)
            
            images = item.get('images') or []
            first_image = None
            if images and len(images) > 0:
                first_image = images[0].get('medium')

            location_data = item.get('location') or {}
            address_info = location_data.get('address') or {}
            street_obj = address_info.get('street') or {}
            
            street_name = None
            if isinstance(street_obj, dict):
                street_name = street_obj.get('name')
            
            district = "Iasi"
            reverse_geo = location_data.get('reverseGeocoding') or {}
            loc_list = reverse_geo.get('locations') or []
            
            for loc in loc_list:
                if loc.get('locationLevel') == 'district':
                    district = loc.get('name')
                    break

            map_data = item.get('map') or {}
            lat = map_data.get('lat')
            lng = map_data.get('lon')

            if not lat or not lng:
                query = f"{street_name or district}, Iasi, Romania"
                try:
                    location = geocode(query)
                    if location:
                        lat, lng = location.latitude, location.longitude
                    else:
                        lat, lng = 47.1585, 27.6014
                except Exception:
                    lat, lng = 47.1585, 27.6014


            rooms = None
            floor = None
            year_built = None
            compartmentation = None

            for p in params:
                if p.get('key') == 'rooms_num':
                    try: rooms = int(p.get('value'))
                    except: pass
                elif p.get('key') == 'floor_no':
                    try: floor = int(p.get('value').replace('floor_', ''))
                    except: pass
                elif p.get('key') == 'construction_year':
                    try: year_built = int(p.get('value'))
                    except: pass

            # Fallback la Regex dacă lipsesc din parametri
            text_blob = (title + " " + description)
            regex_details = extract_details_from_text(text_blob)
            
            if not rooms: rooms = regex_details.get('rooms')
            if not floor: floor = regex_details.get('floor')
            if not year_built: year_built = regex_details.get('year_built')
            if not compartmentation: compartmentation = regex_details.get('compartmentation')

            # Imagini (Array)
            images_list = []
            raw_images = item.get('images', [])
            for img in raw_images:
                if img.get('large'):
                    images_list.append(img.get('large'))
                elif img.get('medium'):
                    images_list.append(img.get('medium'))
            
            first_image = images_list[0] if images_list else None

            try:
                new_ad = models.Listing(
                    title=title,
                    price_eur=float(price) if price else 0,
                    sqm=float(area) if area else 0,
                    neighborhood=district or "Iasi",
                    source_platform="Storia",
                    image_url=first_image,
                    transaction_type=trans_type,
                    geom=from_shape(Point(float(lng), float(lat)), srid=4326),
                    rooms=rooms,
                    floor=floor,
                    year_built=year_built,
                    compartmentation=compartmentation,
                    images=images_list,
                )
                db.add(new_ad)
                count += 1
                print(f"[Storia] + Adaugat: {title[:30]}... ({int(price) if price else 0}€)")
            except Exception as e:
                print(f"Eroare la scrierea In DB: {e}")

        db.commit()
        db.close()
        print(f"Gata Storia: {count} anunturi noi.")

    except Exception as e:
        print(f"Eroare majora Storia: {e}")


#
#OLX SCRAPER (METODA JSON)
#
def scrape_olx(target):
    url = target["url"]
    trans_type = target["type"]

    print(f"\nIncepem colectarea OLX pentru: {trans_type}...")
    
    with sync_playwright() as p:
        try:
            # Lansam browserul
            browser = p.chromium.launch(headless=True)
            context = browser.new_context(viewport={"width": 1366, "height": 768})
            page = context.new_page()

            page.goto(url, wait_until="domcontentloaded")
            
            # Gestionare Cookies
            try:
                time.sleep(2)
                accept_btn = page.locator("button#onetrust-accept-btn-handler")
                if accept_btn.is_visible():
                    accept_btn.click()
                    time.sleep(1)
            except: pass

            # Incarcare Anunturi 
            print("Astept anunturile...")
            try:
                page.wait_for_selector('div[data-cy="l-card"]', timeout=15000)
            except:
                print("EROARE: Nu au aparut anunturile.")
                browser.close()
                return

            # Gasim toate cardurile
            ads_locators = page.locator('div[data-cy="l-card"]').all()
            print(f"Am gasit {len(ads_locators)} carduri. Incep extragerea...")

            db = get_db_session()
            count = 0
            
            seen_urls = set()

            for i, ad in enumerate(ads_locators):
                try:
                    # Scroll la card pentru a declansa Incarcarea imaginii
                    ad.scroll_into_view_if_needed()
                    # Asteptam o fractiune de secunda
                    time.sleep(0.1) 

                    title = ""
                    image_url = None
                    price = 0
                    sqm = 0
                    neighborhood = "Iasi"
                    lat, lng = None, None
                    images_list = []

                    # --- 1. EXTRAGERE URL (CRITIC: Primul pas pentru verificare) ---
                    # Link-ul este de obicei pe primul tag <a> din card
                    listing_url = ad.locator("a").first.get_attribute("href")
                    
                    # Dacă linkul e relativ (începe cu /), îi punem prefixul
                    if listing_url and not listing_url.startswith("http"):
                        listing_url = "https://www.olx.ro" + listing_url

                    if not listing_url:
                        continue

                    # A. Verificare Locală (dacă apare de 2 ori pe pagină)
                    if listing_url in seen_urls:
                        # print(f"Dublura pe pagina (skip): {listing_url}")
                        continue
                    seen_urls.add(listing_url)

                    # --- VERIFICARE STRICTĂ DUPLICAT DUPĂ URL ---
                    # Verificăm dacă linkul există deja. Dacă da, sărim peste el sau îl actualizăm.
                    existing_ad = db.query(models.Listing).filter(models.Listing.listing_url == listing_url).first()
                    
                    if existing_ad:
                        # OPTIONAL: Aici am putea actualiza prețul și last_seen_at ("Heureca! L-am văzut iar!")
                        # Pentru acum, doar sărim ca să nu crăpe scriptul.
                        # print(f"♻️ Anunt existent (skip): {listing_url[:30]}...")
                        continue


                    #TITLU
                    title = ""
                    if ad.locator("h6").count() > 0:
                        title = ad.locator("h6").first.inner_text()
                    elif ad.locator("h4").count() > 0:
                        title = ad.locator("h4").first.inner_text()
                    
                    if not title: continue
                    
                    # Pe viitor vom face "Deep Scraping" (intrat pe fiecare link).
                    images_list = []
                    if image_url:
                        images_list.append(image_url)

                    # Verificare Duplicat
                    if db.query(models.Listing).filter(models.Listing.title == title).first():
                        continue

                    full_text = ad.inner_text()

                    # Extragem detalii suplimentare cu Regex
                    details = extract_details_from_text(title + " " + full_text)



                    #PRET
                    price_text = ""
                    if ad.locator('[data-testid="ad-price"]').count() > 0:
                        price_text = ad.locator('[data-testid="ad-price"]').first.inner_text()
                    else:
                        match = re.search(r'([\d\s\.]+)\s*€', ad.inner_text())
                        if match: price_text = match.group(1)

                    price = float(re.sub(r'[^\d]', '', price_text)) if price_text else 0

                    # 3. LOCAtIE
                    neighborhood = "Iasi"
                    if ad.locator('[data-testid="location-date"]').count() > 0:
                        raw_loc = ad.locator('[data-testid="location-date"]').first.inner_text()
                        parts = raw_loc.split("-")[0].replace("Iasi", "").replace(",", "").strip()
                        if parts: neighborhood = parts

                    # 4. IMAGINE (FIX PENTRU OLX)
                    image_url = None
                    img_el = ad.locator("img").first
                    
                    if img_el.count() > 0:
                        # a) Incercam srcset (unde sunt imaginile mari)
                        srcset = img_el.get_attribute("srcset")
                        if srcset:
                            # srcset format: "url1 1x, url2 2x". Luam ultima parte.
                            candidates = srcset.split(',')
                            best_candidate = candidates[-1].strip().split(' ')[0]
                            if "http" in best_candidate and "no_thumbnail" not in best_candidate:
                                image_url = best_candidate

                        # b) Daca srcset nu e bun, Incercam src
                        if not image_url:
                            src = img_el.get_attribute("src")
                            if src and "http" in src and "no_thumbnail" not in src:
                                image_url = src


                    # MP
                    sqm = 0
                    mp_match = re.search(r'(\d+)\s*mp', title.lower())
                    if mp_match: sqm = float(mp_match.group(1))

                    # Geocoding
                    lat, lng = None, None
                    
                    # 1. Încercăm să detectăm zona din TITLU (ex: "Pacurari", "Copou")
                    detected_zone_query = extract_zone_from_text(title)
                    
                    if detected_zone_query:
                        print(f"Detectat zona din titlu: {detected_zone_query}")
                        try:
                            # Interogăm Nominatim cu zona specifică
                            loc = geocode(detected_zone_query)
                            if loc:
                                lat, lng = loc.latitude, loc.longitude
                        except Exception:
                            pass

                    # 2. Fallback: Dacă nu am găsit în titlu, folosim cartierul generic din anunț
                    if not lat or not lng:
                        clean_neighborhood = neighborhood.replace("Iasi", "").replace(",", "").strip()
                        # Verificăm să nu fie gol sau prea scurt
                        if clean_neighborhood and len(clean_neighborhood) > 2:
                             try:
                                loc = geocode(f"{clean_neighborhood}, Iasi, Romania")
                                if loc:
                                    lat, lng = loc.latitude, loc.longitude
                             except Exception:
                                pass

                    # 3. Fallback Final: Centrul Iașului + Jitter (Randomizare)
                    if not lat or not lng:
                        lat, lng = 47.1585, 27.6014
                        # Jitter mai mare pentru cele generice (rază ~3-4km)
                        lat += (random.random() - 0.5) * 0.04 
                        lng += (random.random() - 0.5) * 0.04
                    else:
                        # Jitter mic pentru cele localizate precis (rază ~100m)
                        # Ca să nu se suprapună perfect pin-urile din același cartier
                        lat += (random.random() - 0.5) * 0.002
                        lng += (random.random() - 0.5) * 0.002

                    new_ad = models.Listing(
                        title=title,
                        price_eur=price,
                        sqm=sqm,
                        neighborhood=neighborhood,
                        source_platform="OLX",
                        image_url=image_url,
                        transaction_type=trans_type,
                        geom=from_shape(Point(float(lng), float(lat)), srid=4326),
                        rooms=details.get('rooms'),
                        floor=details.get('floor'),
                        year_built=details.get('year_built'),
                        compartmentation=details.get('compartmentation'),
                        images=images_list,
                        listing_url=listing_url,
                        status="ACTIVE",
                    )
                    db.add(new_ad)
                    count += 1
                    

                    print(f"[OLX] + Adaugat: {title[:30]}... ({int(price) if price else 0}€)")

                except Exception as e:
                    print(f"Eroare la un card: {e}")
                    continue

            try:
                db.commit()
            except Exception as e:
                db.rollback()
                print(f"Eroare la COMMIT DB: {e}")

            db.commit()
            db.close()
            browser.close()
            print(f"Gata OLX: {count} anunturi noi.")

        except Exception as e:
            print(f"Eroare Generala: {e}")


def run_all_scrapers():
    print("START AGREGATOR")
    
    for target in TARGETS:
        if target["platform"] == "Storia":
            scrape_storia(target)
        elif target["platform"] == "OLX":
            scrape_olx(target)
            
    print(" FINALIZAT")


if __name__ == "__main__":
   run_all_scrapers()