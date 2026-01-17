from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# URL-ul tău de conexiune
SQLALCHEMY_DATABASE_URL = "postgresql://postgres.eakipgzjwfuzoynimxik:askias150R*@aws-1-eu-west-1.pooler.supabase.com:6543/postgres"

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# ACEASTA LINIE LIPSEA: Este fundamentul pentru toate modelele tale
Base = declarative_base()

# Dependency pentru FastAPI
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()