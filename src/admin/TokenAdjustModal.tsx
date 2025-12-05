// src/admin/TokenAdjustModal.tsx
import React, { useState } from 'react';
import { adjustTokens } from './api';

interface TokenAdjustModalProps {
  userId: string;
  userName: string;
  currentTokens: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const TokenAdjustModal: React.FC<TokenAdjustModalProps> = ({
  userId,
  userName,
  currentTokens,
  onClose,
  onSuccess,
}) => {
  const [delta, setDelta] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (delta === 0) return;
    setLoading(true);
    try {
      await adjustTokens(userId, delta);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error adjusting tokens:', error);
      alert('Failed to adjust tokens');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-[#723737] rounded-lg p-6 max-w-md w-full" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-xl mb-4">Adjust Tokens for {userName}</h3>
        <p className="text-sm text-[#F3DADA] mb-4">Current tokens: {currentTokens}</p>
        <form onSubmit={handleSubmit}>
          <input
            type="number"
            value={delta || ''}
            onChange={(e) => setDelta(parseInt(e.target.value) || 0)}
            placeholder="Token change (+/-)"
            className="w-full px-3 py-2 bg-white/10 rounded text-white mb-4"
            required
          />
          <p className="text-sm text-[#F3DADA] mb-4">
            New balance: {currentTokens + delta}
          </p>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || delta === 0}
              className="px-4 py-2 rounded bg-[#f28787] text-[#471212] disabled:opacity-50"
            >
              {loading ? 'Adjusting...' : 'Adjust Tokens'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded bg-white/10 text-white"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
