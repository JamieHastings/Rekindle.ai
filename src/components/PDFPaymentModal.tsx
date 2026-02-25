import { useState } from 'react';
import { X } from 'lucide-react';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface PDFPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaymentSuccess: () => void;
  messageType?: string;
  price?: number;
}

export default function PDFPaymentModal({
  isOpen,
  onClose,
  onPaymentSuccess,
  messageType = 'love_letter',
  price = 5.99,
}: PDFPaymentModalProps) {
  const { user } = useAuth();
  const [processing, setProcessing] = useState(false);

  if (!isOpen) return null;

  const getProductName = () => {
    switch (messageType) {
      case 'love_letter':
      case 'letter':
        return 'Love Letter with Template';
      case 'giftcard':
        return 'Gift Card with Template';
      case 'poem':
        return 'Poem with Template';
      default:
        return 'Message with Template';
    }
  };

  const createOrder = (data: any, actions: any) => {
    console.log('💳 Creating PayPal order for PDF download');
    return actions.order.create({
      purchase_units: [
        {
          amount: {
            value: price.toFixed(2),
            currency_code: 'USD',
          },
          description: `Rekindle - ${getProductName()}`,
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

      if (!user) {
        throw new Error('User must be logged in to complete payment');
      }

      // Get current session for authentication
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication session expired. Please sign in again.');
      }

      // Verify payment with backend
      const { data: result, error } = await supabase.functions.invoke('verify-pdf-payment', {
        body: {
          orderId: data.orderID,
          userId: user.id,
          messageType: messageType,
          amount: price,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      if (!result.success) {
        throw new Error(result.error || 'Payment verification failed');
      }

      console.log('✅ Payment verified successfully');

      // Call success callback to allow PDF download
      onPaymentSuccess();
      onClose();

    } catch (error) {
      console.error('❌ Error verifying payment:', error);
      alert('Payment successful but verification failed. Please contact support with order ID: ' + data.orderID);
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
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Download PDF</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 mb-4">
            To download your <span className="font-semibold">{getProductName()}</span> as a PDF, please complete the payment.
          </p>
          
          <div className="bg-blue-50 rounded-lg p-4 mb-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-700">Total:</span>
              <span className="text-2xl font-bold text-gray-900">${price.toFixed(2)}</span>
            </div>
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
              intent: 'capture',
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
        </div>

        <p className="text-xs text-gray-500 text-center mt-4">
          Secure payment powered by PayPal
        </p>
      </div>
    </div>
  );
}

