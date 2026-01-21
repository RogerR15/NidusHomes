import time
import random
from curl_cffi import requests as crequests
from datetime import datetime, timedelta
from app.database import SessionLocal
from app import models

# --- CONFIGURARE ---
BATCH_SIZE = 50  # Limita ca sa nu blocam IP-ul nostru
USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"

def get_db_session():
    return SessionLocal()

def check_listing_status(url, platform):
    """
    Returneaza: 'ACTIVE', 'INACTIVE', sau 'ERROR'
    """
    try:
        # Pauza mica pentru a nu parea robot
        time.sleep(random.uniform(1.5, 3.5))
        
        response = crequests.get(
            url,
            impersonate="chrome120",
            timeout=15
        )
        
        # 1. Verificare Status Code HTTP
        if response.status_code == 404:
            return "INACTIVE" # Pagina nu mai exista
        
        if response.status_code != 200:
            return "ERROR" # Alta eroare (ex: 500 server error)

        # 2. Verificare Text in Pagina (Soft 404)
        # Uneori pagina exista (200 OK), dar scrie pe ea ca a expirat
        html = response.text.lower()
        
        if platform == "OLX":
            if "acest anunt a fost dezactivat" in html or "nu mai este disponibil" in html:
                return "INACTIVE"
            # OLX uneori redirectioneaza catre homepage sau search daca anuntul e sters
            if len(response.history) > 0 and "olx.ro/d/oferta" not in response.url:
                 return "INACTIVE"

        elif platform == "Storia":
            if "acest anunt nu mai este activ" in html or "oferta nu mai este de actualitate" in html:
                return "INACTIVE"
            # Verificare redirect
            if len(response.history) > 0 and "storia.ro/ro/oferta" not in response.url:
                return "INACTIVE"

        return "ACTIVE"

    except Exception as e:
        print(f"Eroare conexiune: {e}")
        return "ERROR"

def run_janitor():
    db = get_db_session()
    print("PORNIRE JANITOR (Curatenie in baza de date)...")

    try:
        # 1. Selectam anunturile ACTIVE care nu au mai fost verificate de cel mai mult timp
        # Prioritizam anunturile care nu au fost verificate in ultimele 24h
        time_threshold = datetime.now() - timedelta(hours=24)
        
        listings_to_check = db.query(models.Listing).filter(
            models.Listing.status == "ACTIVE",
            models.Listing.last_seen_at < time_threshold
        ).order_by(models.Listing.last_seen_at.asc()).limit(BATCH_SIZE).all()

        if not listings_to_check:
            print("Toate anunturile sunt verificate recent.")
            return

        print(f"Verific starea a {len(listings_to_check)} anunturi vechi...")

        deactivated_count = 0
        confirmed_count = 0

        for item in listings_to_check:
            print(f"Check: {item.title[:30]}... ", end="", flush=True)
            
            status = check_listing_status(item.listing_url, item.source_platform)
            
            if status == "INACTIVE":
                print("EXPIRAT/VANDUT. (INACTIVE)")
                item.status = "INACTIVE"
                deactivated_count += 1
            elif status == "ACTIVE":
                print("ACTIV. (Actualizez data)")
                # Doar actualizam timestamp-ul ca sa stim ca l-am verificat azi
                item.last_seen_at = datetime.now() 
                confirmed_count += 1
            else:
                print("EROARE (Sar peste)")
            
            # Commit dupa fiecare 
            db.commit()
        
        time.sleep(5)  # Pauza finala

        print(f"\nRAPORT JANITOR:")
        print(f"Dezactivate: {deactivated_count}")
        print(f"Confirmate Active: {confirmed_count}")

    except Exception as e:
        print(f"Eroare critica Janitor: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    run_janitor()