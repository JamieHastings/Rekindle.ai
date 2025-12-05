import { useState } from 'react';
import { X, Mail, Loader2, Download } from 'lucide-react';
import { N8nService } from '../services/n8nService';

interface GiftCardEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  message: string;
  template: string;
  recipientName: string;
  senderName: string;
}

export default function GiftCardEmailModal({
  isOpen,
  onClose,
  message,
  template,
  recipientName,
  senderName
}: GiftCardEmailModalProps) {
  const [email, setEmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSend = async () => {
    if (!email) return;

    setIsSending(true);
    setError('');

    try {
      if (N8nService.isConfigured()) {
        await N8nService.sendEmail({
          emailType: 'gift_card',
          recipientEmail: email,
          data: {
            recipientName,
            senderName,
            message,
            template,
          },
        });
      } else {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      setSent(true);
      setTimeout(() => {
        onClose();
        setSent(false);
        setEmail('');
      }, 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send email');
    } finally {
      setIsSending(false);
    }
  };

  const handleDownload = () => {
    const element = document.createElement('a');
    const file = new Blob(
      [
        `Gift Card\n\nTo: ${recipientName}\nFrom: ${senderName}\n\n${message}\n\nTemplate: ${template}`
      ],
      { type: 'text/plain' }
    );
    element.href = URL.createObjectURL(file);
    element.download = `gift-card-${recipientName.toLowerCase().replace(/\s+/g, '-')}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-panel rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fadeIn">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-text-dark">Send Gift Card</h3>
          <button
            onClick={onClose}
            className="text-text-light hover:text-text-dark transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {!sent ? (
          <>
            <p className="text-text-light mb-4">
              Enter your email address to receive your digital gift card
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500 rounded-lg text-red-500 text-sm">
                {error}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-text-dark mb-2"
                >
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                  placeholder="your@email.com"
                  disabled={isSending}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSend}
                  disabled={!email || isSending}
                  className="flex-1 px-6 py-3 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      Send to Email
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="px-6 py-3 bg-background border border-border text-text-dark rounded-lg hover:border-[#CC4F4E] transition-all font-medium flex items-center justify-center gap-2"
                >
                  <Download className="w-5 h-5" />
                  Download
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <p className="text-lg font-medium text-text-dark">
              Gift card sent successfully!
            </p>
            <p className="text-text-light mt-2">Check your email inbox</p>
          </div>
        )}
      </div>
    </div>
  );
}

function Check({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
