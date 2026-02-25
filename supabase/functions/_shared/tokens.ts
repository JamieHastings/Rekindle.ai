// Shared token management utilities for Edge Functions

import { supabaseAdmin } from "./supabaseAdmin.ts";

export interface TokenCosts {
  poem: number;
  apology: number;
  text: number;
  letter: number;
  giftcard: number;
  "love_letter": number;
}

// Token costs: Premium (templates) Letter 5, Gift Card 5; Standard Poem 3, Apology 3, Voicenote 3
export const TOKEN_COSTS: TokenCosts = {
  poem: 3,
  apology: 3,
  text: 3,
  letter: 5,
  giftcard: 5,
  "love_letter": 5,
};

export function getTokenCost(messageType: string): number {
  const normalizedType = messageType.toLowerCase().replace(/\s+/g, "_");
  return TOKEN_COSTS[normalizedType as keyof TokenCosts] ?? TOKEN_COSTS.poem;
}

/**
 * Adjust user tokens atomically
 * Returns new token balance
 */
export async function adjustUserTokens(
  userId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, any>
): Promise<{ success: boolean; tokens_remaining: number }> {
  // Get current balance
  const { data: profile, error: fetchError } = await supabaseAdmin
    .from("profiles")
    .select("tokens")
    .eq("id", userId)
    .single();

  if (fetchError || !profile) {
    throw new Error("Profile not found");
  }

  const newBalance = profile.tokens + amount;

  if (newBalance < 0) {
    throw new Error("Insufficient tokens");
  }

  // Update tokens atomically
  const { error: updateError } = await supabaseAdmin
    .from("profiles")
    .update({ tokens: newBalance })
    .eq("id", userId);

  if (updateError) {
    throw new Error(`Failed to update tokens: ${updateError.message}`);
  }

  // Log transaction
  await supabaseAdmin.from("token_transactions").insert({
    user_id: userId,
    transaction_type: amount > 0 ? "credit" : "debit",
    amount: amount,
    description: reason,
    metadata: metadata || {},
  });

  return {
    success: true,
    tokens_remaining: newBalance,
  };
}

