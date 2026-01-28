'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Users, 
    FileText, 
    Download, 
    Briefcase, 
    TrendingUp, 
    Home, 
    Calendar,
    Search
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { createClient } from '../../../../utils/supabase/client';


export default function AgentDashboard() {
    const [leads, setLeads] = useState<any[]>([]);
    const [myListings, setMyListings] = useState<any[]>([]);
    const [agentProfile, setAgentProfile] = useState<any>(null); // <--- State pentru Rating
    const [selectedListingId, setSelectedListingId] = useState<string>(""); 
    
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [loadingPDF, setLoadingPDF] = useState(false);
    
    const supabase = createClient();

    // 1. Încărcăm Datele (Leads + Listings + Profil)
    useEffect(() => {
        const fetchData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            const token = session.access_token;
            const headers = { Authorization: `Bearer ${token}` };

            // A. Luăm Lead-urile
            try {
                const leadsRes = await axios.get('http://127.0.0.1:8000/agent/leads', { headers });
                setLeads(leadsRes.data);
            } catch (err) {
                console.log("Eroare leads:", err);
            } finally {
                setLoadingLeads(false);
            }

            // B. Luăm Anunțurile mele
            try {
                // Încercăm endpoint-ul nou creat. Dacă nu merge, verifică backend-ul.
                const listingsRes = await axios.get('http://127.0.0.1:8000/my-listings', { headers });
                setMyListings(listingsRes.data);
            } catch (err) {
                console.log("Eroare anunturi:", err);
            }

            // C. Luăm Profilul Agentului (PENTRU RATING)
            try {
                const profileRes = await axios.get('http://127.0.0.1:8000/agent/profile', { headers });
                setAgentProfile(profileRes.data);
            } catch (err) {
                console.log("Eroare profil/rating:", err);
                // Nu facem nimic, lăsăm rating-ul 0.0, dar restul paginii merge!
            }
        };
        fetchData();
    }, []);

    // 2. Funcție Generare PDF Dinamic
    const handleGenerateCMA = async () => {
        if (!selectedListingId) {
            alert("Te rog selectează o proprietate din listă pentru analiză.");
            return;
        }

        setLoadingPDF(true);
        const { data: { session } } = await supabase.auth.getSession();

        try {
            const res = await axios.post(`http://127.0.0.1:8000/agent/generate-cma/${selectedListingId}`, {}, {
                headers: { Authorization: `Bearer ${session?.access_token}` },
                responseType: 'blob'
            });
            
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = document.createElement('a');
            link.href = url;
            const listingTitle = myListings.find(l => l.id.toString() === selectedListingId)?.title || "Raport";
            link.setAttribute('download', `CMA_${listingTitle}.pdf`);
            document.body.appendChild(link);
            link.click();
        } catch (err) {
            alert("Eroare: Nu am putut genera raportul.");
        } finally {
            setLoadingPDF(false);
        }
    };

    const formatDate = (dateStr: string) => {
        if(!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });
    }

    // Calcul Rata Conversie
    const conversionRate = myListings.length > 0 
        ? ((leads.length / myListings.length) * 100).toFixed(0) 
        : "0";

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar />
            
            <div className="max-w-7xl mx-auto p-6 lg:p-8">
                
                {/* --- HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Dashboard Agent</h1>
                        <p className="text-gray-500 mt-1">
                            Salut, {agentProfile?.agency_name || "Agent"}!
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/add">
                            <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg font-bold text-sm hover:bg-gray-50 transition">
                                + Adaugă Anunț
                            </button>
                        </Link>
                        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-bold text-sm shadow-lg shadow-slate-200">
                            <Briefcase size={16}/> Cont PRO
                        </div>
                    </div>
                </div>

                {/*STATISTICI (KPIs)*/}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Lead-uri Totale</p>
                            <p className="text-2xl font-black text-gray-900">{leads.length}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Users size={20}/></div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Anunțuri Active</p>
                            <p className="text-2xl font-black text-gray-900">{myListings.length}</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-full text-purple-600"><Home size={20}/></div>
                    </div>


                    {/*  RATING-UL REAL (Calculat din backend) */}
                    <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase">Rating Mediu</p>
                            <p className="text-2xl font-black text-gray-900">
                                {agentProfile?.rating ? Number(agentProfile.rating).toFixed(1) : "0.0"}
                            </p>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-full text-yellow-600">★</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* COLOANA STANGA: CRM / LEADS */}
                    <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                            <h2 className="text-lg font-bold flex items-center gap-2">
                                <Users className="text-blue-600" size={20}/> Lead-uri Recente
                            </h2>
                            <button className="text-xs font-bold text-blue-600 hover:underline">Vezi tot</button>
                        </div>

                        {loadingLeads ? (
                            <div className="p-8 text-center text-gray-400">Se încarcă datele...</div>
                        ) : leads.length === 0 ? (
                            <div className="p-10 text-center flex flex-col items-center justify-center">
                                <div className="bg-gray-100 p-4 rounded-full mb-3"><Search className="text-gray-400"/></div>
                                <h3 className="font-bold text-gray-900">Nu ai clienți încă</h3>
                                <p className="text-sm text-gray-500 mt-1">Când cineva te contactează, va apărea aici.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-medium">
                                        <tr>
                                            <th className="p-4">Nume Client</th>
                                            <th className="p-4">Proprietate</th>
                                            <th className="p-4">Data</th>
                                            <th className="p-4">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {leads.map((lead) => (
                                            <tr key={lead.id} className="hover:bg-gray-50 transition">
                                                <td className="p-4">
                                                    <p className="font-bold text-gray-900">{lead.client_name}</p>
                                                    <p className="text-xs text-gray-500">{lead.client_phone || 'Fără telefon'}</p>
                                                </td>
                                                <td className="p-4 text-gray-600">
                                                    ID #{lead.listing_id}
                                                </td>
                                                <td className="p-4 text-gray-500 flex items-center gap-1">
                                                    <Calendar size={14}/> {formatDate(lead.created_at)}
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-xs font-bold 
                                                        ${lead.status === 'NOU' ? 'bg-green-100 text-green-700' : 
                                                          lead.status === 'CONTACTAT' ? 'bg-blue-100 text-blue-700' : 
                                                          'bg-gray-100 text-gray-600'}`}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/*  COLOANA DREAPTA: TOOLS */}
                    <div className="space-y-6">
                        
                        {/* CARD GENERATOR PDF (CMA) */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-50 rounded-bl-full -mr-10 -mt-10 z-0"></div>
                            
                            <h2 className="text-lg font-bold mb-4 flex items-center gap-2 relative z-10">
                                <FileText className="text-purple-600"/> Generator Raport (CMA)
                            </h2>
                            <p className="text-sm text-gray-600 mb-4 relative z-10">
                                Creează o analiză de piață pentru a convinge clienții că prețul este corect.
                            </p>

                            {/* SELECTOR PROPRIETATE */}
                            <div className="mb-4 relative z-10">
                                <label className="block text-xs font-bold text-gray-500 mb-1">Alege Proprietatea</label>
                                <select 
                                    className="w-full border border-gray-300 rounded-lg p-2.5 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-200"
                                    value={selectedListingId}
                                    onChange={(e) => setSelectedListingId(e.target.value)}
                                >
                                    <option value="">-- Selectează un anunț --</option>
                                    {myListings.map(listing => (
                                        <option key={listing.id} value={listing.id}>
                                            {listing.title} ({listing.price_eur.toLocaleString()} €)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <button 
                                onClick={handleGenerateCMA}
                                disabled={loadingPDF || !selectedListingId}
                                className={`w-full font-bold py-3 rounded-lg transition flex justify-center items-center gap-2 relative z-10
                                    ${loadingPDF || !selectedListingId 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                        : 'bg-slate-900 text-white hover:bg-black shadow-lg shadow-slate-200'}`}
                            >
                                {loadingPDF ? 'Generare în curs...' : <><Download size={18}/> Descarcă PDF</>}
                            </button>
                        </div>

                        {/* LISTA ANUNȚURI RAPIDE */}
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                            <h2 className="text-lg font-bold mb-4">Anunțurile Tale</h2>
                            <div className="space-y-3">
                                {myListings.slice(0, 3).map(listing => (
                                    <div key={listing.id} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg transition group cursor-pointer">
                                        <div className="h-10 w-10 bg-gray-200 rounded overflow-hidden">
                                            {/* Placeholder imagine */}
                                            <div className="w-full h-full bg-blue-100 flex items-center justify-center text-blue-500">
                                                <Home size={16}/>
                                            </div>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition">
                                                {listing.title}
                                            </p>
                                            <p className="text-xs text-gray-500 truncate">{listing.address || "Fără adresă"}</p>
                                        </div>
                                        <div className="text-xs font-bold text-gray-900">
                                            {listing.price_eur >= 1000 ? `${(listing.price_eur / 1000).toFixed(0)}k` : listing.price_eur} €
                                        </div>
                                    </div>
                                ))}
                                {myListings.length === 0 && (
                                    <p className="text-sm text-gray-400">Nu ai niciun anunț activ.</p>
                                )}
                            </div>
                            {myListings.length > 0 && (
                                <Link href="/my-listings" className="block mt-4 text-center text-xs font-bold text-blue-600 hover:underline">
                                    Vezi toate anunțurile
                                </Link>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}