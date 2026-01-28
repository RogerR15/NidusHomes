'use client';
import { useState } from 'react';
import { Send, MessageSquare, AlertTriangle, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import Link from 'next/link';
import { createClient } from '../../utils/supabase/client';
import ClaimModal from './ClaimModal';

interface ContactFormProps {
    listingId: number;
    ownerId: string | null;
}

export default function ContactForm({ listingId, ownerId }: ContactFormProps) {
    const [message, setMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);
    const [isClaimOpen, setIsClaimOpen] = useState(false);
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

    // MESAJ TRIMIS 
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

    // FORMULAR 
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

    return (
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm sticky top-24">
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