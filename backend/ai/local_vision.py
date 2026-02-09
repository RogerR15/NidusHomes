from PIL import Image
import requests
from io import BytesIO
import torch
from transformers import CLIPProcessor, CLIPModel

print("Incarcare model Vision (CLIP)...")
model = CLIPModel.from_pretrained("openai/clip-vit-base-patch32")
processor = CLIPProcessor.from_pretrained("openai/clip-vit-base-patch32")

def analyze_image_local(image_source):
    try:
        # Incarcare Imagine
        if str(image_source).startswith("http"):
            response = requests.get(image_source, timeout=5)
            image = Image.open(BytesIO(response.content))
        else:
            image = Image.open(image_source)

        # CE CAMERA ESTE?
        # Lista extinsa de tipuri de camere
        room_labels = [
            "living room interior",
            "bedroom interior",
            "kitchen interior",
            "bathroom interior",
            "hallway or corridor",
            "balcony or terrace",
            "building exterior facade",
            "floor plan sketch"  
        ]
        
        inputs_room = processor(text=room_labels, images=image, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_room = model(**inputs_room)
        
        # Aflam cea mai probabila camera
        probs_room = outputs_room.logits_per_image.softmax(dim=1)[0]
        best_room_idx = probs_room.argmax().item()
        detected_room = room_labels[best_room_idx]
        room_score = float(probs_room[best_room_idx])

        # CARE ESTE STAREA EI? 
        # Lista extinsa de conditii/finisaje
        condition_labels = [
            # --- LUX & MODERN ---
            "luxury interior design with premium materials and lighting",   # Lux veritabil
            "modern minimalist apartment with new furniture",               # Modern (stil IKEA/Corporate)
            
            # --- STANDARD & RENOVAT ---
            "recently renovated apartment with white walls and laminate",   # Renovat recent (proaspăt)
            "clean apartment with older classic furniture",                 # "Bătrânesc" dar curat/îngrijit
            
            # --- VECHI / NECESITĂ INVESTIȚIE ---
            "dated communist era apartment interior",                       # Mobilă foarte veche, covoare persane
            "dirty or damaged interior needing full renovation",            # Cazatură / Necesită renovare totală
            
            # --- CONSTRUCȚIE / GOL ---
            "unfinished apartment construction grey stage concrete walls",  # La gri (foarte comun în blocurile noi)
            "empty renovated room with white walls and parquet",            # Gol, gata de mutat
            "empty room needing renovation old floor",                      # Gol, dar vechi
            
            # --- PROBLEME ---
            "messy room with clutter",                                      # Dezordine (scade scorul vizual)
            "blueprint floor plan sketch"                                   # Schiță (ca să nu o confundăm cu o cameră)
        ]

        inputs_cond = processor(text=condition_labels, images=image, return_tensors="pt", padding=True)
        with torch.no_grad():
            outputs_cond = model(**inputs_cond)
            
        probs_cond = outputs_cond.logits_per_image.softmax(dim=1)[0]
        best_cond_idx = probs_cond.argmax().item()
        detected_condition = condition_labels[best_cond_idx]
        cond_score = float(probs_cond[best_cond_idx])

        # CONSTRUIRE REZULTAT FINAL
        # Simplificam output-ul pentru baza de date
        
        final_tag = "standard"
        
        # 1. LUX & MODERN
        if "luxury" in detected_condition: 
            final_tag = "luxury"
        elif "modern" in detected_condition: 
            final_tag = "modern"
            
        # 2. RENOVAT
        elif "recently renovated" in detected_condition: 
            final_tag = "renovated"
        elif "empty renovated" in detected_condition:
            final_tag = "renovated_empty"
            
        # 3. VECHI / STANDARD
        elif "clean apartment" in detected_condition: 
            final_tag = "old_but_clean" # Important pt chirii studenți
        elif "communist" in detected_condition: 
            final_tag = "old_dated"
            
        # 4. NECESITĂ RENOVARE
        elif "damaged" in detected_condition or "needing renovation" in detected_condition: 
            final_tag = "fixer-upper"
            
        # 5. CONSTRUCȚIE
        elif "unfinished" in detected_condition or "grey stage" in detected_condition: 
            final_tag = "construction"
            
        # 6. SCHIȚĂ
        elif "blueprint" in detected_condition or "sketch" in detected_room: 
            final_tag = "sketch"

        return {
            "room_type": detected_room,
            "condition_detail": detected_condition, # Fraza lungă (o păstrăm pt debug)
            "top_tag": final_tag,                   # Tag scurt pt baza de date
            "scores": {
                "room": room_score,
                "condition": cond_score
            }
        }

    except Exception as e:
        print(f"Vision Error: {e}")
        return None
