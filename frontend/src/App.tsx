import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import TrackingPanel from './components/TrackingPanel';
import StoreMapView from './components/StoreMapView';
import StoreDetailsPanel from './components/StoreDetailsPanel';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import ErrorAlert from './components/ErrorAlert';
import ErrorBoundary from './components/ErrorBoundary';
import { useAuth } from './hooks/useAuth';
import { useFetchVehicles } from './hooks/useFetchVehicles';
import { useVehicleDetails } from './hooks/useVehicleDetails';
import { useFetchPlaces } from './hooks/useFetchPlaces';
import { MAP_CONFIG, ADMIN_ROLES } from './constants';
import { initTimeSync } from './utils/timeSync';
import { Vehicle, PlaceOfInterest, Location, User } from './types';

type ViewType = 'stores' | 'tracking' | 'admin';

interface VehicleWithLocation extends Vehicle {
  lastLocation?: Location;
}

// Role permissions checker
const canAccessAdmin = (userRole?: string): boolean => {
  return userRole ? ADMIN_ROLES.includes(userRole as 'admin' | 'manager') : false;
};

function App() {
  // Authentication
  const {
    isAuthenticated,
    currentUser,
    loading,
    error: authError,
    handleLoginSuccess,
    handlePasswordChanged,
    handleLogout,
    setError: setAuthError
  } = useAuth();

  // View state - DEFAULT TO STORES (primary stakeholder need)
  const [activeView, setActiveView] = useState<ViewType>('stores');

  // Map state
  const [mapCenter, setMapCenter] = useState<[number, number]>(MAP_CONFIG.DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState<number>(MAP_CONFIG.DEFAULT_ZOOM);
  const [historyHours, setHistoryHours] = useState<number>(24);
  const [showVehiclesOnMap, setShowVehiclesOnMap] = useState<boolean>(true);
  const [selectedStore, setSelectedStore] = useState<PlaceOfInterest | null>(null);

  // Data fetching hooks
  const {
    vehicles,
    error: vehiclesError,
    setError: setVehiclesError,
    fetchVehicles
  } = useFetchVehicles(isAuthenticated, activeView);

  const {
    selectedVehicle,
    vehicleHistory,
    savedLocations,
    setSelectedVehicle,
    fetchSavedLocations
  } = useVehicleDetails(isAuthenticated, historyHours);

  const {
    placesOfInterest,
    isLoading: placesLoading,
    error: placesError,
    fetchPlacesOfInterest
  } = useFetchPlaces(isAuthenticated, activeView);

  // Combine errors
  const error = authError || vehiclesError || placesError;
  const setError = authError ? setAuthError : setVehiclesError;

  // Initialize server time synchronization on app load
  useEffect(() => {
    initTimeSync();
  }, []);

  const handleSelectVehicle = (vehicle: VehicleWithLocation | null): void => {
    setSelectedVehicle(vehicle);

    if (vehicle && vehicle.lastLocation) {
      // Zoom to vehicle's current location
      setMapCenter([vehicle.lastLocation.latitude, vehicle.lastLocation.longitude]);
      setMapZoom(15); // Zoom in closer to see details
    } else if (!vehicle) {
      // Reset map center/zoom when deselecting vehicle
      setMapCenter(MAP_CONFIG.DEFAULT_CENTER);
      setMapZoom(MAP_CONFIG.DEFAULT_ZOOM);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="text-4xl mb-4">📍</div>
          <div className="text-xl text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Show password change modal if user must change password
  if (currentUser?.must_change_password) {
    return (
      <>
        <div className="min-h-screen bg-gray-100">
          <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg">
            <div className="px-6 py-4 flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">Devnan Maps Tracker</h1>
                <p className="text-sm text-blue-100">Password change required</p>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{currentUser?.username}</div>
                <div className="text-xs text-blue-200">
                  {currentUser?.email} • {currentUser?.role}
                </div>
              </div>
            </div>
          </header>
        </div>
        <ChangePasswordModal
          onPasswordChanged={handlePasswordChanged}
          canCancel={false}
        />
      </>
    );
  }

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-gray-100">
      <ErrorAlert message={error} onDismiss={() => setError(null)} />
      <header className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Devnan Maps Dashboard</h1>
            <p className="text-sm text-blue-100">Business location management and tracking</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveView('stores')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'stores'
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              📍 Store Locations
            </button>
            <button
              onClick={() => setActiveView('tracking')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'tracking'
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              🚗 Vehicle Tracking
            </button>
            {canAccessAdmin(currentUser?.role) && (
              <button
                onClick={() => setActiveView('admin')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeView === 'admin'
                    ? 'bg-white text-blue-600'
                    : 'bg-blue-700 text-white hover:bg-blue-800'
                }`}
              >
                ⚙️ Admin
              </button>
            )}
            <div className="text-right">
              <div className="text-sm font-medium">{currentUser?.username}</div>
              <div className="text-xs text-blue-200">
                {currentUser?.email} • {currentUser?.role}
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="px-4 py-2 bg-white text-blue-600 rounded-lg hover:bg-blue-50 transition-colors font-medium"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {activeView === 'stores' ? (
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <StoreMapView
            placesOfInterest={placesOfInterest}
            isLoading={placesLoading}
            error={placesError}
            onRefresh={fetchPlacesOfInterest}
            onStoreClick={(store) => {
              setSelectedStore(store);
              setMapCenter([store.latitude, store.longitude]);
              setMapZoom(16);
            }}
          />
          <main className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            <Map
              vehicles={[]}
              selectedVehicle={null}
              vehicleHistory={[]}
              savedLocations={[]}
              placesOfInterest={placesOfInterest}
              onRefreshPOI={fetchPlacesOfInterest}
              currentUserRole={currentUser?.role}
              center={mapCenter}
              zoom={mapZoom}
              showVehicles={false}
              showPlaces={true}
            />
          </main>
          <StoreDetailsPanel
            store={selectedStore}
            onClose={() => setSelectedStore(null)}
          />
        </div>
      ) : activeView === 'tracking' ? (
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <TrackingPanel
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            savedLocations={savedLocations}
            historyHours={historyHours}
            onHistoryHoursChange={setHistoryHours}
            onRefreshLocations={() => {
              if (selectedVehicle) {
                fetchSavedLocations(selectedVehicle.id);
              }
            }}
            showVehiclesOnMap={showVehiclesOnMap}
            onToggleShowVehicles={setShowVehiclesOnMap}
          />

          <main className="flex-1 bg-white rounded-lg shadow overflow-hidden">
            <Map
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              vehicleHistory={vehicleHistory}
              savedLocations={savedLocations}
              placesOfInterest={[]}
              onRefreshPOI={() => {}}
              currentUserRole={currentUser?.role}
              center={mapCenter}
              zoom={mapZoom}
              showVehicles={showVehiclesOnMap}
              showPlaces={false}
            />
          </main>
        </div>
      ) : (
        canAccessAdmin(currentUser?.role) ? (
          <div className="flex-1 overflow-hidden">
            <AdminPanel currentUserRole={currentUser?.role} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-6xl mb-4">🔒</div>
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
              <p className="text-gray-600">You don&apos;t have permission to access admin panel.</p>
              <p className="text-sm text-gray-500 mt-2">Your role: {currentUser?.role}</p>
            </div>
          </div>
        )
      )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
