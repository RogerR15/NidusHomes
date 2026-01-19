'use client';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix pentru iconița default Leaflet care uneori dispare în Next.js
const icon = L.icon({
    iconUrl: "https://unpkg.com/leaflet@1.9.3/dist/images/marker-icon.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
});

export default function MiniMap({ lat, lng }: { lat: number, lng: number }) {
    if (!lat || !lng) return null;

    return (
        <MapContainer
            center={[lat, lng]}
            zoom={15}
            scrollWheelZoom={false}
            dragging={false}
            zoomControl={false}
            className="h-full w-full"
        >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            <Marker position={[lat, lng]} icon={icon} />
        </MapContainer>
    );
}