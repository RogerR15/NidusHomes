'use client';

import React from 'react';
import { NewListingsEmail } from '../../../emails/NewListingsEmail';


export default function PreviewEmailPage() {
  
  // 1. Date FALS (Mock Data) ca să vedem cum arată populat
  const mockListings = [
    {
      id: 101,
      title: "Apartament Modern Palas Campus",
      price_eur: 145000,
      image_url: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=500&q=80",
      address: "Str. Sf. Lazăr, Iași",
      rooms: 3
    },
    {
      id: 102,
      title: "Garsonieră Cochetă Podu Roș",
      price_eur: 55000,
      image_url: "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=500&q=80",
      address: "Bld. Socola nr. 2",
      rooms: 1
    },
    {
      id: 103,
      title: "Vila Mediteraneană Bucium",
      price_eur: 320000,
      image_url: "https://images.unsplash.com/photo-1600596542815-2495db9dc2c3?auto=format&fit=crop&w=500&q=80",
      address: "Str. Trei Fântâni",
      rooms: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gray-800 flex flex-col items-center py-10 gap-4">
      
      <h1 className="text-white font-bold text-xl">Preview Design Email (Alerte Noi)</h1>
      <p className="text-gray-400 text-sm">Așa va arăta emailul în inbox-ul clientului (aprox. 600px lățime)</p>

      {/* Simulăm "fereastra" de email */}
      <div className="bg-white max-w-150 w-full shadow-2xl rounded-xl overflow-hidden border border-gray-700">
        
        {/* Randăm componenta de email aici */}
        <NewListingsEmail 
            userName="Alexandru Cel Bun"
            searchName="Investiții Iași Centru"
            listings={mockListings}
        />

      </div>

      <button 
        onClick={() => alert("Acesta e doar un preview vizual. Folosește API-ul pentru trimitere reală.")}
        className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition"
      >
        Simulează Trimitere
      </button>

    </div>
  );
}