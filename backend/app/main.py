from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from geoalchemy2.shape import to_shape
from . import models, schemas, database
from typing import List, Optional

app = FastAPI(title="Ro-Zillow API")

# CORS (obligatoriu pentru frontend)
from fastapi.middleware.cors import CORSMiddleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/listings", response_model=List[schemas.ListingResponse])
def get_listings(
    db: Session = Depends(database.get_db),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_sqm: Optional[float] = None
):
    # Pornim cu o interogare de baza
    query = db.query(models.Listing)
    
    # Adaugam filtre dinamice daca sunt furnizate in URL
    if min_price:
        query = query.filter(models.Listing.price_eur >= min_price)
    if max_price:
        query = query.filter(models.Listing.price_eur <= max_price)
    if min_sqm:
        query = query.filter(models.Listing.sqm >= min_sqm)
    
    listings = query.all()
    
    # Procesarea coordonatelor ramane la fel
    for l in listings:
        if l.geom:
            point = to_shape(l.geom)
            l.longitude = point.x
            l.latitude = point.y
            
    return listings

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