from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry # Pentru PostGIS
from .database import Base

class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, nullable=False)
    description = Column(Text)

    # Date Financiare & Fizice
    price_eur = Column(Float, nullable=False)
    sqm = Column(Float, nullable=False)
    rooms = Column(Integer)
    floor = Column(Integer) # 0 pentru parter

    # Localizare
    neighborhood = Column(String, index=True)
    address = Column(String)

    # imagine
    image_url = Column(String, nullable=True)

    #Link original
    listing_url = Column(String, unique=True)

    # Tip tranzactie (implicit "SALE")
    transaction_type = Column(String, default="SALE")

    # PostGIS: Punct geografic (Latitudine/Longitudine)
    # 4326 este codul standard pentru coordonate GPS (WGS 84)
    geom = Column(Geometry(geometry_type='POINT', srid=4326))

    # Metadate Ingestie
    #source_url = Column(String, unique=True) # Prevenim duplicarea URL-ului
    source_platform = Column(String) # Ex: "OLX", "Storia"
    is_claimed = Column(Boolean, default=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relații
    price_history = relationship("PriceHistory", back_populates="listing")

class PriceHistory(Base):
    __tablename__ = "price_history"

    id = Column(Integer, primary_key=True)
    listing_id = Column(Integer, ForeignKey("listings.id"))
    price_eur = Column(Float, nullable=False)
    recorded_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relații
    listing = relationship("Listing", back_populates="price_history")