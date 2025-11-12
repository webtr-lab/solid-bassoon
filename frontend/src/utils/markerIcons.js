import L from 'leaflet';

/**
 * Create a colored circle icon for vehicle markers
 * @param {string} color - CSS color (e.g., '#3b82f6')
 * @returns {L.DivIcon} Leaflet icon
 */
export const createColoredIcon = (color) => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: `<div style="background-color: ${color}; width: 24px; height: 24px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`,
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
};

/**
 * Create a yellow circle icon for saved vehicle stop locations
 * @returns {L.DivIcon} Leaflet icon
 */
export const createSavedLocationIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background-color: #fbbf24; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

/**
 * Create a pink circle icon for places of interest
 * @returns {L.DivIcon} Leaflet icon
 */
export const createPOIIcon = () => {
  return L.divIcon({
    className: 'custom-div-icon',
    html: '<div style="background-color: #ec4899; width: 28px; height: 28px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); display: flex; align-items: center; justify-content: center; color: white; font-size: 16px;">📍</div>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

/**
 * Default vehicle colors for marker differentiation
 */
export const vehicleColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];
