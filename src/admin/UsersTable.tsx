// src/admin/UsersTable.tsx
import React, { useEffect, useState } from 'react';
import { fetchUsers, adjustTokens } from './api';
import { User } from './types';

export const UsersTable: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchUsers().then((u) => { setUsers(u); setLoading(false); }).catch(console.error);
  }, []);

  const grantTokens = async (userId: string) => {
    await adjustTokens(userId, 5);
    setUsers((s) => s.map(u => u.id === userId ? {...u, tokens: (u.tokens||0) + 5} : u));
  }

  return (
    <div className="bg-white/5 rounded-lg p-4">
      <h3 className="text-xl mb-4">Users</h3>
      {loading ? <div>Loading...</div> : (
        <table className="w-full text-sm">
          <thead className="text-left text-[#F3DADA]">
            <tr><th>Email</th><th>Created</th><th>Tokens</th><th>Actions</th></tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="border-t border-white/5">
                <td className="py-3">{u.email}</td>
                <td>{new Date(u.created_at).toLocaleString()}</td>
                <td>{u.tokens ?? 0}</td>
                <td>
                  <button onClick={() => grantTokens(u.id)} className="px-3 py-1 rounded bg-[#f28787] text-[#471212]">+5 tokens</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
