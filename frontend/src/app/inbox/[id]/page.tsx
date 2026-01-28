'use client';
import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import { Send, ArrowLeft, Loader2, User, Home } from 'lucide-react'; // Am adaugat Home
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { createClient } from '../../../../utils/supabase/client';

export default function ChatPage() {
    const { id: conversationId } = useParams();
    const [messages, setMessages] = useState<any[]>([]);
    const [newMessage, setNewMessage] = useState("");
    const [loading, setLoading] = useState(true);
    const [userId, setUserId] = useState<string | null>(null);
    const [sending, setSending] = useState(false);
    
    // State pentru detaliile casei (Titlu, Poza, Pret)
    const [conversationDetails, setConversationDetails] = useState<any>(null);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const supabase = createClient();
    const router = useRouter();

    // Helper pentru a afisa imaginile (inclusiv cele de pe OLX prin proxy)
    const getImageUrl = (url: string) => {
        if (!url) return undefined;
        if (url.includes('olx')) {
            return `/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    // INCARCARE DATE (User + Istoric Mesaje + Detalii Casa)
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (!session) {
                    router.push('/login');
                    return;
                }
                setUserId(session.user.id);

                // Cerem mesajele vechi
                const messagesRes = await axios.get(`http://127.0.0.1:8000/chat/conversations/${conversationId}/messages`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                setMessages(messagesRes.data);

                // Cerem detaliile conversatiei (Titlu anunt, Poza)
                const detailsRes = await axios.get(`http://127.0.0.1:8000/chat/conversations/${conversationId}`, {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                setConversationDetails(detailsRes.data);

            } catch (err) {
                console.error("Eroare la incarcarea datelor:", err);
            } finally {
                setLoading(false);
            }
        };

        if (conversationId) {
            fetchHistory();
        }
    }, [conversationId, router, supabase]);

    // SUPABASE REALTIME
    useEffect(() => {
        if (!conversationId) return;

        const channel = supabase
            .channel(`chat:${conversationId}`)
            .on(
                'postgres_changes',
                {
                    event: 'INSERT', 
                    schema: 'public',
                    table: 'messages',
                    filter: `conversation_id=eq.${conversationId}` 
                },
                (payload) => {
                    setMessages((prev) => {
                        if (prev.find(m => m.id === payload.new.id)) return prev;
                        return [...prev, payload.new];
                    });
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [conversationId, supabase]);

    // Auto-scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Trimite Mesaj
    const handleSend = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!newMessage.trim() || !userId) return;

        setSending(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            await axios.post(
                `http://127.0.0.1:8000/chat/conversations/${conversationId}/reply`,
                { content: newMessage },
                { headers: { Authorization: `Bearer ${session?.access_token}` } }
            );
            setNewMessage("");
        } catch (err) {
            console.error("Eroare send", err);
            alert("Nu s-a putut trimite mesajul.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-100">
            <Navbar />
            
            {/* HEADER CHAT */}
            <div className="bg-white border-b px-4 py-3 flex items-center gap-3 shadow-sm sticky top-0 z-10">
                <Link href="/inbox" className="p-2 hover:bg-gray-100 rounded-full transition">
                    <ArrowLeft size={20} className="text-gray-600"/>
                </Link>
                
                <div className="flex items-center gap-3 overflow-hidden">
                    {/* POZA */}
                    <div className="w-10 h-10 bg-gray-200 rounded-lg overflow-hidden shrink-0 border border-gray-300 relative">
                        {conversationDetails?.listing?.image_url ? (
                            <img 
                                src={getImageUrl(conversationDetails.listing.image_url)} 
                                alt="Proprietate"
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-500">
                                <Home size={18}/>
                            </div>
                        )}
                    </div>

                    {/* TITLU & PRET */}
                    <div className="min-w-0">
                        <h2 className="font-bold text-gray-900 leading-tight truncate text-sm md:text-base pr-4">
                            {conversationDetails?.listing?.title || `Discuție #${conversationId}`}
                        </h2>
                        <div className="flex items-center gap-2">
                             {conversationDetails?.listing?.price_eur && (
                                <span className="text-xs text-blue-600 font-bold bg-blue-50 px-1.5 rounded">
                                    {conversationDetails.listing.price_eur.toLocaleString()} €
                                </span>
                             )}
                            <span className="text-[10px] text-green-600 font-medium flex items-center gap-1">
                                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span> Chat Activ
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Zona Mesaje */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
                {loading ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="animate-spin text-blue-600" size={32} />
                    </div>
                ) : messages.length === 0 ? (
                    <div className="text-center text-gray-400 py-10 text-sm">
                        Nu exista mesaje. Scrie primul mesaj!
                    </div>
                ) : (
                    messages.map((msg) => {
                        const isMe = msg.sender_id === userId;
                        return (
                            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[75%] px-4 py-2 rounded-2xl shadow-sm text-sm ${
                                    isMe ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-white text-gray-800 border border-gray-200 rounded-tl-none'
                                }`}>
                                    <p>{msg.content}</p>
                                    <p className={`text-[10px] mt-1 text-right ${isMe ? 'text-blue-200' : 'text-gray-400'}`}>
                                        {new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                    </p>
                                </div>
                            </div>
                        );
                    })
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Zona Input */}
            <div className="bg-white border-t p-4 pb-8 md:pb-4">
                <form onSubmit={handleSend} className="max-w-4xl mx-auto flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-full px-4 py-2 focus-within:ring-2 focus-within:ring-blue-500 transition">
                    <input 
                        type="text" 
                        placeholder="Scrie un mesaj..." 
                        className="flex-1 bg-transparent outline-none text-sm"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                    />
                    <button type="submit" disabled={sending || !newMessage.trim()} className={`p-2 rounded-full transition ${sending || !newMessage.trim() ? 'text-gray-400' : 'text-blue-600 hover:bg-blue-100'}`}>
                        {sending ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} />}
                    </button>
                </form>
            </div>
        </div>
    );
}