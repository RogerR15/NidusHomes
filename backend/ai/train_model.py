import pandas as pd
from sqlalchemy import create_engine
import os
from dotenv import load_dotenv
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.compose import ColumnTransformer
from sklearn.pipeline import Pipeline
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, r2_score
import joblib
import json

# Încărcare variabile mediu
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env'))

def get_ai_condition(tags_val):
    """
    Extrage condiția (lux, renovat) din coloana ai_tags.
    Gestionează cazurile când e String, Dict sau Null.
    """
    if not tags_val:
        return "standard"
    
    try:
        data = tags_val
        # Dacă baza de date returnează string (JSON text), îl parsam
        if isinstance(tags_val, str):
            data = json.loads(tags_val)
            
        # Dacă e dicționar
        if isinstance(data, dict):
            return data.get('top_tag', 'standard')
            
        return "standard"
    except:
        return "standard"

def train_price_predictor():
    print("\n🔌 Conectare la baza de date...")
    db_url = os.getenv("DATABASE_URL")
    if not db_url:
        print("❌ Eroare: DATABASE_URL lipsă.")
        return

    try:
        engine = create_engine(db_url)
        
        # 1. SELECT DETALIAT
        # IMPORTAM CRUCIAL: compartmentation și ai_tags
        query = """
            SELECT price_eur, sqm, rooms, floor, year_built, neighborhood, compartmentation, ai_tags
            FROM listings 
            WHERE status = 'ACTIVE' 
              AND transaction_type = 'SALE'
              AND price_eur > 15000 
              AND price_eur < 500000
              AND sqm > 15 
              AND sqm < 300
        """
        df = pd.read_sql(query, engine)
        print(f"📊 Date brute încărcate: {len(df)} anunțuri.")

        if len(df) < 20:
            print("⚠️ Prea puține date. Mai lasă scraper-ul și AI-ul să ruleze.")
            return

        # 2. FEATURE ENGINEERING (Pregătirea Datelor)
        
        # A. Extragem "Condiția" din AI Tags (Aici e secretul scorului bun!)
        print("   -> Procesez etichetele AI...")
        df['condition'] = df['ai_tags'].apply(get_ai_condition)
        
        # B. Curățare Compartimentare (Decomandat vs Nedecomandat contează mult la preț)
        df['compartmentation'] = df['compartmentation'].fillna('nedecomandat').str.lower()
        
        # C. Curățare Cartier
        df['neighborhood'] = df['neighborhood'].fillna('iasi').str.lower()

        # D. Curățare An (0 devine NaN)
        df['year_built'] = df['year_built'].replace(0, None)

        # E. Curățare Etaj (Parter=0, Demisol=-1)
        # Ne asigurăm că e numeric
        df['floor'] = pd.to_numeric(df['floor'], errors='coerce').fillna(1) # Presupunem etaj 1 dacă lipsește

        print(f"🧹 Date pregătite: {len(df)} rânduri.")

        # 3. DEFINIRE PIPELINE AI
        
        # Variabile Numerice
        numeric_features = ['sqm', 'rooms', 'floor', 'year_built']
        
        # Variabile Categorice (Text care devine numere)
        # ACUM INCLUDEM: condition (AI) și compartmentation
        categorical_features = ['neighborhood', 'compartmentation', 'condition']

        # Procesare Numerică
        numeric_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='median')), # Umple golurile cu mediana
            ('scaler', StandardScaler()) # Aduce numerele la scară comună
        ])

        # Procesare Categorică
        categorical_transformer = Pipeline(steps=[
            ('imputer', SimpleImputer(strategy='constant', fill_value='unknown')),
            ('onehot', OneHotEncoder(handle_unknown='ignore', sparse_output=False))
        ])

        # Asamblare
        preprocessor = ColumnTransformer(
            transformers=[
                ('num', numeric_transformer, numeric_features),
                ('cat', categorical_transformer, categorical_features)
            ])

        # Model: Random Forest (Mai puternic, 200 de arbori)
        model = Pipeline(steps=[
            ('preprocessor', preprocessor),
            ('regressor', RandomForestRegressor(n_estimators=200, random_state=42))
        ])

        # 4. ANTRENARE & EVALUARE
        X = df[numeric_features + categorical_features] # Folosim noile coloane
        y = df['price_eur']

        X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

        print("🧠 Antrenare model (învăț din poze și specificații)...")
        model.fit(X_train, y_train)

        # Evaluare
        y_pred = model.predict(X_test)
        r2 = r2_score(y_test, y_pred)
        mae = mean_absolute_error(y_test, y_pred)

        print("-" * 40)
        print(f"✅ REZULTATE ANTRENARE:")
        print(f"   Acuratețe (R2): {r2:.2f}")
        print(f"   Eroare Medie: ±{int(mae)} €")
        print("-" * 40)

        # 5. SALVARE
        save_path = os.path.join(os.path.dirname(__file__), 'price_model.joblib')
        joblib.dump(model, save_path)
        print(f"💾 Model salvat în: {save_path}")

    except Exception as e:
        print(f"❌ Eroare critică: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    train_price_predictor()