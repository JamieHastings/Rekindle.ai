import { X } from 'lucide-react';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPay: () => void;
  onUseTokens: () => void;
}

export default function PaymentModal({ isOpen, onClose, onPay, onUseTokens }: PaymentModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-md p-6 animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-light hover:text-text-dark transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-2xl font-bold text-text-dark mb-3">
          Unlock Your Message
        </h3>
        <p className="text-text-light mb-6">
          Pay $10 to get the full version of your heartfelt message delivered instantly.
        </p>

        <div className="space-y-3">
          <button
            onClick={onPay}
            className="w-full px-6 py-4 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all shadow-lg font-medium text-lg"
          >
            Pay $10 & Unlock
          </button>

          <button
            onClick={onUseTokens}
            className="w-full px-6 py-4 bg-background border border-border text-text-light rounded-lg hover:bg-panel transition-all font-medium"
          >
            Use Tokens Instead
          </button>
        </div>

        <p className="text-xs text-text-light text-center mt-4 opacity-70">
          Your message will be unlocked immediately after payment
        </p>
      </div>
    </div>
  );
}
