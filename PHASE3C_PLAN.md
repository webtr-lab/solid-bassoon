# Phase 3c: Map Component Refactoring - Detailed Plan

## Current State
- **Map.jsx**: 571 lines
- **Responsibilities**: 5 major concerns mixed together
- **Testability**: Difficult (too many dependencies, complex state)
- **Maintainability**: Hard to locate features, make changes safely

## Target State
- **Map.jsx**: ~80 lines (container only)
- **Sub-components**: 6-7 focused components (50-150 lines each)
- **Utilities**: Icon factory extracted
- **Hooks**: Address search logic extracted
- **Testability**: Each component testable in isolation
- **Maintainability**: Clear feature separation, easy to modify

---

## Refactoring Strategy: Responsibility-Based Split

### Components to Create

#### 1. **MapDisplay.jsx** (~100 lines)
**Responsibility**: Core map rendering and navigation control
- MapContainer initialization
- TileLayer setup
- MapClickHandler sub-component
- MapController sub-component
- Props: center, zoom, onMapClick, children (markers)

**Benefits**:
- Pure map display, no business logic
- Reusable in other features
- Easy to test

---

#### 2. **VehicleMarkersLayer.jsx** (~120 lines)
**Responsibility**: Display vehicle locations and history
- Vehicle markers (when no selection)
- Vehicle history polyline
- History point markers (intermediate stops)
- Current position marker
- Popups with vehicle info

**Props**:
- vehicles: array
- selectedVehicle: object | null
- vehicleHistory: array
- showVehicles: boolean

**Benefits**:
- Isolated vehicle rendering logic
- Can be toggled on/off independently
- Easy to test with mock vehicles

---

#### 3. **SavedLocationsLayer.jsx** (~60 lines)
**Responsibility**: Display saved vehicle stops
- Yellow circle markers
- Popups with stop details (duration, time, notes)

**Props**:
- savedLocations: array
- onLocationClick: callback

**Benefits**:
- Single responsibility (just rendering)
- Minimal state management
- Easy to test

---

#### 4. **PointsOfInterestLayer.jsx** (~80 lines)
**Responsibility**: Display places of interest
- Pink circle markers with pin emoji
- Popups with POI details (name, category, address, description)
- Click handler for user interactions

**Props**:
- placesOfInterest: array
- currentUserRole: string
- onPlaceClick: callback

**Benefits**:
- Clean separation from other layer types
- Role-based access handling
- Easy to add new POI features

---

#### 5. **AddressSearchBar.jsx** (~150 lines)
**Responsibility**: Address search and geocoding UI
- Search input field
- Results dropdown
- Clear button
- Save to POI button
- Loading state spinner

**Props**:
- searchQuery: string
- searchResults: array
- searching: boolean
- searchMarker: object | null
- onSearchInput: callback
- onClearSearch: callback
- onSelectResult: callback
- onSaveSearchToPOI: callback
- canEdit: boolean

**Benefits**:
- Isolates search UI from logic
- Can be styled/modified independently
- Reusable in other map-related features

---

#### 6. **PinLocationButton.jsx** (~80 lines)
**Responsibility**: POI creation trigger and status
- Toggle button
- Info card (while in pin mode)
- Cancel button
- Role-based visibility

**Props**:
- pinMode: boolean
- currentUserRole: string
- onTogglePinMode: callback
- onCancel: callback

**Benefits**:
- Separate control from its logic
- Easy to add visual feedback
- Clean conditional rendering

---

#### 7. **SearchMarkerPopup.jsx** (~50 lines)
**Responsibility**: Display search result marker and save option
- Marker for geocoded location
- Popup with address and details
- Save as POI button
- Remove marker button

**Props**:
- position: [lat, lng]
- result: object
- canEdit: boolean
- onSave: callback
- onRemove: callback

**Benefits**:
- Separates search result presentation
- Reusable for other search scenarios
- Easy to style popup content

---

### Utilities to Extract

#### 8. **utils/markerIcons.js** (~40 lines)
**Responsibility**: Create custom Leaflet icons
- createColoredIcon(color, label) → Leaflet Icon
- createSavedLocationIcon() → Leaflet Icon
- createPOIIcon() → Leaflet Icon
- Icon sizing, colors, styling

**Benefits**:
- Reusable across components
- Easy to modify icon appearance
- Cleaner component files

---

### Custom Hooks to Extract

#### 9. **hooks/useAddressSearch.js** (~100 lines)
**Responsibility**: Address search logic and caching
- State: searchQuery, searchResults, searching, searchMarker
- Functions: handleSearchInput, searchAddress, handleClearSearch, handleSelectResult
- Client-side cache (max 50 entries)
- Debouncing (1 second)

**Benefits**:
- Logic completely separated from UI
- Reusable in other components
- Easy to test independently
- Easy to add new search features

---

### Updated Map.jsx (Container) (~120 lines)

**Responsibility**: Orchestrate data flow and POI creation

```javascript
function Map({
  vehicles, selectedVehicle, vehicleHistory,
  savedLocations, placesOfInterest,
  onRefreshPOI, currentUserRole, onPlaceClick,
  center: initialCenter, zoom: initialZoom, showVehicles = true
}) {
  // Core state
  const [center, setCenter] = useState(initialCenter || [5.8520, -55.2038]);
  const [zoom, setZoom] = useState(initialZoom || 13);
  const [pinMode, setPinMode] = useState(false);
  const [tempPin, setTempPin] = useState(null);

  // Custom hook for search
  const searchHook = useAddressSearch();

  // Handlers
  const handleMapClick = (latlng) => { /* prompt-based POI creation */ };
  const savePlace = (name, latlng, ...) => { /* API call to save POI */ };
  const handleSaveSearchToPOI = () => { /* save search result as POI */ };

  // Render: MapDisplay + all layers + controls
}
```

---

## Implementation Phases

### Phase 3c-1: Extract Utilities & Hooks
1. Create `utils/markerIcons.js`
2. Create `hooks/useAddressSearch.js`
3. Test utilities with simple unit tests
4. Update Map.jsx to use new utilities

### Phase 3c-2: Extract Layer Components
1. Create `MapDisplay.jsx`
2. Create `VehicleMarkersLayer.jsx`
3. Create `SavedLocationsLayer.jsx`
4. Create `PointsOfInterestLayer.jsx`
5. Update Map.jsx to use layer components
6. Verify all functionality still works

### Phase 3c-3: Extract Control Components
1. Create `AddressSearchBar.jsx`
2. Create `SearchMarkerPopup.jsx`
3. Create `PinLocationButton.jsx`
4. Update Map.jsx
5. Verify all functionality still works

### Phase 3c-4: Write Component Tests
1. Test each new component in isolation
2. Test integration in Map.jsx
3. Test hook behavior
4. Aim for >80% coverage

### Phase 3c-5: Final Cleanup & Commit
1. Code review
2. PropTypes validation
3. Performance optimization (memoization if needed)
4. Create comprehensive commit

---

## Component Tree (Final Structure)

```
Map (container, ~120 lines)
├─ MapDisplay (core map, ~100 lines)
│  ├─ MapClickHandler
│  └─ MapController
│
├─ VehicleMarkersLayer (~120 lines)
│  └─ Vehicle markers + history
│
├─ SavedLocationsLayer (~60 lines)
│  └─ Stop markers
│
├─ PointsOfInterestLayer (~80 lines)
│  └─ POI markers
│
├─ AddressSearchBar (~150 lines)
│  └─ Search UI
│
├─ SearchMarkerPopup (~50 lines)
│  └─ Search result display
│
└─ PinLocationButton (~80 lines)
   └─ POI creation toggle

hooks/useAddressSearch.js (~100 lines)
└─ All search logic

utils/markerIcons.js (~40 lines)
└─ Icon factories
```

---

## Benefits of This Refactoring

### Code Organization
- ✅ Each component has single responsibility
- ✅ ~80% reduction in Map.jsx complexity
- ✅ Easier to navigate and understand
- ✅ Clear feature boundaries

### Maintainability
- ✅ Changes isolated to specific files
- ✅ Less risk of unintended side effects
- ✅ Easy to add new features
- ✅ Easy to debug issues

### Testability
- ✅ Components can be unit tested
- ✅ Custom hook can be tested independently
- ✅ Utilities easily tested
- ✅ Easier mocking and isolation

### Reusability
- ✅ Layers can be combined differently
- ✅ Search hook reusable elsewhere
- ✅ Icons reusable in other features
- ✅ Components can be duplicated for multiple maps

### Performance
- ✅ Memoization opportunities on layers
- ✅ Render only affected layers on state change
- ✅ Custom hook can optimize re-renders
- ✅ Better code splitting potential

---

## Success Criteria

- ✅ All original Map.jsx functionality preserved
- ✅ No visual changes to users
- ✅ No API changes
- ✅ All tests passing (60+ new tests)
- ✅ Each component <150 lines
- ✅ Clear prop contracts (PropTypes)
- ✅ Zero console errors/warnings
- ✅ Performance metrics stable/improved

---

## Estimated Timeline

| Phase | Tasks | Est. Hours |
|-------|-------|-----------|
| 3c-1 | Extract utils/hooks | 2 |
| 3c-2 | Extract layers | 3 |
| 3c-3 | Extract controls | 3 |
| 3c-4 | Write tests | 4 |
| 3c-5 | Polish & commit | 2 |
| **TOTAL** | | **14 hours** |

---

## Next Steps (After Phase 3c)

### Phase 3d: Advanced Features
- Add cluster markers for many POIs
- Add polygon/heat map visualization
- Add polyline customization options
- Add real-time vehicle path updates

### Phase 4: Performance Optimization
- Implement memoization for layers
- Add virtual scrolling for large result sets
- Optimize Leaflet rendering
- Add map caching

### Phase 5: Mobile Responsiveness
- Responsive search bar
- Mobile-friendly popups
- Touch gesture support
- Mobile map controls

---

## Questions to Consider

1. **Search feature**: Should search be optional? Could be extracted to separate import
2. **POI creation flow**: Should use modal instead of prompts? More professional UX
3. **Vehicle colors**: Should be configurable? Could add color picker in vehicle settings
4. **Icon customization**: User-defined marker icons? Custom icons per POI type?
5. **Layer toggles**: Should add UI to toggle each layer visibility?

