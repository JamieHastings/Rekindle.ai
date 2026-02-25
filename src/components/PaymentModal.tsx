import { PayPalPayment } from "./PayPalPayment";
import { X } from "lucide-react";

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  amount: string;
  description: string;
  itemType: "tokens" | "message";
  onPaymentSuccess: (orderId: string) => void;
}

export function PaymentModal({
  isOpen,
  onClose,
  amount,
  description,
  itemType,
  onPaymentSuccess,
}: PaymentModalProps) {
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
      onClick={onClose}
    >
      <div
        className="relative bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-light hover:text-text-dark transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-text-dark mb-2">
            Complete Your Purchase
          </h2>
          <p className="text-text-light mb-2">
            {description}
          </p>
          <p className="text-2xl font-bold text-[#CC4F4E]">
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

        <button
          onClick={onClose}
          className="mt-4 w-full px-4 py-2 bg-background border border-border text-text-light rounded-lg hover:bg-panel transition-all"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export default PaymentModal;
