from pydantic import BaseModel, Field
from typing import List, Optional, Union
from datetime import datetime
from uuid import UUID

# Schema de baza
class ListingBase(BaseModel):
    title: str
    price_eur: float
    description: Optional[str] = None
    # price_eur: float
    sqm: float
    rooms: Optional[int] = None
    floor: Optional[int] = None
    neighborhood: Optional[str] = None
    source_platform: Optional[str] = "NidusHomes"
    image_url: Optional[str] = None
    transaction_type: str = "SALE"
    year_built: Optional[int] = None
    address: Optional[str] = None

# Ce primim când cream un anunț (manual, optional)
class ListingCreate(ListingBase):
    latitude: float
    longitude: float
    description: Optional[str] = None
    images: List[str] = []
    price: float = Field(..., alias="price_eur")
    address: Optional[str] = None

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
    
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    owner_id: Optional[Union[str, UUID]] = None

    class Config:
        from_attributes = True # Permite conversia automata din SQLAlchemy
        populate_by_name = True # Permite folosirea alias-urilor la output