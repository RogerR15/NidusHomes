from app.database import engine
from app import models

print("Cream tabelele in baza de date...")

models.Base.metadata.create_all(bind=engine)
print("Gata!")