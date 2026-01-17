from pydantic import BaseModel
from typing import Optional, List

class ListingBase(BaseModel):
    title: str
    price_eur: float
    sqm: float
    rooms: Optional[int] = None
    neighborhood: Optional[str] = None
    source_platform: Optional[str] = None
    image_url: Optional[str] = None

class ListingCreate(ListingBase):
    latitude: float
    longitude: float

class ListingResponse(ListingBase):
    id: int
    latitude: float
    longitude: float

    class Config:
        from_attributes = True # Permite Pydantic sa citeasca obiecte SQLAlchemy