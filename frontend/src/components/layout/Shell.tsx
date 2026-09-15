import React from 'react';
import { useApp } from '../../context/AppContext';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { TraceabilityModal } from '../common/TraceabilityModal';
import { RecommendationDrawer } from '../common/RecommendationDrawer';

// Pages
import { CommandCenterPage } from '../../pages/CommandCenterPage';
import { InventoryPage } from '../../pages/InventoryPage';
import { RiskMonitorPage } from '../../pages/RiskMonitorPage';
import { DemandForecastPage } from '../../pages/DemandForecastPage';
import { NetworkPage } from '../../pages/NetworkPage';
import { RecommendationsPage } from '../../pages/RecommendationsPage';
import { RescueModePage } from '../../pages/RescueModePage';
import { ImpactPage } from '../../pages/ImpactPage';
import { AlertsPage } from '../../pages/AlertsPage';
import { SettingsPage } from '../../pages/SettingsPage';

export const Shell: React.FC = () => {
  const { activeRoute } = useApp();

  const renderPage = () => {
    switch (activeRoute) {
      case '/dashboard':
        return <CommandCenterPage />;
      case '/inventory':
        return <InventoryPage />;
      case '/risks':
        return <RiskMonitorPage />;
      case '/forecast':
        return <DemandForecastPage />;
      case '/network':
        return <NetworkPage />;
      case '/recommendations':
        return <RecommendationsPage />;
      case '/rescue':
        return <RescueModePage />;
      case '/impact':
        return <ImpactPage />;
      case '/alerts':
        return <AlertsPage />;
      case '/settings':
        return <SettingsPage />;
      default:
        return <CommandCenterPage />;
    }
  };

  return (
    <div className="min-h-screen bg-[#f2f4f7] p-3 sm:p-5 md:p-6 flex items-center justify-center font-sans">
      {/* Large rounded white application shell inspired by reference image */}
      <div className="bg-white w-full max-w-[1550px] min-h-[92vh] rounded-[2rem] p-4 sm:p-6 shadow-soft border border-slate-200/60 flex flex-col md:flex-row gap-6 relative overflow-hidden">
        {/* Left Sidebar */}
        <Sidebar />

        {/* Main Content Viewport */}
        <div className="flex-1 flex flex-col min-w-0">
          <Topbar />
          <main className="flex-1 min-w-0 overflow-y-auto pr-1">
            {renderPage()}
          </main>
        </div>
      </div>

      {/* Global Modals & Drawers */}
      <TraceabilityModal />
      <RecommendationDrawer />
    </div>
  );
};
