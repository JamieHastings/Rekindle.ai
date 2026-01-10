// src/admin/AdminApp.tsx
import { useState } from 'react';
import { AdminLayout } from './AdminLayout';
import { AdminDashboardView } from './views/AdminDashboardView';
import { AdminMessagesView } from './views/AdminMessagesView';
import { AdminTemplatesView } from './views/AdminTemplatesView';
import { AdminAnalyticsView } from './views/AdminAnalyticsView';
import { AdminSettingsView } from './views/AdminSettingsView';

type AdminView = 'dashboard' | 'messages' | 'templates' | 'analytics' | 'settings';

interface AdminAppProps {
  onNavigate?: (view: 'home' | 'generator' | 'dashboard' | 'admin') => void;
}

export default function AdminApp({ onNavigate }: AdminAppProps){
  const [activeView, setActiveView] = useState<AdminView>('dashboard');

  const renderView = () => {
    switch (activeView) {
      case 'dashboard':
        return <AdminDashboardView />;
      case 'messages':
        return <AdminMessagesView />;
      case 'templates':
        return <AdminTemplatesView />;
      case 'analytics':
        return <AdminAnalyticsView />;
      case 'settings':
        return <AdminSettingsView />;
      default:
        return <AdminDashboardView />;
    }
  };

  return (
    <AdminLayout
      onNavigate={onNavigate}
      activeView={activeView}
      onViewChange={setActiveView}
    >
      {renderView()}
    </AdminLayout>
  );
}
