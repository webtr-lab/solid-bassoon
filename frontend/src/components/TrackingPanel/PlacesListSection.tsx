import React from 'react';
import PlacesList from '../PlacesList';
import type { PlaceOfInterest } from '../../types';

/**
 * PlacesListSection Component
 * Displays places of interest when no vehicle is selected
 * Part of the TrackingPanel sidebar
 */
interface PlacesListSectionProps {
  places: PlaceOfInterest[];
  onPlaceClick: (place: PlaceOfInterest) => void;
  show: boolean;
}

function PlacesListSection({ places, onPlaceClick, show }: PlacesListSectionProps): JSX.Element | null {
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

export default PlacesListSection;
