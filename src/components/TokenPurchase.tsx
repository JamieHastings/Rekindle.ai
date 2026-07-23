import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PaymentModal } from './PaymentModal';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  is_popular: boolean;
}

export function TokenPurchase({ onClose }: { onClose?: () => void }) {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('token_packages')
        .select('*')
        .eq('is_active', true)
        .order('price', { ascending: true });

      if (error) {
        console.error('Error fetching packages:', error);
        // Fallback to default packages if table doesn't exist
        setPackages([
          { id: '1', name: 'Starter', tokens: 10, price: 5.00, is_popular: false },
          { id: '2', name: 'Popular', tokens: 25, price: 10.00, is_popular: true },
          { id: '3', name: 'Value', tokens: 50, price: 18.00, is_popular: false },
          { id: '4', name: 'Premium', tokens: 100, price: 30.00, is_popular: false },
        ]);
      } else {
        setPackages(data || []);
      }
    } catch (err) {
      console.error('Exception fetching packages:', err);
      // Fallback to default packages
      setPackages([
        { id: '1', name: 'Starter', tokens: 10, price: 5.00, is_popular: false },
        { id: '2', name: 'Popular', tokens: 25, price: 10.00, is_popular: true },
        { id: '3', name: 'Value', tokens: 50, price: 18.00, is_popular: false },
        { id: '4', name: 'Premium', tokens: 100, price: 30.00, is_popular: false },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectPackage = (pkg: TokenPackage) => {
    setSelectedPackage(pkg);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (orderId: string) => {
    if (!selectedPackage) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        alert('Please log in to purchase tokens');
        return;
      }

      // Save the payment to database
      const { error: paymentError } = await supabase
        .from('payments')
        .insert({
          user_id: user.id,
          order_id: orderId,
          amount: selectedPackage.price,
          tokens_purchased: selectedPackage.tokens,
          package_name: selectedPackage.name,
          payment_method: 'paypal',
          status: 'completed',
        });

      if (paymentError) {
        console.error('Error saving payment:', paymentError);
        // Continue even if payment save fails - tokens are more important
      }

      // Add tokens to user's account using edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No active session');
        }

        const { data: tokenResult, error: tokenError } = await supabase.functions.invoke('add_tokens', {
          body: {
            amount: selectedPackage.tokens,
            reason: 'purchase',
            paymentId: orderId,
            metadata: {
              package_id: selectedPackage.id,
              package_name: selectedPackage.name,
            },
          },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (tokenError) {
          console.error('Error adding tokens via edge function:', tokenError);
          throw tokenError;
        }

        console.log('✅ Tokens added successfully:', tokenResult);
      } catch (tokenErr) {
        console.error('Error adding tokens:', tokenErr);
        throw tokenErr;
      }

      alert(`✅ Success! ${selectedPackage.tokens} tokens added to your account!`);
      setShowPaymentModal(false);
      onClose?.();

    } catch (error) {
      console.error('Error processing payment:', error);
      alert('Payment successful but there was an error adding tokens. Please contact support.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-text-light">Loading packages...</div>
      </div>
    );
  }

  return (
    <div className="token-purchase">
      <h2 style={{ marginBottom: '1rem', fontSize: '24px', fontWeight: 'bold', color: '#1a1a1a' }}>
        Purchase Tokens
      </h2>
      <p style={{ marginBottom: '2rem', color: '#666' }}>
        Choose a token package to generate more messages
      </p>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {packages.map((pkg) => (
          <div
            key={pkg.id}
            style={{
              border: pkg.is_popular ? '2px solid #ff6b6b' : '1px solid #ddd',
              borderRadius: '8px',
              padding: '1.5rem',
              position: 'relative',
              cursor: 'pointer',
              transition: 'transform 0.2s',
              backgroundColor: 'white',
            }}
            onClick={() => handleSelectPackage(pkg)}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {pkg.is_popular && (
              <div style={{
                position: 'absolute',
                top: '-10px',
                right: '10px',
                backgroundColor: '#ff6b6b',
                color: 'white',
                padding: '4px 12px',
                borderRadius: '12px',
                fontSize: '12px',
                fontWeight: 'bold',
              }}>
                POPULAR
              </div>
            )}

            <h3 style={{ marginBottom: '0.5rem', fontSize: '18px', color: '#1a1a1a' }}>
              {pkg.name}
            </h3>
            
            <div style={{ fontSize: '32px', fontWeight: 'bold', margin: '1rem 0', color: '#1a1a1a' }}>
              {pkg.tokens}
              <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666' }}>
                {' '}tokens
              </span>
            </div>

            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ff6b6b' }}>
              ${pkg.price.toFixed(2)}
            </div>

            <button
              style={{
                width: '100%',
                marginTop: '1rem',
                padding: '0.75rem',
                backgroundColor: pkg.is_popular ? '#ff6b6b' : '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                transition: 'opacity 0.2s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.9';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
              onClick={(e) => {
                e.stopPropagation();
                handleSelectPackage(pkg);
              }}
            >
              Buy Now
            </button>
          </div>
        ))}
      </div>

      {selectedPackage && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={selectedPackage.price.toString()}
          description={`${selectedPackage.name} - ${selectedPackage.tokens} tokens`}
          itemType="tokens"
          onPaymentSuccess={handlePaymentSuccess}
          tokenAmount={selectedPackage.tokens}
        />
      )}
    </div>
  );
}

