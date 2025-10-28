import React, { useState, useEffect } from 'react';
import Map from './components/Map';
import VehicleList from './components/VehicleList';
import VehicleHistory from './components/VehicleHistory';
import VehicleStats from './components/VehicleStats';
import AdminPanel from './components/AdminPanel';
import Login from './components/Login';
import PlacesList from './components/PlacesList';
import ChangePasswordModal from './components/ChangePasswordModal';

// Role permissions checker
const canAccessAdmin = (userRole) => {
  return ['admin', 'manager'].includes(userRole);
};

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeView, setActiveView] = useState('tracking');
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [vehicleHistory, setVehicleHistory] = useState([]);
  const [savedLocations, setSavedLocations] = useState([]);
  const [placesOfInterest, setPlacesOfInterest] = useState([]);
  const [mapCenter, setMapCenter] = useState([5.8520, -55.2038]);
  const [mapZoom, setMapZoom] = useState(13);
  const [historyHours, setHistoryHours] = useState(24);
  const [showVehiclesOnMap, setShowVehiclesOnMap] = useState(true);
  const [vehicleListCollapsed, setVehicleListCollapsed] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const response = await fetch('/api/auth/check', {
        credentials: 'include'
      });
      const data = await response.json();
      
      if (data.authenticated) {
        setIsAuthenticated(true);
        setCurrentUser(data.user);
      }
    } catch (error) {
      console.error('Auth check error:', error);
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
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
      setIsAuthenticated(false);
      setCurrentUser(null);
      setVehicles([]);
      setSelectedVehicle(null);
      setActiveView('tracking');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const fetchVehicles = async () => {
    try {
      const response = await fetch('/api/vehicles', {
        credentials: 'include'
      });
      const vehiclesData = await response.json();
      
      const vehiclesWithLocations = await Promise.all(
        vehiclesData.map(async (vehicle) => {
          try {
            const locResponse = await fetch(`/api/vehicles/${vehicle.id}/location`, {
              credentials: 'include'
            });
            if (locResponse.ok) {
              const location = await locResponse.json();
              return { ...vehicle, lastLocation: location };
            }
          } catch (err) {
            console.log(`No location for vehicle ${vehicle.id}`);
          }
          return vehicle;
        })
      );
      
      setVehicles(vehiclesWithLocations);
    } catch (error) {
      console.error('Error fetching vehicles:', error);
    }
  };

  const fetchVehicleHistory = async (vehicleId) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/history?hours=${historyHours}`, {
        credentials: 'include'
      });
      const data = await response.json();
      setVehicleHistory(data);
    } catch (error) {
      console.error('Error fetching history:', error);
      setVehicleHistory([]);
    }
  };

  const fetchSavedLocations = async (vehicleId) => {
    try {
      const response = await fetch(`/api/vehicles/${vehicleId}/saved-locations`, {
        credentials: 'include'
      });
      const data = await response.json();
      setSavedLocations(data);
    } catch (error) {
      console.error('Error fetching saved locations:', error);
      setSavedLocations([]);
    }
  };

  const fetchPlacesOfInterest = async () => {
    try {
      const response = await fetch('/api/places-of-interest', {
        credentials: 'include'
      });
      const data = await response.json();
      setPlacesOfInterest(data);
    } catch (error) {
      console.error('Error fetching places of interest:', error);
      setPlacesOfInterest([]);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeView === 'tracking') {
      fetchVehicles();
      fetchPlacesOfInterest();
      const interval = setInterval(() => {
        fetchVehicles();
        fetchPlacesOfInterest();
      }, 5000);
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
      }, 10000);
      
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
      setMapCenter([5.8520, -55.2038]);
      setMapZoom(13);
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
                <h1 className="text-2xl font-bold">GPS Tracker</h1>
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
    <div className="h-screen flex flex-col bg-gray-100">
      <header className="bg-blue-600 text-white p-4 shadow-lg">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">GPS Tracker Dashboard</h1>
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
          <aside className="w-80 flex flex-col gap-4 overflow-y-auto">
            {/* Toggle for showing/hiding vehicles on map */}
            <div className="bg-white rounded-lg shadow p-4">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-sm font-medium text-gray-700">Show Vehicles on Map</span>
                <div className="relative">
                  <input
                    type="checkbox"
                    checked={showVehiclesOnMap}
                    onChange={(e) => setShowVehiclesOnMap(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </div>
              </label>
            </div>

                <VehicleList
              vehicles={vehicles}
              selectedVehicle={selectedVehicle}
              onSelectVehicle={handleSelectVehicle}
              collapsed={vehicleListCollapsed}
              onToggleCollapse={() => setVehicleListCollapsed(!vehicleListCollapsed)}
            />
            
            {/* Only show PlacesList when no vehicle is selected */}
            {!selectedVehicle && placesOfInterest.length > 0 && (
              <div className={vehicleListCollapsed ? "flex-1 flex flex-col min-h-0" : ""}>
                <PlacesList
                  places={placesOfInterest}
                  onPlaceClick={(place) => {
                    setMapCenter([place.latitude, place.longitude]);
                    setMapZoom(16);
                  }}
                />
              </div>
            )}            {selectedVehicle && (
              <>
                <div className="bg-white rounded-lg shadow p-4">
                  <label className="block text-sm font-medium mb-2">History Duration</label>
                  <select
                    value={historyHours}
                    onChange={(e) => setHistoryHours(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value={1}>Last 1 hour</option>
                    <option value={6}>Last 6 hours</option>
                    <option value={24}>Last 24 hours</option>
                    <option value={72}>Last 3 days</option>
                    <option value={168}>Last 7 days</option>
                  </select>
                </div>
                
                <VehicleHistory
                  savedLocations={savedLocations}
                  onRefresh={() => fetchSavedLocations(selectedVehicle.id)}
                  vehicleId={selectedVehicle.id}
                />
                
                <VehicleStats
                  vehicleId={selectedVehicle.id}
                  historyHours={historyHours}
                />
              </>
            )}
          </aside>

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
              <p className="text-gray-600">You don't have permission to access admin panel.</p>
              <p className="text-sm text-gray-500 mt-2">Your role: {currentUser?.role}</p>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default App;
