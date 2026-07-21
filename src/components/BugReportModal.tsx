import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Bug, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const FORMSUBMIT_URL = 'https://formsubmit.co/support@rekindle-online.com';

interface BugReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
}

export default function BugReportModal({
  isOpen,
  onClose,
  userEmail = '',
}: BugReportModalProps) {
  const { user } = useAuth();
  const [description, setDescription] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialSuccess, setPartialSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userEmail) {
      setEmail(userEmail);
    }
  }, [isOpen, userEmail]);

  const resetForm = () => {
    setDescription('');
    setEmail(userEmail || '');
    setError(null);
    setPartialSuccess(null);
    setSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim() || !email.trim()) {
      setError('Please fill in description and email.');
      return;
    }
    setLoading(true);
    setError(null);
    setPartialSuccess(null);

    const descriptionTrimmed = description.trim();
    const emailTrimmed = email.trim();

    const [supabaseResult, formSubmitResult] = await Promise.allSettled([
      supabase.from('bug_reports').insert({
        user_id: user?.id ?? null,
        user_email: emailTrimmed,
        title: 'Bug Report',
        description: descriptionTrimmed,
        steps_to_reproduce: null,
        expected_behavior: null,
        actual_behavior: null,
      }),
      (async () => {
        const formData = new FormData();
        formData.append('_subject', 'Bug Report from Rekendle.ai');
        formData.append('_template', 'table');
        formData.append('_captcha', 'false');
        formData.append('description', descriptionTrimmed);
        formData.append('email', emailTrimmed);
        const res = await fetch(FORMSUBMIT_URL, {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error('FormSubmit failed');
        return res;
      })(),
    ]);

    setLoading(false);

    const supabaseOk = supabaseResult.status === 'fulfilled' && !supabaseResult.value.error;
    const formSubmitOk = formSubmitResult.status === 'fulfilled';

    if (supabaseOk && formSubmitOk) {
      setDescription('');
      setEmail(userEmail || '');
      setSuccess(true);
      setError(null);
      setPartialSuccess(null);
      return;
    }
    if (formSubmitOk && !supabaseOk) {
      setDescription('');
      setEmail(userEmail || '');
      setSuccess(true);
      setPartialSuccess('Your report was emailed. There was an issue saving to our system.');
      setError(null);
      return;
    }
    if (supabaseOk && !formSubmitOk) {
      setPartialSuccess('Report saved; we could not send the confirmation email.');
      setError(null);
      return;
    }
    setError('Failed to send report. Please try again or email us directly.');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
        onClick={handleClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-panel border border-border rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
        >
          <div className="relative p-6 border-b border-border bg-gradient-to-r from-[#CC4F4E]/10 to-[#CC4F4E]/5">
            <button
              type="button"
              onClick={handleClose}
              className="absolute top-4 right-4 text-text-light hover:text-text-dark transition-colors"
              aria-label="Close"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#CC4F4E] rounded-lg">
                <Bug className="w-6 h-6 text-white" />
              </div>
              <h2 className="text-xl font-bold text-text-dark">Report a Bug</h2>
            </div>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            {success ? (
              <div className="text-center py-4">
                <p className="text-text-dark font-medium mb-2">Thank you! Your report has been sent.</p>
                {partialSuccess && <p className="text-text-light text-sm mb-4">{partialSuccess}</p>}
                <button
                  type="button"
                  onClick={handleClose}
                  className="px-6 py-2 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 font-medium"
                >
                  Close
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-600 text-sm">
                    {error}
                  </div>
                )}
                {partialSuccess && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg text-amber-700 text-sm">
                    {partialSuccess}
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">Description (required)</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E] resize-y"
                    placeholder="Describe the issue..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-text-dark mb-1">Your email (required)</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-2 bg-background border border-border rounded-lg text-text-dark placeholder-text-light focus:outline-none focus:border-[#CC4F4E]"
                    placeholder="you@example.com"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 px-4 py-2 border border-border rounded-lg text-text-dark hover:bg-background"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Submit'
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
