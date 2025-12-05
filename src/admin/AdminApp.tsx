// src/admin/AdminApp.tsx
import { AdminLayout } from './AdminLayout';
import { UsersTable } from './UsersTable';
import { PaymentsTable } from './PaymentsTable';
import { TemplatesManager } from './TemplatesManager';

interface AdminAppProps {
  onNavigate?: (view: 'home' | 'generator' | 'dashboard' | 'admin') => void;
}

export default function AdminApp({ onNavigate }: AdminAppProps){
  return (
    <AdminLayout onNavigate={onNavigate}>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <UsersTable />
        <PaymentsTable />
      </div>
      <TemplatesManager />
    </AdminLayout>
  );
}
