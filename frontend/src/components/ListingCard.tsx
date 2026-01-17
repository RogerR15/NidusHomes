'use client';
import { Home, Maximize2, MapPin } from 'lucide-react';

interface Listing {
    id: number;
    title: string;
    price: number;
    price_eur?: number;
    sqm: number;
    neighborhood: string;
    image_url?: string;
}

export default function ListingCard({ listing }: { listing: Listing }) {
    // Folosim price_eur dacă price lipsește (pentru siguranță)
    const displayPrice = listing.price || listing.price_eur || 0;

    const getImageUrl = (listing: any) => {
        if (!listing.image_url) return null;

        // Dacă e de pe OLX, îl trecem prin proxy-ul nostru
        if (listing.source_platform === 'OLX') {
            // encodeURIComponent este vital pentru a trimite URL-ul ca parametru
            return `/api/image-proxy?url=${encodeURIComponent(listing.image_url)}`;
        }

        // Dacă e Storia sau altceva, îl folosim direct
        return listing.image_url;
    };

    const displayImageUrl = getImageUrl(listing);

    return (
        <div className="group border rounded-xl overflow-hidden shadow-sm hover:shadow-xl bg-white cursor-pointer transition-all duration-300 border-gray-100 hover:border-blue-400">

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
                {/* Badge pentru sursă (Opțional) */}
                <div className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-1 rounded text-[10px] font-bold shadow-sm uppercase">
                    Iași
                </div>
            </div>

            {/* Secțiunea Detalii */}
            <div className="p-4">
                <div className="flex justify-between items-start mb-1">
                    <p className="text-blue-600 font-black text-2xl">
                        {displayPrice.toLocaleString()} €
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
        </div>
    );
}