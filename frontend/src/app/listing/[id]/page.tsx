'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import DescriptionViewer from '@/components/DescriptionViewer';
import dynamic from 'next/dynamic';

// Importăm harta dinamic (fără SSR) pentru a evita erorile Leaflet
const MiniMap = dynamic(() => import('@/components/MiniMap'), {
    ssr: false,
    loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg"></div>
});

export default function ListingPage() {
    const { id } = useParams();
    const router = useRouter();
    const [listing, setListing] = useState<any>(null); // Folosim any temporar pt câmpuri noi
    const [loading, setLoading] = useState(true);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        if (id) {
            axios.get(`http://127.0.0.1:8000/listings/${id}`)
                .then(res => {
                    setListing(res.data);
                    setLoading(false);
                })
                .catch(err => {
                    console.error(err);
                    setLoading(false);
                });
        }
    }, [id]);

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50">Se încarcă detaliile...</div>;
    if (!listing) return <div className="flex justify-center items-center h-screen">Nu am găsit anunțul.</div>;

    // Gestionare Imagini (Fallback dacă nu sunt imagini)
    const images = listing.images && listing.images.length > 0
        ? listing.images
        : [listing.image_url || "https://placehold.co/800x600/e2e8f0/1e293b?text=Fara+Imagine"];

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-slate-900">
            <Navbar />

            <main className="max-w-6xl mx-auto p-4 md:p-8">
                {/* Breadcrumb / Back */}
                <button
                    onClick={() => router.back()}
                    className="mb-6 flex items-center gap-2 text-slate-500 hover:text-blue-600 transition-colors font-medium"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Înapoi la căutare
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* STÂNGA: Galerie Foto & Descriere */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Galerie Principală */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                            <div className="relative aspect-video bg-gray-900">
                                <img
                                    src={images[activeImageIndex]}
                                    alt={listing.title}
                                    className="w-full h-full object-contain"
                                />

                                {/* Butoane Navigare Galerie */}
                                {images.length > 1 && (
                                    <>
                                        <button
                                            onClick={() => setActiveImageIndex(prev => (prev === 0 ? images.length - 1 : prev - 1))}
                                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                                        >
                                            ←
                                        </button>
                                        <button
                                            onClick={() => setActiveImageIndex(prev => (prev === images.length - 1 ? 0 : prev + 1))}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/10 hover:bg-white/30 text-white p-2 rounded-full backdrop-blur-sm transition-all"
                                        >
                                            →
                                        </button>
                                    </>
                                )}

                                <div className="absolute bottom-4 right-4 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                    {activeImageIndex + 1} / {images.length}
                                </div>
                            </div>

                            {/* Thumbnails */}
                            {images.length > 1 && (
                                <div className="flex gap-2 p-2 overflow-x-auto bg-white border-t">
                                    {images.map((img: string, idx: number) => (
                                        <button
                                            key={idx}
                                            onClick={() => setActiveImageIndex(idx)}
                                            className={`relative w-20 h-14 shrink-0 rounded overflow-hidden border-2 transition-all ${activeImageIndex === idx ? 'border-blue-600 opacity-100' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                        >
                                            <img src={img} className="w-full h-full object-cover" alt="" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Descriere */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
                            <div className="flex items-center gap-2 mb-6">
                                <div className="bg-blue-100 p-2 rounded-lg">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                                    </svg>
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">Descriere Proprietate</h2>
                            </div>


                            <DescriptionViewer text={listing.description || "Nu există o descriere detaliată."} />

                        </div>
                    </div>

                    {/* DREAPTA: Informații Cheie & Contact */}
                    <div className="space-y-6">

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
                            <div className="mb-6">
                                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${listing.transaction_type === 'RENT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                    {listing.transaction_type === 'RENT' ? 'DE ÎNCHIRIAT' : 'DE VÂNZARE'}
                                </span>
                                <h1 className="text-2xl font-bold text-gray-900 leading-tight mb-2">{listing.title}</h1>
                                <p className="text-slate-500 flex items-center gap-1 text-sm">
                                    📍 {listing.neighborhood}, Iași
                                </p>
                            </div>

                            <div className="flex items-end gap-2 mb-6 pb-6 border-b border-gray-100">
                                <span className="text-4xl font-black text-blue-600">
                                    {listing.price_eur?.toLocaleString()} €
                                </span>
                                {listing.transaction_type === 'RENT' && <span className="text-gray-400 font-medium mb-1">/ lună</span>}
                            </div>

                            {/* Grid Specificații */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Suprafață</span>
                                    <span className="font-bold text-slate-800">{listing.sqm} mp</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Camere</span>
                                    <span className="font-bold text-slate-800">{listing.rooms || '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Etaj</span>
                                    <span className="font-bold text-slate-800">{listing.floor !== null ? listing.floor : '-'}</span>
                                </div>
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Construit</span>
                                    <span className="font-bold text-slate-800">{listing.year_built || '-'}</span>
                                </div>
                            </div>

                            {/* Mini Map */}
                            {listing.latitude && listing.longitude && (
                                <div className="h-48 rounded-xl overflow-hidden mb-6 border border-gray-200">
                                    <MiniMap lat={listing.latitude} lng={listing.longitude} />
                                </div>
                            )}

                            {/* Buton Sursă */}
                            <a
                                href={listing.listing_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block w-full bg-orange-500 hover:bg-orange-600 text-white font-bold text-center py-4 rounded-xl transition-all shadow-md hover:shadow-lg transform hover:-translate-y-0.5"
                            >
                                Vezi anunțul pe {listing.source_platform}
                            </a>
                            <p className="text-xs text-center text-gray-400 mt-3">
                                Vei fi redirecționat către site-ul sursă
                            </p>
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}