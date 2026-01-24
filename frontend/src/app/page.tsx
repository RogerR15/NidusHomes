'use client';
import { useEffect, useState, Suspense } from 'react';
import axios from 'axios';
import ListingCard from '@/components/ListingCard';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/FilterBar';
import Navbar from '@/components/Navbar';
import { Listing } from '@/types';
import { useSearchParams } from 'next/navigation';

const MapView = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400">Se incarca harta...</div>
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

      // 1. Citim valorile din URL
      const urlType = searchParams.get('type') || searchParams.get('transaction_type') || 'SALE';
      const q = searchParams.get('q'); // Aici e textul "Visoianu"
      const minPrice = searchParams.get('min_price');
      const maxPrice = searchParams.get('max_price');
      const rooms = searchParams.get('rooms');

      // 2. Construim parametrii pentru Backend
      params.append('transaction_type', urlType);

      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (rooms && rooms !== 'all') params.append('rooms', rooms);

      // FIX
      // Trimitem textul de cautare sub toate formele posibile, 
      // ca sa fim siguri ca backend-ul il prinde.
      if (q) {
        params.append('q', q);            // Pentru cautare generica
        params.append('neighborhood', q); // Daca backend-ul filtreaza pe cartier
        params.append('address', q);      // Daca backend-ul filtreaza pe adresa
      }

      // 3. LOG DE DEBUGGING (Apasa F12 in browser sa vezi asta)
      const finalUrl = `http://127.0.0.1:8000/listings?${params.toString()}`;
      console.log("FRONTEND APEL CaTRE BACKEND:", finalUrl);

      const res = await axios.get(finalUrl);
      console.log("DATE PRIMITE:", res.data.length, "anunturi");

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
      <Navbar />

      <div className="z-40 shadow-sm bg-white relative">
        <FilterBar />
      </div>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Lista */}
        <div className="w-full lg:w-125 h-full overflow-y-auto border-r border-gray-200 bg-white z-20 shadow-xl flex flex-col">
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="font-bold text-lg text-gray-800">Rezultate</h2>
              <p className="text-xs text-gray-500">Iași, România</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {listings.length} proprietați
            </span>
          </div>

          <div className="flex-1 p-3 space-y-3">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl mx-2" />)
            ) : listings.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-gray-500 mb-2">Nu am gasit anunțuri pentru filtrele selectate.</p>
                <button
                  onClick={() => window.location.href = '/?type=SALE'}
                  className="text-blue-600 text-sm hover:underline"
                >
                  Reseteaza filtrele
                </button>
              </div>
            ) : (
              listings.map((l) => (
                <div
                  key={l.id}
                  className="cursor-pointer transition-all duration-200 rounded-xl border border-transparent hover:bg-gray-50 hover:border-gray-200"
                >
                  <ListingCard listing={l} />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Harta */}
        <div className="hidden lg:block flex-1 relative bg-gray-100 z-1">
          <MapView listings={listings} activeId={null} setActiveId={setActiveId} />
          {loading && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-1000 flex items-center gap-2 pointer-events-none">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold text-blue-600">Se actualizeaza...</span>
            </div>
          )}
        </div>
      </div>
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