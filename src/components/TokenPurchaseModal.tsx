import { useState } from 'react';
import { X, Coins } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentTokens: number;
}

const tokenPackages = [
  { tokens: 10, price: 5.00, popular: false },
  { tokens: 25, price: 10.00, popular: true },
  { tokens: 50, price: 18.00, popular: false },
  { tokens: 100, price: 30.00, popular: false },
];

export default function TokenPurchaseModal({
  isOpen,
  onClose,
  currentTokens,
}: TokenPurchaseModalProps) {
  const { refreshProfile } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(25);
  const [showPayPal, setShowPayPal] = useState(false);
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const selectedPrice = tokenPackages.find(p => p.tokens === selectedPackage)?.price || 0;

  const createOrder = (data: any, actions: any) => {
    console.log('💳 Creating PayPal order for', selectedPackage, 'tokens');

    return actions.order.create({
      purchase_units: [
        {
          description: `${selectedPackage} Rekindle.ai Tokens`,
          amount: {
            currency_code: 'USD',
            value: selectedPrice.toFixed(2),
          },
        },
      ],
      application_context: {
        shipping_preference: 'NO_SHIPPING',
      },
    });
  };

  const onApprove = async (data: any, actions: any) => {
    setProcessing(true);

    try {
      console.log('✅ Payment approved, order ID:', data.orderID);

      const { data: result, error } = await supabase.functions.invoke('paypal-capture', {
        body: {
          orderId: data.orderID,
          tokenAmount: selectedPackage,
        },
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error || 'Payment capture failed');
      }

      console.log('✅ Tokens added:', result.tokens_added);

      await refreshProfile();

      alert(`Success! ${result.tokens_added} tokens added to your account! 🎉`);
      onClose();

    } catch (error) {
      console.error('❌ Error capturing payment:', error);
      alert('Payment successful but failed to add tokens. Please contact support with order ID: ' + data.orderID);
    } finally {
      setProcessing(false);
    }
  };

  const onError = (err: any) => {
    console.error('❌ PayPal error:', err);
    alert('Payment failed. Please try again.');
    setProcessing(false);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Purchase Tokens</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-blue-800">
            Current Balance: <span className="font-bold">{currentTokens} tokens</span>
          </p>
        </div>

        {!showPayPal ? (
          <>
            <div className="grid grid-cols-2 gap-4 mb-6">
              {tokenPackages.map((pkg) => (
                <button
                  key={pkg.tokens}
                  onClick={() => setSelectedPackage(pkg.tokens)}
                  className={`p-4 rounded-lg border-2 transition-all relative ${
                    selectedPackage === pkg.tokens
                      ? 'border-[#CC4F4E] bg-red-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {pkg.popular && (
                    <span className="absolute -top-2 right-2 bg-[#CC4F4E] text-white text-xs px-2 py-1 rounded">
                      Popular
                    </span>
                  )}
                  <div className="flex items-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-[#CC4F4E]" />
                    <span className="text-2xl font-bold">{pkg.tokens}</span>
                    <span className="text-gray-600">tokens</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900">${pkg.price.toFixed(2)}</p>
                  <p className="text-sm text-gray-500">
                    ${(pkg.price / pkg.tokens).toFixed(2)} per token
                  </p>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowPayPal(true)}
              className="w-full px-6 py-3 bg-[#0070ba] text-white rounded-lg hover:opacity-90 transition-all font-medium"
            >
              Continue to PayPal - ${selectedPrice.toFixed(2)}
            </button>
          </>
        ) : (
          <div>
            <div className="mb-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">
                Purchasing: <span className="font-bold">{selectedPackage} tokens</span>
              </p>
              <p className="text-sm text-gray-700">
                Total: <span className="font-bold">${selectedPrice.toFixed(2)} USD</span>
              </p>
            </div>

            {processing && (
              <div className="mb-4 p-4 bg-blue-50 rounded-lg text-center">
                <p className="text-blue-800">Processing payment... Please wait.</p>
              </div>
            )}

            <PayPalScriptProvider
              options={{
                clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
                currency: 'USD',
              }}
            >
              <PayPalButtons
                style={{ layout: 'vertical' }}
                createOrder={createOrder}
                onApprove={onApprove}
                onError={onError}
                disabled={processing}
              />
            </PayPalScriptProvider>

            <button
              onClick={() => setShowPayPal(false)}
              className="w-full mt-4 px-6 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-all"
            >
              Back to Package Selection
            </button>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure payment powered by PayPal
        </p>
      </div>
    </div>
  );
}
