import time
import random
import json
import re
from bs4 import BeautifulSoup
from curl_cffi import requests as crequests

from app.database import SessionLocal
from app import models

# --- CONFIGURARE ---
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def get_db_session():
    return SessionLocal()

def clean_html_desc(html):
    if not html: return None
    soup = BeautifulSoup(html, "html.parser")
    text = soup.get_text(separator="\n").strip()
    return text if len(text) > 20 else None

def clean_image_url(url):
    if not url: return None
    if ";s=" in url: return url.split(";s=")[0] + ";s=1280x1024"
    return url

def fetch_html(url):
    """Descarca pagina cu requests rapid."""
    if not url or not isinstance(url, str) or not url.startswith("http"):
        return "INVALID_URL"

    try:
        time.sleep(random.uniform(1.0, 2.5)) 
        response = crequests.get(
            url,
            impersonate="chrome120",
            timeout=15
        )
        if response.status_code == 200:
            return response.text
        elif response.status_code == 404:
            return "404"
    except Exception as e:
        print(f"   Eroare retea ({str(e)[:50]}...)")
    return None

def parse_details(html, platform):
    data = {"desc": None, "images": [], "lat": None, "lng": None}
    if not html or len(html) < 100: return data

    soup = BeautifulSoup(html, 'html.parser')
    
    # Cauta JSON-ul __NEXT_DATA__
    script = soup.find("script", id="__NEXT_DATA__")
    
    # Fallback OLX HTML (daca JSON lipseSte)
    if not script:
        if platform == "OLX":
            try:
                desc_div = soup.find("div", {"data-cy": "ad_description"})
                if desc_div: data["desc"] = desc_div.get_text(separator="\n").strip()
                
                # Imagini din HTML OLX
                imgs = soup.find_all("img", {"src": True})
                for img in imgs:
                    src = img.get("src")
                    if "olxcdn.com" in src and ";s=" in src:
                        data["images"].append(clean_image_url(src))
            except: pass
        return data

    try:
        js = json.loads(script.string)
        props = js.get("props", {}).get("pageProps", {})
        ad = props.get("ad") or props.get("advert")

        if ad:
            # Descriere
            if ad.get("description"):
                data["desc"] = clean_html_desc(ad.get("description"))

            # Imagini
            raw_imgs = ad.get("images") or ad.get("photos") or []
            for img in raw_imgs:
                u = None
                if isinstance(img, dict):
                    u = img.get("url") or img.get("large") or img.get("medium")
                elif isinstance(img, str):
                    u = img
                
                if u: data["images"].append(clean_image_url(u))

            # GPS
            loc = ad.get("location") or ad.get("map")
            if loc:
                if "coordinates" in loc:
                    data["lat"] = loc["coordinates"].get("latitude")
                    data["lng"] = loc["coordinates"].get("longitude")
                elif "latitude" in loc:
                    data["lat"] = loc.get("latitude")
                    data["lng"] = loc.get("longitude")
                elif "lat" in loc:
                    data["lat"] = loc.get("lat")
                    data["lng"] = loc.get("lon")

    except Exception: pass
    return data

def run_enricher_batch():
    db = get_db_session()
    print("PORNIRE ENRICHER")
    
    # Limitam la 200 pentru o rulare
    limit = 200
    
    try:
        # Luam anunturile active sortate dupa actualizare (cele mai recente primele)
        candidates = db.query(models.Listing).filter(
            models.Listing.status == "ACTIVE"
        ).order_by(models.Listing.updated_at.desc()).limit(300).all()

        listings_to_process = []
        
        for item in candidates:
            # 1. VERIFICARE URL INVALID
            if not item.listing_url or len(item.listing_url) < 10 or "http" not in item.listing_url:
                print(f"Sterg anunt cu URL invalid (ID: {item.id})")
                db.delete(item)
                db.commit()
                continue

            # 2. Criterii de actualizare (descriere scurta sau lipsa poze)
            desc_len = len(item.description) if item.description else 0
            has_images = item.images and len(item.images) > 0
            
            if desc_len < 50 or (item.description == item.title) or not has_images:
                listings_to_process.append(item)
                if len(listings_to_process) >= limit:
                    break
        
        if not listings_to_process:
            print("Toate anunturile recente sunt complete.")
            return

        print(f"⚡ Am gasit {len(listings_to_process)} anunturi de completat.")

        processed_count = 0
        for item in listings_to_process:
            print(f"   [{processed_count + 1}/{len(listings_to_process)}] Procesez: {item.title[:30]}...")
            
            html = fetch_html(item.listing_url)
            
            if html == "INVALID_URL":
                print("URL Invalid. Sterg.")
                db.delete(item)
                db.commit()
                continue

            if html == "404":
                print("(Error: 404 - Sters de pe site). Marchez INACTIVE.")
                item.status = "INACTIVE"
                db.commit()
                processed_count += 1
                continue
            
            if not html:
                print("Skip (eroare descarcare)")
                continue

            details = parse_details(html, item.source_platform)
            updated = False
            
            # Update Descriere
            if details["desc"] and len(details["desc"]) > len(item.description or ""):
                item.description = details["desc"]
                updated = True
                print("      -> Descriere OK.")
            
            # Update Imagini
            if details["images"]:
                current = item.images or []
                if len(details["images"]) > len(current):
                    # Dedup
                    item.images = list(dict.fromkeys(details["images"]))
                    item.image_url = details["images"][0]
                    updated = True
                    print(f"      -> Imagini OK ({len(details['images'])}).")

            # Update GPS (optional)
            if details["lat"] and (not item.geom):
                 pass

            # Bump updated_at ca sa nu il mai procesam imediat
            item.updated_at = time.strftime('%Y-%m-%d %H:%M:%S')
            db.commit()
            processed_count += 1
            
            if not updated:
                print("Nu am gasit date noi (dar URL-ul e valid).")

    except Exception as e:
        print(f"Eroare critica: {e}")
        db.rollback()
    finally:
        db.close()
        print("ENRICHER FINALIZAT.")

if __name__ == "__main__":
    run_enricher_batch()