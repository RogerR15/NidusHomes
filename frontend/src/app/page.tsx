'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import ListingCard from '@/components/ListingCard';

import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse" />
});

export default function Home() {
  const [listings, setListings] = useState([]);
  const [activeId, setActiveId] = useState<number | null>(null);

  useEffect(() => {
    axios.get('http://127.0.0.1:8000/listings')
      .then(res => {
        // Mapam datele pentru a ne asigura ca avem o cheie "price" valida pentru toLocaleString
        const sanitized = res.data.map((l: any) => ({
          ...l,
          price: l.price_eur || l.price || 0
        }));
        setListings(sanitized);
      })
      .catch(err => console.error("Eroare la incarcarea datelor:", err));
  }, []);

  return (
    <main className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-100 min-w-100 h-full overflow-y-auto border-r p-5 bg-white shadow-2xl z-20">
        <h1 className="text-2xl font-black text-blue-700 tracking-tighter mb-8 border-b pb-4 uppercase">
          Imobiliare Iasi
        </h1>

        <div className="flex flex-col gap-4">
          {listings.length === 0 && (
            <p className="text-gray-400 text-center mt-10">Cautam apartamente în Iași...</p>
          )}

          {listings.map((l: any) => (
            <div
              key={l.id}
              onClick={() => setActiveId(l.id)}
              className={`cursor-pointer transition-all duration-300 rounded-xl ${activeId === l.id
                ? 'ring-4 ring-blue-500 ring-inset shadow-2xl scale-[1.02]'
                : 'hover:scale-[1.01]'
                }`}
            >
              <ListingCard listing={l} />
            </div>
          ))}
        </div>
      </div>

      {/* Harta */}
      <div className="flex-1 h-full">
        <MapView listings={listings} activeId={activeId} setActiveId={setActiveId} />
      </div>
    </main>
  );
}