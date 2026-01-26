'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import DescriptionViewer from '@/components/DescriptionViewer';
import dynamic from 'next/dynamic';
import MortgageCalculator from '@/components/MortgageCalculator';
import PriceHistoryChart from '@/components/PriceHistoryChart';
import { Separator } from '@/components/ui/separator';
import ImageGallery from '@/components/ImageGallery';


const MiniMap = dynamic(() => import('@/components/MiniMap'), {
    ssr: false,
    loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg"></div>
});

export default function ListingPage() {
    const { id } = useParams();
    const router = useRouter();
    const [listing, setListing] = useState<any>(null); // Folosim any temporar pt câmpuri noi
    const [loading, setLoading] = useState(true);

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

    if (loading) return <div className="flex justify-center items-center h-screen bg-gray-50">Se încarca detaliile...</div>;
    if (!listing) return <div className="flex justify-center items-center h-screen">Nu am gasit anuntul.</div>;

    // Gestionare Imagini (Fallback daca nu sunt imagini)
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
                    Înapoi la cautare
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                    {/* STANGA: Galerie Foto & Descriere */}
                    <div className="lg:col-span-2 space-y-8">

                        {/* Galerie Principala */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden p-1">
                            <ImageGallery images={images} />
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


                            <DescriptionViewer text={listing.description || "Nu exista o descriere detaliata."} />

                        </div>
                        <div className="mt-12 mb-12">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Instrumente Financiare & Analiza</h2>

                            <div>
                                <PriceHistoryChart listingId={listing.id} />
                            </div>
                            {listing.transaction_type === 'SALE' && (
                                <div>
                                    <Separator className="my-8" />
                                    <div>
                                        <MortgageCalculator price={listing.price || listing.price_eur || 0} />
                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    {/* DREAPTA: Informatii Cheie & Contact */}
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
                                {listing.transaction_type === 'RENT' && <span className="text-gray-400 font-medium mb-1">/ luna</span>}
                            </div>

                            {/* Grid Specificatii */}
                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                    <span className="text-xs text-slate-400 uppercase font-semibold block mb-1">Suprafata</span>
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

                            {/* Buton Sursa */}
                            {listing.source_platform !== 'NidusHomes' && listing.listing_url ? (
                                <>
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
                                </>
                            ) : (
                                    <div className="rounded-xl border border-indigo-100 bg-indigo-50/50 p-5 relative overflow-hidden group hover:border-indigo-200 transition-colors">
                                        <div className="flex items-start gap-4">
                                            {/* Badge Icon */}
                                            <div className="bg-white p-3 rounded-xl shadow-sm border border-indigo-100 text-indigo-600">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" /><path d="m9 12 2 2 4-4" /></svg>
                                            </div>

                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                                                        Oficial
                                                    </span>
                                                </div>
                                                <h3 className="font-bold text-gray-900 text-md">Anunț adăugat de pe NidusHome</h3>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Această proprietate este listată direct de proprietar pe platforma noastră.
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                            )}
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}