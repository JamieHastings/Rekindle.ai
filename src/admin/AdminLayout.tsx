// src/admin/AdminLayout.tsx
import React, { useState } from 'react';
import { LogOut, Home as HomeIcon, LayoutDashboard, FileText, BarChart3, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

type AdminView = 'dashboard' | 'templates' | 'analytics' | 'settings';

interface AdminLayoutProps {
  children?: React.ReactNode;
  onNavigate?: (view: 'home' | 'generator' | 'dashboard' | 'admin') => void;
  defaultView?: AdminView;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onNavigate, defaultView = 'dashboard' }) => {
  const { signOut, user, profile } = useAuth();
  const [activeView, setActiveView] = useState<AdminView>(defaultView);

  const handleSignOut = async () => {
    try {
      await signOut();
      // Navigation will be handled by App.tsx useEffect
      if (onNavigate) {
        onNavigate('home');
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Error signing out:', error);
      // Force navigation even if sign out fails
      if (onNavigate) {
        onNavigate('home');
      } else {
        window.location.href = '/';
      }
    }
  };

  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('home');
    } else {
      window.location.href = '/';
    }
  };

  const handleViewChange = (view: AdminView) => {
    setActiveView(view);
    // If onNavigate is provided, we can use it to communicate view changes
    // For now, we'll handle views internally
  };

  // Role-based protection: Only render if user is admin
  const isAdmin = profile && (profile.is_admin === true || profile.is_admin === 1 || profile.is_admin === 'true');
  
  if (!isAdmin && user) {
    // If user is not admin, redirect to home
    if (onNavigate) {
      onNavigate('home');
    }
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#471212] via-[#723737] to-[#9a5959] text-white">
      <header className="border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <img src="/Rekendle_ai_logo.PNG" alt="logo" className="w-10 h-10 rounded" />
              <div>
                <div className="font-serif text-2xl">Rekindle.ai Admin</div>
                <div className="text-sm text-[#F3DADA]">Manage users, payments & templates</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={handleGoHome}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 bg-white/10 hover:bg-white/20"
              >
                <HomeIcon className="w-5 h-5" />
                <span>Home</span>
              </button>
              <button
                onClick={handleSignOut}
                className="px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 bg-white/10 hover:bg-white/20"
              >
                <LogOut className="w-5 h-5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
          
          {/* Admin Navigation Menu */}
          <nav className="flex items-center gap-2 border-t border-white/10 pt-4">
            <button
              onClick={() => handleViewChange('dashboard')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeView === 'dashboard' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 hover:bg-white/15 text-[#F3DADA]'
              }`}
            >
              <LayoutDashboard className="w-5 h-5" />
              <span>Admin Dashboard</span>
            </button>
            <button
              onClick={() => handleViewChange('templates')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeView === 'templates' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 hover:bg-white/15 text-[#F3DADA]'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span>Templates</span>
            </button>
            <button
              onClick={() => handleViewChange('analytics')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeView === 'analytics' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 hover:bg-white/15 text-[#F3DADA]'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              <span>Sales/Analytics</span>
            </button>
            <button
              onClick={() => handleViewChange('settings')}
              className={`px-4 py-2 rounded-lg font-medium transition-all flex items-center gap-2 ${
                activeView === 'settings' 
                  ? 'bg-white/20 text-white' 
                  : 'bg-white/10 hover:bg-white/15 text-[#F3DADA]'
              }`}
            >
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
};
