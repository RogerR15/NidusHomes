from fastapi import FastAPI, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from typing import List, Optional

from app import models, schemas
from app.database import engine, get_db

# Creare tabele
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ro-Zillow API")

# CORS (Esential pentru Frontend)
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # In productie pui domeniul real
    allow_methods=["*"],
    allow_headers=["*"],
)

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
        # Cautare case-insensitive (ex: "copou" gasește "Copou, Iasi")
        query = query.filter(models.Listing.neighborhood.ilike(f"%{neighborhood}%"))

    # Ordonare (cele mai noi primele) și Paginare
    listings = query.order_by(desc(models.Listing.updated_at)).limit(limit).offset(offset).all()
    
    return listings 
    # FastAPI convertește automat lista de obiecte SQLAlchemy In JSON
    # folosind schema ListingOut (inclusiv lat/lng din properties)

# 2. GET SINGLE LISTING (Detalii)
@app.get("/listings/{listing_id}", response_model=schemas.ListingOut)
def get_listing_detail(listing_id: int, db: Session = Depends(get_db)):
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    return listing

@app.get("/")
def read_root():
    return {"status": "API Running"}