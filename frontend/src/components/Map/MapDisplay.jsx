import React, { useEffect } from 'react';
import { MapContainer, TileLayer, useMap } from 'react-leaflet';
import PropTypes from 'prop-types';
import L from 'leaflet';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * MapClickHandler Sub-component
 * Listens for map clicks and triggers callback when in pin mode
 */
function MapClickHandler({ onMapClick, pinMode }) {
  const map = useMap();

  useEffect(() => {
    const handleClick = (e) => {
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

MapClickHandler.propTypes = {
  onMapClick: PropTypes.func.isRequired,
  pinMode: PropTypes.bool.isRequired,
};

/**
 * MapController Sub-component
 * Syncs map view with external center/zoom props
 */
function MapController({ center, zoom }) {
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

MapController.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number),
  zoom: PropTypes.number,
};

/**
 * MapDisplay Component
 * Core map container with tile layer and click handling
 * All map layers (markers, polylines, etc.) are rendered as children
 */
function MapDisplay({
  center,
  zoom,
  pinMode,
  onMapClick,
  children,
}) {
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

MapDisplay.propTypes = {
  center: PropTypes.arrayOf(PropTypes.number).isRequired,
  zoom: PropTypes.number.isRequired,
  pinMode: PropTypes.bool.isRequired,
  onMapClick: PropTypes.func.isRequired,
  children: PropTypes.node,
};

MapDisplay.defaultProps = {
  children: null,
};

export default MapDisplay;
