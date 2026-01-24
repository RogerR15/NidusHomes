from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc
from typing import List, Optional

from app.database import get_db
from app import models, schemas

router = APIRouter(
    prefix="/listings",
    tags=["listings"]
)

@router.get("/", response_model=List[schemas.ListingOut])
def get_listings(
    db: Session = Depends(get_db),
    # --- FILTRELE DIN URL ---
    transaction_type: str = Query("SALE", description="SALE sau RENT"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_sqm: Optional[float] = None,
    rooms: Optional[int] = Query(None, description="Numar minim camere (ex: 2 inseamna 2+)"),
    neighborhood: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """
    Endpoint principal pentru căutare. 
    Exemplu: /listings?transaction_type=SALE&min_price=50000&max_price=90000&rooms=2&rooms=3
    """
    
    # 1. Start Query
    query = db.query(models.Listing).filter(
        models.Listing.status == "ACTIVE",
        models.Listing.transaction_type == transaction_type
    )

    # 2. Aplicare Filtre Dinamice
    if min_price:
        query = query.filter(models.Listing.price_eur >= min_price)
    
    if max_price:
        query = query.filter(models.Listing.price_eur <= max_price)

    if min_sqm:
        query = query.filter(models.Listing.sqm >= min_sqm)

    if rooms:
        query = query.filter(models.Listing.rooms >= rooms)

    if neighborhood:
        # Căutare parțială (insensitive case)
        query = query.filter(models.Listing.neighborhood.ilike(f"%{neighborhood}%"))

    # 3. Sortare (Cele mai noi primele)
    query = query.order_by(desc(models.Listing.updated_at))

    # 4. Paginare
    results = query.limit(limit).offset(offset).all()
    
    # 5. Procesare Lat/Lng din Geometrie (pentru Pydantic)
    # SQLAlchemy returnează un obiect WKBElement pentru geom. 
    # Trebuie să extragem coordonatele manual dacă vrem să le trimitem curat.
    # O variantă simplă este să lăsăm frontend-ul să primească tot obiectul, 
    # dar mai elegant e să facem mapping aici.
    
    final_results = []
    for item in results:
        # Mic hack pentru a adăuga lat/lng la obiectul Pydantic
        # Deoarece item este un obiect SQLAlchemy, putem accesa proprietatile
        try:
            # GeoAlchemy2 convertește automat la citire, dar depinde de configurație.
            # Dacă folosim to_shape:
            from geoalchemy2.shape import to_shape
            if item.geom:
                point = to_shape(item.geom)
                item.lat = point.y
                item.lng = point.x
        except:
            item.lat = None
            item.lng = None
        
        final_results.append(item)

    return final_results