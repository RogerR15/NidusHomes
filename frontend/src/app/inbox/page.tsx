'use client';
import { useEffect, useState } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { MessageCircle, ArrowRight, Home, ImageOff } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { createClient } from '../../../utils/supabase/client';

export default function InboxPage() {
    const [conversations, setConversations] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const supabase = createClient();
    const router = useRouter();

    useEffect(() => {
        const fetchConvos = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                router.push('/login');
                return;
            }

            try {
                const res = await axios.get('http://127.0.0.1:8000/chat/conversations', {
                    headers: { Authorization: `Bearer ${session.access_token}` }
                });
                setConversations(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchConvos();
    }, [router]);

    // Helper pentru Proxy Imagini (ca să meargă pozele de pe OLX)
    const getImageUrl = (url: string): string | undefined => {
        if (!url) return undefined;
        if (url.includes('olx')) {
            return `/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />
            <main className="max-w-4xl mx-auto p-4 md:p-8">
                <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <MessageCircle className="text-blue-600"/> Conversațiile Mele
                </h1>

                {loading ? (
                    <div className="text-center text-gray-500 py-10">Se încarcă discuțiile...</div>
                ) : conversations.length === 0 ? (
                    <div className="bg-white p-10 rounded-xl text-center shadow-sm border border-gray-200">
                        <div className="bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                            <MessageCircle size={32} />
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg">Niciun mesaj încă</h3>
                        <p className="text-gray-500 mb-4">Contactează proprietarii pentru a începe o discuție.</p>
                        <Link href="/" className="text-blue-600 font-bold hover:underline">
                            Vezi Anunțuri 
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {conversations.map((conv) => {
                            const listing = conv.listing;
                            return (
                                <Link 
                                    key={conv.id} 
                                    href={`/inbox/${conv.id}`} 
                                    className="block bg-white p-4 rounded-xl border border-gray-200 hover:shadow-md hover:border-blue-300 transition group"
                                >
                                    <div className="flex justify-between items-center gap-4">
                                        <div className="flex items-center gap-4 flex-1">
                                            
                                            {/* POZA ANUNȚULUI */}
                                            <div className="relative w-16 h-16 bg-gray-100 rounded-full overflow-hidden shrink-0 border border-gray-100">
                                                {listing && listing.image_url ? (
                                                    <img 
                                                        src={getImageUrl(listing.image_url)} 
                                                        alt="House" 
                                                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                                                        <ImageOff size={20}/>
                                                    </div>
                                                )}
                                            </div>

                                            {/* TITLU ȘI DETALII */}
                                            <div className="flex-1 min-w-0">
                                                <h3 className="font-bold text-gray-900 truncate text-base">
                                                    {listing ? listing.title : `Discuție Anunț #${conv.listing_id}`}
                                                </h3>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                                                        {listing ? `${listing.price_eur} €` : 'Nespecificat'}
                                                    </span>
                                                    <span className="text-xs text-gray-400">
                                                        • Ultima activitate: {new Date(conv.updated_at).toLocaleDateString('ro-RO')}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <ArrowRight className="text-gray-300 group-hover:text-blue-600 transition" />
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </main>
        </div>
    );
}