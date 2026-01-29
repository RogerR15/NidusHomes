import time
import requests
from io import BytesIO
from PIL import Image
import imagehash
from sqlalchemy import or_
from app.database import SessionLocal
from app import models

# Configurare
BATCH_SIZE = 50 # Procesăm câte 50 de anunțuri odată
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36"
}

def get_db_session():
    return SessionLocal()

def compute_phash(image_url):
    """Descarcă poza și calculează hash-ul vizual."""
    try:
        response = requests.get(image_url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            # pHash este rezistent la redimensionări mici sau watermark-uri discrete
            return str(imagehash.phash(img))
    except Exception as e:
        print(f"   [Eroare Download]: {e}")
    return None

def run_image_processor():
    db = get_db_session()
    print("PORNIRE IMAGE PROCESSOR (AI Deduplication)...")
    
    while True:
        # 1. Luăm anunțurile ACTIVE care NU au hash de imagine încă
        # (Cele procesate deja vor fi ignorate)
        candidates = db.query(models.Listing).filter(
            models.Listing.status == 'ACTIVE',
            models.Listing.image_hash == None, # Doar cele neprocesate
            models.Listing.image_url != None   # Trebuie să aibă link la poză
        ).limit(BATCH_SIZE).all()

        if not candidates:
            print("💤 Niciun anunț nou de procesat. Dorm 60 secunde...")
            time.sleep(60) # Așteptăm să mai aducă scraperul date
            continue # Reîncepem bucla

        print(f"⚡ Procesez lot de {len(candidates)} imagini...")

        for ad in candidates:
            print(f" -> Procesez ID {ad.id}: {ad.title[:30]}...")
            
            # A. Calculăm Hash-ul
            im_hash = compute_phash(ad.image_url)
            
            if not im_hash:
                # Dacă nu putem descărca poza, punem un marker ca să nu ne blocăm la infinit
                # Punem 'ERROR' sau un string gol, ca să nu mai fie NULL
                ad.image_hash = "ERROR" 
                db.commit()
                continue

            # B. Căutăm DUPLICATE VIZUALE în baza de date
            # Căutăm alt anunț activ care are ACELAȘI hash de imagine
            duplicate = db.query(models.Listing).filter(
                models.Listing.image_hash == im_hash,
                models.Listing.status == 'ACTIVE',
                models.Listing.id != ad.id # Nu ne comparăm cu noi înșine
            ).first()

            if duplicate:
                print(f"DUPLICAT VIZUAL GĂSIT! (Match cu ID {duplicate.id} - {duplicate.source_platform})")
                
                # LOGICA DE MERGE (Cine câștigă?)
                # De obicei, păstrăm anunțul mai vechi (stabilitate URL) SAU pe cel cu preț mai mic.
                # Aici decidem să marcăm noul anunț ca 'DUPLICATE' și să îl ascundem.
                
                # Varianta 1: Noul anunț devine inactiv
                ad.status = 'INACTIVE' 
                ad.description = f"Duplicat vizual al ID {duplicate.id}"
                
                # Varianta 2 (Opțional): Dacă noul preț e mai bun, actualizăm prețul la cel vechi
                if ad.price_eur > 0 and ad.price_eur < duplicate.price_eur:
                    print(f"      💰 Preț mai bun găsit! Actualizez originalul: {duplicate.price_eur} -> {ad.price_eur}")
                    duplicate.price_eur = ad.price_eur
                    duplicate.updated_at = ad.created_at # Îl aducem în față

            # Salvăm hash-ul (chiar dacă e duplicat sau nu, ca să nu îl mai calculăm iar)
            ad.image_hash = im_hash
            
            # Commit per item (mai sigur)
            try:
                db.commit()
            except:
                db.rollback()
            
            # Mică pauză să nu agresăm serverele de imagini (OLX/Storia)
            time.sleep(0.5)

        print("Lot finalizat.")

if __name__ == "__main__":
    run_image_processor()