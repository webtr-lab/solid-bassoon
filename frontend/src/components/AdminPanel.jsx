import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import TabNavigation from './AdminPanel/TabNavigation';
import UserManagement from './AdminPanel/UserManagement';
import VehicleManagement from './AdminPanel/VehicleManagement';
import POIManagement from './AdminPanel/POIManagement';
import VisitsReport from './VisitsReport';

/**
 * AdminPanel Component
 * Container component that manages tabs and delegates to sub-components
 */
function AdminPanel({ currentUserRole }) {
  const [activeTab, setActiveTab] = useState('users');

  useEffect(() => {
    if (currentUserRole !== 'admin' && activeTab === 'users') {
      setActiveTab('vehicles');
    }
  }, [currentUserRole, activeTab]);

  return (
    <div className="h-full flex flex-col bg-gray-100">
      <TabNavigation
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUserRole={currentUserRole}
      />

      <div className="flex-1 overflow-auto p-6">
        {activeTab === 'users' && currentUserRole === 'admin' && <UserManagement />}
        {activeTab === 'vehicles' && <VehicleManagement />}
        {activeTab === 'poi' && <POIManagement />}
        {activeTab === 'reports' && <VisitsReport />}
      </div>
    </div>
  );
}

AdminPanel.propTypes = {
  currentUserRole: PropTypes.oneOf(['admin', 'manager', 'viewer']).isRequired,
};

export default AdminPanel;
