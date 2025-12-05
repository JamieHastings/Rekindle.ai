/**
 * Password Security Utilities
 * 
 * Provides password strength checking, HIBP integration, and security validation
 */

export interface PasswordStrength {
  score: number; // 0-4 (0 = weak, 4 = very strong)
  feedback: string[];
  isBreached: boolean;
  isValid: boolean;
  suggestions: string[];
}

export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  strength: PasswordStrength | null;
}

const MIN_PASSWORD_LENGTH = 8;
const RECOMMENDED_PASSWORD_LENGTH = 14;

/**
 * Simple password strength estimator (zxcvbn-like)
 * Returns score 0-4 and feedback
 */
export function estimatePasswordStrength(password: string): Omit<PasswordStrength, 'isBreached'> {
  let score = 0;
  const feedback: string[] = [];
  const suggestions: string[] = [];

  if (password.length === 0) {
    return {
      score: 0,
      feedback: ['Enter a password'],
      suggestions: [],
      isValid: false,
    };
  }

  // Length checks
  if (password.length < MIN_PASSWORD_LENGTH) {
    feedback.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    suggestions.push(`Use at least ${MIN_PASSWORD_LENGTH} characters`);
  } else if (password.length >= RECOMMENDED_PASSWORD_LENGTH) {
    score += 1;
  }

  // Character variety checks
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^a-zA-Z0-9]/.test(password);

  let varietyCount = 0;
  if (hasLower) varietyCount++;
  if (hasUpper) varietyCount++;
  if (hasNumber) varietyCount++;
  if (hasSpecial) varietyCount++;

  if (varietyCount >= 3) {
    score += 1;
  } else {
    if (!hasLower) suggestions.push('Add lowercase letters');
    if (!hasUpper) suggestions.push('Add uppercase letters');
    if (!hasNumber) suggestions.push('Add numbers');
    if (!hasSpecial) suggestions.push('Add special characters (!@#$%^&*)');
  }

  // Common patterns
  const commonPatterns = [
    /12345/,
    /password/i,
    /qwerty/i,
    /abc123/i,
    /admin/i,
    /letmein/i,
    /welcome/i,
    /monkey/i,
    /dragon/i,
    /master/i,
  ];

  const hasCommonPattern = commonPatterns.some(pattern => pattern.test(password));
  if (hasCommonPattern) {
    feedback.push('Avoid common words or sequences');
    suggestions.push('Avoid dictionary words and common patterns');
  } else {
    score += 1;
  }

  // Repetition check
  const hasRepetition = /(.)\1{2,}/.test(password);
  if (hasRepetition) {
    feedback.push('Avoid repeating characters');
    suggestions.push('Use varied characters throughout');
  } else {
    score += 1;
  }

  // Sequential characters
  const hasSequence = /(abc|bcd|cde|def|efg|fgh|ghi|hij|ijk|jkl|klm|lmn|mno|nop|opq|pqr|qrs|rst|stu|tuv|uvw|vwx|wxy|xyz|012|123|234|345|456|567|678|789)/i.test(password);
  if (hasSequence) {
    feedback.push('Avoid sequential characters');
    suggestions.push('Avoid keyboard sequences (abc, 123, etc.)');
  } else {
    score += 1;
  }

  // Cap score at 4
  score = Math.min(score, 4);

  // Generate strength feedback
  if (score === 0) {
    feedback.push('Very weak password');
  } else if (score === 1) {
    feedback.push('Weak password');
  } else if (score === 2) {
    feedback.push('Fair password');
  } else if (score === 3) {
    feedback.push('Good password');
  } else {
    feedback.push('Strong password');
  }

  const isValid = password.length >= MIN_PASSWORD_LENGTH && score >= 2 && !hasCommonPattern && !hasRepetition && !hasSequence;

  return {
    score,
    feedback: feedback.length > 0 ? feedback : ['Password looks good'],
    suggestions,
    isValid,
  };
}

/**
 * Check if password has been breached using HIBP API
 * Uses k-anonymity model (only sends first 5 chars of SHA-1 hash)
 */
export async function checkPasswordBreach(password: string): Promise<boolean> {
  try {
    // Create SHA-1 hash of password
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();

    // Get first 5 chars (k-anonymity)
    const prefix = hashHex.substring(0, 5);
    const suffix = hashHex.substring(5);

    // Query HIBP API
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
      method: 'GET',
      headers: {
        'User-Agent': 'Rekindle.ai-Password-Checker',
      },
    });

    if (!response.ok) {
      // If API fails, don't block user - log and continue
      console.warn('HIBP API unavailable, skipping breach check');
      return false;
    }

    const text = await response.text();
    const hashes = text.split('\n');

    // Check if our suffix appears in the results
    for (const line of hashes) {
      const [hashSuffix, count] = line.split(':');
      if (hashSuffix === suffix) {
        return true; // Password has been breached
      }
    }

    return false; // Password not found in breach database
  } catch (error) {
    // If check fails, don't block user - log and continue
    console.warn('Password breach check failed:', error);
    return false;
  }
}

/**
 * Validate password with all security checks
 */
export async function validatePassword(password: string): Promise<PasswordValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Basic length check
  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  // Strength estimation
  const strength = estimatePasswordStrength(password);

  // Check for breached password
  const isBreached = await checkPasswordBreach(password);
  const fullStrength: PasswordStrength = {
    ...strength,
    isBreached,
  };

  if (isBreached) {
    errors.push('This password appeared in a data breach. Please choose a stronger, unique password.');
  }

  // Add warnings for weak passwords
  if (strength.score < 2) {
    warnings.push('Consider using a stronger password for better security');
  }

  if (password.length < RECOMMENDED_PASSWORD_LENGTH && password.length >= MIN_PASSWORD_LENGTH) {
    warnings.push(`For better security, consider using at least ${RECOMMENDED_PASSWORD_LENGTH} characters`);
  }

  return {
    isValid: errors.length === 0 && strength.isValid,
    errors,
    warnings,
    strength: fullStrength,
  };
}

/**
 * Get password requirements text
 */
export function getPasswordRequirements(): string[] {
  return [
    `At least ${MIN_PASSWORD_LENGTH} characters (${RECOMMENDED_PASSWORD_LENGTH}+ recommended)`,
    'Mix of uppercase and lowercase letters',
    'Include numbers',
    'Include special characters (!@#$%^&*)',
    'Avoid common words or patterns',
    'Use a unique password (not reused from other accounts)',
  ];
}

