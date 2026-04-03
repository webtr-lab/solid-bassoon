import React from 'react';
import type { UserRole } from '../../types';

/**
 * Tab definition structure
 */
interface Tab {
  id: string;
  label: string;
  adminOnly: boolean;
}

/**
 * TabNavigation Component
 * Displays tab buttons for switching between admin panel sections
 */
interface TabNavigationProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currentUserRole: UserRole;
}

function TabNavigation({ activeTab, setActiveTab, currentUserRole }: TabNavigationProps): JSX.Element {
  const tabs: Tab[] = [
    { id: 'users', label: 'Users', adminOnly: true },
    { id: 'vehicles', label: 'Fleet', adminOnly: false },
    { id: 'poi', label: 'Businesses', adminOnly: false },
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

export default React.memo(TabNavigation);
