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
    contact_phone: Optional[str] = None

# Ce primim când cream un anunț (manual, optional)
class ListingCreate(ListingBase):
    latitude: float
    longitude: float
    description: Optional[str] = None
    images: List[str] = []
    price: float = Field(..., alias="price_eur")
    address: Optional[str] = None


class AgentProfilePublic(BaseModel):
    agency_name: Optional[str] = None
    phone_number: Optional[str] = None
    logo_url: Optional[str] = None
    is_verified: bool = False
    rating: float = 0.0
    
    class Config:
        from_attributes = True


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

    views: int = 0
    favorites_count: int = 0
    is_claimed: bool = False

    agent_profile: Optional[AgentProfilePublic] = None

    class Config:
        from_attributes = True # Permite conversia automata din SQLAlchemy
        populate_by_name = True # Permite folosirea alias-urilor la output


# --- CLAIM SCHEMAS ---
class ClaimRequestCreate(BaseModel):
    proof_document_url: str
    contact_info: Optional[str] = None

class ClaimRequestOut(BaseModel):
    id: int
    user_id: Union[str, UUID]
    listing_id: int
    status: str
    proof_document_url: Optional[str]
    contact_info: Optional[str]
    created_at: datetime
    
    class Config:
        from_attributes = True


# --- CHAT SCHEMAS ---

# Când trimiți un mesaj nou
class MessageCreate(BaseModel):
    listing_id: int # Avem nevoie de asta ca să știm unde să creăm conversația dacă nu există
    content: str

# Când returnăm un mesaj către Frontend
class MessageOut(BaseModel):
    id: int
    conversation_id: int
    sender_id: Union[str, UUID]
    content: str
    created_at: datetime
    is_read: bool

    class Config:
        from_attributes = True

class ListingTiny(BaseModel):
    id: int
    title: str
    image_url: Optional[str] = None
    price_eur: int

    class Config:
        from_attributes = True

# Când returnăm o conversație (Lista de chat-uri din Inbox)
class ConversationOut(BaseModel):
    id: int
    listing_id: int
    buyer_id: Union[str, UUID]   
    seller_id: Union[str, UUID]
    updated_at: datetime

    listing: Optional[ListingTiny] = None
    has_unread: bool = False        
    unread_count: int = 0           
    last_message: Optional[str] = None
   
    
    class Config:
        from_attributes = True


# Scheme pentru Agent/Leads
class AgentProfileCreate(BaseModel):
    agency_name: str
    phone_number: str
    bio: Optional[str] = None
    cui: Optional[str] = None
    website: Optional[str] = None
    cui: Optional[str] = None    
    website: Optional[str] = None

class LeadOut(BaseModel):
    id: int
    listing_id: Optional[int] = None
    client_name: str
    client_avatar: Optional[str] = None
    client_phone: Optional[str] = None
    message: Optional[str] = None
    status: str
    created_at: datetime
    class Config:
        from_attributes = True


class ReviewCreate(BaseModel):
    agent_id: str # UUID-ul agentului
    rating: int   # 1 - 5
    comment: Optional[str] = None