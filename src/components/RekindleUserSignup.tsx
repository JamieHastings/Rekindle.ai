/**
 * Example Component: Rekindle.ai User Signup
 * 
 * This component demonstrates how to create new users on Rekindle.ai
 * and sync them to Supabase profiles table.
 * 
 * Usage:
 * ```tsx
 * import RekindleUserSignup from './components/RekindleUserSignup';
 * 
 * <RekindleUserSignup onSuccess={(userId) => console.log('User created:', userId)} />
 * ```
 */

import { useState } from 'react';
import { createRekindleUser, RekindleUserData } from '../utils/rekindleIntegration';

interface RekindleUserSignupProps {
  onSuccess?: (userId: string) => void;
  onError?: (error: string) => void;
  initialTokens?: number;
}

export default function RekindleUserSignup({
  onSuccess,
  onError,
  initialTokens = 5,
}: RekindleUserSignupProps) {
  const [formData, setFormData] = useState<RekindleUserData>({
    email: '',
    password: '',
    full_name: '',
    tokens: initialTokens,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Validate form data
      if (!formData.email || !formData.password) {
        throw new Error('Email and password are required');
      }

      // Create user on Rekindle.ai and sync to Supabase
      const result = await createRekindleUser({
        ...formData,
        tokens: formData.tokens || initialTokens,
      });

      if (result.success && result.userId) {
        setSuccess(true);
        if (onSuccess) {
          onSuccess(result.userId);
        }
        // Reset form after successful creation
        setTimeout(() => {
          setFormData({
            email: '',
            password: '',
            full_name: '',
            tokens: initialTokens,
          });
          setSuccess(false);
        }, 3000);
      } else {
        const errorMessage = result.error || 'Failed to create user';
        setError(errorMessage);
        if (onError) {
          onError(errorMessage);
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(errorMessage);
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-gray-800">Create Rekindle.ai User</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email *
          </label>
          <input
            id="email"
            type="email"
            required
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
            placeholder="user@example.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password *
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
            placeholder="Minimum 6 characters"
          />
        </div>

        <div>
          <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name
          </label>
          <input
            id="full_name"
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
            placeholder="John Doe"
          />
        </div>

        <div>
          <label htmlFor="tokens" className="block text-sm font-medium text-gray-700 mb-1">
            Initial Tokens
          </label>
          <input
            id="tokens"
            type="number"
            min="0"
            value={formData.tokens || initialTokens}
            onChange={(e) => setFormData({ ...formData, tokens: parseInt(e.target.value) || initialTokens })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
          />
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 bg-green-50 border border-green-200 rounded-md text-green-700 text-sm">
            User created successfully! Profile synced to Supabase.
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full px-4 py-2 bg-[#CC4F4E] text-white rounded-md hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {loading ? 'Creating User...' : 'Create User & Sync to Supabase'}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500">
        <p>This will:</p>
        <ul className="list-disc list-inside mt-1">
          <li>Create a user in Supabase Auth</li>
          <li>Create a profile in the profiles table</li>
          <li>Set initial token balance</li>
        </ul>
      </div>
    </div>
  );
}

