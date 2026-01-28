from fpdf import FPDF
import datetime
import os
import tempfile

class PDF(FPDF):
    def header(self):
        # Încercăm să folosim fontul cu diacritice dacă a fost înregistrat
        try:
            self.set_font('ArialRo', 'B', 16)
        except:
            self.set_font('Arial', 'B', 16)
            
        self.set_text_color(0, 102, 204) # Albastru
        self.cell(0, 10, 'NidusHomes Market Analysis', 0, 1, 'C')
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font('Arial', 'I', 8) # Footerul e safe (fara diacritice speciale in textul de jos)
        self.set_text_color(128)
        self.cell(0, 10, f'Pagina {self.page_no()} | Generat la {datetime.date.today()}', 0, 0, 'C')

def generate_cma_report(target_listing, comparables):
    pdf = PDF()
    
    # --- FIX CRITIC PENTRU DIACRITICE (UNICODE) ---
    # FPDF are nevoie de un font extern (.ttf) pentru a randa ș, ț, ă, î.
    # Folosim Arial din Windows.
    font_path = 'C:\\Windows\\Fonts\\arial.ttf'
    
    if os.path.exists(font_path):
        # Înregistrăm fontul cu suport Unicode (uni=True)
        pdf.add_font('ArialRo', '', font_path, uni=True)
        pdf.add_font('ArialRo', 'B', font_path, uni=True) # Varianta Bold (teoretic ar trebui arialbd.ttf, dar merge si asa pt simplificare)
        
        # Setăm fontul principal
        main_font = 'ArialRo'
    else:
        # Fallback dacă nu suntem pe Windows sau nu găsim fontul
        print("⚠️ ATENȚIE: Nu am găsit fontul Arial. Diacriticele ar putea da erori.")
        main_font = 'Arial'

    pdf.add_page()
    pdf.set_font(main_font, size=12)
    
    # --- 1. DETALII PROPRIETATE SUBIECT ---
    pdf.set_fill_color(240, 245, 255) # Albastru deschis
    pdf.rect(10, 30, 190, 45, 'F') # Mărit puțin dreptunghiul
    
    # Folosim getattr pentru siguranță
    t_title = getattr(target_listing, 'title', 'Fara Titlu')
    t_address = getattr(target_listing, 'address', 'Adresa lipsa')
    t_price = getattr(target_listing, 'price_eur', 0)
    t_surface = getattr(target_listing, 'surface', 0) # Default 0 ca să nu crape
    t_rooms = getattr(target_listing, 'rooms', 0)
    t_neighborhood = getattr(target_listing, 'neighborhood', 'N/A')
    
    # Calcul preț/mp (evităm împărțirea la zero)
    t_price_sqm = int(t_price / t_surface) if t_surface and t_surface > 0 else 0

    pdf.set_y(35)
    pdf.set_font(main_font, 'B', 14) # Folosim 'B' (Bold) doar dacă avem fontul înregistrat corect
    # SAU simulăm bold prin mărirea fontului dacă folosim același fișier ttf
    
    pdf.cell(0, 10, f"Proprietatea Analizata (Subiect)", 0, 1, 'C')
    
    pdf.set_font(main_font, size=12)
    # Folosim encode('latin-1', 'replace') doar ca ultimă soluție, dar cu fontul 'ArialRo' nu e nevoie.
    # Scriem direct textul:
    pdf.cell(0, 8, f"Titlu: {t_title}", 0, 1, 'C')
    pdf.cell(0, 8, f"Pret Cerut: {t_price:,} EUR  ({t_price_sqm} EUR/mp)", 0, 1, 'C')
    pdf.cell(0, 8, f"Detalii: {t_surface} mp | {t_rooms} Camere | Zona: {t_neighborhood}", 0, 1, 'C')
    pdf.cell(0, 8, f"Adresa: {t_address}", 0, 1, 'C')
    
    pdf.ln(15)

    # --- 2. LISTA COMPARABILELOR (PIATA) ---
    pdf.set_font(main_font, '', 12) # Resetare la normal (fara Bold)
    pdf.cell(0, 10, f"Comparatie cu piata ({len(comparables)} proprietati similare):", 0, 1)
    
    if not comparables:
        pdf.set_text_color(200, 0, 0)
        pdf.cell(0, 10, "Nu s-au gasit alte proprietati similare in baza de date.", 0, 1)
        pdf.set_text_color(0)
    else:
        # Header Tabel
        pdf.set_font(main_font, '', 10)
        pdf.set_fill_color(200, 200, 200)
        
        # Celulele tabelului
        pdf.cell(80, 10, "Proprietate", 1, 0, 'L', 1)
        pdf.cell(30, 10, "Pret", 1, 0, 'C', 1)
        pdf.cell(30, 10, "Suprafata", 1, 0, 'C', 1)
        pdf.cell(40, 10, "Pret/mp", 1, 1, 'C', 1)
        
        pdf.set_font(main_font, size=10)
        
        total_sqm_price = 0
        valid_comps = 0
        
        for comp in comparables:
            c_title = getattr(comp, 'title', 'N/A')
            c_price = getattr(comp, 'price_eur', 0)
            c_surface = getattr(comp, 'surface', 0)
            
            c_sqm_price = int(c_price / c_surface) if c_surface and c_surface > 0 else 0
            if c_sqm_price > 0:
                total_sqm_price += c_sqm_price
                valid_comps += 1

            # Trunchiem titlul lung
            title_display = str(c_title)[:35] + "..." if len(str(c_title)) > 35 else str(c_title)

            pdf.cell(80, 10, title_display, 1)
            pdf.cell(30, 10, f"{c_price:,} E", 1, 0, 'C')
            pdf.cell(30, 10, f"{c_surface} mp", 1, 0, 'C')
            pdf.cell(40, 10, f"{c_sqm_price} E/mp", 1, 1, 'C')
            
        pdf.ln(10)
        
        # --- 3. CONCLUZII ---
        if valid_comps > 0:
            avg_sqm = int(total_sqm_price / valid_comps)
            # Dacă ținta are suprafață 0, nu putem estima
            if t_surface > 0:
                suggested_price = avg_sqm * t_surface
                
                pdf.set_font(main_font, '', 14)
                pdf.cell(0, 10, "Concluzia Analizei:", 0, 1)
                
                pdf.set_font(main_font, size=12)
                pdf.write(8, f"Pretul mediu in zona pentru proprietati similare este de {avg_sqm} EUR/mp.\n")
                
                pdf.write(8, f"Pe baza acestor date, valoarea estimata a proprietatii tale este:\n")
                
                pdf.set_font(main_font, '', 16)
                pdf.set_text_color(0, 100, 0) # Verde
                pdf.cell(0, 15, f"~ {suggested_price:,} EUR", 0, 1)
                pdf.set_text_color(0)
                
                diff = suggested_price - t_price
                pdf.set_font(main_font, size=12)
                if diff > 0:
                    pdf.cell(0, 10, f"(Esti sub pretul pietei cu {abs(diff):,} EUR - Oportunitate!)", 0, 1)
                elif diff < 0:
                    pdf.cell(0, 10, f"(Esti peste pretul pietei cu {abs(diff):,} EUR)", 0, 1)
                else:
                    pdf.cell(0, 10, "(Pretul este exact la media pietei)", 0, 1)

    # Salvare
    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    temp_path = temp_file.name # Calea completă (ex: C:\Users\X\AppData\Local\Temp\tmp123.pdf)
    
    pdf.output(temp_path)
    
    # Returnăm calea completă către fișierul temporar
    return temp_path