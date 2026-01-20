from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape
from . import models, schemas, database
from typing import List, Optional
from app import models
from app.database import engine, get_db
import json

app = FastAPI(title="Ro-Zillow API")

# CORS (obligatoriu pentru frontend)
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/listings/{listing_id}")
def get_listing_detail(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    # 1. Facem o copie a datelor
    l_dict = listing.__dict__.copy()
    
    # 2. Ștergem datele interne SQLAlchemy
    if "_sa_instance_state" in l_dict:
        del l_dict["_sa_instance_state"]
    
    # 3. Calculăm coordonatele (Lat/Lng) din geometrie
    lat, lng = None, None
    if listing.geom is not None:
        try:
            # Convertim din format binar în formă geometrică
            shape = to_shape(listing.geom)
            lat, lng = shape.y, shape.x
        except Exception:
            pass
    
    # Le adăugăm ca numere simple
    l_dict["latitude"] = lat
    l_dict["longitude"] = lng
    
    # 4. FIX CRITIC: Ștergem obiectul 'geom' care cauza eroarea 500
    if "geom" in l_dict:
        del l_dict["geom"]
    
    return l_dict


@app.get("/listings")
def get_listings(
    db: Session = Depends(database.get_db),
    limit: int = 100,
    transaction_type: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_sqm: Optional[float] = None,
    rooms_min: Optional[int] = None,
    neighborhood: Optional[str] = None
):
    # 1. Pornim doar cu anunțurile ACTIVE (Soft Delete logic)
    query = db.query(models.Listing).filter(models.Listing.status == 'ACTIVE')

    # 2. Aplicăm filtrele pe rând (construim query-ul)
    if transaction_type:
        query = query.filter(models.Listing.transaction_type == transaction_type)
    
    if min_price:
        query = query.filter(models.Listing.price_eur >= min_price)
        
    if max_price:
        query = query.filter(models.Listing.price_eur <= max_price)
        
    if min_sqm:
        query = query.filter(models.Listing.sqm >= min_sqm)

    if rooms_min:
        query = query.filter(models.Listing.rooms >= rooms_min)

    if neighborhood:
        # Căutare case-insensitive (ILIKE)
        query = query.filter(models.Listing.neighborhood.ilike(f"%{neighborhood}%"))
    
    # 3. Executăm query-ul O SINGURĂ DATĂ, la final
    listings = query.order_by(models.Listing.created_at.desc()).limit(limit).all()
    
    # 4. Procesare rezultate (Fix pentru eroarea WKBElement / Geom)
    results = []
    for l in listings:
        # Convertim în dicționar
        l_dict = l.__dict__.copy()
        
        # Curățăm datele interne SQLAlchemy
        if "_sa_instance_state" in l_dict:
            del l_dict["_sa_instance_state"]
            
        # Extragem coordonatele
        lat, lng = None, None
        if l.geom is not None:
            try:
                point = to_shape(l.geom)
                lat, lng = point.y, point.x
            except: pass
            
        l_dict["latitude"] = lat
        l_dict["longitude"] = lng
        
        # FIX CRITIC: Ștergem obiectul geom care dă erori la serializare
        if "geom" in l_dict:
            del l_dict["geom"]

        if "images" in l_dict and isinstance(l_dict["images"], str):
            try:
                l_dict["images"] = json.loads(l_dict["images"])
            except:
                l_dict["images"] = [] # Fallback dacă e corupt

        if l_dict.get("rooms"): l_dict["rooms"] = int(l_dict["rooms"])
        if l_dict.get("floor"): l_dict["floor"] = int(l_dict["floor"])
        if l_dict.get("price_eur"): l_dict["price_eur"] = int(l_dict["price_eur"])
            
        results.append(l_dict)
            
    return results

@app.post("/listings", response_model=schemas.ListingResponse)
def create_listing(listing: schemas.ListingCreate, db: Session = Depends(database.get_db)):
    from shapely.geometry import Point
    from geoalchemy2.shape import from_shape

    new_listing = models.Listing(
        **listing.model_dump(exclude={'latitude', 'longitude'}),
        geom=from_shape(Point(listing.longitude, listing.latitude), srid=4326)
    )
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)
    
    # Adaugam lat/lng inapoi pentru raspunsul JSON
    new_listing.latitude = listing.latitude
    new_listing.longitude = listing.longitude
    return new_listing