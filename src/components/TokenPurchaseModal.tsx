import { useState } from 'react';
import { X, Coins, Loader2, AlertCircle } from 'lucide-react';
import { N8nService } from '../services/n8nService';

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (tokens: number) => void;
  currentTokens: number;
  tokensRequired?: number;
  action?: string;
  messageType?: string;
}

export default function TokenPurchaseModal({
  isOpen,
  onClose,
  onPurchase,
  currentTokens,
  tokensRequired,
  action,
  messageType,
}: TokenPurchaseModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  if (!isOpen) return null;

  const packages = [
    { tokens: 5, price: 10, priceCents: 1000, label: 'Starter', packageId: 'starter' },
    { tokens: 15, price: 25, priceCents: 2500, label: 'Popular', packageId: 'popular', highlight: true },
    { tokens: 50, price: 75, priceCents: 7500, label: 'Best Value', packageId: 'best_value' },
  ];

  // Calculate shortfall if tokens required are provided
  const shortfall = tokensRequired && tokensRequired > currentTokens 
    ? tokensRequired - currentTokens 
    : 0;

  // Find which package would be sufficient
  const sufficientPackage = tokensRequired 
    ? packages.find(pkg => pkg.tokens >= shortfall) || packages[packages.length - 1]
    : null;

  const handlePurchaseClick = async (pkg: typeof packages[0]) => {
    if (!N8nService.isConfigured()) {
      onPurchase(pkg.tokens);
      return;
    }

    setIsProcessing(true);
    try {
      const result = await N8nService.createStripeCheckout({
        tokenPackage: pkg.packageId,
        packageDetails: {
          tokens: pkg.tokens,
          price: pkg.priceCents,
          label: pkg.label,
        },
      });

      window.location.href = result.checkoutUrl;
    } catch (error) {
      console.error('Failed to create checkout:', error);
      alert('Failed to create checkout. Please try again.');
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-panel border border-border rounded-2xl shadow-2xl w-full max-w-lg p-6 animate-fadeIn">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-text-light hover:text-text-dark transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-3">
          <Coins className="w-6 h-6 text-[#CC4F4E]" />
          <h3 className="text-2xl font-bold text-text-dark">Buy Tokens</h3>
        </div>

        {/* Insufficient Tokens Alert */}
        {tokensRequired && action && tokensRequired > currentTokens && (
          <div className="mb-4 p-4 bg-orange-500/10 border border-orange-500/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <h4 className="font-semibold text-text-dark mb-1">Insufficient Tokens</h4>
                <p className="text-sm text-text-light">
                  {messageType 
                    ? `You need ${tokensRequired} tokens to ${action} this ${messageType} message, but you only have ${currentTokens} token${currentTokens !== 1 ? 's' : ''}.`
                    : `You need ${tokensRequired} tokens to ${action}, but you only have ${currentTokens} token${currentTokens !== 1 ? 's' : ''}.`
                  }
                </p>
                {shortfall > 0 && sufficientPackage && (
                  <p className="text-xs text-text-light mt-2 opacity-80">
                    💡 You need {shortfall} more token{shortfall !== 1 ? 's' : ''}. The {sufficientPackage.label} package ({sufficientPackage.tokens} tokens) would work!
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        <p className="text-text-light mb-4">
          Use tokens to regenerate messages and unlock features
        </p>

        <div className="mb-6 p-4 bg-background border border-border rounded-lg">
          <div className="flex items-center justify-between">
            <span className="text-text-light">Your current balance:</span>
            <span className="text-2xl font-bold text-[#CC4F4E]">{currentTokens} tokens</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 mb-6">
          {packages.map((pkg) => (
            <button
              key={pkg.tokens}
              onClick={() => handlePurchaseClick(pkg)}
              disabled={isProcessing}
              className={`p-4 rounded-lg border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${
                pkg.highlight
                  ? 'bg-[#CC4F4E]/10 border-[#CC4F4E] shadow-lg'
                  : 'bg-background border-border hover:border-[#CC4F4E]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold text-text-dark">
                      {pkg.tokens} Tokens
                    </span>
                    {pkg.highlight && (
                      <span className="px-2 py-1 text-xs bg-[#CC4F4E] text-black rounded font-medium">
                        {pkg.label}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-text-light mt-1">
                    ${(pkg.price / pkg.tokens).toFixed(2)} per token
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-text-dark">${pkg.price}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {isProcessing && (
          <div className="flex items-center justify-center gap-2 text-text-light mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Creating checkout session...</span>
          </div>
        )}

        <p className="text-xs text-text-light text-center opacity-70">
          {N8nService.isConfigured()
            ? 'Secure checkout powered by Stripe. Tokens never expire.'
            : 'Tokens never expire and can be used for regenerations'
          }
        </p>
      </div>
    </div>
  );
}
