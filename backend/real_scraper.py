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

    # 3. An Constructie (ex: "1980", "2022")
    # Cautam ani plauzibili Intre 1900 si 2030
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

def extract_surface(soup, description_text):
    """
    Încearcă să găsească suprafața în HTML sau în descriere folosind Regex.
    Caută formate gen: "50 mp", "50mp", "50 m2", "50.5 mp"
    """
    surface = 0

    # METODA 1: Căutare în lista de specificații (unde scrie "Suprafata utila: 50 mp")
    # OLX și Storia pun asta de obicei în tag-uri <li> sau <p>
    try:
        keywords = ['suprafata', 'suprafață', 'utila', 'utilă']
        # Căutăm în orice tag care conține textul "suprafata"
        tags = soup.find_all(lambda tag: tag.name in ['li', 'p', 'div', 'span'] and any(k in tag.get_text().lower() for k in keywords))
        
        for tag in tags:
            text = tag.get_text().lower()
            # Regex: Caută un număr urmat de mp/m2
            match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:mp|m²|m2)', text)
            if match:
                num_str = match.group(1).replace(',', '.')
                surface = float(num_str)
                if 10 < surface < 1000: # Filtru de siguranță (să nu luăm ani sau numere de telefon)
                    return int(surface)
    except Exception as e:
        print(f"Eroare la parsare HTML suprafata: {e}")

    # METODA 2: Regex Brut în Descriere (Fallback)
    # Dacă nu am găsit în tabel, căutăm în textul anunțului "55 mp"
    try:
        # Căutăm tipare de genul:  spatiu spatiu 55 mp
        match = re.search(r'(\d+(?:[.,]\d+)?)\s*(?:mp|m²|m2)', description_text, re.IGNORECASE)
        if match:
            num_str = match.group(1).replace(',', '.')
            val = float(num_str)
            if 10 < val < 500: # Validare (să fie realist pentru un apartament)
                return int(val)
    except:
        pass

    return 0

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
        response = requests.get(url, headers=HEADERS, timeout=15)
        soup = BeautifulSoup(response.text, 'html.parser')
        script_tag = soup.find("script", {"id": "__NEXT_DATA__"})
        
        if not script_tag:
            print("Nu am gasit datele structurate pe Storia.")
            return

        data = json.loads(script_tag.string)
        
        items = []
        try:
            # Incercam ambele locatii posibile pentru anunturi
            props = data.get('props', {}).get('pageProps', {})
            if 'data' in props and 'searchAds' in props['data']:
                items = props['data']['searchAds']['items']
            elif 'ads' in props:
                items = props['ads']
        except KeyError:
            print("Structura JSON Storia s-a schimbat sau nu sunt anunturi.")
            return

        print(f"Storia: Gasite {len(items)} anunturi.")

        db = get_db_session()
        count = 0
        seen_urls = set() # Lista pentru a evita duplicatele din acelasi request

        for item in items:
            if not item: continue

            title = item.get('title')
            if not title: continue

            # CONSTRUIRE LINK
            slug = item.get('slug')
            listing_url = None
            
            if slug:
                listing_url = f"https://www.storia.ro/ro/oferta/{slug}"
            else:
                listing_url = item.get('url')
                if listing_url and not listing_url.startswith("http"):
                    listing_url = "https://www.storia.ro" + listing_url
            
            if not listing_url:
                continue 
            
            # Curatam link-ul de parametri extra
            listing_url = listing_url.split('?')[0]

            # DEDUPLICARE LOCALA (CRITIC!)
            # Daca Storia ne da acelasi anunt de 2 ori In lista, Il ignoram pe al doilea
            if listing_url in seen_urls:
                continue
            seen_urls.add(listing_url)

            # DEDUPLICARE BAZA DE DATE 
            if db.query(models.Listing).filter(models.Listing.listing_url == listing_url).first():
                continue

            description = item.get('description', '')
            # Curatare sumara HTML din descriere
            if description:
                description = BeautifulSoup(description, "html.parser").get_text(separator="\n")

            params = item.get('parameters', [])
            
            price_data = item.get('totalPrice') or {} 
            price = price_data.get('value')

            area = item.get('areaInSquareMeters', 0)
            if not area or area == 0:
                # Fallback: Cautam in descriere daca JSON-ul are 0
                area = extract_surface(None, description)
            
            images = item.get('images') or []
            first_image = None
            if images and len(images) > 0:
                first_image = images[0].get('medium') or images[0].get('large') or images[0].get('url')

            # Locatie
            map_data = item.get('map') or {}
            lat = map_data.get('lat')
            lng = map_data.get('lon')
            district = "Iasi" 

            if not lat or not lng:
                try:
                    loc_name = item.get('location', {}).get('reverseGeocoding', {}).get('locations', [])[-1].get('fullName')
                    if loc_name: district = loc_name
                    
                    if district != "Iasi":
                        location = geocode(f"{district}, Romania")
                        if location:
                            lat, lng = location.latitude, location.longitude
                        else:
                            lat, lng = 47.1585, 27.6014
                    else:
                         lat, lng = 47.1585, 27.6014
                except:
                    lat, lng = 47.1585, 27.6014

            rooms = None
            floor = None
            year_built = None
            compartmentation = None

            for p in params:
                k = p.get('key')
                v = p.get('value')
                if k == 'rooms_num':
                    try: rooms = int(v)
                    except: pass
                elif k == 'floor_no':
                    try: floor = int(v.replace('floor_', ''))
                    except: pass
                elif k == 'construction_year':
                    try: year_built = int(v)
                    except: pass

            regex_details = extract_details_from_text(title)
            if not rooms: rooms = regex_details.get('rooms')
            if not floor: floor = regex_details.get('floor')
            if not year_built: year_built = regex_details.get('year_built')
            if not compartmentation: compartmentation = regex_details.get('compartmentation')

            images_list = []
            for img in images:
                u = img.get('large') or img.get('medium') or img.get('url')
                if u: images_list.append(u)
            
            # SALVARE INDIVIDUALA (COMMIT PER ITEM) 
            try:
                new_ad = models.Listing(
                    title=title,
                    description=description,
                    price_eur=float(price) if price else 0,
                    sqm=float(area) if area else 0,
                    neighborhood=district,
                    source_platform="Storia",
                    image_url=first_image,
                    images=images_list,
                    transaction_type=trans_type,
                    geom=from_shape(Point(float(lng), float(lat)), srid=4326),
                    rooms=rooms,
                    floor=floor,
                    year_built=year_built,
                    compartmentation=compartmentation,
                    listing_url=listing_url,
                    status="ACTIVE"
                )
                db.add(new_ad)
                db.commit() # SALVAM IMEDIAT
                count += 1
                print(f"[Storia] + Adaugat: {title[:30]}... ({int(price) if price else 0}€)")
            
            except Exception as e:
                db.rollback() # Daca unul esueaza (duplicat), nu-i strica pe ceilalti
                # print(f"Skip duplicat/eroare: {e}")
                pass

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
                    time.sleep(2)
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
                    time.sleep(0.3) 

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
                    
                    # Daca linkul e relativ (Incepe cu /), Ii punem prefixul
                    if listing_url and not listing_url.startswith("http"):
                        listing_url = "https://www.olx.ro" + listing_url

                    if not listing_url:
                        continue

                    # A. Verificare Locala (daca apare de 2 ori pe pagina)
                    if listing_url in seen_urls:
                        # print(f"Dublura pe pagina (skip): {listing_url}")
                        continue
                    seen_urls.add(listing_url)

                    # --- VERIFICARE STRICTa DUPLICAT DUPa URL ---
                    # Verificam daca linkul exista deja. Daca da, sarim peste el sau Il actualizam.
                    existing_ad = db.query(models.Listing).filter(models.Listing.listing_url == listing_url).first()
                    
                    if existing_ad:
                        # OPTIONAL: Aici am putea actualiza pretul si last_seen_at ("Heureca! L-am vazut iar!")
                        # Pentru acum, doar sarim ca sa nu crape scriptul.
                        # print(f"Anunt existent (skip): {listing_url[:30]}...")
                        continue


                    #TITLU
                    title = ""
                    if ad.locator("h6").count() > 0:
                        title = ad.locator("h6").first.inner_text()
                    elif ad.locator("h4").count() > 0:
                        title = ad.locator("h4").first.inner_text()
                    
                    if not title: continue
                    
                    # IMAGINE
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

                    images_list = []
                    if image_url: images_list.append(image_url)

                    # MP
                    sqm = extract_surface(None, title + " " + full_text)

                    # Geocoding
                    lat, lng = None, None
                    
                    # 1. Incercam sa detectam zona din TITLU (ex: "Pacurari", "Copou")
                    detected_zone_query = extract_zone_from_text(title)
                    
                    if detected_zone_query:
                        print(f"Detectat zona din titlu: {detected_zone_query}")
                        try:
                            # Interogam Nominatim cu zona specifica
                            loc = geocode(detected_zone_query)
                            if loc:
                                lat, lng = loc.latitude, loc.longitude
                        except Exception:
                            pass

                    # 2. Fallback: Daca nu am gasit In titlu, folosim cartierul generic din anunt
                    if not lat or not lng:
                        clean_neighborhood = neighborhood.replace("Iasi", "").replace(",", "").strip()
                        # Verificam sa nu fie gol sau prea scurt
                        if clean_neighborhood and len(clean_neighborhood) > 2:
                             try:
                                loc = geocode(f"{clean_neighborhood}, Iasi, Romania")
                                if loc:
                                    lat, lng = loc.latitude, loc.longitude
                             except Exception:
                                pass

                    # 3. Fallback Final: Centrul Iasului + Jitter (Randomizare)
                    if not lat or not lng:
                        lat, lng = 47.1585, 27.6014
                        # Jitter mai mare pentru cele generice (raza ~3-4km)
                        lat += (random.random() - 0.5) * 0.04 
                        lng += (random.random() - 0.5) * 0.04
                    else:
                        # Jitter mic pentru cele localizate precis (raza ~100m)
                        # Ca sa nu se suprapuna perfect pin-urile din acelasi cartier
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