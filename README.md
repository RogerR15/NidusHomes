# 🏡 NidusHomes - Intelligent Real Estate Aggregator

**NidusHomes** is a full-stack real estate platform designed to solve the fragmentation of the property market in Iași, Romania. It aggregates listings from major platforms (OLX, Storia), cleans the data, places them on an interactive map, and uses **AI (Perceptual Hashing)** to eliminate duplicate listings posted by different agencies.

![NidusHomes Map](./assets/NidusHomes_Snapshot_01.png)

## 🚀 Key Features

-   **🗺️ Interactive Map View:** Browse properties geographically using Leaflet/Mapbox.
-   **🤖 AI De-duplication:** Uses `imagehash` (pHash) to detect visually identical apartments across different ads and merges them (e.g., merging a €128k listing with a €650 rent listing correctly).
-   **🔄 Automated Data Pipeline:** A robust Python ETL pipeline scrapes, enriches, and cleans data 24/7.
-   **⚡ Real-time Updates:** Listings are updated continuously.
-   **📱 Modern UI/UX:** Built with Next.js 15, Tailwind CSS, and Infinite Scroll.
-   **💬 Chat System:** Real-time messaging between buyers and sellers/agents.
-   **🔐 Authentication:** Secure user management via Supabase Auth.

## 🛠️ Tech Stack

### Frontend
-   **Framework:** Next.js 15 (App Router)
-   **Styling:** Tailwind CSS
-   **Maps:** React Leaflet 
-   **State/Data:** Axios

### Backend & Data Engineering
-   **Language:** Python 3.10+
-   **API:** FastAPI
-   **Database:** PostgreSQL (via Supabase) & SQLAlchemy ORM
-   **Scraping:** Playwright, BeautifulSoup4, Curl_cffi
-   **Geocoding:** Geopy (Nominatim)
-   **Automation:** `schedule` library for orchestration

### Infrastructure
-   **Cloud/DB:** Supabase (PostgreSQL + Auth + Storage)
-   **Images:** Hosted on external CDNs, processed for hashing

---

## 🧠 The Data Pipeline

The core of NidusHomes is its automated backend pipeline that runs on a schedule:

1.  **🕵️ Scraper (`real_scraper.py`)**: Fetches raw data from target platforms. It handles anti-bot measures and inserts raw listings into the DB.
2.  **💎 Enricher (`enricher.py`)**: Visits individual listing pages to extract high-res images, full descriptions, and precise GPS coordinates.
3.  **🖼️ AI Processor (`processor_images.py`)**: 
    -   Downloads the main listing image.
    -   Calculates a **Perceptual Hash (pHash)**.
    -   Compares it against the database to find duplicates.
    -   **Smart Merge:** If a duplicate is found (same transaction type), it keeps the oldest/cheapest one active and marks the other as `INACTIVE`.
4.  **🧹 Janitor (`janitor.py`)**: Checks for 404s or "Sold" listings on source sites and deactivates them in our DB.
5.  **🎼 Automation (`automation.py`)**: Manages the schedule (e.g., Scrape at 08:00, 12:00, 18:00).

---

## ⚙️ Getting Started

### Prerequisites
-   Node.js 18+
-   Python 3.10+
-   A Supabase project

### 1. Backend Setup

```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\activate
# Mac/Linux
source venv/bin/activate

pip install -r requirements.txt

Create a `.env` file in `backend/`:

```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT].supabase.co:5432/postgres
ADMIN_USER_ID=your_admin_uuid
```

Run the pipeline manually or start the API:

```bash
# Start the API
uvicorn app.main:app --reload

# OR Run the automation
python automation.py
```

### 2. Frontend Setup

```bash
cd frontend
npm install
```

Create a `.env.local` file in `frontend/`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
NEXT_PUBLIC_API_URL=http://127.0.0.1:8000
```

Run the development server:

```bash
npm run dev
```

## 🗄️ Database Schema (Snippet)

The project uses a relational schema with Cascade Deletes to ensure data integrity.

- **Listings:** Stores property data, geometries (PostGIS), and image hashes.
- **AgentProfiles:** Linked via UUID to Auth Users.
- **Conversations/Messages:** Real-time chat system linked to Listings.
- **PriceHistory:** Tracks price changes over time.

## 🔮 Future Roadmap

- [x] Implement "Search by Radius" drawing on the map.
- [x] Add Price History charts for users.(demo data)
- [ ] Notifications system (Email/In-app) for saved searches.
- [ ] Mobile App (React Native).

## 🤝 Contributing

Contributions are welcome! Please open an issue or submit a pull request.

## 📄 License
This project is open-source.
