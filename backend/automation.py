import schedule
import time
import subprocess
import datetime

def run_pipeline():
    print(f"\nPORNIRE CICLU AUTOMAT: {datetime.datetime.now()}")

    # 1. Rulam SCRAPER (aduce date noi)
    print("1. Pornire Scraper...")
    subprocess.run(["python", "real_scraper.py"])
    
    # 2. Rulam ENRICHER (aduce detalii extra)
    print("2. Pornire Enricher...")
    subprocess.run(["python", "enricher.py"])

    # 3. Rulam PROCESSOR (scoate duplicatele)
    # Putem sa-l rulam de 2-3 ori ca sa fim siguri ca a terminat tot, daca sunt multe
    print("3. Pornire Image Processor...")
    subprocess.run(["python", "processor_images.py"])
    
    print(f"CICLU FINALIZAT: {datetime.datetime.now()}\n")

def run_janitor_job():
    print("\nPORNIRE CURATENIE")
    subprocess.run(["python", "janitor.py"])
    print("CURATENIE FINALIZATA\n")


# CONFIGURARE 

# La intervale (ex: la fiecare 2 ore)
# schedule.every(2).hours.do(run_pipeline)

# La ore fixe 
schedule.every().day.at("08:00").do(run_pipeline)
schedule.every().day.at("12:00").do(run_pipeline)
schedule.every().day.at("18:00").do(run_pipeline)
schedule.every().day.at("22:00").do(run_pipeline)

# Janitorul ruleaza o singura data, noaptea
schedule.every().day.at("04:00").do(run_janitor_job)

# Rulare imediata la pornire 
run_pipeline()

print("Automation ON. Astept ora programata...")

while True:
    schedule.run_pending()
    time.sleep(60) # Verifica minut de minut