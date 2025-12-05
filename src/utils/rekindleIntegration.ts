/**
 * Rekindle.ai Integration Utilities
 * 
 * This file provides helper functions to integrate Rekindle.ai user creation
 * with Supabase profile management.
 * 
 * Usage Example:
 * ```typescript
 * import { createRekindleUser } from './utils/rekindleIntegration';
 * 
 * const result = await createRekindleUser({
 *   email: 'user@example.com',
 *   full_name: 'John Doe',
 *   password: 'securePassword123',
 *   tokens: 5
 * });
 * 
 * if (result.success) {
 *   console.log('User created:', result.userId);
 * } else {
 *   console.error('Error:', result.error);
 * }
 * ```
 */

import { RekindleUserService, RekindleUserData, SyncUserResult } from '../services/rekindleUserService';

/**
 * Create a new user on Rekindle.ai and sync to Supabase
 * 
 * This is the main function to call when creating a new user on Rekindle.ai.
 * It will handle both Supabase Auth user creation and profile table sync.
 * 
 * @param userData - User data from Rekindle.ai signup form
 * @returns Result with success status, user ID, and profile data
 */
export async function createRekindleUser(
  userData: RekindleUserData
): Promise<SyncUserResult> {
  return await RekindleUserService.syncUserToSupabase(userData);
}

/**
 * Update an existing Rekindle.ai user's profile in Supabase
 * 
 * @param userId - Supabase user ID
 * @param updates - Profile fields to update
 * @returns Result with updated profile data
 */
export async function updateRekindleUserProfile(
  userId: string,
  updates: Partial<Pick<RekindleUserData, 'full_name' | 'tokens' | 'is_admin'>>
): Promise<SyncUserResult> {
  return await RekindleUserService.updateUserProfile(userId, updates);
}

/**
 * Get a Rekindle.ai user profile by email
 * 
 * @param email - User's email address
 * @returns Profile data or null if not found
 */
export async function getRekindleUserByEmail(email: string) {
  return await RekindleUserService.getUserByEmail(email);
}

/**
 * Check if a user exists in Supabase by email
 * 
 * @param email - User's email address
 * @returns true if user exists, false otherwise
 */
export async function rekindleUserExists(email: string): Promise<boolean> {
  const profile = await RekindleUserService.getUserByEmail(email);
  return profile !== null;
}

// Export types for use in other files
export type { RekindleUserData, SyncUserResult } from '../services/rekindleUserService';

