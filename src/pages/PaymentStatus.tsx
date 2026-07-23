import { useEffect, useState } from 'react';
import { CheckCircle, Clock, AlertCircle, Coins } from 'lucide-react';
import { supabase } from '../lib/supabase';

type Status = 'processing' | 'success' | 'timeout';

interface PaymentStatusProps {
  onGoHome: () => void;
}

export default function PaymentStatus({ onGoHome }: PaymentStatusProps) {
  const [status, setStatus] = useState<Status>('processing');
  const [tokensAdded, setTokensAdded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const pending = localStorage.getItem('rekindle_fygaro_pending');
    let balanceBefore = 0;
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        balanceBefore = parsed.balanceBefore ?? 0;
      } catch {}
    }

    let attempts = 0;
    const maxAttempts = 10; // ~15 seconds total

    const poll = async () => {
      if (cancelled) return;

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          // Not logged in — can't poll
          if (!cancelled) setStatus('timeout');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('tokens')
          .eq('id', session.user.id)
          .single();

        if (!profile) {
          attempts++;
        } else if (profile.tokens > balanceBefore) {
          if (!cancelled) {
            setTokensAdded(profile.tokens - balanceBefore);
            setStatus('success');
            localStorage.removeItem('rekindle_fygaro_pending');
          }
          return;
        } else {
          attempts++;
        }
      } catch {
        attempts++;
      }

      if (attempts >= maxAttempts) {
        if (!cancelled) {
          setStatus('timeout');
          localStorage.removeItem('rekindle_fygaro_pending');
        }
        return;
      }

      setTimeout(poll, 1500);
    };

    poll();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <div className="bg-panel border border-border rounded-2xl shadow-2xl max-w-sm w-full p-8 text-center space-y-4">

        {status === 'processing' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-[#CC4F4E]/10 rounded-full animate-pulse">
                <Clock className="w-10 h-10 text-[#CC4F4E]" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-text-dark">Processing your payment…</h2>
            <p className="text-text-light text-sm">
              Please wait — we're confirming your payment and adding your tokens.
            </p>
            <div className="flex justify-center mt-2">
              <div className="w-6 h-6 border-2 border-[#CC4F4E] border-t-transparent rounded-full animate-spin" />
            </div>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-green-100 rounded-full">
                <CheckCircle className="w-10 h-10 text-green-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-text-dark">Payment successful!</h2>
            {tokensAdded !== null && (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-[#CC4F4E]/10 rounded-lg">
                <Coins className="w-5 h-5 text-[#CC4F4E]" />
                <span className="font-semibold text-[#CC4F4E]">
                  {tokensAdded} tokens added to your account
                </span>
              </div>
            )}
            <button
              onClick={onGoHome}
              className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition"
            >
              Start generating
            </button>
          </>
        )}

        {status === 'timeout' && (
          <>
            <div className="flex justify-center">
              <div className="p-4 bg-amber-100 rounded-full">
                <AlertCircle className="w-10 h-10 text-amber-600" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-text-dark">Still processing…</h2>
            <p className="text-text-light text-sm">
              Your payment is being confirmed. Tokens can take a minute to appear —
              check your balance after refreshing. If they don't arrive within 5 minutes,
              contact support.
            </p>
            <button
              onClick={onGoHome}
              className="w-full py-3 bg-[#CC4F4E] text-black font-semibold rounded-lg hover:opacity-90 transition"
            >
              Go to dashboard
            </button>
          </>
        )}

      </div>
    </div>
  );
}
