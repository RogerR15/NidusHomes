'use client';
import { useEffect, useRef, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, GeoJSON, FeatureGroup, useMap } from 'react-leaflet';
import { EditControl } from "react-leaflet-draw";
import MarkerClusterGroup from 'react-leaflet-cluster';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import Link from 'next/link';
import 'leaflet/dist/leaflet.css';
import 'leaflet-draw/dist/leaflet.draw.css';

import { iasiGeoJSON } from '../../data/iasi-geojson';

import booleanPointInPolygon from '@turf/boolean-point-in-polygon';
import { point, polygon } from '@turf/helpers';

function MapResizer({ trigger }: { trigger: boolean }) {
    const map = useMap();

    useEffect(() => {
        // Asteptam 300ms sa se termine animatia/randarea CSS
        const timer = setTimeout(() => {
            map.invalidateSize(); 
        }, 300);
        return () => clearTimeout(timer);
    }, [trigger, map]);

    return null;
}


function MapController({ activeListing, clusterGroupRef }: { activeListing: any, clusterGroupRef: any }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;

        if (activeListing) {
            
            const lat = Number(activeListing.latitude ?? activeListing.lat);
            const lng = Number(activeListing.longitude ?? activeListing.lng ?? activeListing.lon);

            if (isNaN(lat) || isNaN(lng) || (lat === 0 && lng === 0)) return;

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
                    try {
                        map.flyTo([lat, lng], 18);
                    } catch (e) {
                        map.setView([lat, lng], 18);
                    }
                }
            } else {
                try {
                    map.flyTo([lat, lng], 18);
                } catch (e) {
                    map.setView([lat, lng], 18);
                }
            }
        } else {
            try {
                map.flyTo([47.1585, 27.6014], 13, { duration: 1.5 });
            } catch (e) {
                map.setView([47.1585, 27.6014], 13);
            }
            map.closePopup();
        }
    }, [activeListing, map, clusterGroupRef]);

    return null;
}

export default function MapView({ listings, activeId, setActiveId, setFilterPolygon, forceRefresh = false }: any) {
    const clusterGroupRef = useRef<any>(null);
    const activeListing = listings.find((l: any) => l.id === activeId);

    const [drawnPolygon, setDrawnPolygon] = useState<any>(null);
    const featureGroupRef = useRef<any>(null);

    useEffect(() => {
        const saved = sessionStorage.getItem('user_search_polygon');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                setDrawnPolygon(parsed);
                if (setFilterPolygon) setFilterPolygon(parsed); // Reactivam filtrul
                console.log("Restored polygon from storage");
            } catch (e) {
                console.error("Failed to parse saved polygon", e);
            }
        }
    }, [setFilterPolygon]);

    const _onCreated = (e: any) => {
        const { layerType, layer } = e;
        if (layerType === 'polygon' || layerType === 'rectangle') {
            const geoJSON = layer.toGeoJSON();
            console.log("Zona desenata:", geoJSON);
            
            // Setam statul local pentru a filtra vizual
            setDrawnPolygon(geoJSON);

            // Trimitem si parintelui (daca e cazul, pentru lista din stanga)
            if (setFilterPolygon) {
                setFilterPolygon(geoJSON);
            }
            sessionStorage.setItem('user_search_polygon', JSON.stringify(geoJSON));
        } else if (layerType === 'circle') {
             // Cercul e mai complicat cu Turf (trebuie convertit in poligon sau calculata distanta)
             // Pentru simplitate, acum suportam doar poligoane/dreptunghiuri
             alert("Momentan filtrarea funcționează doar cu Poligon sau Dreptunghi.");
        }
    };

    const _onDeleted = (e: any) => {
        console.log("Zona stearsa");
        setDrawnPolygon(null);
        if (setFilterPolygon) setFilterPolygon(null);
        sessionStorage.removeItem('user_search_polygon');
    };

    
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

        // 1. Verificam daca are coordonate valide
        const isValid = !isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0);
        if (!isValid) return false;

        // 2. Daca avem un poligon desenat, verificam daca punctul e inauntru
        if (drawnPolygon) {
            try {
                const pt = point([lng, lat]); // Atentie: Turf foloseste [Longitudine, Latitudine]
                const poly = polygon(drawnPolygon.geometry.coordinates);
                return booleanPointInPolygon(pt, poly);
            } catch (err) {
                console.error("Eroare filtrare turf:", err);
                return true; // Daca e eroare, il aratam oricum
            }
        }

        return true;
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

                <MapResizer trigger={forceRefresh} />

                <MapController activeListing={activeListing} clusterGroupRef={clusterGroupRef} />

                <GeoJSON 
                    data={iasiGeoJSON as any} 
                    style={() => ({
                        color: '#3b82f6',     // Albastru
                        weight: 2,
                        fillColor: '#3b82f6', 
                        fillOpacity: 0.08,    // Foarte transparent
                        dashArray: '5, 5'
                    })}
                />

                {drawnPolygon && (
                    <GeoJSON 
                        key="saved-polygon-layer" // Key e important ca sa se re-randeze cand se schimba
                        data={drawnPolygon}
                        style={{ color: '#ef4444', weight: 4, fillOpacity: 0.2 }}
                    />
                )}

                {/* --- B. UNELTE DE DESENAT (MANUAL) --- */}
                <FeatureGroup ref={featureGroupRef}>
                    <EditControl
                        position='topright'
                        onCreated={_onCreated}
                        onDeleted={_onDeleted}
                        draw={{
                            rectangle: true,
                            polyline: false,
                            circlemarker: false,
                            marker: false,
                            circle: false,
                            polygon: {
                                allowIntersection: false,
                                showArea: true,
                                shapeOptions: { color: '#ef4444' }
                            }
                        }}
                    />
                </FeatureGroup>

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
                                <Popup className="custom-popup" closeButton={false}>
                                    <div className="w-64 bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300 font-sans group">

                                        {/* ZONA IMAGINE */}
                                        <Link href={`/listing/${l.id}`} className="block relative overflow-hidden h-36">
                                            {popupImageUrl ? (
                                                <img
                                                    src={popupImageUrl}
                                                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                                    alt={l.title}
                                                    onError={(e) => {
                                                        e.currentTarget.src = "https://placehold.co/600x400/e2e8f0/1e293b.png?text=Fara+Imagine";
                                                    }}
                                                />
                                            ) : (
                                                <div className="w-full h-full bg-slate-100 flex items-center justify-center text-slate-400">
                                                    <span className="text-xs">Fără imagine</span>
                                                </div>
                                            )}

                                            {/* Badge Preț peste imagine (Opțional, arată modern) */}
                                            <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2.5 py-1 h-6 rounded shadow-sm flex items-center justify-center">
                                                <p className="text-blue-600 font-extrabold text-xs tracking-tight">
                                                    {(l.price_eur || 0).toLocaleString()} €
                                                </p>
                                            </div>
                                        </Link>

                                        {/* ZONA CONTINUT */}
                                        <div className="p-3">
                                            {/* Titlu */}
                                            <Link href={`/listing/${l.id}`} className="block mb-1">
                                                <h3 className="font-bold text-gray-800 text-sm leading-snug truncate group-hover:text-blue-600 transition-colors">
                                                    {l.title}
                                                </h3>
                                            </Link>

                                            {/* Locație cu Icon */}
                                            <div className="flex items-center gap-1 text-gray-500 mb-3">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                    <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                                                    <circle cx="12" cy="10" r="3" />
                                                </svg>
                                                <p className="text-xs truncate">{l.neighborhood || 'Iași'}</p>
                                            </div>

                                            {/* Buton Detalii */}
                                            <Link
                                                href={`/listing/${l.id}`}
                                                className="group relative overflow-hidden flex items-center justify-center gap-2 w-full bg-slate-50/80 backdrop-blur-sm hover:bg-blue-50 text-blue-600 border border-blue-200 hover:border-blue-400 text-xs font-bold py-2 rounded-lg transition-all duration-300"
                                            >
                                                <span className="relative z-10">Vezi Detalii</span>
                                                <svg
                                                    xmlns="http://www.w3.org/2000/svg"
                                                    width="14"
                                                    height="14"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    className="relative z-10 transition-transform group-hover:translate-x-1"
                                                >
                                                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                                                </svg>
                                            </Link>
                                        </div>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MarkerClusterGroup>
            </MapContainer>
            {(activeId || drawnPolygon) && (
                <button
                    onClick={() => {
                        setActiveId(null);
                        setDrawnPolygon(null); 
                        if (setFilterPolygon) setFilterPolygon(null);

                        sessionStorage.removeItem('user_search_polygon');

                        if (featureGroupRef.current) {
                            featureGroupRef.current.clearLayers();
                        }
                    }}
                    className="absolute top-4 right-14 z-1000 bg-white text-blue-600 px-4 py-2 rounded-lg shadow-xl font-bold border border-blue-100 hover:bg-blue-50 transition-all flex items-center gap-2"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
                    Reset View
                </button>
            )}
        </div>
    );
}