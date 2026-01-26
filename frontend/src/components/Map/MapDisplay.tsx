import React, { useEffect, ReactNode } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * MapClickHandler Sub-component
 * Listens for map clicks and triggers callback when in pin mode
 */
interface MapClickHandlerProps {
  onMapClick: (latlng: L.LatLng) => void;
  pinMode: boolean;
}

function MapClickHandler({ onMapClick, pinMode }: MapClickHandlerProps): null {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e: L.LeafletMouseEvent) => {
      if (pinMode) {
        onMapClick(e.latlng);
      }
    };

    map.on('click', handleClick);
    return () => {
      map.off('click', handleClick);
    };
  }, [map, pinMode, onMapClick]);

  return null;
}

/**
 * MapController Sub-component
 * Syncs map view with external center/zoom props
 */
interface MapControllerProps {
  center?: [number, number];
  zoom?: number;
}

function MapController({ center, zoom }: MapControllerProps): null {
  const map = useMap();

  useEffect(() => {
    if (center) {
      map.setView(center, zoom || map.getZoom(), {
        animate: true,
        duration: 1, // 1 second animation
      });
    }
  }, [center, zoom, map]);

  return null;
}

/**
 * MapDisplay Component
 * Core map container with tile layer and click handling
 * All map layers (markers, polylines, etc.) are rendered as children
 */
interface MapDisplayProps {
  center: [number, number];
  zoom: number;
  pinMode: boolean;
  onMapClick: (latlng: L.LatLng) => void;
  children?: ReactNode;
}

function MapDisplay({
  center,
  zoom,
  pinMode,
  onMapClick,
  children,
}: MapDisplayProps): JSX.Element {
  return (
    <MapContainer center={center} zoom={zoom} className="h-full w-full">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapClickHandler onMapClick={onMapClick} pinMode={pinMode} />
      <MapController center={center} zoom={zoom} />
      {children}
    </MapContainer>
  );
}

export default MapDisplay;
