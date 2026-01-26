import os
from fastapi import FastAPI, Depends, HTTPException, Query, Header
from supabase import create_client, Client
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware # Importul e aici

# Asigură-te că aceste importuri locale funcționează (folderul app)
from app import models, schemas
from app.database import engine, get_db

# Creare tabele
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ro-Zillow API")

# --- CONFIGURARE SUPABASE ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Eroare la initializarea Supabase: {e}")
# ------------------------------------------------

# CONFIGURARE CORS
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)
# ------------------------------------------------

# 1. GET LISTINGS (Cautare Avansata)
@app.get("/listings", response_model=List[schemas.ListingOut])
def get_listings(
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
    transaction_type: str = Query("SALE", description="SALE sau RENT"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_sqm: Optional[float] = None,
    rooms: Optional[int] = None,
    neighborhood: Optional[str] = None
):
    # Start Query
    query = db.query(models.Listing).filter(
        models.Listing.status == 'ACTIVE',
        models.Listing.transaction_type == transaction_type
    )

    # Filtre
    if min_price:
        query = query.filter(models.Listing.price_eur >= min_price)
    if max_price:
        query = query.filter(models.Listing.price_eur <= max_price)
    if min_sqm:
        query = query.filter(models.Listing.sqm >= min_sqm)
    if rooms:
        query = query.filter(models.Listing.rooms >= rooms)
    if neighborhood:
        query = query.filter(models.Listing.neighborhood.ilike(f"%{neighborhood}%"))

    # Ordonare (cele mai noi primele) și Paginare
    listings = query.order_by(desc(models.Listing.updated_at)).limit(limit).offset(offset).all()
    
    return listings 

# 2. GET SINGLE LISTING (Detalii)
@app.get("/listings/{listing_id}", response_model=schemas.ListingOut)
def get_listing_detail(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing

# 3. CREATE LISTING (Adaugă Anunț)
@app.post("/listings", response_model=schemas.ListingOut, status_code=201)
def create_listing(
    listing: schemas.ListingCreate, 
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    # 1. Validare User
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        # FIX: Convertim ID-ul în string simplu
        user_id = str(user.user.id) 
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Token")

    # 2. Convertim coordonatele
    geom_point = f'POINT({listing.longitude} {listing.latitude})'

    # 3. Salvăm în DB
    new_listing = models.Listing(
        owner_id=user_id,
        title=listing.title,
        description=listing.description,
        
        # AICI TREBUIE SA FIE EXACT CA IN SCHEMA NOUA
        price_eur=listing.price_eur, 
        
        transaction_type=listing.transaction_type,
        rooms=listing.rooms,
        sqm=listing.sqm,
        neighborhood=listing.neighborhood,
        address=listing.address,
        
        geom=geom_point,
        images=listing.images, # Lista de poze
        image_url=listing.images[0] if listing.images else None, # Thumbnail
        
        source_platform="NidusHomes",
        is_claimed=True,
        status="ACTIVE"
    )

    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)

    return new_listing


# 4. GET MY LISTINGS (Doar anunțurile userului logat)
@app.get("/my-listings", response_model=List[schemas.ListingOut])
def get_my_listings(
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid Token")

    # Returnăm doar anunțurile unde owner_id este egal cu ID-ul userului
    listings = db.query(models.Listing).filter(models.Listing.owner_id == user_id).all()
    return listings

# 5. DELETE LISTING (Șterge un anunț)
@app.delete("/listings/{listing_id}", status_code=204)
def delete_listing(
    listing_id: int,
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")

    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Invalid Token")

    # Căutăm anunțul
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Anunțul nu există")

    # VERIFICARE CRITICĂ: Userul are voie să șteargă doar propriile anunțuri
    if listing.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea să ștergi acest anunț")

    db.delete(listing)
    db.commit()
    return None


# 6. UPDATE LISTING (Editează un anunț)
@app.put("/listings/{listing_id}", response_model=schemas.ListingOut)
def update_listing(
    listing_id: int,
    listing_update: schemas.ListingCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Autentificare
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Invalid Token")

    # 2. Căutăm anunțul
    db_listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not db_listing:
        raise HTTPException(status_code=404, detail="Anunțul nu există")

    # --- AICI ESTE MODIFICAREA (Pasul 3) ---
    # Definim o funcție mică pentru a curăța ID-urile de spații sau ghilimele
    def normalize_id(uid):
        return str(uid).strip().lower().replace('"', '').replace("'", "")

    id_db_clean = normalize_id(db_listing.owner_id)
    id_token_clean = normalize_id(user_id)

    print(f"DEBUG FIX: Comparăm '{id_db_clean}' cu '{id_token_clean}'")

    if id_db_clean != id_token_clean:
        raise HTTPException(status_code=403, detail="Nu ai voie să modifici acest anunț")
    # ---------------------------------------

    # 4. Actualizăm câmpurile
    db_listing.title = listing_update.title
    db_listing.description = listing_update.description
    db_listing.price_eur = listing_update.price_eur
    db_listing.sqm = listing_update.sqm
    db_listing.rooms = listing_update.rooms
    db_listing.neighborhood = listing_update.neighborhood
    db_listing.transaction_type = listing_update.transaction_type
    db_listing.floor = listing_update.floor
    db_listing.year_built = listing_update.year_built
    db_listing.address = listing_update.address
    
    # Actualizăm locația pe hartă
    db_listing.geom = f'POINT({listing_update.longitude} {listing_update.latitude})'
    
    db_listing.latitude = listing_update.latitude
    db_listing.longitude = listing_update.longitude

    # Actualizăm imaginile DOAR dacă userul a trimis altele noi
    if listing_update.images and len(listing_update.images) > 0:
         db_listing.images = listing_update.images
         db_listing.image_url = listing_update.images[0]

    db.commit()
    db.refresh(db_listing)
    return db_listing

@app.get("/")
def read_root():
    return {"status": "API Running"}