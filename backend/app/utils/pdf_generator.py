from fpdf import FPDF
import datetime
import os
import tempfile
import requests
from PIL import Image  
from io import BytesIO 
import qrcode

# COLOR PALETTE
COLOR_PRIMARY = (0, 0, 0)           # Pure Black
COLOR_SECONDARY = (28, 28, 30)      # Apple Dark Grey
COLOR_ACCENT = (0, 122, 255)        # Apple Blue
COLOR_BG = (255, 255, 255)          # Pure White
COLOR_BG_CARD = (250, 250, 250)     # Off-White
COLOR_TEXT = (29, 29, 31)           # Near Black
COLOR_TEXT_SECONDARY = (142, 142, 147)  # Medium Grey
COLOR_SUCCESS = (52, 199, 89)       # Apple Green
COLOR_WARNING = (255, 149, 0)       # Apple Orange
COLOR_DIVIDER = (229, 229, 234)     # Light Grey

class ApplePDF(FPDF):
    def __init__(self):
        super().__init__()
        self.font_registered = False
        self._register_fonts()
        self.set_auto_page_break(auto=True, margin=20)

        self.header_qr_path = None
        self.header_qr_link = None

    def _register_fonts(self):
        font_paths = [
            'DejaVuSans.ttf', 
            'arial.ttf',
            'C:\\Windows\\Fonts\\arial.ttf',
            '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
            '/System/Library/Fonts/Helvetica.ttc'
        ]
        
        for path in font_paths:
            if os.path.exists(path):
                try:
                    self.add_font('SystemFont', '', path, uni=True)
                    self.add_font('SystemFont', 'B', path, uni=True)
                    self.font_registered = True
                    break
                except:
                    continue

    def set_system_font(self, style='', size=12):
        if self.font_registered:
            self.set_font('SystemFont', style, size)
        else:
            self.set_font('Helvetica', style, size)

    def header(self):
        self.set_y(12)
        self.set_text_color(*COLOR_PRIMARY)
        self.set_system_font('B', 18)
        self.cell(0, 10, 'NidusHomes', 0, 1, 'L')
        self.set_draw_color(*COLOR_DIVIDER)
        self.set_line_width(0.3)
        self.line(10, self.get_y(), 50, self.get_y())
        self.set_line_width(0.2)
        self.ln(3)
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('', 8.5)
        self.cell(0, 4, 'MARKET ANALYSIS REPORT', 0, 1, 'L')
        self.set_y(12)
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('', 7.5)
        self.cell(0, 5, datetime.date.today().strftime("%B %d, %Y"), 0, 0, 'R')
        self.ln(20)

    def footer(self):
        self.set_y(-15)
        self.set_draw_color(*COLOR_DIVIDER)
        self.set_line_width(0.3)
        self.line(20, self.get_y()-3, 190, self.get_y()-3)
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('', 7)
        self.cell(85, 5, f'Page {self.page_no()}', 0, 0, 'L')
        self.cell(0, 5, f'{datetime.date.today().strftime("%B %d, %Y")}', 0, 0, 'R')

    def draw_section_header(self, title, subtitle=None):
        self.ln(5)
        self.set_text_color(*COLOR_PRIMARY)
        self.set_system_font('B', 20)
        self.cell(0, 10, title, 0, 1, 'L')
        if subtitle:
            self.set_text_color(*COLOR_TEXT_SECONDARY)
            self.set_system_font('', 11)
            self.cell(0, 6, subtitle, 0, 1, 'L')
        self.ln(8)

    def set_header_qr(self, url):
        """Generează QR-ul o singură dată și îl salvează pentru a fi folosit în header()"""
        if not url: return
        try:
            qr = qrcode.QRCode(box_size=10, border=0) # Border 0 pt integrare clean
            qr.add_data(url)
            qr.make(fit=True)
            img = qr.make_image(fill_color="black", back_color="white")

            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as tmp:
                img.save(tmp)
                self.header_qr_path = tmp.name
                self.header_qr_link = url
        except Exception as e:
            print(f"QR Error: {e}")

    # FUNCTIE PENTRU CROP IMAGINE 
    def _crop_and_save_image(self, img_data, target_w, target_h):
        """Taie imaginea (Center Crop) ca sa se potriveasca perfect in chenar fara deformare"""
        try:
            img = Image.open(BytesIO(img_data))
            
            # Convertim in RGB daca e PNG/RGBA
            if img.mode in ("RGBA", "P"):
                img = img.convert("RGB")

            # Calculam rapoartele
            target_ratio = target_w / target_h
            img_ratio = img.width / img.height

            if img_ratio > target_ratio:
                # Imaginea e prea lata : taiem din stânga si dreapta
                new_width = int(img.height * target_ratio)
                offset = (img.width - new_width) // 2
                img = img.crop((offset, 0, offset + new_width, img.height))
            else:
                # Imaginea e prea inalta : taiem de sus si jos
                new_height = int(img.width / target_ratio)
                offset = (img.height - new_height) // 2
                img = img.crop((0, offset, img.width, offset + new_height))

            # Salvam intr-un temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp_file:
                img.save(tmp_file, quality=90)
                return tmp_file.name
        except Exception as e:
            print(f"Error cropping image: {e}")
            return None
        

    def header(self):
        self.set_y(10)
        
        # 1. Logo & Brand (Stânga)
        self.set_text_color(*COLOR_PRIMARY)
        self.set_system_font('B', 18)
        self.cell(40, 10, 'NidusHomes', 0, 0, 'L')
        
        # 2. QR Code (Dreapta Sus)
        if self.header_qr_path:
            # QR Image (15x15mm)
            qr_size = 15
            qr_x = 180  # Aproape de marginea din dreapta (210 - 20 - 10)
            qr_y = 8    # Puțin mai sus
            
            # Desenăm QR-ul
            self.image(self.header_qr_path, x=qr_x, y=qr_y, w=qr_size, h=qr_size, link=self.header_qr_link)
            
            # Data (În stânga QR-ului)
            self.set_xy(135, 12) # Ajustăm poziția datei
            self.set_text_color(*COLOR_TEXT_SECONDARY)
            self.set_system_font('', 8)
            self.cell(40, 5, datetime.date.today().strftime("%B %d, %Y"), 0, 0, 'R')
            
        else:
            # Fallback dacă nu avem QR (Data în dreapta)
            self.set_y(12)
            self.set_text_color(*COLOR_TEXT_SECONDARY)
            self.set_system_font('', 8)
            self.cell(0, 5, datetime.date.today().strftime("%B %d, %Y"), 0, 0, 'R')

        # 3. Subtitlu & Linie (Sub logo)
        self.set_xy(10, 18) # Resetăm poziția sub logo
        self.set_draw_color(*COLOR_DIVIDER)
        self.set_line_width(0.3)
        self.line(10, 20, 50, 20) # Linie scurtă sub logo
        self.set_line_width(0.2)
        
        self.ln(3)
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('', 8.5)
        self.cell(0, 4, 'MARKET ANALYSIS REPORT', 0, 1, 'L')
        
        self.ln(10) # Spațiu după header


    def draw_featured_card(self, listing):
        start_y = self.get_y()
        card_height = 95
        
        listing_id = getattr(listing, 'id', None)
        base_url = "http://localhost:3000" 
        listing_url = f"{base_url}/listing/{listing_id}" if listing_id else (getattr(listing, 'listing_url', "") or getattr(listing, 'url', ""))

        # Background Card
        self.set_fill_color(248, 248, 250)
        self.rounded_rect(21.5, start_y + 2, 168, card_height, 5, 'F')
        self.set_fill_color(245, 245, 247)
        self.rounded_rect(21, start_y + 1.5, 168, card_height, 5, 'F')
        self.set_fill_color(*COLOR_BG)
        self.set_draw_color(*COLOR_DIVIDER)
        self.set_line_width(0.3)
        self.rounded_rect(20, start_y, 168, card_height, 5, 'DF')
        self.set_line_width(0.2)
        
        # IMAGINE
        img_url = getattr(listing, 'image_url', None)
        img_x = 26
        img_y = start_y + 10
        img_w = 95
        img_h = 75
        
        image_inserted = False
        
        if img_url:
            try:
                response = requests.get(img_url, stream=True, timeout=5)
                if response.status_code == 200:
                    # Folosim functia de crop
                    processed_img_path = self._crop_and_save_image(response.content, img_w, img_h)
                    
                    if processed_img_path:
                        self.rounded_rect(img_x, img_y, img_w, img_h, 4, 'F')
                        
                        if listing_url:
                            self.image(processed_img_path, x=img_x, y=img_y, w=img_w, h=img_h, link=listing_url)
                        else:
                            self.image(processed_img_path, x=img_x, y=img_y, w=img_w, h=img_h)
                        
                        os.remove(processed_img_path)
                        image_inserted = True
            except:
                pass
        
        if not image_inserted:
            self.set_fill_color(250, 250, 252)
            self.rounded_rect(img_x, img_y, img_w, img_h, 4, 'F')
            self.set_draw_color(220, 220, 224)
            self.set_xy(img_x, img_y + img_h/2 - 2)
            self.set_text_color(*COLOR_TEXT_SECONDARY)
            self.set_system_font('', 7)
            self.cell(img_w, 4, "No Image", 0, 0, 'C')

        # TEXT CONTENT 
        text_x = img_x + img_w + 14
        text_y = start_y + 10
        max_text_width = 55
        
        self.set_xy(text_x, text_y)
        self.set_text_color(*COLOR_PRIMARY)
        self.set_system_font('B', 12)
        title = getattr(listing, 'title', 'Untitled Property')
        if len(title) > 40: title = title[:37] + '...'
        
        if listing_url:
            self.set_text_color(0, 100, 200)
        self.multi_cell(max_text_width, 5, title, 0, 'L')
        self.ln(1)
        
        self.set_x(text_x)
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('', 8)
        address = getattr(listing, 'address', 'N/A')[:32]
        self.cell(max_text_width, 4, address, 0, 1)
        self.set_x(text_x)
        neighborhood = getattr(listing, 'neighborhood', 'N/A')[:30]
        self.cell(max_text_width, 4, neighborhood, 0, 1)
        self.ln(5)
        
        # Pills
        surface = getattr(listing, 'sqm', 0)
        rooms = getattr(listing, 'rooms', 0)
        pill_y = self.get_y()
        
        self.set_fill_color(245, 247, 250)
        self.set_draw_color(230, 232, 236)
        
        # Surface Pill
        self.set_x(text_x)
        self.rounded_rect(text_x, pill_y, 26, 7, 2, 'DF')
        self.set_text_color(*COLOR_TEXT)
        self.set_system_font('B', 7.5)
        self.set_xy(text_x, pill_y + 0.5)
        self.cell(26, 7, f"{surface} m²", 0, 0, 'C')
        
        # Rooms Pill
        self.set_x(text_x + 29)
        self.rounded_rect(text_x + 29, pill_y, 26, 7, 2, 'DF')
        self.set_xy(text_x + 29, pill_y + 0.5)
        self.cell(26, 7, f"{rooms} cam", 0, 1, 'C')
        self.ln(7)
        
        # Price
        price = getattr(listing, 'price_eur', 0)
        sqm_price = int(price / surface) if surface > 0 else 0
        self.set_x(text_x)
        self.set_text_color(*COLOR_PRIMARY)
        self.set_system_font('B', 20)
        self.cell(0, 9, f"{price:,.0f} €", 0, 1)
        self.set_x(text_x)
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('', 8)
        self.cell(0, 4, f"{sqm_price:,} €/m²", 0, 1)
        
        # Button
        if listing_url:
            self.ln(5)
            self.set_x(text_x)
            btn_width = 40
            btn_height = 8
            self.set_fill_color(*COLOR_ACCENT)
            self.rounded_rect(text_x, self.get_y(), btn_width, btn_height, 2, 'F')
            self.set_text_color(*COLOR_BG)
            self.set_system_font('B', 8)
            self.set_xy(text_x, self.get_y() + 2.5)
            self.cell(btn_width, 4, "VIEW ONLINE", 0, 0, 'C', link=listing_url)
        
        self.set_y(start_y + card_height + 15)

    def draw_comparable_row(self, comp, is_odd=False):
        row_height = 24
        start_y = self.get_y()
        
        if is_odd: self.set_fill_color(251, 252, 253)
        else: self.set_fill_color(255, 255, 255)
        self.rect(20, start_y, 168, row_height, 'F')
        
        # Thumbnail cu Crop
        img_url = getattr(comp, 'image_url', None)
        thumb_x = 26
        thumb_y = start_y + 4
        thumb_size = 16
        comp_id = getattr(comp, 'id', None)
        comp_url = f"http://localhost:3000/listing/{comp_id}" if comp_id else ""
        
        if img_url:
            try:
                response = requests.get(img_url, stream=True, timeout=3)
                if response.status_code == 200:
                    # Crop si la comparabile
                    processed_path = self._crop_and_save_image(response.content, thumb_size, thumb_size)
                    
                    self.set_fill_color(245, 245, 245)
                    self.rounded_rect(thumb_x, thumb_y, thumb_size, thumb_size, 2, 'F')
                    
                    if processed_path:
                        if comp_url:
                            self.image(processed_path, x=thumb_x, y=thumb_y, w=thumb_size, h=thumb_size, link=comp_url)
                        else:
                            self.image(processed_path, x=thumb_x, y=thumb_y, w=thumb_size, h=thumb_size)
                        os.remove(processed_path)
            except:
                self.set_fill_color(240, 240, 240)
                self.rounded_rect(thumb_x, thumb_y, thumb_size, thumb_size, 2, 'F')
        else:
            self.set_fill_color(240, 240, 240)
            self.rounded_rect(thumb_x, thumb_y, thumb_size, thumb_size, 2, 'F')
        
        # Detalii
        text_x = thumb_x + thumb_size + 8
        self.set_xy(text_x, start_y + 5)
        self.set_text_color(*COLOR_TEXT)
        self.set_system_font('', 9)
        title = str(getattr(comp, 'title', 'N/A'))[:38]
        if comp_url:
            self.set_text_color(0, 100, 200)
            self.cell(68, 6, title, 0, 0, 'L', link=comp_url)
        else:
            self.cell(68, 6, title, 0, 0, 'L')
        
        self.set_x(130)
        price = getattr(comp, 'price_eur', 0)
        sqm = getattr(comp, 'sqm', 0)
        self.set_text_color(*COLOR_PRIMARY)
        self.set_system_font('B', 9)
        self.cell(32, 6, f"{price:,} €", 0, 0, 'R')
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('', 8.5)
        self.cell(18, 6, f"{sqm} m²", 0, 0, 'R')
        
        sqm_price = int(price / sqm) if sqm > 0 else 0
        pill_x = self.get_x() + 2
        pill_width = 24
        self.set_fill_color(240, 247, 255)
        self.rounded_rect(pill_x, start_y + 6, pill_width, 6, 1.5, 'F')
        self.set_text_color(*COLOR_ACCENT)
        self.set_system_font('B', 8)
        self.set_x(pill_x)
        self.cell(pill_width, 6, f"{sqm_price} €/m²", 0, 1, 'C')
        
        self.set_draw_color(*COLOR_DIVIDER)
        self.set_line_width(0.2)
        self.line(26, start_y + row_height, 186, start_y + row_height)
        self.set_y(start_y + row_height)

    def draw_insight_card(self, estimated_value, avg_sqm, target_listing, valid_comps):
        start_y = self.get_y()
        card_height = 72
        
        self.set_fill_color(250, 250, 252)
        self.rounded_rect(21.5, start_y + 2.5, 168, card_height, 7, 'F')
        self.set_fill_color(252, 253, 255)
        self.rounded_rect(20, start_y, 168, card_height, 7, 'F')
        self.set_draw_color(235, 237, 242)
        self.set_line_width(0.5)
        self.rounded_rect(20.5, start_y + 0.5, 167, card_height - 1, 6.5, 'D')
        self.set_line_width(0.2)
        
        self.set_fill_color(0, 122, 255)
        self.rounded_rect(20, start_y, 168, 4, 7, 'F')
        self.set_fill_color(100, 170, 255)
        self.rounded_rect(20, start_y + 2, 168, 2, 0, 'F')
        
        self.set_y(start_y + 15)
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('B', 8)
        self.cell(0, 5, "E S T I M A T E D   M A R K E T   V A L U E", 0, 1, 'C')
        self.ln(1)
        self.set_text_color(*COLOR_PRIMARY)
        self.set_system_font('B', 32)
        self.cell(0, 14, f"{estimated_value:,.0f} EUR", 0, 1, 'C')
        self.set_text_color(*COLOR_TEXT_SECONDARY)
        self.set_system_font('', 8.5)
        self.cell(0, 5, f"Based on {valid_comps} comparable properties", 0, 1, 'C')
        self.ln(5)
        self.set_system_font('', 8)
        self.cell(0, 4, f"Market average: {avg_sqm} EUR/m2", 0, 1, 'C')
        self.ln(3)
        
        t_price = getattr(target_listing, 'price_eur', 0)
        diff = estimated_value - t_price
        diff_percent = (diff / t_price * 100) if t_price > 0 else 0
        
        if abs(diff) > 1000:
            pill_width = 130
            pill_height = 9
            pill_x = (210 - pill_width) / 2
            pill_y = self.get_y()
            if diff > 0:
                bg_c, txt_c, txt = (236, 253, 245), COLOR_SUCCESS, f"EUR {abs(diff):,.0f} below market ({abs(diff_percent):.1f}%)"
            else:
                bg_c, txt_c, txt = (255, 250, 240), COLOR_WARNING, f"EUR {abs(diff):,.0f} above market ({abs(diff_percent):.1f}%)"
            self.set_fill_color(*bg_c)
            self.rounded_rect(pill_x, pill_y, pill_width, pill_height, 2.5, 'F')
            self.set_text_color(*txt_c)
            self.set_system_font('B', 8)
            self.set_xy(pill_x, pill_y + 1)
            self.cell(pill_width, pill_height, txt, 0, 1, 'C')
        self.set_y(start_y + card_height + 12)

    def rounded_rect(self, x, y, w, h, r, style=''):
        k = self.k
        hp = self.h
        if style: op = 'B' if 'FD' in style or 'DF' in style else ('F' if 'F' in style else 'S')
        else: op = 'S'
        my_arc = 4/3 * (2**0.5 - 1)
        self._out('%.2f %.2f m' % ((x+r)*k, (hp-y)*k))
        xc = x+w-r
        yc = y+r
        self._out('%.2f %.2f l' % (xc*k, (hp-y)*k))
        self._arc(xc + r*my_arc, yc - r, xc + r, yc - r*my_arc, xc + r, yc)
        xc = x+w-r
        yc = y+h-r
        self._out('%.2f %.2f l' % ((x+w)*k, (hp-yc)*k))
        self._arc(xc + r, yc + r*my_arc, xc + r*my_arc, yc + r, xc, yc + r)
        xc = x+r
        yc = y+h-r
        self._out('%.2f %.2f l' % (xc*k, (hp-(y+h))*k))
        self._arc(xc - r*my_arc, yc + r, xc - r, yc + r*my_arc, xc - r, yc)
        xc = x+r
        yc = y+r
        self._out('%.2f %.2f l' % ((x)*k, (hp-yc)*k))
        self._arc(xc - r, yc - r*my_arc, xc - r*my_arc, yc - r, xc, yc - r)
        self._out(op)
    
    def _arc(self, x1, y1, x2, y2, x3, y3):
        h = self.h
        self._out('%.2f %.2f %.2f %.2f %.2f %.2f c' % (x1*self.k, (h-y1)*self.k, x2*self.k, (h-y2)*self.k, x3*self.k, (h-y3)*self.k))

def generate_cma_report(target_listing, comparables):
    valid_comps = 0
    total_sqm_price = 0
    pdf = ApplePDF()

    listing_id = getattr(target_listing, 'id', None)
    base_url = "http://localhost:3000"
    target_url = f"{base_url}/listing/{listing_id}" if listing_id else (getattr(target_listing, 'listing_url', "") or "")
    
    if target_url:
        pdf.set_header_qr(target_url) 

    pdf.add_page()

    pdf.draw_section_header("Subject Property", "Primary analysis target")
    pdf.draw_featured_card(target_listing)
    pdf.draw_section_header("Market Comparables", f"{len(comparables)} similar properties")
    
    if comparables:
        pdf.set_fill_color(*COLOR_BG_CARD)
        pdf.rect(20, pdf.get_y(), 168, 10, 'F')
        pdf.set_text_color(*COLOR_TEXT_SECONDARY)
        pdf.set_system_font('B', 8)
        header_y = pdf.get_y() + 3
        pdf.set_xy(47, header_y)
        pdf.cell(70, 4, "PROPERTY", 0, 0, 'L')
        pdf.cell(30, 4, "PRICE", 0, 0, 'R')
        pdf.cell(20, 4, "SIZE", 0, 0, 'R')
        pdf.cell(25, 4, "PRICE/M2", 0, 1, 'R')
        pdf.ln(2)
        pdf.set_draw_color(*COLOR_DIVIDER)
        pdf.line(20, pdf.get_y(), 188, pdf.get_y())
        pdf.ln(1)
        for idx, comp in enumerate(comparables):
            c_price = getattr(comp, 'price_eur', 0)
            c_surface = getattr(comp, 'sqm', 0)
            if c_surface > 0:
                total_sqm_price += (c_price / c_surface)
                valid_comps += 1
            pdf.draw_comparable_row(comp, is_odd=(idx % 2 == 0))
    else:
        pdf.set_text_color(*COLOR_TEXT_SECONDARY)
        pdf.cell(0, 10, "No comparable properties found", 0, 1, 'C')
    
    pdf.ln(12)
    if valid_comps > 0:
        avg_sqm = int(total_sqm_price / valid_comps)
        t_surface = getattr(target_listing, 'sqm', 0)
        estimated = avg_sqm * t_surface
        pdf.draw_insight_card(estimated, avg_sqm, target_listing, valid_comps)
    else:
        pdf.cell(0, 10, "Insufficient data for market valuation", 0, 1, 'C')

    temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf")
    pdf.output(temp_file.name)
    return temp_file.name