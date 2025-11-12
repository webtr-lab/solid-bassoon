import React from 'react';
import PropTypes from 'prop-types';

/**
 * TabNavigation Component
 * Displays tab buttons for switching between admin panel sections
 */
function TabNavigation({ activeTab, setActiveTab, currentUserRole }) {
  const tabs = [
    { id: 'users', label: 'Users', adminOnly: true },
    { id: 'vehicles', label: 'Vehicles', adminOnly: false },
    { id: 'poi', label: 'Places of Interest', adminOnly: false },
    { id: 'reports', label: 'Reports', adminOnly: false },
  ];

  return (
    <div className="bg-white shadow">
      <div className="flex border-b">
        {tabs.map((tab) => (
          (!tab.adminOnly || currentUserRole === 'admin') && (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-6 py-3 font-medium ${
                activeTab === tab.id
                  ? 'border-b-2 border-blue-500 text-blue-600'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              {tab.label}
            </button>
          )
        ))}
      </div>
    </div>
  );
}

TabNavigation.propTypes = {
  activeTab: PropTypes.string.isRequired,
  setActiveTab: PropTypes.func.isRequired,
  currentUserRole: PropTypes.oneOf(['admin', 'manager', 'viewer']).isRequired,
};

export default TabNavigation;
