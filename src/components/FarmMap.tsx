import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Product } from '../types';
import { ShoppingCart, MapPin } from 'lucide-react';

// Fix for default marker icons in Leaflet with React
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';
const markerRetina = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png';

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerRetina,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to handle map centering when userLocation changes
function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom);
  }, [center, zoom, map]);
  return null;
}

interface FarmMapProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
  userLocation?: { lat: number; lng: number; address: string } | null;
  searchRadius?: number;
}

export default function FarmMap({ products, onAddToCart, userLocation, searchRadius = 10 }: FarmMapProps) {
  // Center the map around user location if available, else average location of products
  const center: [number, number] = userLocation 
    ? [userLocation.lat, userLocation.lng]
    : products.length > 0 
      ? [
          products.reduce((sum, p) => sum + p.coordinates.lat, 0) / products.length,
          products.reduce((sum, p) => sum + p.coordinates.lng, 0) / products.length
        ]
      : [20.5937, 78.9629]; // Default center (India)

  // Calculate appropriate zoom level based on search radius
  const getZoomLevel = (radius: number) => {
    if (radius <= 2) return 14;
    if (radius <= 5) return 13;
    if (radius <= 10) return 11;
    if (radius <= 25) return 10;
    if (radius <= 50) return 9;
    if (radius <= 100) return 8;
    if (radius <= 250) return 7;
    return 6;
  };

  const zoomLevel = userLocation ? getZoomLevel(searchRadius) : 10;

  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden border border-brand-ink/10 shadow-inner relative z-0">
      <MapContainer 
        center={center} 
        zoom={zoomLevel} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <MapController center={center} zoom={zoomLevel} />
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="http://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}"
        />
        
        {userLocation && (
          <>
            <Marker position={[userLocation.lat, userLocation.lng]}>
              <Popup>
                <div className="font-bold text-brand-ink">Your Location</div>
                <div className="text-xs text-brand-ink/60">{userLocation.address}</div>
              </Popup>
            </Marker>
            <Circle 
              center={[userLocation.lat, userLocation.lng]} 
              radius={searchRadius * 1000} // searchRadius in km to meters
              pathOptions={{ color: '#5A5A40', fillColor: '#5A5A40', fillOpacity: 0.1 }}
            />
          </>
        )}

        {products.map((product) => (
          <Marker 
            key={product.id} 
            position={[product.coordinates.lat, product.coordinates.lng]}
          >
            <Popup className="custom-popup">
              <div className="w-48 p-1">
                <img 
                  src={product.image} 
                  alt={product.name} 
                  className="w-full h-24 object-cover rounded-lg mb-2"
                />
                <h3 className="font-serif font-bold text-brand-ink">{product.name}</h3>
                <p className="text-xs text-brand-ink/60 mb-1 flex items-center gap-1">
                  <MapPin size={10} /> {product.farmerName}
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="font-bold text-brand-olive">₹{product.price.toFixed(2)}</span>
                  <button 
                    onClick={() => onAddToCart(product)}
                    className="p-2 bg-brand-olive text-white rounded-full hover:bg-brand-olive/90 transition-all"
                  >
                    <ShoppingCart size={14} />
                  </button>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
