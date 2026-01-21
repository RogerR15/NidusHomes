from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

# Schema de baza
class ListingBase(BaseModel):
    title: str
    price: float = Field(..., alias="price_eur")
    # price_eur: float
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
    latitude: Optional[float] = Field(None, alias="lat")
    longitude: Optional[float] = Field(None, alias="lng")
    
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True # Permite conversia automata din SQLAlchemy
        populate_by_name = True # Permite folosirea alias-urilor la output