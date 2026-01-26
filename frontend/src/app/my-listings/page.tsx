'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Navbar from '@/components/Navbar';
import { Trash2, MapPin, Edit } from 'lucide-react';
import Link from 'next/link';
import { createClient } from '../../../utils/supabase/client';

export default function MyListingsPage() {
    const [listings, setListings] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const supabase = createClient();

    // Functie sigura pentru formatarea datei
    const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Data necunoscuta';
    
    const date = new Date(dateString);
    
    // Verificam daca data este valida
    if (isNaN(date.getTime())) {
        return 'Recent'; 
    }
    
    return date.toLocaleDateString('ro-RO', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
  };


  // Incarcam anunturile la intrarea pe pagina
  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push('/login'); // Redirect daca nu e logat
        return;
      }

      try {
        const res = await axios.get('http://127.0.0.1:8000/my-listings', {
          headers: {
            Authorization: `Bearer ${session.access_token}`
          }
        });
        setListings(res.data);
      } catch (error) {
        console.error("Eroare la fetch:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [router, supabase]);

  // 2. Functia de Ștergere
  const handleDelete = async (id: number) => {
    if (!confirm("Sigur vrei sa ștergi acest anunt? Actiunea este ireversibila.")) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      await axios.delete(`http://127.0.0.1:8000/listings/${id}`, {
        headers: {
            Authorization: `Bearer ${session?.access_token}`
        }
      });

      // Scoatem anuntul din lista local
      setListings(prev => prev.filter(item => item.id !== id));
      alert("Anunt șters cu succes.");

    } catch (error) {
      console.error("Eroare la ștergere:", error);
      alert("Nu s-a putut șterge anuntul.");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <Navbar />
      
      <main className="max-w-5xl mx-auto py-10 px-4">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900">Anunturile mele</h1>
            <Link 
                href="/add" 
                className="bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition"
            >
                + Adauga Anunt
            </Link>
        </div>

        {loading ? (
            <div className="text-center py-20 text-gray-500">Se încarca proprietatile...</div>
        ) : listings.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-xl border border-dashed border-gray-300">
                <p className="text-gray-500 text-lg mb-4">Nu ai adaugat niciun anunt înca.</p>
                <Link href="/add" className="text-blue-600 font-bold hover:underline">Începe acum</Link>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {listings.map((item) => (
                    <div key={item.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden hover:shadow-md transition">
                        
                        {/* Imagine */}
                        <Link href={`/listing/${item.id}`}>
                        <div className="h-48 bg-gray-200 relative">
                            {item.images && item.images.length > 0 ? (
                                <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">Fara imagine</div>
                            )}
                            <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded text-xs font-bold shadow-sm">
                                {item.transaction_type === 'SALE' ? 'Vânzare' : 'Chirie'}
                            </div>
                        </div>
                        </Link>

                        {/* Continut */}
                        <div className="p-4">
                            <h3 className="font-bold text-gray-900 truncate mb-1">{item.title}</h3>
                            <div className="flex items-center text-gray-500 text-sm mb-3">
                                <MapPin size={14} className="mr-1" />
                                <span className="truncate">{item.neighborhood || 'Iași'}</span>
                            </div>
                            
                            <div className="flex justify-between items-end mb-4">
                                <span className="text-xl font-bold text-blue-600">{item.price_eur} €</span>
                                <span className="text-xs text-gray-400">
                                    {formatDate(item.updated_at || item.created_at)}
                                </span>
                            </div>

                            {/* Actiuni */}
                            <div className="flex gap-2 border-t pt-3">
                                <button 
                                    onClick={() => router.push(`/edit/${item.id}`)}
                                    className="flex-1 flex items-center justify-center gap-1 text-sm font-medium text-gray-700 hover:bg-gray-50 py-2 rounded border"
                                >
                                    <Edit size={16} /> Editeaza
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="flex-1 flex items-center justify-center gap-1 text-sm font-medium text-red-600 hover:bg-red-50 py-2 rounded border border-red-100"
                                >
                                    <Trash2 size={16} /> Șterge
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        )}
      </main>
    </div>
  );
}