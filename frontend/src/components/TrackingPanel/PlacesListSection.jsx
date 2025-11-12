import React from 'react';
import PropTypes from 'prop-types';
import PlacesList from '../PlacesList';

/**
 * PlacesListSection Component
 * Displays places of interest when no vehicle is selected
 * Part of the TrackingPanel sidebar
 */
function PlacesListSection({ places, onPlaceClick, show }) {
  if (!show || places.length === 0) {
    return null;
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <PlacesList
        places={places}
        onPlaceClick={onPlaceClick}
      />
    </div>
  );
}

PlacesListSection.propTypes = {
  places: PropTypes.arrayOf(PropTypes.object).isRequired,
  onPlaceClick: PropTypes.func.isRequired,
  show: PropTypes.bool.isRequired,
};

export default PlacesListSection;
