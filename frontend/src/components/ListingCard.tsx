'use client';
import { Home, Maximize2, MapPin, Heart } from 'lucide-react';
import { Listing } from '@/types';
import { useEffect, useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import Link from 'next/link';

export default function ListingCard({ listing }: { listing: Listing }) {
    // Folosim price_eur dacă price lipsește (pentru siguranță)
    const displayPrice = listing.price || listing.price_eur || 0;
    const isRent = listing.transaction_type === 'RENT';

    const getImageUrl = (listing: any) => {
        if (!listing.image_url) return null;

        // Daca e de pe OLX, îl trecem prin proxy-ul nostru
        if (listing.source_platform === 'OLX') {
            // encodeURIComponent este vital pentru a trimite URL-ul ca parametru
            return `/api/image-proxy?url=${encodeURIComponent(listing.image_url)}`;
        }

        // Dacă e Storia sau altceva, îl folosim direct
        return listing.image_url;
    };

    const displayImageUrl = getImageUrl(listing);

    const [isFavorite, setIsFavorite] = useState(false);
    const supabase = createClient();
    const [userId, setUserId] = useState<string | null>(null);

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
            alert("Trebuie să fii autentificat pentru a salva anunțuri!");
            return;
        }

        if (isFavorite) {
            // ȘTERGE
            await supabase
                .from('favorites')
                .delete()
                .eq('user_id', userId)
                .eq('listing_id', listing.id);
            setIsFavorite(false);
        } else {
            // ADAUGĂ
            await supabase
                .from('favorites')
                .insert([{ user_id: userId, listing_id: listing.id }]);
            setIsFavorite(true);
        }
    };

    return (
        <div className="group relative border rounded-xl overflow-hidden shadow-sm hover:shadow-xl bg-white cursor-pointer transition-all duration-300 border-gray-100 hover:border-blue-400">


            <Link href={`/listing/${listing.id}`}>
                {/* Secțiunea Imagine */}
                <div className="relative h-48 w-full bg-gray-200 overflow-hidden">
                    {displayImageUrl ? (
                        <img
                            src={displayImageUrl}
                            alt={listing.title}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                            onError={(e) => {
                                // Fallback în caz că și proxy-ul eșuează
                                e.currentTarget.src = "https://placehold.co/600x400/e2e8f0/1e293b?text=Fara+Imagine";
                            }}
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-400">
                            <Home size={40} strokeWidth={1} />
                        </div>
                    )}
                    <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase">
                        Iași
                    </div>
                </div>
            </Link>


            <button
                onClick={toggleFavorite}
                className="absolute top-2 right-2 p-2 rounded-full bg-white/80 hover:bg-white backdrop-blur-sm transition-all shadow-sm z-20 group/heart"
            >
                <Heart
                    size={18}
                    className={`transition-colors duration-200 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-600 group-hover/heart:text-red-500'}`}
                />
            </button>

            {/* Badge pentru sursă (Opțional) */}


            {/* Secțiunea Detalii */}
            <Link href={`/listing/${listing.id}`}>
                <div className="p-4">
                    <div className="flex justify-between items-start mb-1">
                        <p className="text-blue-600 font-black text-2xl">
                            {displayPrice.toLocaleString()} € {isRent && <span className="text-sm text-gray-500 font-normal">/ lună</span>}
                        </p>
                    </div>

                    <h3 className="font-semibold text-gray-800 text-sm line-clamp-2 h-10 mb-3 group-hover:text-blue-700">
                        {listing.title}
                    </h3>

                    <div className="flex items-center gap-4 pt-3 border-t border-gray-50 text-gray-500">
                        <span className="flex items-center gap-1.5 text-xs font-medium">
                            <Maximize2 size={14} className="text-gray-400" />
                            {listing.sqm} mp
                        </span>
                        <span className="flex items-center gap-1.5 text-xs font-medium truncate">
                            <MapPin size={14} className="text-gray-400" />
                            {listing.neighborhood}
                        </span>
                    </div>
                </div>
            </Link>
        </div >
    );
}