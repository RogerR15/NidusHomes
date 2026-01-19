'use client';
import { useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';

function MapController({ activeListing, clusterGroupRef }: { activeListing: any, clusterGroupRef: any }) {
    const map = useMap();

    useEffect(() => {
        if (activeListing) { // Verificăm doar dacă există anunțul
            // VALIDARE CRITICĂ: Convertim și verificăm coordonatele înainte de orice acțiune
            const lat = Number(activeListing.latitude ?? activeListing.lat);
            const lng = Number(activeListing.longitude ?? activeListing.lng ?? activeListing.lon);

            // Dacă coordonatele sunt invalide, NU facem nimic (evităm crash-ul)
            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) {
                console.warn("MapController: Coordonate invalide pentru listing", activeListing.id);
                return;
            }

            if (clusterGroupRef.current) {
                const markers = clusterGroupRef.current.getLayers();
                const targetMarker = markers.find((m: any) =>
                    m.options.listingId === activeListing.id
                );

                if (targetMarker) {
                    clusterGroupRef.current.zoomToShowLayer(targetMarker, () => {
                        setTimeout(() => {
                            targetMarker.openPopup();
                        }, 300);
                    });
                } else {
                    // Folosim variabilele verificate (lat, lng), nu proprietățile brute
                    map.flyTo([lat, lng], 18);
                }
            }
        } else {
            // Reset view
            map.flyTo([47.1585, 27.6014], 13, { duration: 1.5 });
            map.closePopup();
        }
    }, [activeListing, map, clusterGroupRef]);

    return null;
}

export default function MapView({ listings, activeId, setActiveId }: any) {
    const clusterGroupRef = useRef<any>(null);
    const activeListing = listings.find((l: any) => l.id === activeId);

    const getImageUrl = (url: string | null, source: string) => {
        if (!url) return null;
        if (source === 'OLX') {
            return `/api/image-proxy?url=${encodeURIComponent(url)}`;
        }
        return url;
    };

    const validListings = listings.filter((l: any) => {
        const lat = Number(l.latitude ?? l.lat);
        const lng = Number(l.longitude ?? l.lng ?? l.lon);

        return !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
    });


    return (
        <div className="h-full w-full relative">
            <MapContainer
                center={[47.1585, 27.6014]}
                zoom={13}
                className="h-full w-full"
                zoomControl={false}
            >
                <TileLayer
                    attribution='&copy; CARTO'
                    url='https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png'
                />

                <MapController activeListing={activeListing} clusterGroupRef={clusterGroupRef} />

                <MarkerClusterGroup
                    ref={clusterGroupRef}
                    chunkedLoading
                    maxClusterRadius={30}
                    // SETARI CRITICE PENTRU SUPRAPUNERE:
                    spiderfyOnMaxZoom={true}
                    showCoverageOnHover={false}
                    zoomToBoundsOnClick={true}
                    // Forteaza imprastierea markerilor daca sunt la aceleasi coordonate
                    spiderfyDistanceMultiplier={1.5}
                    iconCreateFunction={(cluster: any) => {
                        return L.divIcon({
                            // Punem clasa noastra 'cluster-circle' 
                            html: `<div class="cluster-circle">${cluster.getChildCount()}</div>`,

                            // Setam clasa wrapper-ului sa fie cea transparenta definita in CSS
                            className: 'cluster-wrapper',

                            // Dimensiunile trebuie sa fie aceleasi cu cele din CSS
                            iconSize: L.point(40, 40),
                            iconAnchor: [20, 20] // Centrul (jumatate din marime)
                        });
                    }}
                >
                    {validListings.map((l: any) => {
                        const isSelected = l.id === activeId;
                        const lat = Number(l.latitude ?? l.lat);
                        const lng = Number(l.longitude ?? l.lng ?? l.lon);

                        const popupImageUrl = getImageUrl(l.image_url, l.source_platform);

                        // Jittering: Daca sunt identice, le miscam cu 0.0002 grade
                        // Asta ajuta Leaflet sa le vada ca puncte diferite
                        const position: [number, number] = [
                            lat + (Math.random() - 0.5) * 0.0002,
                            lng + (Math.random() - 0.5) * 0.0002
                        ];

                        const priceIcon = L.divIcon({
                            className: '',
                            html: `
                                <div class="flex flex-col items-center">
                                  <div class="transition-all duration-300 ${isSelected ? 'bg-orange-500 scale-125 z-1000' : 'bg-blue-600'} text-white px-2 py-1 rounded-md shadow-md font-bold text-[11px] border border-white">
                                    ${(l.price_eur || 0).toLocaleString()} €
                                  </div>
                                  <div class="w-0 h-0 border-l-[5px] border-l-transparent border-r-[5px] border-r-transparent border-t-[6px] ${isSelected ? 'border-t-orange-500' : 'border-t-blue-600'} -mt-px"></div>
                                </div>
                            `,
                            iconSize: [70, 30],
                            iconAnchor: [35, 15]
                        });

                        return (
                            <Marker
                                key={l.id}
                                position={position}
                                icon={priceIcon}
                                eventHandlers={{
                                    click: () => setActiveId(l.id),
                                }}
                                {...({ listingId: l.id } as any)}
                            >
                                <Popup>
                                    <div className="w-48 overflow-hidden rounded-lg">
                                        {/* Partea de Imagine (deja existentă) */}
                                        {popupImageUrl && (
                                            // Poți face și imaginea clickabilă înfășurând-o în Link
                                            <Link href={`/listing/${l.id}`}>
                                                <img
                                                    src={popupImageUrl}
                                                    className="w-full h-24 object-cover hover:opacity-90 transition-opacity cursor-pointer"
                                                    alt={l.title}
                                                    onError={(e) => {
                                                        e.currentTarget.src = "https://placehold.co/600x400/e2e8f0/1e293b?text=Fara+Imagine";
                                                    }}
                                                />
                                            </Link>
                                        )}

                                        <div className="p-2">
                                            <p className="font-bold text-sm leading-tight truncate">{l.title}</p>
                                            <p className="text-blue-600 font-bold">{(l.price_eur || 0).toLocaleString()} €</p>
                                            <p className="text-xs text-gray-500 mb-2">{l.neighborhood || 'Iasi'}</p>

                                            {/* 2. BUTONUL DE VEZI DETALII */}
                                            <Link
                                                href={`/listing/${l.id}`}
                                                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold py-2 rounded transition-colors"
                                            >
                                                Vezi Detalii
                                            </Link>

                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
            {activeId && (
                <button
                    onClick={() => setActiveId(null)}
                    className="absolute top-4 right-4 z-1000 bg-white text-blue-600 px-4 py-2 rounded-lg shadow-xl font-bold border border-blue-100 hover:bg-blue-50 transition-all flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Reset View
                </button>
            )}
        </div>
    );
}