// src/admin/PaymentsTable.tsx
import React, { useEffect, useState } from 'react';
import { fetchPayments } from './api';

export const PaymentsTable: React.FC = () => {
  const [payments, setPayments] = useState<any[]>([]);
  useEffect(() => { fetchPayments().then(setPayments).catch(console.error); }, []);
  return (
    <div className="bg-white/5 rounded-lg p-4 mt-4">
      <h3 className="text-xl mb-4">Payments</h3>
      <table className="w-full text-sm">
        <thead className="text-[#F3DADA]"><tr><th>id</th><th>user</th><th>amount</th><th>status</th><th>date</th></tr></thead>
        <tbody>
          {payments.map(p => (
            <tr key={p.id} className="border-t border-white/5">
              <td className="truncate max-w-xs">{p.id.substring(0, 8)}...</td>
              <td className="truncate max-w-xs">{p.user_id.substring(0, 8)}...</td>
              <td>${(p.amount_cents / 100).toFixed(2)}</td>
              <td>{p.status}</td>
              <td>{new Date(p.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
