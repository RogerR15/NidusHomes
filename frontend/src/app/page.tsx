'use client';
import { useEffect, useState, Suspense } from 'react';
import axios from 'axios';
import ListingCard from '@/components/ListingCard';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/FilterBar';
import Navbar from '@/components/Navbar';
import { Listing } from '@/types';
import { useSearchParams } from 'next/navigation';

// Importăm harta dinamic
const MapView = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400">Se încarcă harta...</div>
});

function HomeContent() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const searchParams = useSearchParams();

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();

      const urlType = searchParams.get('type') || searchParams.get('transaction_type') || 'SALE';
      const q = searchParams.get('q');
      const minPrice = searchParams.get('min_price');
      const maxPrice = searchParams.get('max_price');
      const rooms = searchParams.get('rooms');

      params.append('transaction_type', urlType);

      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (rooms && rooms !== 'all') params.append('rooms', rooms);

      if (q) {
        params.append('q', q);
        params.append('neighborhood', q);
        params.append('address', q);
      }

      const finalUrl = `http://127.0.0.1:8000/listings?${params.toString()}`;
      console.log("FETCH:", finalUrl);

      const res = await axios.get(finalUrl);
      setListings(res.data);
    } catch (error) {
      console.error("EROARE la fetch:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, [searchParams]);

  return (
    <div className="flex flex-col h-screen w-full bg-white font-sans overflow-hidden">
      {/* 1. Navbar (Fix Sus) */}
      <div className="flex-none z-50">
         <Navbar />
      </div>

      {/* 2. FilterBar (Sub Navbar) */}
      <div className="flex-none z-40 shadow-sm bg-white relative">
        <FilterBar />
      </div>

      {/* 3. Conținut Principal (Split View) */}
      <main className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        
        {/* --- ZONA A: LISTA --- */}
        {/* Mobile: Jos (Order 2), 50% înălțime */}
        {/* Desktop: Stânga (Order 1), Lățime fixă, 100% înălțime */}
        <div className="
            order-2 md:order-1 
            w-full md:w-112.5 lg:w-125 
            h-1/2 md:h-full 
            overflow-y-auto 
            border-t md:border-t-0 md:border-r border-gray-200 
            bg-white 
            shadow-[0_-5px_15px_rgba(0,0,0,0.1)] md:shadow-none
            z-20
        ">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="font-bold text-lg text-gray-800">Rezultate</h2>
              <p className="text-xs text-gray-500">Iași, România</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {listings.length} proprietăți
            </span>
          </div>

          <div className="p-3 space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl mx-2" />)
            ) : listings.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-gray-500 mb-2">Nu am găsit anunțuri.</p>
                <button
                  onClick={() => window.location.href = '/?type=SALE'}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Resetează filtrele
                </button>
              </div>
            ) : (
              listings.map((l) => (
                <div
                  key={l.id}
                  onClick={() => setActiveId(l.id)} // La click, setăm focus pe hartă
                  className={`
                    cursor-pointer transition-all duration-200 rounded-xl border-2 
                    ${activeId === l.id ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]' : 'border-transparent hover:bg-gray-50 hover:border-gray-200'}
                  `}
                >
                  <ListingCard listing={l} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* --- ZONA B: HARTA --- */}
        {/* Mobile: Sus (Order 1), 50% înălțime */}
        {/* Desktop: Dreapta (Order 2), Restul ecranului */}
        <div className="
            order-1 md:order-2 
            w-full md:flex-1 
            h-1/2 md:h-full 
            relative 
            z-10
        ">
          <MapView listings={listings} activeId={activeId} setActiveId={setActiveId} />
          
          {loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-1000 flex items-center gap-2 pointer-events-none">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold text-blue-600">Se actualizează...</span>
            </div>
          )}
        </div>

      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <HomeContent />
    </Suspense>
  )
}