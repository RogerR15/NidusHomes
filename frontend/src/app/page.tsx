'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import ListingCard from '@/components/ListingCard';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/FilterBar'; // Componenta Zillow-style
import Navbar from '@/components/Navbar';
import { Listing } from '@/types';

// Import dinamic hartă
const MapView = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400">Se încarcă harta...</div>
});

export default function Home() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // --- 1. Funcția de Căutare pe Server (Backend Filtering) ---
  const fetchListings = async (filters: any = {}) => {
    setLoading(true);
    try {
      // Construim parametrii pentru URL
      const params = new URLSearchParams();

      // Mapăm filtrele din Frontend la ce așteaptă Backend-ul (main.py)
      if (filters.transaction_type) params.append('transaction_type', filters.transaction_type);
      if (filters.min_price) params.append('min_price', filters.min_price);
      if (filters.max_price) params.append('max_price', filters.max_price);
      if (filters.rooms_min) params.append('rooms_min', filters.rooms_min);
      if (filters.neighborhood) params.append('neighborhood', filters.neighborhood);

      // Apelăm API-ul
      const res = await axios.get(`http://127.0.0.1:8000/listings?${params.toString()}`);

      // Procesăm datele (backend-ul trimite snake_case, frontend-ul uneori vrea camelCase, dar aici folosim direct ce vine)
      setListings(res.data);
    } catch (error) {
      console.error("Eroare la fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. Încărcare Inițială ---
  useEffect(() => {
    // Pornim implicit cu vânzări
    fetchListings({ transaction_type: 'SALE' });
  }, []);

  return (
    <main className="flex flex-col h-screen w-full bg-white font-sans overflow-hidden">

      {/* Navbar */}
      <Navbar />

      {/* --- FilterBar (Sticky sub Navbar) --- */}
      <div className="z-40 border-b border-gray-200 shadow-sm bg-white">
        {/* Aici conectăm FilterBar la funcția fetchListings prin prop-ul onFilter */}
        <FilterBar onFilter={(newFilters) => fetchListings(newFilters)} />
      </div>

      {/* --- Zona Principală (Split View) --- */}
      <div className="flex flex-1 overflow-hidden relative">

        {/* A. Lista (Sidebar Stânga) */}
        <div className="w-105 h-full overflow-y-auto border-r border-gray-200 bg-white z-20 shadow-xl hidden lg:flex flex-col">

          {/* Header Listă */}
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="font-bold text-lg text-gray-800">Rezultate</h2>
              <p className="text-xs text-gray-500">Iași, România</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {listings.length} proprietăți
            </span>
          </div>

          {/* Lista efectivă */}
          <div className="flex-1 p-2 space-y-2">
            {loading ? (
              // Skeleton Loading
              [1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl mx-2" />)
            ) : listings.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-gray-500 mb-2">Nu am găsit anunțuri pentru filtrele selectate.</p>
                <button
                  onClick={() => fetchListings({ transaction_type: 'SALE' })}
                  className="text-blue-600 font-bold hover:underline text-sm"
                >
                  Resetează Căutarea
                </button>
              </div>
            ) : (
              listings.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setActiveId(l.id)}
                  className={`cursor-pointer transition-all duration-200 rounded-xl border ${activeId === l.id
                    ? 'border-blue-500 bg-blue-50 shadow-md ring-1 ring-blue-500'
                    : 'border-transparent hover:bg-gray-50 hover:border-gray-200'
                    }`}
                >
                  <ListingCard listing={l} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* B. Harta (Dreapta) */}
        <div className="flex-1 relative bg-gray-100 z-1">
          <MapView
            listings={listings}
            activeId={activeId}
            setActiveId={setActiveId}
          />

          {/* Indicator Loading pe Hartă */}
          {loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-1000 flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold text-blue-600">Se actualizează...</span>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}