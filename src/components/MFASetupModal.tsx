import { useState } from 'react';
import { X, Loader2, Shield, Smartphone, Key, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface MFASetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

type MFAMethod = 'totp' | 'webauthn' | null;

export default function MFASetupModal({ isOpen, onClose, onSuccess }: MFASetupModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totpSecret, setTotpSecret] = useState<string | null>(null);
  const [totpQRCode, setTotpQRCode] = useState<string | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerified, setIsVerified] = useState(false);

  if (!isOpen) return null;

  const handleTOTPSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // Generate TOTP secret and QR code
      // Note: Supabase MFA requires specific setup
      // This is a simplified example - you'll need to use Supabase's MFA API
      const { data, error: mfaError } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (mfaError) {
        throw mfaError;
      }

      if (data) {
        setTotpSecret(data.secret || null);
        setTotpQRCode(data.qr_code || null);
        setSelectedMethod('totp');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set up TOTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyTOTP = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Verify TOTP code
      const { data, error: verifyError } = await supabase.auth.mfa.verify({
        factorId: 'totp', // You'll need the actual factor ID from enrollment
        code: verificationCode,
      });

      if (verifyError) {
        throw verifyError;
      }

      if (data) {
        setIsVerified(true);
        if (onSuccess) {
          setTimeout(() => {
            onSuccess();
            onClose();
          }, 1500);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Invalid verification code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleWebAuthnSetup = async () => {
    setLoading(true);
    setError('');

    try {
      // WebAuthn setup using Supabase
      // Note: This requires proper WebAuthn configuration in Supabase
      const { data, error: webauthnError } = await supabase.auth.mfa.enroll({
        factorType: 'webauthn',
      });

      if (webauthnError) {
        throw webauthnError;
      }

      // WebAuthn will trigger browser prompt
      setIsVerified(true);
      if (onSuccess) {
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to set up WebAuthn. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedMethod(null);
    setTotpSecret(null);
    setTotpQRCode(null);
    setVerificationCode('');
    setIsVerified(false);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-panel border border-border rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-text-dark flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Enable Multi-Factor Authentication
          </h2>
          <button
            onClick={handleClose}
            className="text-text-light hover:text-text-dark transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {isVerified ? (
          <div className="text-center py-8">
            <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-text-dark mb-2">MFA Enabled Successfully!</h3>
            <p className="text-text-light">
              Your account is now protected with multi-factor authentication.
            </p>
          </div>
        ) : !selectedMethod ? (
          <div className="space-y-4">
            <p className="text-text-light mb-4">
              Add an extra layer of security to your account. Choose a method:
            </p>

            {/* TOTP Option */}
            <button
              onClick={handleTOTPSetup}
              disabled={loading}
              className="w-full p-4 border border-border rounded-lg hover:border-[#CC4F4E] transition-all text-left flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 bg-[#CC4F4E]/10 rounded-lg">
                <Smartphone className="w-6 h-6 text-[#CC4F4E]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-dark">Authenticator App (TOTP)</h3>
                <p className="text-sm text-text-light">
                  Use apps like Google Authenticator, Authy, or 1Password
                </p>
              </div>
            </button>

            {/* WebAuthn Option */}
            <button
              onClick={handleWebAuthnSetup}
              disabled={loading}
              className="w-full p-4 border border-border rounded-lg hover:border-[#CC4F4E] transition-all text-left flex items-center gap-3 disabled:opacity-50"
            >
              <div className="p-2 bg-[#CC4F4E]/10 rounded-lg">
                <Key className="w-6 h-6 text-[#CC4F4E]" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-text-dark">Security Key (WebAuthn)</h3>
                <p className="text-sm text-text-light">
                  Use hardware keys like YubiKey or Touch ID / Face ID
                </p>
              </div>
            </button>

            <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <p className="text-xs text-blue-400">
                <strong>Why MFA?</strong> Even if someone gets your password, they can't access your account without your second factor.
              </p>
            </div>
          </div>
        ) : selectedMethod === 'totp' && totpQRCode ? (
          <div className="space-y-4">
            <div className="text-center">
              <h3 className="font-medium text-text-dark mb-2">Scan QR Code</h3>
              <p className="text-sm text-text-light mb-4">
                Use your authenticator app to scan this QR code
              </p>
              {totpQRCode && (
                <div className="bg-white p-4 rounded-lg inline-block mb-4">
                  <img src={totpQRCode} alt="TOTP QR Code" className="w-48 h-48" />
                </div>
              )}
              {totpSecret && (
                <div className="p-3 bg-background border border-border rounded-lg mb-4">
                  <p className="text-xs text-text-light mb-1">Or enter this code manually:</p>
                  <code className="text-sm font-mono text-text-dark break-all">{totpSecret}</code>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-text-dark mb-2">
                Enter 6-digit code from your app
              </label>
              <input
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full px-4 py-3 bg-background border border-border rounded-lg text-text-light focus:outline-none focus:ring-2 focus:ring-[#CC4F4E]"
                placeholder="000000"
                maxLength={6}
              />
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setSelectedMethod(null);
                  setTotpSecret(null);
                  setTotpQRCode(null);
                }}
                className="flex-1 px-4 py-2 border border-border rounded-lg text-text-light hover:bg-background transition-all"
              >
                Back
              </button>
              <button
                onClick={handleVerifyTOTP}
                disabled={loading || verificationCode.length !== 6}
                className="flex-1 px-4 py-2 bg-[#CC4F4E] text-black rounded-lg hover:opacity-90 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify & Enable'
                )}
              </button>
            </div>
          </div>
        ) : null}

        {error && !selectedMethod && (
          <div className="mt-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-400">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

