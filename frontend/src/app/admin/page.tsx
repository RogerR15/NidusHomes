'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, X, FileText, Phone, ExternalLink, ShieldAlert, Home, MapPin } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '../../../utils/supabase/client';
import { useRouter } from 'next/navigation';

const ADMIN_ID = process.env.NEXT_PUBLIC_ADMIN_USER_ID;

// CARD INDIVIDUAL CU DETALII PROPRIETATE
function ClaimCard({ claim, signedUrl, onDecision }: any) {
    const [listing, setListing] = useState<any>(null);
    const [loadingListing, setLoadingListing] = useState(true);

    // Cand apare cardul, cerem detaliile casei de la Backend
    useEffect(() => {
        const fetchListing = async () => {
            try {
                const res = await axios.get(`http://127.0.0.1:8000/listings/${claim.listing_id}`);
                setListing(res.data);
            } catch (err) {
                console.error("Nu am putut incarca anuntul", err);
            } finally {
                setLoadingListing(false);
            }
        };
        fetchListing();
    }, [claim.listing_id]);

    // Functie helper pentru imagine (proxy OLX sau direct)
    const getImageUrl = (item: any) => {
        if (!item?.image_url) return null;
        if (item.source_platform === 'OLX') {
            return `/api/image-proxy?url=${encodeURIComponent(item.image_url)}`;
        }
        return item.image_url;
    };

    return (
        <div className="bg-white p-0 rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition duration-300">
            {/* Header Card: ID Cerere si Data */}
            <div className="bg-gray-50 px-6 py-3 border-b border-gray-100 flex justify-between items-center">
                <span className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded uppercase tracking-wider">
                    Cerere #{claim.id}
                </span>
                <span className="text-xs text-gray-400 font-mono">
                    {new Date(claim.created_at).toLocaleDateString('ro-RO')}
                </span>
            </div>

            <div className="p-6 flex flex-col lg:flex-row gap-6">
                
                {/* PARTEA STANGA: PREVIZUALIZARE PROPRIETATE */}
                <div className="flex-1 border border-gray-100 rounded-lg p-3 bg-slate-50/50">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <Home size={12}/> Proprietatea Revendicată (ID: {claim.listing_id})
                    </h4>
                    
                    {loadingListing ? (
                        <div className="h-16 bg-gray-200 rounded animate-pulse w-full"></div>
                    ) : listing ? (
                        <div className="flex gap-4">
                            {/* Imagine Mică */}
                            <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                                {getImageUrl(listing) ? (
                                    <img 
                                        src={getImageUrl(listing)} 
                                        alt="House" 
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                                )}
                            </div>
                            
                            {/* Detalii Text */}
                            <div className="flex flex-col justify-center">
                                <h3 className="text-sm font-bold text-gray-900 line-clamp-1 mb-1" title={listing.title}>
                                    {listing.title}
                                </h3>
                                <div className="text-blue-600 font-bold text-sm mb-1">
                                    {listing.price_eur ? listing.price_eur.toLocaleString() : 0} €
                                </div>
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <MapPin size={10} /> {listing.neighborhood || 'Iași'}
                                </div>
                                <a href={`/listing/${listing.id}`} target="_blank" className="text-[10px] text-blue-500 hover:underline mt-1 font-medium">
                                    Vezi anunțul original &rarr;
                                </a>
                            </div>
                        </div>
                    ) : (
                        <div className="text-red-400 text-xs italic">Anunțul a fost șters sau nu există.</div>
                    )}
                </div>

                {/* PARTEA DREAPTA: DATE UTILIZATOR & DOVADA */}
                <div className="flex-1 flex flex-col justify-center">
                    <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-1">
                        <ShieldAlert size={12}/> Detalii Solicitant
                    </h4>
                    
                    <div className="space-y-3">
                        <div className="flex items-center gap-3 p-2 bg-white border border-gray-100 rounded-lg shadow-sm">
                            <div className="bg-blue-50 p-2 rounded-full text-blue-600">
                                <Phone size={16} />
                            </div>
                            <div>
                                <div className="text-[10px] text-gray-400 font-bold uppercase">Telefon Contact</div>
                                <div className="font-mono font-bold text-gray-800 text-sm">{claim.contact_info || 'Nespecificat'}</div>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="text-[10px] text-gray-400 font-bold uppercase w-16">User ID:</div>
                            <code className="text-[10px] bg-gray-100 px-2 py-1 rounded text-gray-600 truncate flex-1">
                                {claim.user_id}
                            </code>
                        </div>

                        {/* Buton Document */}
                        <div className="pt-2">
                            {signedUrl ? (
                                <a 
                                    href={signedUrl} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-2 text-blue-700 hover:text-white hover:bg-blue-600 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100 transition duration-200 group w-fit"
                                >
                                    <FileText size={18} className="group-hover:scale-110 transition"/> 
                                    <span className="font-bold text-sm">Deschide Documentul</span>
                                    <ExternalLink size={12} className="opacity-50"/>
                                </a>
                            ) : (
                                <span className="text-red-500 text-xs flex items-center gap-1 bg-red-50 px-3 py-2 rounded border border-red-100 w-fit">
                                    <X size={14}/> Document indisponibil
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ACTION FOOTER */}
            <div className="bg-gray-50 px-6 py-4 border-t border-gray-100 flex gap-4">
                <button 
                    onClick={() => onDecision(claim.id, 'reject')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-red-200 text-red-600 rounded-lg hover:bg-red-50 font-bold transition shadow-sm hover:shadow"
                >
                    <X size={18} /> Respinge
                </button>
                <button 
                    onClick={() => onDecision(claim.id, 'approve')}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-sm hover:shadow-md"
                >
                    <Check size={18} /> Aprobă Transferul
                </button>
            </div>
        </div>
    );
}

// PAGINA PRINCIPALA
export default function AdminPage() {
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [signedUrls, setSignedUrls] = useState<{[key: number]: string}>({}); 
    
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const checkPermissionAndFetch = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                router.push('/login');
                return;
            }

            if (session.user.id !== ADMIN_ID) {
                alert("Acces Interzis! Această pagină este doar pentru administrator.");
                router.push('/');
                return;
            }

            try {
                const res = await axios.get('http://127.0.0.1:8000/admin/claims', {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                
                const claimsData = res.data;
                setClaims(claimsData);

                const urlsMap: {[key: number]: string} = {};
                for (const claim of claimsData) {
                    if (claim.proof_document_url) {
                        const { data } = await supabase.storage
                            .from('claim-documents')
                            .createSignedUrl(claim.proof_document_url, 3600); 

                        if (data?.signedUrl) urlsMap[claim.id] = data.signedUrl;
                    }
                }
                setSignedUrls(urlsMap);

            } catch (err) {
                console.error("Eroare admin:", err);
                alert("Eroare la încărcarea datelor.");
            } finally {
                setLoading(false);
            }
        };

        checkPermissionAndFetch();
    }, [router, supabase]);

    const handleDecision = async (id: number, decision: 'approve' | 'reject') => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!confirm(`Ești sigur că vrei să ${decision === 'approve' ? 'APROBI' : 'RESPINGI'} cererea?`)) return;

        try {
            await axios.post(
                `http://127.0.0.1:8000/admin/claims/${id}/${decision}`, 
                {}, 
                { headers: { Authorization: `Bearer ${session?.access_token}` } }
            );
            alert("Succes!");
            window.location.reload();
        } catch (err) {
            alert("Eroare la procesare.");
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 text-gray-500">
                <ShieldAlert size={48} className="mb-4 text-blue-600 animate-pulse" />
                <h2 className="text-xl font-bold">Verificare Permisiuni...</h2>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 pb-20">
            <Navbar />
            <div className="max-w-5xl mx-auto p-4 md:p-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                        <ShieldAlert className="text-blue-600 h-8 w-8"/> 
                        Admin Panel
                    </h1>
                    <div className="bg-white px-4 py-2 rounded-full shadow-sm text-sm font-bold text-gray-600">
                        {claims.length} {claims.length === 1 ? 'Cerere' : 'Cereri'} în așteptare
                    </div>
                </div>

                {claims.length === 0 ? (
                    <div className="bg-white p-12 rounded-xl text-center text-gray-500 shadow-sm border border-gray-200">
                        <div className="bg-green-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Check className="h-10 w-10 text-green-600" />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Totul este la zi!</h3>
                        <p className="max-w-md mx-auto">Nu există cereri de revendicare în așteptare. Relaxează-te și bea o cafea. ☕</p>
                    </div>
                ) : (
                    <div className="grid gap-8">
                        {claims.map((claim) => (
                            <ClaimCard 
                                key={claim.id} 
                                claim={claim} 
                                signedUrl={signedUrls[claim.id]} 
                                onDecision={handleDecision}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}