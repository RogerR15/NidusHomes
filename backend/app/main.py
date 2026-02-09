import os
from fastapi import FastAPI, Depends, HTTPException, Query, Header
from pydantic import BaseModel
from supabase import create_client, Client
from sqlalchemy.orm import Session
from sqlalchemy import and_, desc, func, or_
from typing import List, Optional
from fastapi.middleware.cors import CORSMiddleware 
from sqlalchemy.orm import Session, joinedload

from app import models, schemas
from app.database import engine, get_db

from fastapi.responses import FileResponse
from app.utils.pdf_generator import generate_cma_report

import tldextract 
from urllib.parse import urlparse
import joblib
import pandas as pd

# Creare tabele
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Ro-Zillow API")

# --- CONFIGURARE SUPABASE ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

ADMIN_USER_ID = os.getenv("ADMIN_USER_ID")

try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
except Exception as e:
    print(f"Eroare la initializarea Supabase: {e}")


# CONFIGURARE CORS
app.add_middleware(
    CORSMiddleware, 
    allow_origins=["http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"], 
)

# 1. Încarcare Model AI la startup
price_model = None
model_path = os.path.join("ai", "price_model.joblib")

@app.on_event("startup")
def load_ai_model():
    global price_model
    if os.path.exists(model_path):
        try:
            price_model = joblib.load(model_path)
            print("AI Price Model loaded successfully!")
        except Exception as e:
            print(f"Could not load AI model: {e}")
    else:
        print("No AI model found. Run 'python ai/train_model.py' to create one.")

# 2. Endpoint Estimare Pret
class ValuationRequest(BaseModel):
    sqm: float
    rooms: int
    floor: int = 1
    year_built: int = 1990
    neighborhood: str

@app.post("/api/ai/estimate-price")
def estimate_property_price(data: ValuationRequest):
    if not price_model:
        return {"error": "AI Model not loaded. Train it first."}
    
    # Pregatim datele exact cum au fost la antrenare
    input_df = pd.DataFrame([{
        'sqm': data.sqm,
        'rooms': data.rooms,
        'floor': data.floor,
        'year_built': data.year_built,
        'neighborhood': data.neighborhood
    }])
    
    try:
        prediction = price_model.predict(input_df)[0]
        return {
            "estimated_price": int(prediction),
            "currency": "EUR",
            "status": "success"
        }
    except Exception as e:
        return {"error": f"Prediction failed: {str(e)}"}



# 1. GET LISTINGS (Cautare Avansata)
@app.get("/listings", response_model=List[schemas.ListingOut])
def get_listings(
    db: Session = Depends(get_db),
    limit: int = 100,
    offset: int = 0,
    transaction_type: str = Query("SALE", description="SALE sau RENT"),
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    min_sqm: Optional[float] = None,
    rooms: Optional[int] = None,
    neighborhood: Optional[str] = None
):
    # Start Query
    query = db.query(models.Listing).filter(
        models.Listing.status == 'ACTIVE',
        models.Listing.transaction_type == transaction_type
    )

    # Filtre
    if min_price:
        query = query.filter(models.Listing.price_eur >= min_price)
    if max_price:
        query = query.filter(models.Listing.price_eur <= max_price)
    if min_sqm:
        query = query.filter(models.Listing.sqm >= min_sqm)
    if rooms:
        query = query.filter(models.Listing.rooms >= rooms)
    if neighborhood:
        query = query.filter(models.Listing.neighborhood.ilike(f"%{neighborhood}%"))

    # Ordonare (cele mai noi primele) si Paginare
    listings = query.order_by(desc(models.Listing.updated_at)).limit(limit).offset(offset).all()
    
    return listings 

# 2. GET SINGLE LISTING (Detalii)
@app.get("/listings/{listing_id}", response_model=schemas.ListingOut)
def get_listing_detail(
    listing_id: int, 
    increment_view: bool = True,
    db: Session = Depends(get_db)
    ):
    
    listing = db.query(models.Listing).options(
        joinedload(models.Listing.agent_profile)
    ).filter(models.Listing.id == listing_id).first()

    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if increment_view:
        if listing.views is None:
            listing.views = 0
        listing.views += 1

    db.commit()         
    db.refresh(listing)
    
    return listing

# 3. CREATE LISTING 
@app.post("/listings", response_model=schemas.ListingOut, status_code=201)
def create_listing(
    listing: schemas.ListingCreate, 
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    # 1. Validare User
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    
    try:
        token = authorization.split(" ")[1]
        auth_response = supabase.auth.get_user(token)
        current_user = auth_response.user
        # FIX: Convertim ID-ul in string simplu
        user_id = str(current_user.id)
        user_phone = current_user.user_metadata.get('phone', None)
    except Exception as e:
        print(f"Auth Error: {e}")
        raise HTTPException(status_code=401, detail="Invalid Token")

    # 2. Convertim coordonatele
    geom_point = f'POINT({listing.longitude} {listing.latitude})'

    # 3. Salvam in DB
    new_listing = models.Listing(
        owner_id=user_id,
        title=listing.title,
        description=listing.description,
        
        # AICI TREBUIE SA FIE EXACT CA IN SCHEMA NOUA
        price_eur=listing.price_eur, 
        
        transaction_type=listing.transaction_type,
        rooms=listing.rooms,
        sqm=listing.sqm,
        neighborhood=listing.neighborhood,
        address=listing.address,
        floor=listing.floor,          
        year_built=listing.year_built,
        
        geom=geom_point,
        images=listing.images, # Lista de poze
        image_url=listing.images[0] if listing.images else None, # Thumbnail
        
        source_platform="NidusHomes",
        is_claimed=True,
        status="ACTIVE",
        contact_phone=user_phone
    )

    
    db.add(new_listing)
    db.commit()
    db.refresh(new_listing)

    return new_listing


# 4. GET MY LISTINGS (Doar anunturile userului logat)
@app.get("/my-listings", response_model=List[schemas.ListingOut])
def get_my_listings(
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid Token")

    # Returnam doar anunturile unde owner_id este egal cu ID-ul userului
    listings = db.query(models.Listing).filter(models.Listing.owner_id == user_id).all()
    return listings

# 5. DELETE LISTING (sterge un anunt)
@app.delete("/listings/{listing_id}", status_code=204)
def delete_listing(
    listing_id: int,
    authorization: str = Header(None), 
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")

    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Invalid Token")

    # Cautam anuntul
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    
    if not listing:
        raise HTTPException(status_code=404, detail="Anuntul nu exista")

    # VERIFICARE: Userul are voie sa stearga doar propriile anunturi
    if listing.owner_id != user_id:
        raise HTTPException(status_code=403, detail="Nu ai permisiunea sa stergi acest anunt")

    db.delete(listing)
    db.commit()
    return None


# 6. UPDATE LISTING (Editeaza un anunt)
@app.put("/listings/{listing_id}", response_model=schemas.ListingOut)
def update_listing(
    listing_id: int,
    listing_update: schemas.ListingCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Autentificare
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Invalid Token")

    # 2. Cautam anuntul
    db_listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not db_listing:
        raise HTTPException(status_code=404, detail="Anuntul nu exista")

    # --- AICI ESTE MODIFICAREA (Pasul 3) ---
    # Definim o functie mica pentru a curata ID-urile de spatii sau ghilimele
    def normalize_id(uid):
        return str(uid).strip().lower().replace('"', '').replace("'", "")

    id_db_clean = normalize_id(db_listing.owner_id)
    id_token_clean = normalize_id(user_id)

    print(f"DEBUG FIX: Comparam '{id_db_clean}' cu '{id_token_clean}'")

    if id_db_clean != id_token_clean:
        raise HTTPException(status_code=403, detail="Nu ai voie sa modifici acest anunt")
    # ---------------------------------------

    # 4. Actualizam câmpurile
    db_listing.title = listing_update.title
    db_listing.description = listing_update.description
    db_listing.price_eur = listing_update.price_eur
    db_listing.sqm = listing_update.sqm
    db_listing.rooms = listing_update.rooms
    db_listing.neighborhood = listing_update.neighborhood
    db_listing.transaction_type = listing_update.transaction_type
    db_listing.floor = listing_update.floor
    db_listing.year_built = listing_update.year_built
    db_listing.address = listing_update.address
    
    # Actualizam locatia pe harta
    db_listing.geom = f'POINT({listing_update.longitude} {listing_update.latitude})'
    
    db_listing.latitude = listing_update.latitude
    db_listing.longitude = listing_update.longitude

    # Actualizam imaginile DOAR daca userul a trimis altele noi
    if listing_update.images and len(listing_update.images) > 0:
         db_listing.images = listing_update.images
         db_listing.image_url = listing_update.images[0]

    db.commit()
    db.refresh(db_listing)
    return db_listing

# 7. TOGGLE FAVORITE (Save / Unsave)
@app.post("/listings/{listing_id}/favorite")
def toggle_favorite(
    listing_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Auth Check
    if not authorization:
        raise HTTPException(status_code=401, detail="Trebuie sa fii logat.")
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Token invalid.")

    # 2. Cautam anuntul
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Anuntul nu exista.")

    # 3. Verificam in tabelul tau 'favorites'
    existing_fav = db.query(models.Favorite).filter(
        models.Favorite.user_id == user_id,
        models.Favorite.listing_id == listing_id
    ).first()

    if existing_fav:
        # --- CAZUL 1: E deja salvat -> IL STERGEM (UNSAVE) ---
        db.delete(existing_fav)
        
        # Decrementam contorul
        if listing.favorites_count and listing.favorites_count > 0:
            listing.favorites_count -= 1
        
        message = "Removed from favorites"
        is_favorited = False
    else:
        # --- CAZUL 2: Nu e salvat -> IL ADAUGAM (SAVE) ---
        # Aici folosim structura ta (id se autogenereaza)
        new_fav = models.Favorite(
            user_id=user_id, 
            listing_id=listing_id
        )
        db.add(new_fav)
        
        # Incrementam contorul
        if listing.favorites_count is None:
            listing.favorites_count = 0
        listing.favorites_count += 1
        
        message = "Added to favorites"
        is_favorited = True

    db.commit()
    db.refresh(listing)

    return {
        "message": message,
        "favorites_count": listing.favorites_count,
        "is_favorited": is_favorited
    }

# 8. CHECK FAVORITE STATUS
@app.get("/listings/{listing_id}/is_favorited")
def check_favorite(
    listing_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization:
        return {"is_favorited": False}
    
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
        
        fav = db.query(models.Favorite).filter(
            models.Favorite.user_id == user_id,
            models.Favorite.listing_id == listing_id
        ).first()
        
        return {"is_favorited": fav is not None}
    except:
        return {"is_favorited": False}
    
# 9. RESET VIEWS (Doar pentru proprietar)
@app.put("/listings/{listing_id}/reset-views")
def reset_listing_views(
    listing_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Auth Check
    if not authorization:
        raise HTTPException(status_code=401, detail="Missing Token")
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Invalid Token")

    # 2. Gasim anuntul
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Anuntul nu exista")

    # 3. Verificam daca esti proprietarul
    # Folosim functia de normalizare id pe care o ai deja sau comparam direct
    def normalize_id(uid):
        return str(uid).strip().lower().replace('"', '').replace("'", "")

    if normalize_id(listing.owner_id) != normalize_id(user_id):
        raise HTTPException(status_code=403, detail="Nu ai voie sa resetezi vizualizarile acestui anunt")

    # 4. Resetam vizualizarile
    listing.views = 0
    db.commit()
    db.refresh(listing)

    return {"message": "Vizualizari resetate cu succes", "views": 0}


# 10. TRIMITE CERERE REVENDICARE (User)
@app.post("/listings/{listing_id}/claim", response_model=schemas.ClaimRequestOut)
def submit_claim(
    listing_id: int,
    claim_data: schemas.ClaimRequestCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Trebuie sa fii logat.")
    
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
    except:
        raise HTTPException(status_code=401, detail="Token invalid.")

    # Verificam anuntul
    listing = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not listing:
        raise HTTPException(status_code=404, detail="Anuntul nu exista.")
    if listing.is_claimed:
        raise HTTPException(status_code=400, detail="Anuntul este deja revendicat.")

    # Verificam duplicate
    existing = db.query(models.ClaimRequest).filter(
        models.ClaimRequest.listing_id == listing_id,
        models.ClaimRequest.user_id == user_id,
        models.ClaimRequest.status == 'PENDING'
    ).first()
    if existing:
        raise HTTPException(status_code=400, detail="Ai deja o cerere in asteptare.")

    new_claim = models.ClaimRequest(
        user_id=user_id,
        listing_id=listing_id,
        proof_document_url=claim_data.proof_document_url,
        contact_info=claim_data.contact_info,
        status="PENDING"
    )
    db.add(new_claim)
    db.commit()
    db.refresh(new_claim)
    return new_claim

# 11. VEZI CERERI PENDING (Admin Panel)
@app.get("/admin/claims", response_model=List[schemas.ClaimRequestOut])
def get_pending_claims(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    # SECURITATE ADMIN
    try:
        token = authorization.split(" ")[1]
        user = supabase.auth.get_user(token)
        user_id = str(user.user.id)
        
        # Verificam daca esti TU
        if user_id != ADMIN_USER_ID:
            raise HTTPException(status_code=403, detail="Acces interzis. Nu esti administrator.")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Token invalid")
        
    claims = db.query(models.ClaimRequest).filter(models.ClaimRequest.status == 'PENDING').all()
    return claims

# 12. APROBA CERERE
@app.post("/admin/claims/{claim_id}/approve")
def approve_claim(
    claim_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)

    # SECURITATE ADMIN
    token = authorization.split(" ")[1]
    requesting_user_id = str(supabase.auth.get_user(token).user.id)
    if requesting_user_id != ADMIN_USER_ID:
        raise HTTPException(status_code=403, detail="Acces interzis.")

    claim = db.query(models.ClaimRequest).filter(models.ClaimRequest.id == claim_id).first()
    if not claim:
        raise HTTPException(status_code=404, detail="Cererea nu exista.")

    listing = db.query(models.Listing).filter(models.Listing.id == claim.listing_id).first()
    
    listing.owner_id = claim.user_id
    listing.is_claimed = True
    listing.source_platform = "NidusHomes"
    claim.status = "APPROVED"
    
    db.commit()
    return {"message": "Aprobat cu succes!"}

# 13. RESPINGE CERERE
@app.post("/admin/claims/{claim_id}/reject")
def reject_claim(
    claim_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)

    # SECURITATE ADMIN
    token = authorization.split(" ")[1]
    requesting_user_id = str(supabase.auth.get_user(token).user.id)
    if requesting_user_id != ADMIN_USER_ID:
        raise HTTPException(status_code=403, detail="Acces interzis.")

    claim = db.query(models.ClaimRequest).filter(models.ClaimRequest.id == claim_id).first()
    if not claim: raise HTTPException(404)

    claim.status = "REJECTED"
    db.commit()
    return {"message": "Cerere respinsa."}



# ZONA CHAT

# 14. TRIMITE MESAJ (Initiaza conversatie daca nu exista)
@app.post("/chat/send", response_model=schemas.MessageOut)
def send_message(
    msg_data: schemas.MessageCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    
    # 1. Cine trimite?
    try:
        token = authorization.split(" ")[1]
        sender = supabase.auth.get_user(token)
        sender_id = str(sender.user.id)
    except:
        raise HTTPException(401, detail="Token invalid")

    # 2. Gasim anuntul ca sa vedem cine e proprietarul (Seller)
    listing = db.query(models.Listing).filter(models.Listing.id == msg_data.listing_id).first()
    if not listing:
        raise HTTPException(404, detail="Anuntul nu mai exista")
    
    seller_id = listing.owner_id
    
    # Nu iti poti trimite mesaj tie insuti
    # (Comentat pentru teste, dar e bine de avut)
    # if sender_id == seller_id:
    #     raise HTTPException(400, detail="Nu poti trimite mesaje propriului anunt.")

    # 3. Verificam daca exista deja conversatia
    # Logica: Conversatia este unica per (listing_id, buyer_id)
    # Daca senderul e buyerul -> cautam (listing_id, sender_id)
    # Daca senderul e sellerul -> Nu putem initia noi conversatia ca seller de pe pagina anuntului de obicei, 
    # dar presupunem aici scenariul clasic: Buyerul contacteaza Sellerul.
    
    conversation = db.query(models.Conversation).filter(
        models.Conversation.listing_id == msg_data.listing_id,
        models.Conversation.buyer_id == sender_id 
    ).first()

    if not conversation:
        # Cream conversatie noua
        conversation = models.Conversation(
            listing_id=msg_data.listing_id,
            buyer_id=sender_id,
            seller_id=seller_id
        )
        db.add(conversation)
        db.commit()
        db.refresh(conversation)

    # 4. Adaugam Mesajul
    new_message = models.Message(
        conversation_id=conversation.id,
        sender_id=sender_id,
        content=msg_data.content
    )
    db.add(new_message)
    
    # Actualizam data conversatiei (ca sa apara prima in lista)
    conversation.updated_at = func.now()
    
    db.commit()
    db.refresh(new_message)

    return new_message

# 15. LISTA CONVERSATII (Inbox-ul meu)
@app.get("/chat/conversations", response_model=List[schemas.ConversationOut])
def get_my_conversations(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    
    try:
        token = authorization.split(" ")[1]
        user_auth = supabase.auth.get_user(token)
        user_id = str(user_auth.user.id)
    except:
        raise HTTPException(401, detail="Token invalid")

    # 1. Luam conversatiile
    conversations = db.query(models.Conversation).options(
        joinedload(models.Conversation.listing)
    ).filter(
        or_(models.Conversation.buyer_id == user_id, models.Conversation.seller_id == user_id)
    ).order_by(models.Conversation.updated_at.desc()).all()

    results = []
    
    # 2. Pentru fiecare, calculam daca are mesaje necitite
    for conv in conversations:
        # Numaram mesajele unde: conversatia e asta, NU sunt eu expeditorul, și is_read e False
        unread_count = db.query(models.Message).filter(
            models.Message.conversation_id == conv.id,
            models.Message.sender_id != user_id, 
            models.Message.is_read == False
        ).count()

        # Luam ultimul mesaj pentru preview
        last_msg = db.query(models.Message).filter(
            models.Message.conversation_id == conv.id
        ).order_by(desc(models.Message.created_at)).first()

        # Convertim la schema
        conv_data = schemas.ConversationOut.model_validate(conv)
        
        # Populam datele extra
        conv_data.has_unread = (unread_count > 0)
        conv_data.unread_count = unread_count
        conv_data.last_message = last_msg.content if last_msg else "Începe discutia"

        results.append(conv_data)

    return results

# 16. VEZI MESAJELE DINTR-O CONVERSATIE
@app.get("/chat/conversations/{conversation_id}/messages", response_model=List[schemas.MessageOut])
def get_messages(
    conversation_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    
    # Securitate: Verificam daca faci parte din conversatie!
    token = authorization.split(" ")[1]
    user_id = str(supabase.auth.get_user(token).user.id)

    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(404, detail="Conversatia nu exista")

    if str(conversation.buyer_id) != user_id and str(conversation.seller_id) != user_id:
        raise HTTPException(403, detail="Nu ai acces la aceasta conversatie.")

    # print(f"DEBUG:")
    # print(f"EU (Cel logat):   {user_id}")
    # print(f"Cumparator Conv:  {conversation.buyer_id}")
    # print(f"Vanzator Conv:    {conversation.seller_id}")


    messages = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id
    ).order_by(models.Message.created_at.asc()).all()

    return messages

# 17. VEZI DETALIILE UNEI CONVERSATII
@app.get("/chat/conversations/{conversation_id}", response_model=schemas.ConversationOut)
def get_conversation_details(
    conversation_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    token = authorization.split(" ")[1]
    user_id = str(supabase.auth.get_user(token).user.id)

    # Aducem conversatia + listing-ul
    conversation = db.query(models.Conversation).options(
        joinedload(models.Conversation.listing)
    ).filter(models.Conversation.id == conversation_id).first()

    if not conversation:
        raise HTTPException(404, detail="Conversatia nu exista")

    # Verificare securitate
    if str(conversation.buyer_id) != user_id and str(conversation.seller_id) != user_id:
        raise HTTPException(403, detail="Nu ai acces.")

    return conversation


class ReplyRequest(BaseModel):
    content: str

# 18. RASPUNDE LA CONVERSATIE (Reply)
@app.post("/chat/conversations/{conversation_id}/reply", response_model=schemas.MessageOut)
def reply_to_conversation(
    conversation_id: int,
    reply: ReplyRequest,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    
    # 1. Cine trimite?
    try:
        token = authorization.split(" ")[1]
        sender = supabase.auth.get_user(token)
        sender_id = str(sender.user.id)
    except:
        raise HTTPException(401, detail="Token invalid")

    # 2. Verificam conversatia
    conversation = db.query(models.Conversation).filter(models.Conversation.id == conversation_id).first()
    if not conversation:
        raise HTTPException(404, detail="Conversatia nu exista")

    if str(conversation.buyer_id) != sender_id and str(conversation.seller_id) != sender_id:
        raise HTTPException(403, detail="Nu ai acces aici.")


    # 4. Adaugam mesajul
    new_message = models.Message(
        conversation_id=conversation.id,
        sender_id=sender_id,
        content=reply.content
    )
    db.add(new_message)
    
    # Actualizam timestamp-ul conversatiei
    conversation.updated_at = func.now()
    
    db.commit()
    db.refresh(new_message)

    return new_message


# AGENTS

# 1. GENERARE RAPORT CMA (PDF)
@app.post("/agent/generate-cma/{listing_id}")
def create_cma_pdf(
    listing_id: int, 
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    # 1. Gasim casa TA
    target = db.query(models.Listing).filter(models.Listing.id == listing_id).first()
    if not target: raise HTTPException(404, detail="Listing not found")
    
    # --- FIX: EXTRAGERE DATE SAFE (cu getattr) ---
    t_price = getattr(target, 'price_eur', 0)
    t_surface = getattr(target, 'sqm', 0) 
    t_rooms = getattr(target, 'rooms', 0)
    t_neighborhood = getattr(target, 'neighborhood', None)
    
    # 2. Definim marjele de comparatie
    price_min = t_price * 0.8
    price_max = t_price * 1.2
    
    # Construim query-ul de baza
    query = db.query(models.Listing).filter(
        models.Listing.id != target.id,
        models.Listing.price_eur >= price_min,
        models.Listing.price_eur <= price_max
    )

    # Adaugam filtre optionale DOAR daca atributele exista în model
    if hasattr(models.Listing, 'rooms') and t_rooms > 0:
        query = query.filter(models.Listing.rooms == t_rooms)

    if hasattr(models.Listing, 'neighborhood') and t_neighborhood:
        query = query.filter(models.Listing.neighborhood == t_neighborhood)

    # Filtram dupa suprafata DOAR daca exista coloana 'sqm' în model și avem o valoare
    if hasattr(models.Listing, 'sqm') and t_surface > 0:
        surface_min = t_surface * 0.8
        surface_max = t_surface * 1.2
        query = query.filter(
            models.Listing.sqm >= surface_min,
            models.Listing.sqm <= surface_max
        )

    # Luam maxim 5 rezultate
    comparables = query.limit(5).all()
    
    print(f"CMA: Am gasit {len(comparables)} proprietati similare.")

    # 3. Generam PDF-ul
    file_path = generate_cma_report(target, comparables)
    
    return FileResponse(file_path, media_type='application/pdf', filename=f"CMA_Analiza.pdf")



@app.put("/agent/profile", response_model=schemas.AgentProfileCreate)
def update_my_agent_profile(
    profile_data: schemas.AgentProfileCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    token = authorization.split(" ")[1]
    user_id = str(supabase.auth.get_user(token).user.id)

    # Cautam profilul existent sau cream unul nou
    agent = db.query(models.AgentProfile).filter(models.AgentProfile.id == user_id).first()
    
    if not agent:
        agent = models.AgentProfile(id=user_id, **profile_data.dict())
        db.add(agent)
    else:
        agent.agency_name = profile_data.agency_name
        agent.phone_number = profile_data.phone_number
        agent.bio = profile_data.bio
        # agent.logo_url = ... (daca trimiti și logo)
    
    db.commit()
    db.refresh(agent)
    return agent


@app.get("/agent/check-status")
def check_is_agent(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: return {"is_agent": False}
    try:
        token = authorization.split(" ")[1]
        user_id = str(supabase.auth.get_user(token).user.id)
        agent = db.query(models.AgentProfile).filter(models.AgentProfile.id == user_id).first()
        return {"is_agent": agent is not None}
    except:
        return {"is_agent": False}
    

@app.put("/agent/profile", response_model=schemas.AgentProfileCreate)
def update_my_agent_profile(
    profile_data: schemas.AgentProfileCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    token = authorization.split(" ")[1]
    
    # Luam datele userului curent
    user_auth = supabase.auth.get_user(token)
    user_email = user_auth.user.email
    user_id = str(user_auth.user.id)

    agent = db.query(models.AgentProfile).filter(models.AgentProfile.id == user_id).first()
    
    # Cream sau Actualizam
    if not agent:
        agent = models.AgentProfile(id=user_id, **profile_data.dict())
        db.add(agent)
    else:
        agent.agency_name = profile_data.agency_name
        agent.phone_number = profile_data.phone_number
        agent.bio = profile_data.bio
        agent.cui = profile_data.cui
        agent.website = profile_data.website
        
        # --- VERIFICARE AUTOMATa (DOMAIN MATCH) ---
        # Verificam daca domeniul emailului corespunde cu site-ul agentiei
        
        is_verified_now = False
        
        if profile_data.website and user_email:
            # 1. Extragem domeniul din site (ex: https://www.nidus.ro/contact -> nidus.ro)
            extracted_site = tldextract.extract(profile_data.website)
            site_domain = f"{extracted_site.domain}.{extracted_site.suffix}" # "nidus.ro"
            
            # 2. Extragem domeniul din email (ex: alex@nidus.ro -> nidus.ro)
            if '@' in user_email:
                email_domain = user_email.split('@')[1]
                
                # 3. Lista domeniilor publice (care NU primesc verificare automata)
                public_domains = ['gmail.com', 'yahoo.com', 'yahoo.ro', 'outlook.com', 'icloud.com', 'hotmail.com']
                
                if email_domain not in public_domains:
                    if site_domain == email_domain:
                        is_verified_now = True
                        print(f"AUTO-VERIFICAT: {user_email} match cu {site_domain}")

        # Aplicam statusul
        if is_verified_now:
            agent.is_verified = True
        else:
            if not agent.is_verified: agent.is_verified = False 
        
    db.commit()
    db.refresh(agent)
    
    # Returnam obiectul și adaugam un flag custom în raspuns daca e verificat
    response_object = profile_data.dict()
    # Putem injecta is_verified în raspuns daca modificam schema de raspuns, 
    # dar frontend-ul va face redirect oricum.
    
    return response_object

# 3. Endpoint GET Profil (ca sa populam formularul când intra din nou)
@app.get("/agent/profile")
def get_my_agent_profile(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    token = authorization.split(" ")[1]
    user_id = str(supabase.auth.get_user(token).user.id)
    
    agent = db.query(models.AgentProfile).filter(models.AgentProfile.id == user_id).first()
    if not agent:
        return {} # Return empty JSON
    return agent


@app.post("/reviews", status_code=201)
def create_review(
    review_data: schemas.ReviewCreate,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    token = authorization.split(" ")[1]
    
    user_auth = supabase.auth.get_user(token)
    client_id = str(user_auth.user.id)

    # 1. Nu te poti nota singur
    if client_id == review_data.agent_id:
        raise HTTPException(400, detail="Nu îti poti lasa singur recenzie.")

    # --- 2. VERIFICARE DUPLICAT (COD NOU) ---
    # Cautam daca exista deja o recenzie de la acest client pentru acest agent
    existing_review = db.query(models.AgentReview).filter(
        models.AgentReview.agent_id == review_data.agent_id,
        models.AgentReview.client_id == client_id
    ).first()

    if existing_review:
        raise HTTPException(400, detail="Ai lasat deja o recenzie acestui agent.")
    # ----------------------------------------

    # 3. Salvam Recenzia (Codul existent)
    new_review = models.AgentReview(
        agent_id=review_data.agent_id,
        client_id=client_id,
        rating=review_data.rating,
        comment=review_data.comment
    )
    db.add(new_review)
    db.commit()

    # 3. RECALCULaM MEDIA AGENTULUI (CRITIC!)
    # Calculam media tuturor notelor acestui agent
    avg_data = db.query(func.avg(models.AgentReview.rating), func.count(models.AgentReview.id))\
                 .filter(models.AgentReview.agent_id == review_data.agent_id).first()
    
    new_rating = round(avg_data[0], 1) if avg_data[0] else 0.0
    total_reviews = avg_data[1]

    # Actualizam profilul agentului
    agent = db.query(models.AgentProfile).filter(models.AgentProfile.id == review_data.agent_id).first()
    if agent:
        agent.rating = new_rating
        # Daca ai coloana review_count în agent_profiles, o poti actualiza și pe aia
        # agent.review_count = total_reviews 
        db.commit()

    return {"message": "Recenzie salvata", "new_rating": new_rating}



@app.get("/agent/leads", response_model=List[schemas.LeadOut])
def get_agent_leads(
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    
    # 1. Obtinem ID-ul Agentului curent
    try:
        token = authorization.split(" ")[1]
        user_auth = supabase.auth.get_user(token)
        agent_id = str(user_auth.user.id)
    except:
        raise HTTPException(401, detail="Token invalid")

    # 2. Cautam conversatiile
    conversations = db.query(models.Conversation).filter(
        models.Conversation.seller_id == agent_id
    ).order_by(desc(models.Conversation.updated_at)).all()

    formatted_leads = []

    # Functie helper pentru a curata ID-urile (siguranta maxima)
    def normalize_id(uid):
        return str(uid).strip().lower().replace('"', '').replace("'", "")

    clean_agent_id = normalize_id(agent_id)

    for conv in conversations:

        buyer_profile = {}
        try:
            # Acum avem tabelul 'profiles', deci nu va mai da eroare!
            res = supabase.table("profiles").select("full_name, avatar_url").eq("id", str(conv.buyer_id)).execute()
            
            if res.data and len(res.data) > 0:
                buyer_profile = res.data[0]
        except Exception as e:
            print(f"Nu am gasit profil pt {conv.buyer_id}: {e}")

        # Setam datele
        client_name = buyer_profile.get("full_name") or f"Client #{str(conv.buyer_id)[:5]}"
        client_avatar = buyer_profile.get("avatar_url")

        # Luam ultimul mesaj
        last_msg = db.query(models.Message).filter(
            models.Message.conversation_id == conv.id
        ).order_by(desc(models.Message.created_at)).first()

        client_display = f"Client #{str(conv.buyer_id)[:5]}" 

        # --- LOGICa STATUS CORECTATa ---
        status = "CONTACTAT"
        preview_text = "Conversatie începuta"

        if last_msg:
            clean_sender_id = normalize_id(last_msg.sender_id)
            
            # Construim textul de preview
            if clean_sender_id == clean_agent_id:
                sender_name = "Tu"
            else:
                sender_name = client_name
            
            preview_text = f"{sender_name}: {last_msg.content}"

            # Determinam Statusul
            if clean_sender_id == clean_agent_id:
                # 1. Daca ultimul mesaj e trimis de MINE (Agent)
                status = "RaSPUNS"
            elif not last_msg.is_read:
                # 2. Daca e trimis de EL (Client) și e NECITIT
                status = "MESAJ NOU"
            else:
                # 3. Daca e trimis de EL (Client) și e CITIT
                status = "CONTACTAT"

        formatted_leads.append({
            "id": conv.id,
            "listing_id": conv.listing_id,
            "client_name": client_name,
            "client_avatar": client_avatar,
            "client_phone": "Vezi Chat", 
            "message": preview_text,
            "created_at": conv.updated_at if conv.updated_at else conv.created_at,
            "status": status
        })
    
    return formatted_leads

@app.put("/chat/conversations/{conversation_id}/read")
def mark_conversation_as_read(
    conversation_id: int,
    authorization: str = Header(None),
    db: Session = Depends(get_db)
):
    if not authorization: raise HTTPException(401)
    
    try:
        token = authorization.split(" ")[1]
        user_auth = supabase.auth.get_user(token)
        current_user_id = str(user_auth.user.id)
    except:
        raise HTTPException(401, detail="Token invalid")

    # 1. Identificam mesajele necitite care NU sunt ale mele
    # (Adica mesajele primite de la celalalt)
    messages_to_update = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id,
        models.Message.sender_id != current_user_id, # Mesaje primite
        models.Message.is_read == False # Doar cele necitite
    ).all()

    count = len(messages_to_update)

    # 2. Le actualizam manual (metoda sigura)
    for msg in messages_to_update:
        msg.is_read = True
    
    db.commit()
    
    return {"message": "Conversatie actualizata", "updated_count": count}

@app.get("/")
def read_root():
    return {"status": "API Running"}