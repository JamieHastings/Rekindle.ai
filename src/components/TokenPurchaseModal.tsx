import { useState, useEffect } from 'react';
import { X, Coins, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PaymentModal } from './PaymentModal';

interface TokenPackage {
  id: string;
  name: string;
  tokens: number;
  price: number;
  is_popular: boolean;
}

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTokens: number;
}

export default function TokenPurchaseModal({
  isOpen,
  onClose,
  currentTokens,
}: TokenPurchaseModalProps) {
  const { refreshProfile } = useAuth();
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<TokenPackage | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<{ tokensAdded: number; newBalance: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchPackages();
    }
  }, [isOpen]);

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

    // Close PayPal modal immediately and show processing state
    setShowPaymentModal(false);
    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        setIsProcessing(false);
        setErrorMessage('Please log in to purchase tokens.');
        return;
      }

      const { data: result, error: fnError } = await supabase.functions.invoke('paypal-capture', {
        body: { orderId, tokenAmount: selectedPackage.tokens },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Edge function error');
      }

      if (!result?.success) {
        throw new Error(result?.error || 'Payment capture failed');
      }

      await refreshProfile();
      setIsProcessing(false);
      setSuccessMessage({ tokensAdded: result.tokens_added, newBalance: result.new_balance });
    } catch (error: any) {
      console.error('Error processing payment:', error);
      setIsProcessing(false);
      setErrorMessage(`Payment received but there was an error: ${error?.message || 'Unknown error'}. Order ID: ${orderId}. Please contact support if tokens were not added.`);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    setSuccessMessage(null);
    setErrorMessage(null);
    onClose();
  };

  if (loading || isProcessing) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6">
          <div className="text-center py-6">
            <div className="inline-block w-10 h-10 border-4 border-[#CC4F4E] border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-gray-700 font-medium">
              {isProcessing ? 'Processing your payment…' : 'Loading packages...'}
            </p>
            {isProcessing && (
              <p className="text-sm text-gray-500 mt-1">This may take a few seconds. Please don't close this window.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Purchase Tokens</h2>
            <button onClick={handleClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="w-5 h-5" />
            </button>
          </div>

          {successMessage ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 text-green-600 mb-4">
                <Coins className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Payment successful</h3>
              <p className="text-gray-600 mb-6">
                {successMessage.tokensAdded} tokens have been added to your account.
              </p>
              <p className="text-lg font-semibold text-gray-800 mb-6">
                New balance: <span className="text-[#CC4F4E]">{successMessage.newBalance} tokens</span>
              </p>
              <button
                onClick={handleClose}
                className="px-6 py-3 bg-[#CC4F4E] text-white font-medium rounded-lg hover:opacity-90 transition-opacity"
              >
                Done
              </button>
            </div>
          ) : errorMessage ? (
            <div className="py-8 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-amber-100 text-amber-600 mb-4">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">{errorMessage}</p>
              <button
                onClick={() => { setErrorMessage(null); }}
                className="px-6 py-3 bg-gray-200 text-gray-800 font-medium rounded-lg hover:bg-gray-300 transition-colors"
              >
                Try again
              </button>
              <button
                onClick={handleClose}
                className="ml-3 px-6 py-3 border border-gray-300 text-gray-700 font-medium rounded-lg hover:bg-gray-50 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <>
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-800">
              Current Balance: <span className="font-bold">{currentTokens} tokens</span>
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {packages.map((pkg) => (
              <div
                key={pkg.id}
                style={{
                  border: pkg.is_popular ? '2px solid #CC4F4E' : '1px solid #ddd',
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
                    backgroundColor: '#CC4F4E',
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
                
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="w-5 h-5 text-[#CC4F4E]" />
                  <span style={{ fontSize: '32px', fontWeight: 'bold', color: '#1a1a1a' }}>
                    {pkg.tokens}
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 'normal', color: '#666' }}>
                    tokens
                  </span>
                </div>

                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#CC4F4E' }}>
                  ${pkg.price.toFixed(2)}
                </div>

                <button
                  style={{
                    width: '100%',
                    marginTop: '1rem',
                    padding: '0.75rem',
                    backgroundColor: pkg.is_popular ? '#CC4F4E' : '#4CAF50',
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

          <p className="text-xs text-gray-500 text-center mt-4">
            Secure payment powered by PayPal
          </p>
            </>
          )}
        </div>
      </div>

      {selectedPackage && (
        <PaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          amount={selectedPackage.price.toFixed(2)}
          description={`${selectedPackage.name} - ${selectedPackage.tokens} tokens`}
          itemType="tokens"
          onPaymentSuccess={handlePaymentSuccess}
          tokenAmount={selectedPackage.tokens}
        />
      )}
    </>
  );
}
