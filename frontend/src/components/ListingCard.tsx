'use client';
import { Home, Maximize2, MapPin, Heart, Clock, TrendingDown, ImageOff, BedDouble, Ruler, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import { Listing } from '@/types';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Badge } from './ui/badge';
import axios from 'axios';
import ClaimModal from './ClaimModal';
import { createClient } from '../../utils/supabase/client';

export default function ListingCard({ listing }: { listing: Listing }) {
    const displayPrice = listing.price || listing.price_eur || 0;
    const isRent = listing.transaction_type === 'RENT';

    const supabase = createClient();
    
    const [isFavorite, setIsFavorite] = useState(false);
    const [favCount, setFavCount] = useState(listing.favorites_count || 0);
    const [isLoadingFav, setIsLoadingFav] = useState(false);
    const [isClaimOpen, setIsClaimOpen] = useState(false);
    
    const canClaim = listing.source_platform !== 'NidusHomes' && !listing.is_claimed;

    const finalPrice = listing.price || listing.price_eur || 0;
    const sqm = listing.sqm || 0;
    const pricePerSqm = sqm > 0 && finalPrice > 0 ? Math.round(finalPrice / sqm) : 0;

    const isGoodDeal = pricePerSqm > 0 && pricePerSqm < 1350;
    const isNew = new Date(listing.created_at).getTime() > Date.now() - (48 * 60 * 60 * 1000);

    const rawDate = new Date(listing.created_at);
    const dateAdded = rawDate.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' });

    const getImageUrl = (listing: any) => {
        if (!listing.image_url) return null;
        if (listing.source_platform === 'OLX') {
            return `/api/image-proxy?url=${encodeURIComponent(listing.image_url)}`;
        }
        return listing.image_url;
    };

    const displayImageUrl = getImageUrl(listing);

    useEffect(() => {
        const checkFavorite = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            const { data } = await supabase
                .from('favorites')
                .select('*')
                .eq('user_id', session.user.id)
                .eq('listing_id', listing.id)
                .maybeSingle();

            if (data) setIsFavorite(true);
        };
        checkFavorite();
    }, [listing.id]);

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsLoadingFav(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                alert("Trebuie să fii autentificat pentru a salva anunțuri!");
                return;
            }

            const res = await axios.post(
                `http://127.0.0.1:8000/listings/${listing.id}/favorite`,
                {}, 
                { headers: { Authorization: `Bearer ${session.access_token}` } }
            );

            setIsFavorite(res.data.is_favorited);
            setFavCount(res.data.favorites_count);

        } catch (error) {
            console.error("Eroare la favorite:", error);
        } finally {
            setIsLoadingFav(false);
        }
    };

    return (
        <>
            <ClaimModal 
                listingId={listing.id}
                isOpen={isClaimOpen}
                onClose={() => setIsClaimOpen(false)}
            />

            <div className="group relative border rounded-xl overflow-hidden shadow-sm hover:shadow-xl bg-white cursor-pointer transition-all duration-300 border-gray-100 hover:border-blue-400 flex flex-col h-full">

                <div className="absolute top-3 left-3 z-1 flex flex-col gap-2 items-start">
                    {isNew && (
                        <Badge className="bg-blue-600/90 hover:bg-blue-700 backdrop-blur-sm text-white border-none shadow-sm px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold">
                            <Clock size={10} className="mr-1" /> Nou
                        </Badge>
                    )}
                    {isGoodDeal && (
                        <Badge className="bg-emerald-600/90 hover:bg-emerald-700 backdrop-blur-sm text-white border-none shadow-sm px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold">
                            <TrendingDown size={10} className="mr-1" /> Preț Bun
                        </Badge>
                    )}
                </div>

                <button
                    onClick={toggleFavorite}
                    disabled={isLoadingFav}
                    className={`absolute top-3 right-3 z-1 p-2 rounded-full transition-all duration-300 flex items-center gap-1 ${
                        isFavorite
                        ? "bg-white text-red-500 shadow-md scale-105"
                        : "bg-black/20 text-white hover:bg-white hover:text-red-500 backdrop-blur-sm"
                    }`}
                >
                    {isLoadingFav ? (
                        <Loader2 size={18} className="animate-spin" />
                    ) : (
                        <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                    )}
                </button>

                <Link href={`/listing/${listing.id}`} className="block h-48 relative overflow-hidden bg-gray-200">
                    {displayImageUrl ? (
                        <img
                            src={displayImageUrl}
                            alt={listing.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                                e.currentTarget.src = "https://placehold.co/600x400/e2e8f0/1e293b?text=Fara+Imagine";
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-400 bg-slate-50 gap-2">
                            <ImageOff size={32} className="opacity-20" />
                            <span className="text-xs font-medium opacity-50">Fara imagine</span>
                        </div>
                    )}
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase">
                        Iași
                    </div>
                    
                    {/* Badge Sursa */}
                    <div className="absolute bottom-2 left-2 text-white">
                        <div className="text-[9px] text-gray-300 font-medium bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-md uppercase">
                            {listing.source_platform || 'Nidus'}
                        </div>
                    </div>
                </Link>

                <Link href={`/listing/${listing.id}`} className="flex flex-col flex-1 p-4">
                    
                    {/* Pret & Titlu */}
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-blue-600 font-black text-2xl">
                            {displayPrice.toLocaleString()} € {isRent && <span className="text-sm text-gray-500 font-normal">/ luna</span>}
                        </p>
                    </div>

                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 h-10 mb-2 group-hover:text-blue-700">
                        {listing.title}
                    </h3>

                    {/* Locatie */}
                    <div className="flex items-center text-slate-500 text-xs mb-2 gap-1.5">
                        <MapPin size={14} className="text-blue-500 shrink-0" />
                        <span className="truncate">{listing.neighborhood || 'Iași'}</span>
                    </div>

                    {/* ZONA REVENDICARE */}
                    {canClaim && (
                        <div 
                            onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                setIsClaimOpen(true);
                            }}
                            className="mb-4 mt-1 bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex items-center justify-between cursor-pointer hover:bg-indigo-100 transition-colors group/claim"
                        >
                            <div className="flex items-center gap-1.5 text-xs text-indigo-800 font-medium">
                                <UserCheck size={14} />
                                <span>Ești proprietarul?</span>
                            </div>
                            <span className="text-[10px] font-bold text-white bg-indigo-600 px-2 py-1 rounded group-hover/claim:bg-indigo-700 transition-colors">
                                Revendică
                            </span>
                        </div>
                    )}

                    {/* Facilitati */}
                    <div className="flex items-center gap-3 text-slate-700 text-xs font-medium border-t border-gray-50 pt-3 mt-auto">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded" title="Camere">
                            <BedDouble size={14} className="text-slate-400" />
                            <span>{listing.rooms || '-'} <span className="text-slate-400 font-normal">cam</span></span>
                        </div>

                        {sqm > 0 && (
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded" title="Suprafata">
                                <Ruler size={14} className="text-slate-400" />
                                <span>{sqm} <span className="text-slate-400 font-normal">mp</span></span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Adăugat: {dateAdded}</span>
                        {pricePerSqm > 0 && !isRent && (
                            <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {pricePerSqm} €/mp
                            </span>
                        )}
                    </div>
                </Link>
            </div >
        </>
    );
}