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

# Returnam sesiunea direct
def get_db_session():
    return SessionLocal()

#
# STORIA SCRAPER (JSON API)
#
def scrape_storia():
    print("\nIncepem colectarea STORIA...")
    url = "https://www.storia.ro/ro/rezultate/vanzare/apartament/iasi/iasi"
    
    try:
        response = requests.get(url, headers=HEADERS)
        soup = BeautifulSoup(response.text, 'html.parser')
        script_tag = soup.find("script", {"id": "__NEXT_DATA__"})
        
        if not script_tag:
            print("Nu am gasit datele structurate pe Storia.")
            return

        data = json.loads(script_tag.string)
        
        try:
            items = data['props']['pageProps']['data']['searchAds']['items']
        except KeyError:
            print("Structura JSON Storia s-a schimbat sau nu sunt anunturi.")
            return

        # Incepem procesarea anunturilor
        db = get_db_session()
        count = 0

        for item in items:
            if not item: continue

            title = item.get('title')
            if not title: continue
            
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

            try:
                new_ad = models.Listing(
                    title=title,
                    price_eur=float(price) if price else 0,
                    sqm=float(area) if area else 0,
                    neighborhood=district or "Iasi",
                    source_platform="Storia",
                    image_url=first_image,
                    geom=from_shape(Point(float(lng), float(lat)), srid=4326),
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
def scrape_olx():
    print("\nIncepem colectarea OLX...")
    url = "https://www.olx.ro/imobiliare/apartamente-garsoniere-de-vanzare/iasi_39939/"
    
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
            print(f"🔎 Am gasit {len(ads_locators)} carduri. Incep extragerea...")

            db = get_db_session()
            count = 0
            
            for i, ad in enumerate(ads_locators):
                try:
                    # Scroll la card pentru a declansa Incarcarea imaginii
                    ad.scroll_into_view_if_needed()
                    # Asteptam o fractiune de secunda
                    # time.sleep(0.1) 

                    #TITLU
                    title = ""
                    if ad.locator("h6").count() > 0:
                        title = ad.locator("h6").first.inner_text()
                    elif ad.locator("h4").count() > 0:
                        title = ad.locator("h4").first.inner_text()
                    
                    if not title: continue

                    # Verificare Duplicat
                    if db.query(models.Listing).filter(models.Listing.title == title).first():
                        continue

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
                    lat, lng = 47.1585, 27.6014
                    lat += (random.random() - 0.5) * 0.04
                    lng += (random.random() - 0.5) * 0.04

                    new_ad = models.Listing(
                        title=title,
                        price_eur=price,
                        sqm=sqm,
                        neighborhood=neighborhood,
                        source_platform="OLX",
                        image_url=image_url,
                        geom=from_shape(Point(float(lng), float(lat)), srid=4326)
                    )
                    db.add(new_ad)
                    count += 1
                    

                    print(f"[OLX] + Adaugat: {title[:30]}... ({int(price) if price else 0}€)")

                except Exception as e:
                    # print(f"Eroare la un card: {e}")
                    continue

            db.commit()
            db.close()
            browser.close()
            print(f"Gata OLX: {count} anunturi noi.")

        except Exception as e:
            print(f"Eroare Generala: {e}")

if __name__ == "__main__":
    print("START AGREGATOR IMOBILIAR")
    scrape_storia()
    scrape_olx()
    print("FINALIZAT")