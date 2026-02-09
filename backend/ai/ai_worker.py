import time
import os
import sys
import re
import joblib
import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

# Adăugăm calea către backend
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from ai.local_vision import analyze_image_local
from app.models import Listing 

# Configurare DB
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))
DATABASE_URL = os.getenv("DATABASE_URL")

# --- INCARCARE MODEL AI DE PRET ---
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'price_model.joblib')
PRICE_MODEL = None

if os.path.exists(MODEL_PATH):
    try:
        PRICE_MODEL = joblib.load(MODEL_PATH)
        print("🧠 Modelul de preț (ML) a fost încărcat cu succes!")
    except Exception as e:
        print(f"⚠️ Nu am putut încărca modelul de preț: {e}")
else:
    print("⚠️ Modelul de preț nu există. Voi folosi medii statice.")

# Fallback prices (în caz că modelul dă rateuri sau nu e încărcat)
AVERAGE_PRICES = {
    "copou": 2200, "centru": 2300, "pacurari": 1600, "tatarasi": 1500, 
    "nicolina": 1450, "cug": 1300, "bucium": 1200, "dacia": 1400, 
    "alexandru": 1400, "galata": 1300, "miroslava": 1100, "rediu": 1100
}

def get_db():
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(bind=engine)
    return SessionLocal()

def extract_year_from_text(text):
    if not text: return None
    match = re.search(r'\b(19[5-9][0-9]|20[0-2][0-9])\b', text)
    if match: return int(match.group(0))
    if "bloc nou" in text.lower() or "constructie noua" in text.lower(): return 2024
    return None

def predict_fair_price(listing, ai_tag):
    """Folosește modelul ML pentru a prezice prețul corect."""
    if not PRICE_MODEL:
        return None
    
    try:
        # Construim un DataFrame cu un singur rând (exact ca la antrenare)
        input_data = pd.DataFrame([{
            'sqm': listing.sqm,
            'rooms': listing.rooms,
            'floor': listing.floor if listing.floor is not None else 1,
            'year_built': listing.year_built,
            'neighborhood': listing.neighborhood.lower() if listing.neighborhood else 'iasi',
            'compartmentation': listing.compartmentation.lower() if listing.compartmentation else 'nedecomandat',
            'condition': ai_tag # AICI E CHEIA: Modelul știe starea!
        }])
        
        # Facem predicția
        predicted_price = PRICE_MODEL.predict(input_data)[0]
        return int(predicted_price)
    except Exception as e:
        # print(f"Eroare predicție model: {e}")
        return None

def calculate_investment_metrics(listing, ai_tag):
    """Calculează date financiare premium folosind AI."""
    price = listing.price_eur or 0
    sqm = listing.sqm or 0
    if price == 0 or sqm == 0: return None

    price_per_sqm = price / sqm
    
    # 1. AI VALUATION (Prețul Corect)
    fair_price = predict_fair_price(listing, ai_tag)
    
    # Dacă modelul nu merge, folosim media zonei (Fallback)
    if not fair_price:
        zone_lower = listing.neighborhood.lower() if listing.neighborhood else ""
        avg_zone_sqm = 1500
        for z, p in AVERAGE_PRICES.items():
            if z in zone_lower:
                avg_zone_sqm = p
                break
        fair_price = int(sqm * avg_zone_sqm)
    
    fair_price_sqm = int(fair_price / sqm)

    # 2. MARKET COMPARISON (Real vs Fair)
    diff_percent = ((price - fair_price) / fair_price) * 100
    
    market_position = "fair"
    if diff_percent < -7: market_position = "deal"       # Mai ieftin cu 7% decât zice AI-ul
    elif diff_percent > 10: market_position = "expensive" # Mai scump cu 10%

    # 3. ESTIMARE RENOVARE
    renovation_cost = 0
    if ai_tag == 'fixer-upper': renovation_cost = sqm * 350
    elif ai_tag == 'renovated': renovation_cost = 0
    elif ai_tag == 'construction': renovation_cost = sqm * 150
    else: renovation_cost = sqm * 100

    total_investment = price + renovation_cost

    # 4. ESTIMARE CHIRIE & YIELD
    rent_per_sqm = 7
    zone_lower = listing.neighborhood.lower() if listing.neighborhood else ""
    if any(z in zone_lower for z in ['copou', 'centru', 'palas']): rent_per_sqm = 11
    elif any(z in zone_lower for z in ['pacurari', 'tatarasi', 'nicolina']): rent_per_sqm = 8.5
    
    if ai_tag in ['luxury', 'modern']: rent_per_sqm *= 1.2
    
    estimated_rent = round(sqm * rent_per_sqm)
    yearly_income = estimated_rent * 12
    yield_percent = (yearly_income / total_investment) * 100

    return {
        "renovation_cost": int(renovation_cost),
        "total_investment": int(total_investment),
        "estimated_rent": int(estimated_rent),
        "yield_percent": round(yield_percent, 2),
        "market_comparison": {
            "avg_price_sqm": fair_price_sqm, # Aici punem ce crede AI-ul că e corect / mp
            "listing_price_sqm": int(price_per_sqm),
            "status": market_position,
            "fair_total_price": fair_price # Trimitem și totalul estimat
        }
    }

def process_pending_images():
    print("🤖 AI Worker pornit. Caut anunțuri neprocesate...")
    
    while True:
        db = get_db()
        try:
            # Luăm câte 10 ca să nu blocăm memoria
            listings = db.query(Listing).filter(
                Listing.image_url.isnot(None),
                Listing.status == 'ACTIVE',
                Listing.ai_tags.is_(None)
            ).limit(10).all()
            
            if not listings:
                print("💤 Nimic de făcut. Aștept 10 secunde...")
                time.sleep(10)
                db.close()
                continue
                
            print(f"🚀 Procesez un batch de {len(listings)} anunțuri...")

            for listing in listings:
                print(f"   --> Analizez ID {listing.id} ({listing.title[:20]}...)...")
                
                # A. Analiza Vizuală (CLIP)
                ai_result = analyze_image_local(listing.image_url)
                
                if ai_result:
                    visual_tag = ai_result.get('top_tag', 'standard')
                    
                    # B. Determinare An
                    year = listing.year_built
                    if not year or year == 0:
                        year = extract_year_from_text(listing.description)
                        if year: listing.year_built = year

                    # C. Logică Hibridă
                    final_tag = visual_tag 
                    if year:
                        if year < 2005 and visual_tag in ['luxury', 'modern']:
                            final_tag = 'renovated'
                            ai_result['condition_detail'] += " (downgraded due to building age)"
                        elif year > 2020 and visual_tag in ['fixer-upper', 'old_dated']:
                            final_tag = 'construction'
                            ai_result['condition_detail'] = "under construction or grey stage"
                    else:
                        if visual_tag == 'luxury' and ai_result['scores']['condition'] < 0.90:
                            final_tag = 'renovated'

                    # D. CALCUL PREMIUM (Investiție)
                    try:
                        investment_data = calculate_investment_metrics(listing, final_tag)
                        if investment_data:
                            ai_result['investment'] = investment_data
                            print(f"      💰 Fair Price: {investment_data['market_comparison']['fair_total_price']}€ | Yield: {investment_data['yield_percent']}%")
                    except Exception as calc_err:
                        print(f"      ⚠️ Eroare calcul financiar: {calc_err}")

                    # E. Salvare Finală
                    ai_result['top_tag'] = final_tag
                    listing.ai_tags = ai_result
                    
                    db.commit()
                    print(f"      ✅ Gata! Tag: {final_tag}")
                
                else:
                    print("      ❌ Eroare download imagine.")
                    listing.ai_tags = {"error": "image_download_failed", "top_tag": "unknown"}
                    db.commit()

        except Exception as e:
            print(f"⚠️ Eroare în bucla AI: {e}")
            db.rollback()
            time.sleep(5)
        finally:
            db.close()

if __name__ == "__main__":
    process_pending_images()