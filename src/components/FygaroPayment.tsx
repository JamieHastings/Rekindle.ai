import { useState } from 'react';
import { CreditCard } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FygaroPaymentProps {
  tokenAmount: number;
  onError: (message: string) => void;
}

export function FygaroPayment({ tokenAmount, onError }: FygaroPaymentProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onError('Please log in to purchase tokens.');
        return;
      }

      // Store current balance so PaymentStatus can detect when tokens land
      const { data: profile } = await supabase
        .from('profiles')
        .select('tokens')
        .eq('id', session.user.id)
        .single();

      localStorage.setItem('rekindle_fygaro_pending', JSON.stringify({
        tokenAmount,
        balanceBefore: profile?.tokens ?? 0,
        timestamp: Date.now(),
      }));

      const { data, error } = await supabase.functions.invoke('create-fygaro-payment', {
        body: { tokenAmount },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (error || !data?.checkoutUrl) {
        localStorage.removeItem('rekindle_fygaro_pending');
        throw new Error(error?.message || 'Failed to create payment session');
      }

      window.location.href = data.checkoutUrl;
    } catch (err: any) {
      setIsLoading(false);
      onError(err.message || 'Failed to start payment. Please try again.');
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-semibold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
      style={{ backgroundColor: '#1a1a2e', color: 'white' }}
    >
      <CreditCard className="w-5 h-5" />
      {isLoading ? 'Redirecting to checkout…' : 'Pay with Card'}
    </button>
  );
}
