'use client';
import { useEffect, useState, Suspense } from 'react';
import axios from 'axios';
import ListingCard from '@/components/ListingCard';
import dynamic from 'next/dynamic';
import FilterBar from '@/components/FilterBar';
import Navbar from '@/components/Navbar';
import { Listing } from '@/types';
import { useSearchParams } from 'next/navigation';
import { useInView } from 'react-intersection-observer';
import { ListIcon, MapIcon } from 'lucide-react';

const MapView = dynamic(() => import('@/components/Map'), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full bg-gray-100 flex items-center justify-center text-gray-400">
      Se incarca harta...
    </div>
  )
});

function HomeContent() {
  // STATE LISTA (Scroll Infinit)
  const [listings, setListings] = useState<Listing[]>([]);
  
  // STATE HARTA (Toate rezultatele)
  const [mapListings, setMapListings] = useState<Listing[]>([]); 

  const [activeId, setActiveId] = useState<number | null>(null);
  
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [offset, setOffset] = useState(0);
  const LIMIT = 12;

  const [showMapMobile, setShowMapMobile] = useState(false);

  const searchParams = useSearchParams();
  const { ref, inView } = useInView({ threshold: 0, rootMargin: '100px' });

  // Helper pentru construirea parametrilor de filtrare (comun pentru ambele cereri)
  const getBaseParams = () => {
      const params = new URLSearchParams();
      const urlType = searchParams.get('type') || searchParams.get('transaction_type') || 'SALE';
      const q = searchParams.get('q');
      const minPrice = searchParams.get('min_price');
      const maxPrice = searchParams.get('max_price');
      const rooms = searchParams.get('rooms');

      params.append('transaction_type', urlType);
      if (minPrice) params.append('min_price', minPrice);
      if (maxPrice) params.append('max_price', maxPrice);
      if (rooms && rooms !== 'all') params.append('rooms', rooms);
      if (q) {
        params.append('q', q);
        params.append('neighborhood', q);
        params.append('address', q);
      }
      return params;
  };

  // 1. FETCH LISTA (Paginat)
  const fetchListings = async (isLoadMore = false) => {
    if (loading) return; 
    setLoading(true);

    try {
      const params = getBaseParams();
      const currentOffset = isLoadMore ? offset : 0;
      params.append('limit', LIMIT.toString());
      params.append('offset', currentOffset.toString());

      const res = await axios.get(`http://127.0.0.1:8000/listings?${params.toString()}`);
      const newData = res.data;

      if (isLoadMore) {
        setListings(prev => {
          const existingIds = new Set(prev.map(l => l.id));
          const uniqueNew = newData.filter((l: Listing) => !existingIds.has(l.id));
          return [...prev, ...uniqueNew];
        });
      } else {
        setListings(newData);
      }

      setOffset(prev => isLoadMore ? prev + LIMIT : LIMIT);
      setHasMore(newData.length >= LIMIT);

    } catch (error) {
      console.error("Eroare fetch lista:", error);
    } finally {
      setLoading(false);
    }
  };

  // FETCH HARTA (Toate rezultatele)
  const fetchMapPins = async () => {
      try {
          const params = getBaseParams();
          // Cerem un numar mare pentru harta (ex: 500) ca sa aducem tot
          params.append('limit', '500'); 
          params.append('offset', '0');

          const res = await axios.get(`http://127.0.0.1:8000/listings?${params.toString()}`);
          setMapListings(res.data); // <--- Populam harta cu TOT ce am gasit
      } catch (error) {
          console.error("Eroare fetch harta:", error);
      }
  };

  

  // La schimbarea filtrelor: Resetam Lista si Reincarcam Harta
  useEffect(() => {
    setOffset(0);
    setHasMore(true);
    
    // Lansam ambele cereri in paralel
    fetchListings(false); 
    fetchMapPins(); 

  }, [searchParams]);

  // La scroll: incarcam doar lista
  useEffect(() => {
    if (inView && hasMore && !loading) {
      fetchListings(true);
    }
    
  }, [inView]);


  return (
    <div className="flex flex-col h-screen w-full bg-white font-sans overflow-hidden">
      <div className="flex-none z-50"><Navbar /></div>
      <div className="flex-none z-40 shadow-sm bg-white relative"><FilterBar /></div>

      <main className="flex-1 flex  md:flex-row relative overflow-hidden">
        
        {/* ZONA A: LISTA */}
        <div className={`
            w-full md:w-112.5 lg:w-125 
            h-full overflow-y-auto custom-scrollbar 
            border-r border-gray-200 bg-white shadow-md z-20
            ${showMapMobile ? 'hidden' : 'block'} md:block
        `}>
          <div className="p-4 border-b bg-gray-50 flex justify-between items-center sticky top-0 z-10">
            <div>
              <h2 className="font-bold text-lg text-gray-800">Rezultate</h2>
              <p className="text-xs text-gray-500">Iasi, România</p>
            </div>
            <span className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
              {/* Afisam totalul de pe harta */}
              {mapListings.length > listings.length ? mapListings.length : listings.length} proprietați
            </span>
          </div>

          <div className="p-3 space-y-3">
            {loading && listings.length === 0 ? (
               [1, 2, 3].map(i => <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl mx-2 border border-gray-200" />)
            ) : listings.length === 0 ? (
              <div className="text-center py-10 px-4">
                <p className="text-gray-500 mb-2">Nu am gasit anunțuri.</p>
                <button onClick={() => window.location.href = '/?type=SALE'} className="text-blue-600 text-sm hover:underline">Reseteaza filtrele</button>
              </div>
            ) : (
              <>
                {listings.map((l) => (
                  
                    <div key={l.id} onClick={() => setActiveId(l.id)} className={`cursor-pointer transition-all duration-200 rounded-xl border-2 ${activeId === l.id ? 'border-blue-500 bg-blue-50 shadow-md transform scale-[1.02]' : 'border-transparent hover:bg-gray-50 hover:border-gray-200'}`}>
                      <ListingCard listing={l} />
                    </div>
                  
                ))}
                
                {hasMore && (
                    <div ref={ref} className="py-6 flex justify-center items-center w-full min-h-12.5">
                        {loading ? (
                            <div className="flex items-center gap-2 text-blue-600 text-sm font-medium animate-pulse">
                                <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                                Se incarca...
                            </div>
                        ) : <div className="h-1 w-full" />}
                    </div>
                )}
                {!hasMore && listings.length > 0 && <div className="text-center text-xs text-gray-400 py-6 border-t border-gray-100 mt-4">Ai ajuns la finalul listei. 🎉</div>}
              </>
            )}
          </div>
        </div>

        {/* ZONA B: HARTA */}
        <div className={`
            w-full md:flex-1 h-full relative z-10
            ${!showMapMobile ? 'hidden' : 'block'} md:block
        `}>
          
          <MapView listings={mapListings} activeId={activeId} setActiveId={setActiveId} />
          
          {loading && listings.length === 0 && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg z-1000 flex items-center gap-2 pointer-events-none">
              <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
              <span className="text-sm font-bold text-blue-600">Se actualizeaza...</span>
            </div>
          )}
        </div>

        <div className="md:hidden fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
            <button
                onClick={() => setShowMapMobile(!showMapMobile)}
                className="flex items-center gap-2 bg-gray-900 text-white px-6 py-3.5 rounded-full shadow-2xl font-semibold hover:bg-black transition-transform active:scale-95"
            >
                {showMapMobile ? (
                    <>
                        <ListIcon size={18} /> Vezi Lista
                    </>
                ) : (
                    <>
                        <MapIcon size={18} /> Vezi Harta
                    </>
                )}
            </button>
        </div>

      </main>
    </div>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Se inițializeaza...</div>}>
      <HomeContent />
    </Suspense>
  )
}