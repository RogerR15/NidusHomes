from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape 
from sqlalchemy.dialects.postgresql import ARRAY
from .database import Base

class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(String, nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text)

    # Date Financiare & Fizice
    price_eur = Column(Float, nullable=False)
    sqm = Column(Float, nullable=False)
    rooms = Column(Integer)
    floor = Column(Integer)
    year_built = Column(Integer, nullable=True)
    compartmentation = Column(String, nullable=True)

    # Localizare
    neighborhood = Column(String, index=True)
    address = Column(String)

    # Media & Linkuri
    image_url = Column(String, nullable=True) # Thumbnail
    images = Column(ARRAY(String), nullable=True) # Galerie foto
    listing_url = Column(String, unique=True)

    # Tip tranzactie
    transaction_type = Column(String, default="SALE")

    # PostGIS
    geom = Column(Geometry(geometry_type='POINT', srid=4326))

    # Metadate
    source_platform = Column(String)
    is_claimed = Column(Boolean, default=False)
    status = Column(String, default="ACTIVE")

    views = Column(Integer, default=0)
    favorites_count = Column(Integer, default=0)

    # Timestamp pentru ultima verificare a anuntului
    last_seen_at = Column(DateTime(timezone=True), server_default=func.now())
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # HELPERE PENTRU PYDANTIC 
    @property
    def lat(self):
        try:
            if self.geom:
                # Extrage Y (Latitudine) din obiectul geometric
                return to_shape(self.geom).y
        except: pass
        return None

    @property
    def lng(self):
        try:
            if self.geom:
                # Extrage X (Longitudine)
                return to_shape(self.geom).x
        except: pass
        return None
    

class Favorite(Base):
    __tablename__ = "favorites"  
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ClaimRequest(Base):
    __tablename__ = "claim_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String, nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id"), nullable=False)
    status = Column(String, default="PENDING")
    proof_document_url = Column(String, nullable=True)
    contact_info = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())