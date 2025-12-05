/**
 * Password Security Service
 * 
 * Handles password validation, breach checking, and security logging
 */

import { supabase } from '../lib/supabase';
import { validatePassword, PasswordValidationResult } from '../utils/passwordSecurity';

export interface SecurityLogEntry {
  event_type: 'password_breach_blocked' | 'weak_password_warning' | 'mfa_enabled' | 'mfa_disabled';
  user_id?: string;
  email?: string;
  metadata?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
}

/**
 * Log security events for monitoring
 */
export async function logSecurityEvent(entry: SecurityLogEntry): Promise<void> {
  try {
    // Get user session if available
    const { data: { session } } = await supabase.auth.getSession();
    
    // Get IP and user agent (if available in browser)
    const ipAddress = entry.ip_address || 'unknown';
    const userAgent = entry.user_agent || (typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown');

    // Log to database using the security function
    const { error } = await supabase.rpc('log_security_event', {
      p_event_type: entry.event_type,
      p_user_id: entry.user_id || session?.user?.id || null,
      p_email: entry.email || session?.user?.email || null,
      p_ip_address: ipAddress,
      p_user_agent: userAgent,
      p_metadata: entry.metadata || null,
    });

    if (error) {
      // Fallback to console if database logging fails
      console.log('[Security Event]', entry);
      console.warn('Failed to log to database:', error);
    }
  } catch (error) {
    // Don't fail on logging errors - just log to console
    console.log('[Security Event]', entry);
    console.warn('Failed to log security event:', error);
  }
}

/**
 * Validate password with security checks and logging
 */
export async function validatePasswordWithLogging(
  password: string,
  email?: string
): Promise<PasswordValidationResult> {
  const result = await validatePassword(password);

  // Log security events
  if (result.strength?.isBreached) {
    await logSecurityEvent({
      event_type: 'password_breach_blocked',
      email,
      metadata: {
        password_length: password.length,
        strength_score: result.strength.score,
      },
    });
  } else if (result.strength && result.strength.score < 2) {
    await logSecurityEvent({
      event_type: 'weak_password_warning',
      email,
      metadata: {
        password_length: password.length,
        strength_score: result.strength.score,
      },
    });
  }

  return result;
}

