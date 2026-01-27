'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import { Check, X, FileText, Phone, ExternalLink } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { createClient } from '../../../utils/supabase/client';

export default function AdminPage() {
    const [claims, setClaims] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    // Ținem link-urile generate aici: { claim_id: "https://signed-url..." }
    const [signedUrls, setSignedUrls] = useState<{[key: number]: string}>({}); 
    
    const supabase = createClient();

    useEffect(() => {
        fetchClaims();
    }, []);

    const fetchClaims = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;
        
        try {
            // 1. Luăm cererile din DB
            const res = await axios.get('http://127.0.0.1:8000/admin/claims', {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            
            const claimsData = res.data;
            setClaims(claimsData);

            // 2. Generăm Signed URLs pentru fiecare document
            const urlsMap: {[key: number]: string} = {};
            
            for (const claim of claimsData) {
                if (claim.proof_document_url) {
                    // Presupunem că proof_document_url este calea (path)
                    const { data, error } = await supabase.storage
                        .from('claim-documents')
                        .createSignedUrl(claim.proof_document_url, 3600); // Link valabil 1 oră (3600 sec)

                    if (data?.signedUrl) {
                        urlsMap[claim.id] = data.signedUrl;
                    }
                }
            }
            setSignedUrls(urlsMap);

        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

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
            fetchClaims(); 
        } catch (err) {
            alert("Eroare la procesare.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-100">
            <Navbar />
            <div className="max-w-6xl mx-auto p-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-6">Admin Panel - Cereri Revendicare</h1>

                {loading ? <p>Se încarcă...</p> : claims.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl text-center text-gray-500 shadow">Nu există cereri în așteptare.</div>
                ) : (
                    <div className="grid gap-4">
                        {claims.map((claim) => (
                            <div key={claim.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                                <div>
                                    <h3 className="font-bold text-lg">Cerere #{claim.id} - Listing ID: {claim.listing_id}</h3>
                                    <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                                        <div className="flex items-center gap-2">
                                            <Phone size={14} /> Telefon: <span className="font-mono bg-gray-100 px-2 rounded">{claim.contact_info || '-'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-400">User ID: {claim.user_id}</span>
                                        </div>
                                        
                                        <div className="mt-2">
                                            {/* Aici folosim URL-ul semnat */}
                                            {signedUrls[claim.id] ? (
                                                <a 
                                                    href={signedUrls[claim.id]} 
                                                    target="_blank" 
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center gap-1 text-blue-600 hover:underline font-bold bg-blue-50 px-3 py-1 rounded border border-blue-100"
                                                >
                                                    <FileText size={16} /> Vezi Documentul (Securizat) <ExternalLink size={12}/>
                                                </a>
                                            ) : (
                                                <span className="text-red-500 text-xs">Document indisponibil sau expirat</span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3">
                                    <button 
                                        onClick={() => handleDecision(claim.id, 'reject')}
                                        className="flex items-center gap-1 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-bold transition"
                                    >
                                        <X size={18} /> Respinge
                                    </button>
                                    <button 
                                        onClick={() => handleDecision(claim.id, 'approve')}
                                        className="flex items-center gap-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition shadow-sm"
                                    >
                                        <Check size={18} /> Aprobă Transferul
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}