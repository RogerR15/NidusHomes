from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

# Schema de baza
class ListingBase(BaseModel):
    title: str
    price_eur: float
    sqm: float
    rooms: Optional[int] = None
    floor: Optional[int] = None
    neighborhood: Optional[str] = None
    source_platform: Optional[str] = None
    image_url: Optional[str] = None
    transaction_type: str = "SALE"

# Ce primim când cream un anunț (manual, optional)
class ListingCreate(ListingBase):
    latitude: float
    longitude: float

# FRONTEND OUTPUT 
class ListingOut(ListingBase):
    id: int
    description: Optional[str] = None
    images: List[str] = [] # Lista de poze
    listing_url: Optional[str] = None
    year_built: Optional[int] = None
    compartmentation: Optional[str] = None
    
    # Acestea vor fi populate automat de proprietatile @property din models.py
    lat: Optional[float] = None
    lng: Optional[float] = None
    
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True # Permite conversia automata din SQLAlchemy