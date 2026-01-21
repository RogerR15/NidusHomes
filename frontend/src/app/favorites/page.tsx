'use client';
import { useEffect, useState } from 'react';

import Navbar from '@/components/Navbar';
import ListingCard from '@/components/ListingCard';
import { Listing } from '@/types';
import Link from 'next/link';
import { createClient } from '../../../utils/supabase/client';

export default function FavoritesPage() {
    const supabase = createClient();
    const [listings, setListings] = useState<Listing[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavorites = async () => {
            // 1. Luăm userul curent
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            // 2. Cerem favoritele ȘI datele anunțului (JOIN)
            // Sintaxa 'listings(*)' înseamnă: "Adu-mi toate coloanele din tabelul listings legat de acest favorit"
            const { data, error } = await supabase
                .from('favorites')
                .select('listings(*)')
                .eq('user_id', user.id);

            if (error) {
                console.error('Eroare la favorite:', error);
            } else if (data) {
                // Supabase returnează un array de obiecte de tip { listings: { ... } }
                // Noi vrem doar array-ul de listing-uri, deci le extragem (flatten)
                const flatListings = data.map((item: any) => item.listings);
                setListings(flatListings);
            }
            setLoading(false);
        };

        fetchFavorites();
    }, []);

    return (
        <div className="min-h-screen bg-gray-50">
            <Navbar />

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex items-center justify-between mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Anunțuri Salvate</h1>
                    <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm font-bold">
                        {listings.length}
                    </span>
                </div>

                {loading ? (
                    <div className="text-center py-20 text-gray-500">Se încarcă favoritele...</div>
                ) : listings.length === 0 ? (
                    <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">

                        <h3 className="text-xl font-bold text-gray-900 mb-2">Nu ai niciun anunț salvat</h3>
                        <p className="text-gray-500 mb-6">Explorează piața și salvează cele mai bune oferte.</p>
                        <Link
                            href="/"
                            className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-blue-700 transition-colors"
                        >
                            Vezi Anunțuri
                        </Link>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {listings.map((listing) => (
                            <ListingCard key={listing.id} listing={listing} />
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}