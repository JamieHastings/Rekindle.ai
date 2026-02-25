import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PreviewService } from '../services/previewService';
import { SessionManager } from '../utils/sessionManager';

interface UnlockPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlockSuccess: (fullContent: string, tokensAwarded: number, messageId?: string) => void;
  previewId: string;
  /** Id of the generated_messages row for this preview so unlock can update it with full content instead of inserting a duplicate. */
  generatedMessageId?: string;
  /** Full message content to save when converting preview (e.g. from parent state) */
  fullMessage?: string;
}

export default function UnlockPreviewModal({
  isOpen,
  onClose,
  onUnlockSuccess,
  previewId,
  fullMessage: fullMessageProp,
}: UnlockPreviewModalProps) {
  const [mode, setMode] = useState<'signup' | 'signin'>('signup');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { linkAnonymousMessages } = useAuth();

  const handleSignUp = async () => {
    if (!email || !password || !fullName) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const anonymousSessionId = typeof localStorage !== 'undefined' ? localStorage.getItem('anonymous_session_id') : null;

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('No user returned');

      console.log('✅ Account created:', data.user.id);

      // Link anonymous messages: must match App.tsx storage (user_id null, anonymous_session_id in input_data)
      if (anonymousSessionId) {
        const { data: linked, error: linkError } = await supabase
          .from('generated_messages')
          .update({
            user_id: data.user.id,
            is_preview: false,
          })
          .is('user_id', null)
          .contains('input_data', { anonymous_session_id: anonymousSessionId })
          .select();

        if (!linkError) {
          console.log(`✅ Linked ${linked?.length || 0} messages`);
          if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('anonymous_session_id');
          }
        }
      }

      onUnlockSuccess(fullMessageProp || 'Your message will appear in your dashboard shortly.', 3, previewId);
      onClose();
    } catch (err) {
      console.error('❌ Error:', err);
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;

      if (!authData.session) {
        setError('Failed to create session');
        return;
      }

      // Link any anonymous messages and charge existing user for them
      if (authData.user) {
        await linkAnonymousMessages(authData.user.id, { chargeForLinkedMessages: true });
      }

      const { fullContent, tokensAwarded, messageId } = await PreviewService.unlockPreview(
        previewId,
        authData.session.access_token,
        { generatedMessageId }
      );

      SessionManager.clearSession();

      onUnlockSuccess(fullContent, tokensAwarded || 0, messageId || undefined);
      onClose();
    } catch (err) {
      console.error('Signin error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-panel border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="relative p-6 border-b border-border bg-gradient-to-r from-[#CC4F4E] to-[#CC4F4E] bg-opacity-10">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 text-gray-700 hover:text-gray-900 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-[#CC4F4E] rounded-lg">
                  <Lock className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900">Unlock Your Message</h2>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#8B0000]" />
                <p className="text-sm font-semibold text-gray-900">New users get 3 free tokens!</p>
              </div>
            </div>

            <div className="p-6">
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => setMode('signup')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    mode === 'signup'
                      ? 'bg-[#CC4F4E] text-black'
                      : 'bg-background text-text-light hover:text-text-dark'
                  }`}
                >
                  Sign Up
                </button>
                <button
                  onClick={() => setMode('signin')}
                  className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
                    mode === 'signin'
                      ? 'bg-[#CC4F4E] text-black'
                      : 'bg-background text-text-light hover:text-text-dark'
                  }`}
                >
                  Sign In
                </button>
              </div>

              <div className="space-y-4">
                {mode === 'signup' && (
                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                      placeholder="Enter your name"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                    placeholder="you@example.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-2">
                    Password
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                    placeholder="••••••••"
                  />
                </div>

                {error && (
                  <div className="p-3 bg-red-500 bg-opacity-10 border border-red-500 rounded-lg">
                    <p className="text-red-500 text-sm">{error}</p>
                  </div>
                )}

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={mode === 'signup' ? handleSignUp : handleSignIn}
                  disabled={loading}
                  className="w-full px-6 py-3 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg hover:shadow-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading
                    ? 'Processing...'
                    : mode === 'signup'
                    ? 'Sign Up & Unlock'
                    : 'Sign In & Unlock'}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
