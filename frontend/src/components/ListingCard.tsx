'use client';
import { Home, Maximize2, MapPin, Heart, Clock, TrendingDown, ImageOff, BedDouble, Ruler } from 'lucide-react';
import { Listing } from '@/types';
import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';
import { Badge } from './ui/badge';


export default function ListingCard({ listing }: { listing: Listing }) {
    // Folosim price_eur daca price lipseste (pentru siguranta)
    const displayPrice = listing.price || listing.price_eur || 0;
    const isRent = listing.transaction_type === 'RENT';

    const [isFavorite, setIsFavorite] = useState(false);
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);

    const finalPrice = listing.price || listing.price_eur || 0;
    const sqm = listing.sqm || 0;
    const pricePerSqm = sqm > 0 && finalPrice > 0 ? Math.round(finalPrice / sqm) : 0;

    const isGoodDeal = pricePerSqm > 0 && pricePerSqm < 1350;

    const isNew = new Date(listing.created_at).getTime() > Date.now() - (48 * 60 * 60 * 1000);

    const rawDate = new Date(listing.created_at);
    const dateAdded = rawDate.toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
    const getImageUrl = (listing: any) => {
        if (!listing.image_url) return null;

        // Daca e de pe OLX, il trecem prin proxy-ul nostru
        if (listing.source_platform === 'OLX') {
            // encodeURIComponent este vital pentru a trimite URL-ul ca parametru
            return `/api/image-proxy?url=${encodeURIComponent(listing.image_url)}`;
        }

        // Daca e Storia sau altceva, il folosim direct
        return listing.image_url;
    };

    const displayImageUrl = getImageUrl(listing);

    useEffect(() => {
        const checkFavorite = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            setUserId(user.id);

            const { data } = await supabase
                .from('favorites')
                .select('*')
                .eq('user_id', user.id)
                .eq('listing_id', listing.id)
                .maybeSingle()

            if (data) setIsFavorite(true);
        };
        checkFavorite();
    }, [listing.id]);

    const toggleFavorite = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();

        if (!userId) {
            alert("Trebuie sa fii autentificat pentru a salva anunturi!");
            return;
        }

        if (isFavorite) {
            // STERGE
            await supabase
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('listing_id', listing.id);
            setIsFavorite(false);
        } else {
            // ADAUGA
            await supabase
                .from('favorites')
                .insert([{ user_id: userId, listing_id: listing.id }]);
            setIsFavorite(true);
        }
    };

    return (
        <div className="group relative border rounded-xl overflow-hidden shadow-sm hover:shadow-xl bg-white cursor-pointer transition-all duration-300 border-gray-100 hover:border-blue-400">

            {/*(SMART BADGES)*/}
            <div className="absolute top-3 left-3 z-1 flex flex-col gap-2 items-start">
                {isNew && (
                    <Badge className="bg-blue-600/90 hover:bg-blue-700 backdrop-blur-sm text-white border-none shadow-sm px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold">
                        <Clock size={10} className="mr-1" /> Nou
                    </Badge>
                )}
                {isGoodDeal && (
                    <Badge className="bg-emerald-600/90 hover:bg-emerald-700 backdrop-blur-sm text-white border-none shadow-sm px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold">
                        <TrendingDown size={10} className="mr-1" /> Pret Bun
                    </Badge>
                )}
            </div>
            {/* BUTON FAVORITE */}
            <button
                onClick={(e) => {
                    e.preventDefault();
                    toggleFavorite(e);
                }}
                className={`absolute top-3 right-3 z-1 p-2 rounded-full transition-all duration-300 ${isFavorite
                    ? "bg-white text-red-500 shadow-md scale-110"
                    : "bg-black/20 text-white hover:bg-white hover:text-red-500 backdrop-blur-sm"
                    }`}
            >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
            </button>

            <Link href={`/listing/${listing.id}`}>
                {/* Sectiunea Imagine */}
                <div className="relative h-48 w-full bg-gray-200 overflow-hidden">
                    {displayImageUrl ? (
                        <img
                            src={displayImageUrl}
                            alt={listing.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                                // Fallback in caz ca si proxy-ul esueaza
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
                        Iasi
                    </div>
                    <div className="absolute bottom-4 left-4 text-white">

                        <div className="text-[10px] text-gray-300 font-medium bg-black/30 px-1.5 py-0.5 rounded inline-block mt-1 backdrop-blur-md border border-white/10 uppercase">
                            {listing.source_platform || 'Nidus'}
                        </div>
                    </div>
                </div>
            </Link>


            {/* Sectiunea Detalii */}
            <Link href={`/listing/${listing.id}`}>
                <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-blue-600 font-black text-2xl">
                            {displayPrice.toLocaleString()} € {isRent && <span className="text-sm text-gray-500 font-normal">/ luna</span>}
                        </p>
                    </div>

                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 h-10 mb-3 group-hover:text-blue-700">
                        {listing.title}
                    </h3>

                    <div className="flex items-center text-slate-500 text-xs mb-4 gap-1.5">
                        <MapPin size={14} className="text-blue-500 shrink-0" />
                        <span className="truncate">{listing.neighborhood || 'Iași'}</span>
                    </div>

                    {/* Facilitati */}
                    <div className="flex items-center gap-3 text-slate-700 text-xs font-medium border-t border-gray-50 pt-3 mt-auto">
                        <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded" title="Camere">
                            <BedDouble size={14} className="text-slate-400" />
                            <span>{listing.rooms || '-'} <span className="text-slate-400 font-normal">cam</span></span>
                        </div>

                        {/* Afisam suprafata doar daca exista */}
                        {sqm > 0 && (
                            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded" title="Suprafata">
                                <Ruler size={14} className="text-slate-400" />
                                <span>{sqm} <span className="text-slate-400 font-normal">mp</span></span>
                            </div>
                        )}
                    </div>

                    <div className="mt-3 flex justify-between items-center text-[10px] text-slate-400 font-medium">
                        <span>Adaugat: {dateAdded}</span>
                        {pricePerSqm > 0 && !isRent && (
                            <span className="text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                {pricePerSqm} €/mp
                            </span>
                        )}
                    </div>
                </div>
            </Link>
        </div >
    );
}