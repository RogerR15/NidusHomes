import time
import requests
from io import BytesIO
from PIL import Image
import imagehash
from sqlalchemy import or_
from app.database import SessionLocal
from app import models

# Configurare
BATCH_SIZE = 50 # Procesam câte 50 de anunturi odata
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/91.0.4472.124 Safari/537.36"
}

def get_db_session():
    return SessionLocal()

def compute_phash(image_url):
    """Descarca poza și calculeaza hash-ul vizual."""
    try:
        response = requests.get(image_url, headers=HEADERS, timeout=10)
        if response.status_code == 200:
            img = Image.open(BytesIO(response.content))
            # pHash este rezistent la redimensionari mici sau watermark-uri discrete
            return str(imagehash.phash(img))
    except Exception as e:
        print(f"[Eroare Download]: {e}")
    return None

def run_image_processor():
    db = get_db_session()
    print("PORNIRE IMAGE PROCESSOR (AI Deduplication)...")
    
    total_processed = 0
    
    while True:
    # Luam anunturile ACTIVE care NU au hash de imagine înca
        candidates = db.query(models.Listing).filter(
            models.Listing.status == 'ACTIVE',
            models.Listing.image_hash == None, # Doar cele neprocesate
            models.Listing.image_url != None   
        ).limit(BATCH_SIZE).all()

        if not candidates:
            print(f"Gata. Nu mai sunt anunțuri noi. Total procesate azi: {total_processed}")
            break

        print(f"Procesez lot de {len(candidates)} imagini...")

        for ad in candidates:
            print(f"Procesez ID {ad.id}: {ad.title[:30]}...")
            
            # A. Calculam Hash-ul
            im_hash = compute_phash(ad.image_url)
            
            if not im_hash:
                # Daca nu putem descarca poza, punem un marker ca sa nu ne blocam la infinit
                # Punem 'ERROR' sau un string gol, ca sa nu mai fie NULL
                ad.image_hash = "ERROR" 
                db.commit()
                continue

            # B. Cautam DUPLICATE VIZUALE în baza de date
            # Cautam alt anunt activ care are ACELASI hash de imagine
            duplicate = db.query(models.Listing).filter(
                models.Listing.image_hash == im_hash,
                models.Listing.status == 'ACTIVE',
                models.Listing.id != ad.id,
                models.Listing.transaction_type == ad.transaction_type,
            ).first()

            if duplicate:
                print(f"DUPLICAT VIZUAL GASIT! (Match cu ID {duplicate.id} - {duplicate.source_platform})")
                
                # LOGICA DE MERGE (Cine câștiga?)
                # De obicei, pastram anuntul mai vechi (stabilitate URL) SAU pe cel cu pret mai mic.
                # Aici decidem sa marcam noul anunt ca 'DUPLICATE' și sa îl ascundem.
                
                # Varianta 1: Noul anunt devine inactiv
                ad.status = 'INACTIVE' 
                ad.description = f"Duplicat vizual al ID {duplicate.id}"
                
                # Varianta 2: Daca noul pret e mai bun, actualizam pretul la cel vechi
                if ad.price_eur > 0 and ad.price_eur < duplicate.price_eur:
                    print(f"Pret mai bun gasit! Actualizez originalul: {duplicate.price_eur} -> {ad.price_eur}")
                    duplicate.price_eur = ad.price_eur
                    duplicate.updated_at = ad.created_at # Îl aducem în fata

            # Salvam hash-ul (chiar daca e duplicat sau nu, ca sa nu îl mai calculam iar)
            ad.image_hash = im_hash
            
            # Commit per item 
            try:
                db.commit()
                total_processed += 1
            except:
                db.rollback()
            
            # Mica pauza sa nu supra solicitam serverele de imagini (OLX/Storia)
            time.sleep(0.5)


        print(f"Lot finalizat.")
        time.sleep(5) # Pauza intre loturi

    db.close()


if __name__ == "__main__":
    run_image_processor()