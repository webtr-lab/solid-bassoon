import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import TrackingPanel from './components/TrackingPanel';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import ChangePasswordModal from './components/ChangePasswordModal';
import ErrorAlert from './components/ErrorAlert';
import ErrorBoundary from './components/ErrorBoundary';
import { apiFetch, getErrorMessage, isAuthError } from './utils/apiClient';
import logger from './utils/logger';
import { MAP_CONFIG, REFRESH_INTERVALS, ADMIN_ROLES, HISTORY_WINDOWS } from './constants';

// Role permissions checker
const canAccessAdmin = (userRole) => {
  return ADMIN_ROLES.includes(userRole);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeView, setActiveView] = useState('tracking');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [placesOfInterest, setPlacesOfInterest] = useState([]);
  const [mapCenter, setMapCenter] = useState(MAP_CONFIG.DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(MAP_CONFIG.DEFAULT_ZOOM);
  const [historyHours, setHistoryHours] = useState(24);
  const [showVehiclesOnMap, setShowVehiclesOnMap] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const data = await apiFetch('/api/auth/check');

      if (data.authenticated) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
        setError(null);
      }
    } catch (err) {
      logger.error('Auth check error', err);
      // Don't show error for auth check - just leave user logged out
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLoginSuccess = (user) => {
    setIsAuthenticated(true);
    setCurrentUser(user);
  };

  const handlePasswordChanged = async () => {
    // Re-check auth to get updated user info
    await checkAuth();
  };

  const handleLogout = async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setVehicles([]);
      setSelectedVehicle(null);
      setActiveView('tracking');
      setError(null);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Logout failed');
      setError(errorMsg);
      logger.error('Logout error', err);
    }
  };

  const fetchVehicles = async () => {
    try {
      const vehiclesData = await apiFetch('/api/vehicles');

      const vehiclesWithLocations = await Promise.all(
        vehiclesData.data.map(async (vehicle) => {
          try {
            const location = await apiFetch(`/api/vehicles/${vehicle.id}/location`);
            return { ...vehicle, lastLocation: location };
          } catch (err) {
            // Vehicle may not have a location yet, that's okay
            logger.debug(`No location for vehicle ${vehicle.id}`);
            return vehicle;
          }
        })
      );

      setVehicles(vehiclesWithLocations);
      setError(null);
    } catch (err) {
      const errorMsg = getErrorMessage(err, 'Failed to load vehicles');
      setError(errorMsg);
      logger.error('Error fetching vehicles', err);
      // If auth error, re-check auth
      if (isAuthError(err)) {
        checkAuth();
      }
    }
  };

  const fetchVehicleHistory = async (vehicleId) => {
    try {
      const data = await apiFetch(`/api/vehicles/${vehicleId}/history?hours=${historyHours}`);
      setVehicleHistory(data);
      setError(null);
    } catch (err) {
      logger.error('Error fetching history', err);
      setVehicleHistory([]);
      // Don't show error for non-critical data loading
    }
  };

  const fetchSavedLocations = async (vehicleId) => {
    try {
      const data = await apiFetch(`/api/vehicles/${vehicleId}/saved-locations`);
      setSavedLocations(data);
      setError(null);
    } catch (err) {
      logger.error('Error fetching saved locations', err);
      setSavedLocations([]);
      // Don't show error for non-critical data loading
    }
  };

  const fetchPlacesOfInterest = async () => {
    try {
      const data = await apiFetch('/api/places-of-interest');
      setPlacesOfInterest(data.data);
      setError(null);
    } catch (err) {
      logger.error('Error fetching places of interest', err);
      setPlacesOfInterest([]);
      // Don't show error for non-critical data loading
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeView === 'tracking') {
      fetchVehicles();
      fetchPlacesOfInterest();
      const interval = setInterval(() => {
        fetchVehicles();
        fetchPlacesOfInterest();
      }, REFRESH_INTERVALS.VEHICLES);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, activeView]);

  useEffect(() => {
    if (selectedVehicle && isAuthenticated) {
      fetchVehicleHistory(selectedVehicle.id);
      fetchSavedLocations(selectedVehicle.id);

      const interval = setInterval(() => {
        fetchVehicleHistory(selectedVehicle.id);
        fetchSavedLocations(selectedVehicle.id);
      }, REFRESH_INTERVALS.HISTORY);

      return () => clearInterval(interval);
    } else {
      setVehicleHistory([]);
      setSavedLocations([]);
    }
  }, [selectedVehicle, historyHours, isAuthenticated]);

  const handleSelectVehicle = (vehicle) => {
    setSelectedVehicle(vehicle);
    // Reset map center/zoom when deselecting vehicle
    if (!vehicle) {
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
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Devnan Maps Dashboard</h1>
            <p className="text-sm text-blue-100">Real-time vehicle tracking and location history</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setActiveView('tracking')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                activeView === 'tracking'
                  ? 'bg-white text-blue-600'
                  : 'bg-blue-700 text-white hover:bg-blue-800'
              }`}
            >
              Tracking
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
                Admin
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
      
      {activeView === 'tracking' ? (
        <div className="flex-1 flex gap-4 p-4 overflow-hidden">
          <TrackingPanel
            vehicles={vehicles}
            selectedVehicle={selectedVehicle}
            onSelectVehicle={handleSelectVehicle}
            placesOfInterest={placesOfInterest}
            onPlaceClick={(place) => {
              setMapCenter([place.latitude, place.longitude]);
              setMapZoom(16);
            }}
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
              placesOfInterest={placesOfInterest}
              onRefreshPOI={fetchPlacesOfInterest}
              currentUserRole={currentUser?.role}
              center={mapCenter}
              zoom={mapZoom}
              showVehicles={showVehiclesOnMap}
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
