import React from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
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

interface FarmMapProps {
  products: Product[];
  onAddToCart: (product: Product) => void;
}

export default function FarmMap({ products, onAddToCart }: FarmMapProps) {
  // Center the map around the average location of products
  const center: [number, number] = products.length > 0 
    ? [
        products.reduce((sum, p) => sum + p.coordinates.lat, 0) / products.length,
        products.reduce((sum, p) => sum + p.coordinates.lng, 0) / products.length
      ]
    : [20.5937, 78.9629]; // Default center (India)

  return (
    <div className="h-[600px] w-full rounded-3xl overflow-hidden border border-brand-ink/10 shadow-inner relative z-0">
      <MapContainer 
        center={center} 
        zoom={10} 
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.google.com/maps">Google Maps</a>'
          url="http://mt0.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}"
        />
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
