import React from 'react';
import { TemplatesManager } from '../TemplatesManager';
import { UsersTable } from '../UsersTable';
import { PaymentsTable } from '../PaymentsTable';

export const AdminTemplatesView: React.FC = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold mb-2">Template Management</h2>
        <p className="text-[#F3DADA]">Upload, edit, and manage design templates for messages</p>
      </div>

      <TemplatesManager />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <UsersTable />
        <PaymentsTable />
      </div>
    </div>
  );
};
