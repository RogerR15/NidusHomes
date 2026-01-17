'use client';
import { useEffect, useState, useMemo } from 'react';
import axios from 'axios';
import ListingCard from '@/components/ListingCard';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/FilterBar';

// Import dinamic pentru hartă pentru a evita erorile de SSR (Server Side Rendering)
const MapView = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />
});

interface Listing {
  id: number;
  title: string;
  price: number;
  price_eur?: number;
  sqm: number;
  neighborhood: string;
  source_platform: string;
  image_url?: string;
  latitude?: number;
  longitude?: number;
  // Add any other fields your API returns
}

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Starea pentru filtre - similar cu interfața Zillow
  const [filters, setFilters] = useState({
    searchTerm: '',
    minPrice: '',
    maxPrice: '',
    minSqm: '',
    maxSqm: ''
  });

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/listings')
      .then(res => {
        const sanitized = res.data.map((l: any) => ({
          ...l,
          price: l.price_eur || l.price || 0
        }));
        setListings(sanitized);
        setLoading(false);
      })
      .catch(err => {
        console.error("Eroare la incarcarea datelor:", err);
        setLoading(false);
      });
  }, []);

  // Logica de filtrare - se execută ori de câte ori se schimbă listings sau filtrele
  const filteredListings = useMemo(() => {
    return listings.filter(listing => {
      // 1. Filtru Text (Titlu sau Cartier)
      if (filters.searchTerm) {
        const term = filters.searchTerm.toLowerCase();
        const titleMatch = listing.title?.toLowerCase().includes(term);
        const neighMatch = listing.neighborhood?.toLowerCase().includes(term);
        if (!titleMatch && !neighMatch) return false;
      }

      // 2. Filtru Preț
      const price = listing.price_eur || listing.price || 0;
      if (filters.minPrice && price < Number(filters.minPrice)) return false;
      if (filters.maxPrice && price > Number(filters.maxPrice)) return false;

      // 3. Filtru Suprafață (Mp)
      const sqm = listing.sqm || 0;
      if (filters.minSqm && sqm < Number(filters.minSqm)) return false;
      if (filters.maxSqm && sqm > Number(filters.maxSqm)) return false;

      return true;
    });
  }, [listings, filters]);

  if (loading) return (
    <div className="h-screen w-full flex items-center justify-center bg-white text-blue-600 font-bold">
      Se încarcă proprietățile din Iași...
    </div>
  );

  return (
    // Container principal: Flex pe coloană pentru a pune FilterBar sus
    <main className="flex flex-col h-screen w-full overflow-hidden bg-white">

      {/* 1. Bara de Filtre (Sus) */}
      <FilterBar filters={filters} setFilters={setFilters} />

      {/* 2. Zona de Conținut (Jos) - împărțită în Sidebar și Hartă */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar - Lista de anunțuri */}
        <div className="w-112.5 min-w-112.5 h-full overflow-y-auto border-r border-gray-200 bg-white z-20 shadow-lg">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
            <h2 className="font-bold text-lg text-gray-800">Rezultate în Iași</h2>
            <span className="text-sm font-semibold text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
              {filteredListings.length} proprietăți
            </span>
          </div>

          <div className="flex flex-col gap-1 p-2">
            {filteredListings.length === 0 ? (
              <div className="text-center py-20">
                <p className="text-gray-500 font-medium">Nu am găsit nicio proprietate conform filtrelor.</p>
                <button
                  onClick={() => setFilters({ searchTerm: '', minPrice: '', maxPrice: '', minSqm: '', maxSqm: '' })}
                  className="mt-4 text-blue-600 font-bold hover:underline"
                >
                  Resetează filtrele
                </button>
              </div>
            ) : (
              filteredListings.map((l: any) => (
                <div
                  key={l.id}
                  onClick={() => setActiveId(l.id)}
                  className={`p-2 transition-all duration-200 ${activeId === l.id ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                >
                  <div className={`rounded-xl overflow-hidden transition-all ${activeId === l.id ? 'ring-2 ring-blue-500 shadow-md' : ''
                    }`}>
                    <ListingCard listing={l} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Harta - Ocupă restul spațiului */}
        <div className="flex-1 h-full relative">
          {/* Folosim filteredListings pentru a afișa pe hartă doar ce este filtrat */}
          <MapView
            listings={filteredListings}
            activeId={activeId}
            setActiveId={setActiveId}
          />
        </div>
      </div>
    </main>
  );
}