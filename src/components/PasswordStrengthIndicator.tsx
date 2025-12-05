import { Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { PasswordStrength } from '../utils/passwordSecurity';

interface PasswordStrengthIndicatorProps {
  strength: PasswordStrength | null;
  showSuggestions?: boolean;
}

export default function PasswordStrengthIndicator({
  strength,
  showSuggestions = true,
}: PasswordStrengthIndicatorProps) {
  if (!strength || strength.score === undefined) {
    return null;
  }

  const getStrengthColor = (score: number) => {
    if (score === 0) return 'bg-red-500';
    if (score === 1) return 'bg-orange-500';
    if (score === 2) return 'bg-yellow-500';
    if (score === 3) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (score: number) => {
    if (score === 0) return 'Very Weak';
    if (score === 1) return 'Weak';
    if (score === 2) return 'Fair';
    if (score === 3) return 'Good';
    return 'Strong';
  };

  return (
    <div className="space-y-2">
      {/* Strength Bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-background border border-border rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-300 ${getStrengthColor(strength.score)}`}
            style={{ width: `${((strength.score + 1) / 5) * 100}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${
          strength.score < 2 ? 'text-red-400' :
          strength.score < 3 ? 'text-yellow-400' :
          'text-green-400'
        }`}>
          {getStrengthLabel(strength.score)}
        </span>
      </div>

      {/* Breach Warning */}
      {strength.isBreached && (
        <div className="flex items-start gap-2 p-2 bg-red-500/10 border border-red-500/30 rounded-lg">
          <AlertTriangle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-xs text-red-400 font-medium">
              This password appeared in a data breach
            </p>
            <p className="text-xs text-red-300 mt-1">
              Please choose a stronger, unique password to protect your account.
            </p>
          </div>
        </div>
      )}

      {/* Feedback */}
      {strength.feedback && strength.feedback.length > 0 && (
        <div className="text-xs text-text-light">
          {strength.feedback.map((msg, idx) => (
            <div key={idx} className="flex items-start gap-1.5 mt-1">
              {strength.isValid && !strength.isBreached ? (
                <CheckCircle2 className="w-3 h-3 text-green-400 mt-0.5 flex-shrink-0" />
              ) : (
                <Lock className="w-3 h-3 text-text-light mt-0.5 flex-shrink-0" />
              )}
              <span>{msg}</span>
            </div>
          ))}
        </div>
      )}

      {/* Suggestions */}
      {showSuggestions && strength.suggestions && strength.suggestions.length > 0 && (
        <div className="mt-2 p-2 bg-[#CC4F4E]/10 border border-[#CC4F4E]/30 rounded-lg">
          <p className="text-xs font-medium text-text-dark mb-1">Suggestions:</p>
          <ul className="text-xs text-text-light space-y-0.5">
            {strength.suggestions.map((suggestion, idx) => (
              <li key={idx} className="flex items-start gap-1.5">
                <span className="text-[#CC4F4E]">•</span>
                <span>{suggestion}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

