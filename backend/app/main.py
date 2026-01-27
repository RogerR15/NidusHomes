import os
from fastapi import FastAPI, Depends, HTTPException, Query, Header
from supabase import create_client, Client
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware 

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
def get_listing_detail(
    listing_id: int, 
    increment_view: bool = True,
    db: Session = Depends(get_db)
    ):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if increment_view:
        if listing.views is None:
            listing.views = 0
        listing.views += 1

    db.commit()         
    db.refresh(listing)
    
    return listing

# 3. CREATE LISTING 
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
        floor=listing.floor,          
        year_built=listing.year_built,
        
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

    fav_count = 0
    listing_data = schemas.ListingOut.model_validate(listing)
    listing_data.favorites_count = fav_count

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

# 7. TOGGLE FAVORITE (Save / Unsave)
@app.post("/listings/{listing_id}/favorite")
def toggle_favorite(
    listing_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Auth Check
    if not authorization:
        raise HTTPException(status_code=401, detail="Trebuie să fii logat.")
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Token invalid.")

    # 2. Căutăm anunțul
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Anunțul nu există.")

    # 3. Verificăm în tabelul tău 'favorites'
    existing_fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == user_id,
        models.Favorite.listing_id == listing_id
    ).first()

    if existing_fav:
        # --- CAZUL 1: E deja salvat -> ÎL ȘTERGEM (UNSAVE) ---
        db.delete(existing_fav)
        
        # Decrementăm contorul
        if listing.favorites_count and listing.favorites_count > 0:
            listing.favorites_count -= 1
        
        message = "Removed from favorites"
        is_favorited = False
    else:
        # --- CAZUL 2: Nu e salvat -> ÎL ADĂUGĂM (SAVE) ---
        # Aici folosim structura ta (id se autogenerează)
        new_fav = models.Favorite(
            user_id=user_id, 
            listing_id=listing_id
        )
        db.add(new_fav)
        
        # Incrementăm contorul
        if listing.favorites_count is None:
            listing.favorites_count = 0
        listing.favorites_count += 1
        
        message = "Added to favorites"
        is_favorited = True

    db.commit()
    db.refresh(listing)

    return {
        "message": message,
        "favorites_count": listing.favorites_count,
        "is_favorited": is_favorited
    }

# 8. CHECK FAVORITE STATUS
@app.get("/listings/{listing_id}/is_favorited")
def check_favorite(
    listing_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization:
        return {"is_favorited": False}
    
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
        
        fav = db.query(models.Favorite).filter(
            models.Favorite.user_id == user_id,
            models.Favorite.listing_id == listing_id
        ).first()
        
        return {"is_favorited": fav is not None}
    except:
        return {"is_favorited": False}
    
# 9. RESET VIEWS (Doar pentru proprietar)
@app.put("/listings/{listing_id}/reset-views")
def reset_listing_views(
    listing_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Auth Check
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Invalid Token")

    # 2. Găsim anunțul
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Anunțul nu există")

    # 3. Verificăm dacă ești proprietarul
    # Folosim funcția de normalizare id pe care o ai deja sau comparăm direct
    def normalize_id(uid):
        return str(uid).strip().lower().replace('"', '').replace("'", "")

    if normalize_id(listing.owner_id) != normalize_id(user_id):
        raise HTTPException(status_code=403, detail="Nu ai voie să resetezi vizualizările acestui anunț")

    # 4. Resetăm vizualizările
    listing.views = 0
    db.commit()
    db.refresh(listing)

    return {"message": "Vizualizări resetate cu succes", "views": 0}


# 10. TRIMITE CERERE REVENDICARE (User)
@app.post("/listings/{listing_id}/claim", response_model=schemas.ClaimRequestOut)
def submit_claim(
    listing_id: int,
    claim_data: schemas.ClaimRequestCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Trebuie să fii logat.")
    
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Token invalid.")

    # Verificăm anunțul
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Anunțul nu există.")
    if listing.is_claimed:
        raise HTTPException(status_code=400, detail="Anunțul este deja revendicat.")

    # Verificăm duplicate
    existing = db.query(models.ClaimRequest).filter(
        models.ClaimRequest.listing_id == listing_id,
        models.ClaimRequest.user_id == user_id,
        models.ClaimRequest.status == 'PENDING'
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ai deja o cerere în așteptare.")

    new_claim = models.ClaimRequest(
        user_id=user_id,
        listing_id=listing_id,
        proof_document_url=claim_data.proof_document_url,
        contact_info=claim_data.contact_info,
        status="PENDING"
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim

# 11. VEZI CERERI PENDING (Admin Panel)
@app.get("/admin/claims", response_model=List[schemas.ClaimRequestOut])
def get_pending_claims(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # TODO: Aici ar trebui să verifici dacă user_id == ADMIN_ID_UL_TAU
    # Momentan lăsăm deschis doar pentru tine să vezi datele
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
        
    claims = db.query(models.ClaimRequest).filter(models.ClaimRequest.status == 'PENDING').all()
    return claims

# 12. APROBĂ CERERE (Admin Action)
@app.post("/admin/claims/{claim_id}/approve")
def approve_claim(
    claim_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # Verificare simplă Admin (poți hardcoda ID-ul tău aici pentru siguranță reală)
    # if user_id != "ID-UL-TAU-SUPABASE": raise HTTPException(403)

    claim = db.query(models.ClaimRequest).filter(models.ClaimRequest.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Cererea nu există.")

    if claim.status != 'PENDING':
        raise HTTPException(status_code=400, detail="Cererea nu este în așteptare.")

    listing = db.query(models.Listing).filter(models.Listing.id == claim.listing_id).first()
    
    # --- TRANSFERUL REAL DE PROPRIETATE ---
    listing.owner_id = claim.user_id      # Noul proprietar
    listing.is_claimed = True             # Marcat ca revendicat
    listing.source_platform = "NidusHomes" # Devine 'Oficial'
    
    claim.status = "APPROVED"
    
    db.commit()
    return {"message": "Aprobat cu succes! Proprietatea a fost transferată."}

# 13. RESPINGE CERERE
@app.post("/admin/claims/{claim_id}/reject")
def reject_claim(
    claim_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    claim = db.query(models.ClaimRequest).filter(models.ClaimRequest.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Cererea nu există.")

    claim.status = "REJECTED"
    db.commit()
    return {"message": "Cerere respinsă."}

@app.get("/")
def read_root():
    return {"status": "API Running"}