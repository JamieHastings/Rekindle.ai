// src/pages/admin/AdminDashboard.tsx
import AdminApp from '../../admin/AdminApp';

interface AdminDashboardProps {
  onNavigate?: (view: 'home' | 'generator' | 'dashboard' | 'admin') => void;
}

export default function AdminDashboard({ onNavigate }: AdminDashboardProps) {
  return <AdminApp onNavigate={onNavigate} />;
}
