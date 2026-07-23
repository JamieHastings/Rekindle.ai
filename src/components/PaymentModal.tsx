import { useState } from "react";
import { PayPalPayment } from "./PayPalPayment";
import { FygaroPayment } from "./FygaroPayment";
import { X } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  description: string;
  itemType: "tokens" | "message";
  onPaymentSuccess: (orderId: string) => void;
  tokenAmount?: number;
}

export function PaymentModal({
  isOpen,
  onClose,
  amount,
  description,
  itemType,
  onPaymentSuccess,
  tokenAmount,
}: PaymentModalProps) {
  const [cardError, setCardError] = useState('');

  if (!isOpen) return null;

  const handleSuccess = async (orderId: string) => {
    console.log("💳 Payment completed! Order ID:", orderId);
    onPaymentSuccess(orderId);
  };

  const handleError = (error: any) => {
    alert("Payment failed. Please try again.");
    console.error(error);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}
      onClick={onClose}
    >
      <div
        className="relative rounded-2xl shadow-2xl w-full max-w-md p-6"
        style={{ backgroundColor: '#ffffff' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 transition-colors"
          style={{ color: '#6b7280' }}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2" style={{ color: '#111827' }}>
            Complete Your Purchase
          </h2>
          <p className="mb-2" style={{ color: '#4b5563' }}>
            {description}
          </p>
          <p className="text-2xl font-bold" style={{ color: '#CC4F4E' }}>
            ${amount}
          </p>
        </div>

        <PayPalPayment
          amount={amount}
          description={description}
          messageType={itemType}
          onSuccess={handleSuccess}
          onError={handleError}
        />

        {tokenAmount && (
          <>
            <div className="my-4 flex items-center gap-3">
              <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
              <span className="text-sm" style={{ color: '#9ca3af' }}>or pay with card</span>
              <div className="flex-1 h-px" style={{ backgroundColor: '#e5e7eb' }} />
            </div>

            {cardError && (
              <p className="mb-3 text-sm text-center" style={{ color: '#dc2626' }}>
                {cardError}
              </p>
            )}

            <FygaroPayment
              tokenAmount={tokenAmount}
              onError={(msg) => setCardError(msg)}
            />
          </>
        )}

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 rounded-lg transition-all"
          style={{ backgroundColor: '#f3f4f6', border: '1px solid #d1d5db', color: '#374151' }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PaymentModal;
