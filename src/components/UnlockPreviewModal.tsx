import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Lock, Sparkles, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { EXISTING_ACCOUNT_MESSAGE, signupIndicatesExistingAccount } from '../lib/signupAlreadyExists';
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
  generatedMessageId,
  fullMessage: fullMessageProp,
}: UnlockPreviewModalProps) {
  const [mode, setMode] = useState<'signup' | 'signin' | 'email-confirmation'>('signup');
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
          emailRedirectTo: `${window.location.origin}/auth/confirm`,
          data: {
            full_name: fullName,
            anonymous_session_id: anonymousSessionId ?? undefined,
          },
        },
      });

      if (signUpError) throw signUpError;
      if (!data.user) throw new Error('No user returned');

      if (signupIndicatesExistingAccount(data.user, data.session)) {
        setError(EXISTING_ACCOUNT_MESSAGE);
        return;
      }

      console.log('✅ Account created:', data.user.id);

      // Email confirmation is required — session is null until the user clicks the link
      if (!data.session) {
        localStorage.setItem('rekindle_pending_unlock', JSON.stringify({
          messageId: generatedMessageId || previewId,
          fullMessage: fullMessageProp || '',
        }));
        setMode('email-confirmation');
        return;
      }

      // Email confirmation disabled — session exists, proceed immediately
      if (anonymousSessionId) {
        const { data: linked, error: linkError } = await supabase
          .from('generated_messages')
          .update({ user_id: data.user.id, is_preview: false })
          .is('user_id', null)
          .contains('input_data', { anonymous_session_id: anonymousSessionId })
          .select();
        if (!linkError) {
          console.log(`✅ Linked ${linked?.length || 0} messages`);
          localStorage.removeItem('anonymous_session_id');
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
              {/* Email confirmation pending — hide the tabs and form */}
              {mode === 'email-confirmation' && (
                <div className="space-y-4 text-center">
                  <div className="flex justify-center">
                    <div className="p-4 bg-[#CC4F4E]/10 rounded-full">
                      <Mail className="w-10 h-10 text-[#CC4F4E]" />
                    </div>
                  </div>
                  <p className="text-text-dark font-medium">We sent a confirmation link to</p>
                  <p className="text-[#CC4F4E] font-semibold break-all">{email}</p>
                  <p className="text-text-light text-sm">
                    Click the link in that email to activate your account. Your message will be waiting for you in your dashboard.
                  </p>
                  <p className="text-text-light text-xs">
                    Didn't receive it? Check your spam folder or{' '}
                    <button
                      className="text-[#CC4F4E] hover:opacity-80 transition-opacity underline"
                      onClick={() => { setMode('signup'); setError(''); }}
                    >
                      try again
                    </button>.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition mt-2"
                  >
                    Got it
                  </button>
                </div>
              )}

              {mode !== 'email-confirmation' && (
              <>
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
              </>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
