'use client';
import { useState, useEffect, useCallback } from 'react'; // <--- 1. Importam useCallback
import axios from 'axios';
import { 
    Users, 
    FileText, 
    Download, 
    Briefcase, 
    TrendingUp, 
    Home, 
    Calendar,
    Search,
    MessageSquare,
    CheckCircle2,
    Clock,
    ArrowRight
} from 'lucide-react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../../utils/supabase/client';

export default function AgentDashboard() {
    const [leads, setLeads] = useState<any[]>([]);
    const [myListings, setMyListings] = useState<any[]>([]);
    const [agentProfile, setAgentProfile] = useState<any>(null); 
    const [selectedListingId, setSelectedListingId] = useState<string>(""); 
    
    const [loadingLeads, setLoadingLeads] = useState(true);
    const [loadingPDF, setLoadingPDF] = useState(false);
    
    const supabase = createClient();
    const router = useRouter(); 

    // ---------------------------------------------------------
    // 2. FUNCTIE REFOLOSIBILA PENTRU REINCARCARE DATE (LEADS)
    // ---------------------------------------------------------
    const fetchLeadsData = useCallback(async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        try {
            const res = await axios.get('http://127.0.0.1:8000/agent/leads', { 
                headers: { Authorization: `Bearer ${session.access_token}` } 
            });
            setLeads(res.data);
        } catch (err) {
            console.log("Eroare refresh leads:", err);
        } finally {
            setLoadingLeads(false);
        }
    }, [supabase]); // Dependinte

    // 3. EFECTUL PRINCIPAL + REALTIME
    useEffect(() => {
        const initData = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            
            const token = session.access_token;
            const headers = { Authorization: `Bearer ${token}` };

            // A. Incarcam Lead-urile initial
            fetchLeadsData();

            // B. Anunturi
            axios.get('http://127.0.0.1:8000/my-listings', { headers })
                .then(res => setMyListings(res.data))
                .catch(err => console.log("Eroare anunturi:", err));

            // C. Profil
            axios.get('http://127.0.0.1:8000/agent/profile', { headers })
                .then(res => setAgentProfile(res.data))
                .catch(err => console.log("Eroare profil:", err));
        };
        
        initData();

        // --- ZONA REALTIME (MAGICĂ) ---
        // Asta face ca statusul sa se schimbe singur!
        const channel = supabase
            .channel('dashboard-realtime')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'messages' }, // Ascultam orice modificare pe mesaje
                (payload) => {
                    console.log('🔔 Schimbare in mesaje:', payload);
                    fetchLeadsData(); // Reincarcam lista cand se intampla ceva
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };

    }, [fetchLeadsData, supabase]); 

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
            alert("Eroare generare raport.");
        } finally {
            setLoadingPDF(false);
        }
    };

    const goToChat = (conversationId: number) => {
        router.push(`/inbox/${conversationId}`);
    };

    const formatDate = (dateStr: string) => {
        if(!dateStr) return "-";
        return new Date(dateStr).toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', hour: '2-digit', minute:'2-digit' });
    }

    const conversionRate = myListings.length > 0 
        ? ((leads.length / myListings.length) * 100).toFixed(0) 
        : "0";

    return (
        <div className="min-h-screen bg-gray-50 pb-12">
            <Navbar />
            
            <div className="max-w-7xl mx-auto p-6 lg:p-8">
                
                {/* HEADER */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                    <div>
                        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Dashboard Agent</h1>
                        <p className="text-gray-500 mt-1 flex items-center gap-2">
                            Bun venit, <span className="font-bold text-gray-800">{agentProfile?.agency_name || "Agent"}</span>!
                            {agentProfile?.is_verified && <CheckCircle2 size={16} className="text-blue-500"/>}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/add">
                            <button className="bg-white border border-gray-200 text-gray-700 px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-50 transition shadow-sm">
                                + Adaugă Anunț
                            </button>
                        </Link>
                        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center gap-2 font-bold text-sm shadow-lg shadow-slate-200">
                            <Briefcase size={16}/> Cont PRO
                        </div>
                    </div>
                </div>

                {/* KPI CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Lead-uri Totale</p>
                            <p className="text-3xl font-black text-gray-900 mt-1">{leads.length}</p>
                        </div>
                        <div className="bg-blue-50 p-3 rounded-full text-blue-600"><Users size={24}/></div>
                    </div>
                    
                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Anunțuri Active</p>
                            <p className="text-3xl font-black text-gray-900 mt-1">{myListings.length}</p>
                        </div>
                        <div className="bg-purple-50 p-3 rounded-full text-purple-600"><Home size={24}/></div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Interes / Anunț</p>
                            <p className="text-3xl font-black text-gray-900 mt-1">{conversionRate}%</p>
                        </div>
                        <div className="bg-green-50 p-3 rounded-full text-green-600"><TrendingUp size={24}/></div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between hover:shadow-md transition">
                        <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Rating Mediu</p>
                            <div className="flex items-baseline gap-1 mt-1">
                                <p className="text-3xl font-black text-gray-900">
                                    {agentProfile?.rating ? Number(agentProfile.rating).toFixed(1) : "0.0"}
                                </p>
                                <span className="text-sm text-gray-400 font-medium">/ 5.0</span>
                            </div>
                        </div>
                        <div className="bg-yellow-50 p-3 rounded-full text-yellow-600">★</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* CRM / LEADS TABLE */}
                    <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                            <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800">
                                <MessageSquare className="text-blue-600" size={20}/> Mesaje Recente
                            </h2>
                            <Link href="/inbox" className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline">
                                Vezi tot inboxul <ArrowRight size={12}/>
                            </Link>
                        </div>

                        {loadingLeads ? (
                            <div className="p-12 text-center text-gray-400 flex flex-col items-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                                Se încarcă datele...
                            </div>
                        ) : leads.length === 0 ? (
                            <div className="p-12 text-center flex flex-col items-center justify-center">
                                <div className="bg-gray-100 p-4 rounded-full mb-3 text-gray-400"><Search size={24}/></div>
                                <h3 className="font-bold text-gray-900">Nu ai mesaje încă</h3>
                                <p className="text-sm text-gray-500 mt-1 max-w-xs mx-auto">Când cineva te contactează pentru o proprietate, va apărea aici.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-gray-50 text-gray-500 font-semibold border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4">Client</th>
                                            <th className="px-6 py-4">Ultimul Mesaj</th>
                                            <th className="px-6 py-4">Data</th>
                                            <th className="px-6 py-4">Status</th>
                                            <th className="px-6 py-4 text-right">Acțiune</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {leads.map((lead) => (
                                            <tr key={lead.id} className="hover:bg-blue-50/30 transition group cursor-pointer" onClick={() => goToChat(lead.id)}>
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-xs">
                                                            {lead.client_name ? lead.client_name[0].toUpperCase() : 'C'}
                                                        </div>
                                                        <div>
                                                            <p className="font-bold text-gray-900">{lead.client_name}</p>
                                                            <p className="text-xs text-gray-500">ID #{lead.listing_id}</p>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <p className="text-gray-600 truncate max-w-37.5 group-hover:text-gray-900 transition">
                                                        {lead.message || "Fără mesaj"}
                                                    </p>
                                                </td>
                                                <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                                                    <div className="flex items-center gap-1">
                                                        <Clock size={12}/> {formatDate(lead.created_at)}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider
                                                        ${lead.status === 'MESAJ NOU' ? 'bg-green-100 text-green-700' : 
                                                          lead.status === 'RĂSPUNS' ? 'bg-blue-100 text-blue-700' : 
                                                          'bg-gray-100 text-gray-600'}`}>
                                                        {lead.status}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); goToChat(lead.id); }}
                                                        className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded-lg transition"
                                                    >
                                                        Vezi Chat
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* TOOLS COLUMN */}
                    <div className="space-y-6">
                        
                        {/* CARD GENERATOR PDF */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-purple-50 rounded-bl-[100px] -mr-10 -mt-10 z-0 transition-transform group-hover:scale-110"></div>
                            
                            <h2 className="text-lg font-bold mb-3 flex items-center gap-2 relative z-10 text-gray-900">
                                <div className="bg-purple-100 p-2 rounded-lg text-purple-600"><FileText size={18}/></div>
                                Analiză Piață (CMA)
                            </h2>
                            <p className="text-sm text-gray-500 mb-6 relative z-10 leading-relaxed">
                                Generează un raport PDF profesional pentru a justifica prețul proprietății clienților tăi.
                            </p>

                            <div className="mb-4 relative z-10">
                                <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase tracking-wider">Alege Proprietatea</label>
                                <select 
                                    className="w-full border border-gray-200 rounded-xl p-3 text-sm bg-gray-50 outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition cursor-pointer"
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
                                className={`w-full font-bold py-3.5 rounded-xl transition flex justify-center items-center gap-2 relative z-10 shadow-lg text-sm
                                    ${loadingPDF || !selectedListingId 
                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed shadow-none' 
                                        : 'bg-slate-900 text-white hover:bg-black shadow-slate-200 hover:shadow-slate-300 transform hover:-translate-y-0.5'}`}
                            >
                                {loadingPDF ? 'Se generează...' : <><Download size={18}/> Descarcă Raport PDF</>}
                            </button>
                        </div>

                        {/* LISTA RAPIDĂ ANUNȚURI */}
                        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-bold text-gray-900">Anunțuri Top</h2>
                                <span className="text-xs font-semibold bg-gray-100 px-2 py-1 rounded text-gray-600">{myListings.length} total</span>
                            </div>
                            
                            <div className="space-y-3">
                                {myListings.slice(0, 3).map(listing => (
                                    <Link href={`/listing/${listing.id}`} key={listing.id} className="block">
                                        <div className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl transition group cursor-pointer border border-transparent hover:border-gray-100">
                                            <div className="h-12 w-12 bg-gray-200 rounded-lg overflow-hidden shrink-0 relative">
                                                {listing.image_url ? (
                                                    <img src={listing.image_url} alt="" className="w-full h-full object-cover"/>
                                                ) : (
                                                    <div className="w-full h-full bg-blue-50 flex items-center justify-center text-blue-400">
                                                        <Home size={18}/>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-bold text-gray-900 truncate group-hover:text-blue-600 transition">
                                                    {listing.title}
                                                </p>
                                                <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                                                    {listing.address || "Fără adresă"}
                                                </p>
                                            </div>
                                            <div className="text-right">
                                                <div className="text-xs font-bold text-gray-900">
                                                    {listing.price_eur >= 1000 ? `${(listing.price_eur / 1000).toFixed(0)}k` : listing.price_eur} €
                                                </div>
                                                <div className="text-[10px] text-green-600 font-bold bg-green-50 px-1.5 py-0.5 rounded inline-block mt-1">
                                                    ACTIVE
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                ))}
                                {myListings.length === 0 && (
                                    <div className="text-center py-6">
                                        <p className="text-sm text-gray-400">Nu ai niciun anunț activ.</p>
                                        <Link href="/add" className="text-blue-600 text-xs font-bold hover:underline mt-2 inline-block">+ Adaugă unul acum</Link>
                                    </div>
                                )}
                            </div>
                            {myListings.length > 3 && (
                                <Link href="/my-listings" className="block mt-5 text-center text-xs font-bold text-gray-500 hover:text-blue-600 transition border-t border-gray-100 pt-3">
                                    Vezi toate anunțurile ({myListings.length})
                                </Link>
                            )}
                        </div>

                    </div>
                </div>
            </div>
        </div>
    );
}