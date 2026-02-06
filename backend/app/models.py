from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from geoalchemy2 import Geometry
from geoalchemy2.shape import to_shape 
from sqlalchemy.dialects.postgresql import ARRAY, UUID
from .database import Base

class Listing(Base):
    __tablename__ = "listings"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(UUID(as_uuid=False), nullable=True)
    title = Column(String, nullable=False)
    description = Column(Text)

    # Date Financiare & Fizice
    price_eur = Column(Float, nullable=False)
    sqm = Column(Float, nullable=True)
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

    agent_profile = relationship("AgentProfile", primaryjoin="foreign(Listing.owner_id) == remote(AgentProfile.id)", uselist=False, viewonly=True)
    
    contact_phone = Column(String, nullable=True)

    fingerprint = Column(String, index=True) 
    image_hash = Column(String, index=True)
    
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
    user_id = Column(UUID(as_uuid=False), nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class ClaimRequest(Base):
    __tablename__ = "claim_requests"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(UUID(as_uuid=False), nullable=False)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    status = Column(String, default="PENDING")
    proof_document_url = Column(String, nullable=True)
    contact_info = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True, index=True)
    listing_id = Column(Integer, ForeignKey("listings.id", ondelete="CASCADE"), nullable=False)
    buyer_id = Column(UUID(as_uuid=False), nullable=False)
    seller_id = Column(UUID(as_uuid=False), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relații (Opțional, ajută la query-uri complexe)
    messages = relationship("Message", back_populates="conversation")
    listing = relationship("Listing") 

class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False)
    sender_id = Column(UUID(as_uuid=False), nullable=False)
    content = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    conversation = relationship("Conversation", back_populates="messages")


class AgentProfile(Base):
    __tablename__ = "agent_profiles"
    id = Column(UUID(as_uuid=False), primary_key=True) # UUID
    agency_name = Column(String)
    logo_url = Column(String)
    bio = Column(String)
    phone_number = Column(String)
    license_number = Column(String)
    is_verified = Column(Boolean, default=False)
    rating = Column(Float, default=0.0)
    cui = Column(String, nullable=True)
    website = Column(String, nullable=True)

class Lead(Base):
    __tablename__ = "leads"
    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(UUID(as_uuid=False))
    listing_id = Column(Integer)
    client_name = Column(String)
    client_phone = Column(String)
    client_email = Column(String)
    message = Column(String)
    status = Column(String, default='NOU')
    created_at = Column(DateTime(timezone=True), server_default=func.now())


class AgentReview(Base):
    __tablename__ = "agent_reviews"

    id = Column(Integer, primary_key=True, index=True)
    agent_id = Column(UUID(as_uuid=False), index=True)  # UUID-ul agentului
    client_id = Column(UUID(as_uuid=False))             # UUID-ul clientului care lasă recenzia
    rating = Column(Integer)               # 1-5
    comment = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())