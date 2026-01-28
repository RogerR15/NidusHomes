'use client';
import { useState } from 'react';
import { Send, MessageSquare, AlertTriangle, ShieldCheck, Star } from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';
import { createClient } from '../../utils/supabase/client';
import ClaimModal from './ClaimModal';
import StarRating from './StarRating'; 

interface ContactFormProps {
    listingId: number;
    ownerId: string | null;
    agentDetails?: {  
        agency_name: string;
        phone_number: string;
        rating: number;
        is_verified: boolean;
    }
}

export default function ContactForm({ listingId, ownerId, agentDetails }: ContactFormProps) {
    // State-uri existente
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [isClaimOpen, setIsClaimOpen] = useState(false);
    
    // State-uri NOI pentru Review
    const [showReview, setShowReview] = useState(false);
    const [reviewRating, setReviewRating] = useState(0);
    const [reviewText, setReviewText] = useState("");
    
    const supabase = createClient();

    
    // ANUNT NEREVENDICAT (Fara Proprietar)
    
    if (!ownerId) {
        return (
            <>
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-6 shadow-sm sticky top-24">
                <div className="flex items-start gap-3">
                    <div className="bg-orange-100 p-2 rounded-full shrink-0">
                        <AlertTriangle className="text-orange-600" size={24} />
                    </div>
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg mb-1">
                            Anunț Nerevendicat
                        </h3>
                        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                            Acest anunț a fost preluat automat din surse publice și nu are înca un proprietar verificat pe platforma noastra.
                        </p>
                        
                        <div className="bg-white p-3 rounded-lg border border-orange-100 text-xs text-gray-500 mb-4">
                            Nu poți trimite mesaje momentan. Vezi anunțul pe plaforma de unde a fost extras.
                        </div>
 
                        {/* Buton Revendicare */}
                           <button 
                                onClick={() => setIsClaimOpen(true)}
                                className="flex items-center justify-center gap-2 w-full bg-gray-900 text-white font-bold py-3 rounded-lg hover:bg-gray-800 transition shadow-lg text-sm"
                            >
                                <ShieldCheck size={18}/>
                                Ești proprietarul? Revendica-l!
                            </button>
                    </div>
                </div>
            </div>
            <ClaimModal 
                    listingId={listingId}
                    isOpen={isClaimOpen}
                    onClose={() => setIsClaimOpen(false)}
                />
            </>
        );
    }

   
    // MESAJ DEJA TRIMIS (FEEDBACK)
    if (sent) {
        return (
            <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center sticky top-24">
                <div className="bg-green-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                    <Send size={24} />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">Mesaj Trimis!</h3>
                <p className="text-sm text-gray-600 mb-4">Proprietarul a fost notificat.</p>
                
                <Link 
                    href="/inbox" 
                    className="block w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition text-sm"
                >
                    Mergi la Conversațiile Mele
                </Link>
                <button 
                    onClick={() => setSent(false)} 
                    className="mt-3 text-xs text-gray-500 hover:underline"
                >
                    Trimite alt mesaj
                </button>
            </div>
        );
    }


    // TRIMITERE MESAJ (CHAT) 
    const handleSend = async () => {
        if (!message.trim()) return;
        setLoading(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                alert("Trebuie sa te autentifici pentru a trimite mesaje.");
                return;
            }

            if (session.user.id === ownerId) {
                alert("Nu îți poți trimite mesaje ție însuți.");
                return;
            }

            await axios.post(
                'http://127.0.0.1:8000/chat/send',
                { listing_id: listingId, content: message },
                { headers: { Authorization: `Bearer ${session.access_token}` } }
            );

            setSent(true);
            setMessage("");
        } catch (error: any) {
            console.error(error);
            if (error.response?.data?.detail) {
                alert("⚠️ " + error.response.data.detail);
            } else {
                alert("Eroare la trimitere.");
            }
        } finally {
            setLoading(false);
        }
    };


    //TRIMITERE REVIEW (NOU)
    const handleSubmitReview = async () => {
        if (reviewRating === 0) return alert("Te rog selectează un număr de stele.");
        
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return alert("Trebuie să fii autentificat pentru a lăsa o recenzie.");

        if (session.user.id === ownerId) return alert("Nu îți poți lăsa singur recenzie.");

        try {
            await axios.post('http://127.0.0.1:8000/reviews', {
                agent_id: ownerId,
                rating: reviewRating,
                comment: reviewText
            }, {
                headers: { Authorization: `Bearer ${session.access_token}` }
            });
            
            alert("Recenzia a fost trimisă cu succes!");
            setShowReview(false); // Închidem formularul
            setReviewText("");
            setReviewRating(0);
        } catch (e) {
            alert("Eroare: Probabil ai lăsat deja o recenzie acestui agent.");
        }
    };

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
            
            {/* --- HEADER AGENT --- */}
            {agentDetails && (
                <div className="mb-6 border-b pb-4">
                    <div className="flex items-center gap-3 mb-2">
                        {/* Avatar Agent */}
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold text-lg">
                            {agentDetails.agency_name ? agentDetails.agency_name[0] : 'A'}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900">
                                {agentDetails.agency_name || "Agent Independent"}
                                {agentDetails.is_verified && <span className="ml-1 text-blue-500" title="Verificat">✓</span>}
                            </h3>
                            <div className="flex items-center text-yellow-500 text-sm font-medium">
                                ★ {agentDetails.rating || "5.0"} 
                                <span className="text-gray-400 ml-1 font-normal text-xs">(Rating mediu)</span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-600">Listing Agent</p>
                        
                        {/* BUTON TOGGLE REVIEW */}
                        <button 
                            onClick={() => setShowReview(!showReview)}
                            className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:bg-blue-50 px-2 py-1 rounded transition"
                        >
                            <Star size={12}/> {showReview ? "Închide" : "Lasă o recenzie"}
                        </button>
                    </div>
                </div>
            )}

            {/* --- FORMULAR REVIEW (CONDITIONAL) --- */}
            {showReview && (
                <div className="mb-6 bg-yellow-50 border border-yellow-100 rounded-lg p-4 animate-in fade-in slide-in-from-top-2">
                    <h4 className="font-bold text-sm text-gray-800 mb-2">Cum a fost experiența?</h4>
                    
                    <div className="mb-3 flex justify-center">
                        <StarRating totalStars={5} onRate={(val) => setReviewRating(val)} />
                    </div>

                    <textarea 
                        className="w-full border border-yellow-200 rounded p-2 text-sm mb-2 focus:ring-2 focus:ring-yellow-400 outline-none resize-none bg-white"
                        placeholder="Scrie o scurtă părere..."
                        rows={2}
                        value={reviewText}
                        onChange={e => setReviewText(e.target.value)}
                    />
                    
                    <button 
                        onClick={handleSubmitReview}
                        className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-bold py-2 rounded text-sm transition shadow-sm"
                    >
                        Trimite Recenzia
                    </button>
                </div>
            )}

            
            {/* --- FORMULAR MESAJ --- */}
            <h3 className="font-bold text-lg text-gray-900 mb-4 flex items-center gap-2">
                <MessageSquare className="text-blue-600" size={20}/> 
                Contacteaza Proprietarul
            </h3>
            
            <textarea
                className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-32 mb-4"
                placeholder="Buna ziua, sunt interesat de acest anunț. Când se poate viziona?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
            ></textarea>

            <button 
                onClick={handleSend}
                disabled={loading || !message.trim()}
                className={`w-full py-3 rounded-lg font-bold text-white transition flex items-center justify-center gap-2 ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}
            >
                {loading ? 'Se trimite...' : <><Send size={18}/> Trimite Mesaj</>}
            </button>
            
            <p className="text-xs text-gray-400 text-center mt-3">
                Prin trimiterea mesajului, accepți termenii și condițiile.
            </p>
        </div>
    );
}