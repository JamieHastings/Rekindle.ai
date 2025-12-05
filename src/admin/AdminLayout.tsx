// src/admin/AdminLayout.tsx
import React from 'react';
import { LogOut, Home as HomeIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface AdminLayoutProps {
  children?: React.ReactNode;
  onNavigate?: (view: 'home' | 'generator' | 'dashboard' | 'admin') => void;
}

export const AdminLayout: React.FC<AdminLayoutProps> = ({ children, onNavigate }) => {
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    // Navigation will be handled by App.tsx useEffect
    if (onNavigate) {
      onNavigate('home');
    } else {
      window.location.href = '/';
    }
  };

  const handleGoHome = () => {
    if (onNavigate) {
      onNavigate('home');
    } else {
      window.location.href = '/';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#471212] via-[#723737] to-[#9a5959] text-white">
      <header className="flex items-center justify-between p-6 max-w-7xl mx-auto">
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
      </header>
      <main className="max-w-7xl mx-auto p-6">{children}</main>
    </div>
  );
};
