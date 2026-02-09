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
import { AlertTriangle, Bot, CheckCircle, CheckCircle2, Eye, Hammer, Heart, Info, Lock, Phone, PieChart, TrendingUp } from 'lucide-react';
import ContactForm from '@/components/ContactForm';


const MiniMap = dynamic(() => import('@/components/MiniMap'), {
    ssr: false,
    loading: () => <div className="h-48 bg-gray-100 animate-pulse rounded-lg"></div>
});

export default function ListingPage() {
    const { id } = useParams();
    const router = useRouter();
    const [listing, setListing] = useState<any>(null); // Folosim any temporar pt campuri noi
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (id) {
            axios.get(`http://127.0.0.1:8000/listings/${id}?t=${new Date().getTime()}`)
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
                            <Separator className="my-8"/>
                            <div>
                            <ContactForm 
                                    listingId={listing.id}
                                    ownerId={listing.owner_id}
                                    agentDetails={listing.agent_profile ? {
                                        agency_name: listing.agent_profile.agency_name,
                                        phone_number: listing.agent_profile.phone_number,
                                        rating: listing.agent_profile.rating,
                                        is_verified: listing.agent_profile.is_verified
                                    } : undefined}
                            />
                            </div>
                        </div>
                      {/* --- NIDUS PRO INTELLIGENCE --- */}
{listing.ai_tags ? (
  listing.ai_tags.investment ? (
    // CAZ 1: AVEM DATELE PREMIUM (Randament, Preț Corect)
    <div className="mb-10 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg relative group">
      
      {/* HEADER PRO */}
      <div className="bg-slate-900 px-6 py-4 flex items-center justify-between text-white">
        <div className="flex items-center gap-3">
          <div className="bg-linear-to-r from-amber-400 to-amber-600 text-slate-900 text-[10px] font-black px-2 py-0.5 rounded shadow-[0_0_10px_rgba(251,191,36,0.4)]">
            AI
          </div>
          <h3 className="font-bold tracking-wide text-lg flex items-center gap-2">
            <Bot size={18} className="text-amber-400"/>
            Raport Investițional
          </h3>
        </div>
        <div className="text-slate-500 text-xs font-mono">
          AI CONFIDENCE: {((listing.ai_tags.scores?.condition || 0.85) * 100).toFixed(0)}%
        </div>
      </div>

      {/* CONTENT GRID */}
      <div className="p-6 grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-slate-100">

        {/* 1. RANDAMENT (YIELD) */}
        <div className="space-y-4 px-3">
           <div className="flex items-center gap-2 text-indigo-600 font-semibold mb-1">
              <PieChart size={20}/>
              <h4 className="text-sm uppercase tracking-wider text-slate-500">Randament</h4>
           </div>
           
           <div className="flex items-baseline gap-1">
              <span className="text-4xl font-black text-slate-800 tracking-tight">
                {listing.ai_tags.investment.yield_percent}%
              </span>
              <span className="text-sm font-medium text-slate-400">/ an</span>
           </div>
           
           <div className="bg-indigo-50/50 rounded-lg p-3 text-sm border border-indigo-100">
              <div className="flex justify-between mb-1">
                 <span className="text-slate-500">Chirie Estimat:</span>
                 <span className="font-bold text-indigo-900">{listing.ai_tags.investment.estimated_rent} € / lună</span>
              </div>
              <p className="text-[10px] text-indigo-400 mt-2 leading-tight">
                 *Calculat automat pe baza mediei zonei {listing.neighborhood || 'Iași'} și a stării interioare.
              </p>
           </div>
        </div>

        {/* 2. COSTURI REALE (RENOVARE) */}
        <div className="space-y-4 px-2 pt-6 md:pt-0 md:pl-6">
           <div className="flex items-center gap-2 text-orange-600 font-semibold mb-1">
              <Hammer size={20}/>
              <h4 className="text-sm uppercase tracking-wider text-slate-500">Investiție Necesară</h4>
           </div>
           
           <div className="flex flex-col items-baseline gap-1">
              <span className="text-3xl font-bold text-slate-800">
                {listing.ai_tags.investment.renovation_cost > 0 
                  ? `~${(listing.ai_tags.investment.renovation_cost / 1000).toFixed(1)}k €`
                  : "0 €"}
              </span>
                    
                <span className="text-xs  text-slate-400 font-medium bg-slate-100 px-2 py-1 rounded-full ml-2 text-center">
                    Estimare Minima De Renovare
                </span>
              
           </div>
           
           
           <div className="text-sm  text-slate-600 leading-relaxed">
              <p>Stare detectată: <strong>
                {listing.ai_tags.top_tag === 'fixer-upper' && "Necesită Renovare Completă"}
                {listing.ai_tags.top_tag === 'renovated' && "Renovat Recent"}
                {listing.ai_tags.top_tag === 'luxury' && "Lux / Premium"}
                {listing.ai_tags.top_tag === 'construction' && "La Gri"}
                {listing.ai_tags.top_tag === 'standard' && "Standard / Vechi"}
                {listing.ai_tags.top_tag === 'old_but_clean' && "Vechi dar Locuibil"}
              </strong></p>
           </div>

           <div className="mt-2 text-xs font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">
              Total (Achiziție + Renovare): <span className="font-bold text-slate-900">{(listing.ai_tags.investment.total_investment / 1000).toFixed(1)}k €</span>
           </div>
        </div>

        {/* 3. ANALIZA PIAȚĂ (Preț Corect) */}
        <div className="space-y-4 px-2 pt-6 md:pt-0 md:pl-6">
           <div className="flex items-center gap-2 text-emerald-600 font-semibold mb-1">
              <TrendingUp size={20}/>
              <h4 className="text-sm uppercase tracking-wider text-slate-500">Poziție în Piață</h4>
           </div>
           
           <div>
              {listing.ai_tags.investment.market_comparison?.status === 'deal' && (
                 <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-700 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border border-emerald-200">
                    <CheckCircle2 size={16}/> SUPER DEAL
                 </span>
              )}
              {listing.ai_tags.investment.market_comparison?.status === 'fair' && (
                 <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border border-blue-200">
                    ⚖️ Preț Corect
                 </span>
              )}
              {listing.ai_tags.investment.market_comparison?.status === 'expensive' && (
                 <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 px-3 py-1.5 rounded-full text-sm font-bold shadow-sm border border-red-200">
                    <AlertTriangle size={16}/> Peste Piață
                 </span>
              )}
           </div>

           <div className="text-sm space-y-2 mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100">
              <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                 <span className="text-slate-500">Preț Listat:</span>
                 <span className="font-bold text-slate-900">{listing.ai_tags.investment.market_comparison?.listing_price_sqm} €/mp</span>
              </div>
              <div className="flex justify-between items-center pt-1">
                 <span className="text-slate-500 flex items-center gap-1">
                    AI Fair Price: 
                    <span className="bg-slate-200 text-[10px] px-1 rounded text-slate-500 text-center mr-5">ML Model</span>
                 </span>
                 <span className="pl- font-bold text-slate-600">
                    {listing.ai_tags.investment.market_comparison?.avg_price_sqm} €/mp
                 </span>
              </div>
           </div>
        </div>
      </div>
    </div>
  ) : (
    // CAZ 2: ANUNȚ PROCESAT DOAR VIZUAL (FĂRĂ DATE FINANCIARE) - FALLBACK ELEGANT
    <div className="mb-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-white shadow-lg relative p-8 text-center">
         <div className="relative z-10 flex flex-col items-center justify-center h-full space-y-4">
            <div className="bg-white/10 p-3 rounded-full backdrop-blur-sm">
                <Lock className="w-8 h-8 text-amber-400" />
            </div>
            <div>
                <h3 className="text-2xl font-bold mb-1 text-white">Nidus PRO Report</h3>
                <p className="text-slate-400 text-sm max-w-md mx-auto">
                    Calculăm randamentul investițional, costurile ascunse de renovare și prețul corect de piață.
                </p>
            </div>
            
            {/* Starea de "Loading" simulata */}
            <div className="flex items-center gap-2 text-amber-400 text-sm font-mono animate-pulse mt-4">
                <Bot size={16}/>
                <span>AI Processing Financial Data...</span>
            </div>
         </div>
         
         {/* Background Effects */}
         <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-slate-800 via-slate-900 to-black opacity-50"></div>
         <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl"></div>
    </div>
  )
) : null}
                    </div>

                    {/* DREAPTA: Informatii Cheie & Contact */}
                    <div className="space-y-6">

                        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 sticky top-24">
                            <div className="flex justify-end gap-4 text-gray-400 text-xs mb-4">
                                <div className="flex items-center gap-1" title="Vizualizări totale">
                                    <Eye size={14} />
                                    <span>{listing.views || 0} vizualizări</span>
                                </div>
                                <div className="flex items-center gap-1" title="Adăugat la favorite">
                                    <Heart size={14} className="text-red-400" />
                                    <span>{listing.favorites_count || 0} salvări</span>
                                </div>
                            </div>
                            
                            
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
                                        {listing.contact_phone && (
                                                    <div className="bg-white rounded-lg p-3 border mt-5 border-indigo-100 shadow-sm flex items-center justify-between group/phone hover:border-indigo-300 transition-all cursor-pointer">
                                                        <div className="flex items-center gap-3">
                                                            <div className="bg-indigo-100 p-2 rounded-full text-indigo-600 group-hover/phone:bg-indigo-600 group-hover/phone:text-white transition-colors">
                                                                <Phone size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Telefon Proprietar</p>
                                                                <a href={`tel:${listing.contact_phone}`} className="text-lg font-black text-gray-800 group-hover/phone:text-indigo-600 transition-colors">
                                                                    {listing.contact_phone}
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                    </div>
                            )}  
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}