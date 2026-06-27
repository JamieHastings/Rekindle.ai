// src/services/tokenService.ts
// Service for managing user tokens via Supabase Edge Functions

import { supabase } from '../lib/supabase';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

if (!SUPABASE_URL) {
  throw new Error('Missing VITE_SUPABASE_URL environment variable');
}

// Token costs for different message types
// Premium (with templates): Love Letter 6, Gift Card 6
// Standard: Poem 4, Apology 4, Voicenote 4; Regenerate 2 (in regenerate flow)
export const TOKEN_COSTS = {
  poem: 4,
  letter: 6,
  apology: 4,
  text: 4,
  giftcard: 6,
  love_letter: 6,
} as const;

export type MessageType = keyof typeof TOKEN_COSTS;

export interface DeductTokensResponse {
  success: boolean;
  tokens_remaining: number;
  tokens_deducted: number;
}

export interface AddTokensResponse {
  success: boolean;
  tokens_remaining: number;
  tokens_added: number;
}

export interface TokenServiceError {
  error: string;
  message: string;
}

/**
 * Get the current user's access token for API calls
 */
async function getAccessToken(): Promise<string> {
  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session?.access_token) {
    throw new Error('Not authenticated. Please sign in.');
  }
  
  return session.access_token;
}

/**
 * Deduct tokens from user account
 * @param cost - Number of tokens to deduct
 * @param reason - Reason for deduction (e.g., 'generate_message', 'regenerate_message')
 * @param messageType - Optional message type for better logging
 * @returns Response with remaining tokens
 * @throws Error if deduction fails (e.g., insufficient tokens)
 */
export async function deductTokens(
  cost: number,
  reason: string = 'generate_message',
  messageType?: string
): Promise<DeductTokensResponse> {
  if (cost <= 0 || !Number.isInteger(cost)) {
    throw new Error('Cost must be a positive integer');
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/deduct_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      cost,
      reason,
      messageType,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as TokenServiceError;
    
    // Handle specific error cases
    if (error.error === 'insufficient_tokens') {
      throw new Error('Insufficient tokens. Please purchase more tokens to continue.');
    }
    
    if (error.error === 'profile_not_found') {
      throw new Error('User profile not found. Please contact support.');
    }
    
    throw new Error(error.message || 'Failed to deduct tokens');
  }

  return data as DeductTokensResponse;
}

/**
 * Add tokens to user account (typically after purchase)
 * @param amount - Number of tokens to add
 * @param reason - Reason for addition (e.g., 'purchase', 'admin_grant')
 * @param paymentId - Optional payment ID for tracking
 * @param metadata - Optional metadata for transaction
 * @returns Response with new token balance
 * @throws Error if addition fails
 */
export async function addTokens(
  amount: number,
  reason: string = 'purchase',
  paymentId?: string,
  metadata?: Record<string, any>
): Promise<AddTokensResponse> {
  if (amount <= 0 || !Number.isInteger(amount)) {
    throw new Error('Amount must be a positive integer');
  }

  const accessToken = await getAccessToken();

  const response = await fetch(`${SUPABASE_URL}/functions/v1/add_tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY || '',
    },
    body: JSON.stringify({
      amount,
      reason,
      paymentId,
      metadata,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    const error = data as TokenServiceError;
    throw new Error(error.message || 'Failed to add tokens');
  }

  return data as AddTokensResponse;
}

/**
 * Get token cost for a message type
 * @param messageType - The message type
 * @returns Token cost for that message type
 */
export function getTokenCost(messageType: string): number {
  return TOKEN_COSTS[messageType as MessageType] ?? TOKEN_COSTS.poem;
}

/**
 * Check if user has enough tokens for a message type
 * @param currentTokens - User's current token balance
 * @param messageType - The message type to check
 * @returns True if user has enough tokens
 */
export function hasEnoughTokens(currentTokens: number, messageType: string): boolean {
  const cost = getTokenCost(messageType);
  return currentTokens >= cost;
}

