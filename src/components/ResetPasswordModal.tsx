// src/components/ResetPasswordModal.tsx

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, KeyRound, CheckCircle } from "lucide-react";
import { supabase } from "../lib/supabase";

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessionReady: boolean;
}

const validatePassword = (password: string) => {
  if (password.length < 6) return 'Password must be at least 6 characters.';
  return null;
};

export default function ResetPasswordModal({ isOpen, onClose, sessionReady }: ResetPasswordModalProps) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setLoading(true);
    setError("");

    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center p-4 z-50"
          onClick={success ? onClose : undefined}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-panel border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            {/* Header */}
            <div className="relative p-6 border-b border-border">
              {success && (
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 text-text-light hover:text-text-dark transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
              <div className="flex items-center gap-3">
                <div className="p-2 bg-[#CC4F4E] rounded-lg">
                  {success ? (
                    <CheckCircle className="w-5 h-5 text-black" />
                  ) : (
                    <KeyRound className="w-5 h-5 text-black" />
                  )}
                </div>
                <h2 className="text-xl font-bold text-text-dark">
                  {success ? "Password Updated" : "Set New Password"}
                </h2>
              </div>
            </div>

            <div className="p-6">
              {success ? (
                <div className="text-center py-2">
                  <p className="text-text-light text-sm mb-6">
                    Your password has been changed successfully. You can now use it to log in.
                  </p>
                  <button
                    onClick={onClose}
                    className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition"
                  >
                    Continue
                  </button>
                </div>
              ) : !sessionReady ? (
                <div className="text-center py-4">
                  <div className="w-8 h-8 border-2 border-[#CC4F4E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-text-light text-sm">Verifying your reset link…</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="px-4 py-3 bg-[#CC4F4E]/20 border border-[#CC4F4E]/40 rounded-lg text-[#CC4F4E] text-sm">
                      {error}
                    </div>
                  )}

                  <p className="text-sm text-gray-500 mb-3">
                    Password must be at least 6 characters. Letters, numbers, and symbols are all accepted.
                  </p>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-text-dark mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] transition-colors"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition disabled:opacity-50 mt-2"
                  >
                    {loading ? "Updating..." : "Update Password"}
                  </button>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
