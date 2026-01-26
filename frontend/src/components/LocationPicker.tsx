'use client';

import { useEffect, useMemo } from 'react'; // Am adaugat useMemo
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { renderToStaticMarkup } from 'react-dom/server'; // Pentru a converti iconita Lucide in HTML
import { Home } from 'lucide-react';


const createCustomIcon = () => {
    const iconSvgString = renderToStaticMarkup(
        <Home size={20} color="white" strokeWidth={2.5} />
    );

    const html = `
    <div class="flex flex-col items-center justify-start w-full h-full">
      
      <div class="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center shadow-md border-2 border-white z-20">
        ${iconSvgString}
      </div>
      
      <div class="w-4 h-4 bg-blue-600 border-r-2 border-b-2 border-white transform rotate-45 -mt-3 z-10 rounded-sm"></div>
      
    </div>
  `;

    return L.divIcon({
        className: 'bg-transparent',
        html: html,
        iconSize: [40, 48],   
        iconAnchor: [20, 48], 
        popupAnchor: [0, -48] 
    });
};

function MapEvents({ onLocationSelect }: { onLocationSelect: (lat: number, lng: number) => void }) {
    useMapEvents({
        click(e) {
            onLocationSelect(e.latlng.lat, e.latlng.lng);
        },
    });
    return null;
}

function ChangeView({ center }: { center: [number, number] }) {
    const map = useMap();
    useEffect(() => {
        map.setView(center);
    }, [center, map]);
    return null;
}

interface LocationPickerProps {
    lat: number;
    lng: number;
    onLocationSelect: (lat: number, lng: number) => void;
}

export default function LocationPicker({ lat, lng, onLocationSelect }: LocationPickerProps) {
    const centerPosition: [number, number] = [lat || 47.1585, lng || 27.6014];

    // Folosim useMemo ca sa nu recream iconita la fiecare render (performanta)
    const customPin = useMemo(() => createCustomIcon(), []);

    return (
        <div className="h-full w-full rounded-xl overflow-hidden z-0 relative shadow-inner group">
            <MapContainer
                center={centerPosition}
                zoom={14}
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://carto.com/">CARTO</a>'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                <MapEvents onLocationSelect={onLocationSelect} />
                <ChangeView center={centerPosition} />

                {/* Folosim pin-ul */}
                <Marker position={centerPosition} icon={customPin}></Marker>
            </MapContainer>

            {/* Overlay modern */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-1000 bg-white/90 backdrop-blur-md px-4 py-2 rounded-full text-xs font-bold shadow-lg text-blue-900 pointer-events-none border border-white/50 flex items-center gap-2 transition-transform group-hover:scale-105">
                <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
                Click pe harta pentru a seta locatia
            </div>
        </div>
    );
}