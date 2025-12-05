import { supabase } from '../lib/supabase';
import { Profile } from '../lib/supabase';

/**
 * Rekindle.ai User Service
 * 
 * This service handles syncing user data from Rekindle.ai to Supabase.
 * When a new user is created on Rekindle.ai, this service will:
 * 1. Create a user in Supabase Auth (if needed)
 * 2. Create/update the profile in the profiles table
 */

export interface RekindleUserData {
  email: string;
  full_name?: string;
  password?: string; // Required if creating new auth user
  tokens?: number; // Default: 5
  is_admin?: boolean;
}

export interface SyncUserResult {
  success: boolean;
  userId?: string;
  profile?: Profile;
  error?: string;
  message?: string;
}

export class RekindleUserService {
  /**
   * Sync a user from Rekindle.ai to Supabase
   * 
   * This function will:
   * 1. Check if user exists in Supabase Auth
   * 2. Create auth user if needed (requires password)
   * 3. Create or update profile in profiles table
   * 
   * @param userData - User data from Rekindle.ai
   * @returns Result with user ID and profile data
   */
  static async syncUserToSupabase(
    userData: RekindleUserData
  ): Promise<SyncUserResult> {
    try {
      // Validate required fields
      if (!userData.email) {
        return {
          success: false,
          error: 'Email is required',
        };
      }

      // Check if user already exists in Supabase Auth
      const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers();
      
      if (listError) {
        console.error('Error listing users:', listError);
        // If admin API is not available, try alternative approach
        return await this.syncUserViaProfile(userData);
      }

      const existingUser = existingUsers?.users?.find(
        (u) => u.email === userData.email
      );

      let userId: string;

      if (existingUser) {
        // User exists in Auth, use their ID
        userId = existingUser.id;
      } else {
        // Create new user in Supabase Auth
        if (!userData.password) {
          return {
            success: false,
            error: 'Password is required to create a new user',
          };
        }

        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email: userData.email,
          password: userData.password,
          options: {
            data: {
              full_name: userData.full_name || '',
            },
          },
        });

        if (signUpError) {
          return {
            success: false,
            error: `Failed to create auth user: ${signUpError.message}`,
          };
        }

        if (!authData.user) {
          return {
            success: false,
            error: 'User creation failed: No user data returned',
          };
        }

        userId = authData.user.id;
      }

      // Create or update profile
      const profileResult = await this.createOrUpdateProfile(userId, userData);

      if (!profileResult.success) {
        return profileResult;
      }

      return {
        success: true,
        userId,
        profile: profileResult.profile,
        message: existingUser
          ? 'User profile updated successfully'
          : 'User created and synced successfully',
      };
    } catch (error) {
      console.error('Error syncing user to Supabase:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Alternative method: Sync user directly via profile table
   * Use this if admin API is not available
   */
  private static async syncUserViaProfile(
    userData: RekindleUserData
  ): Promise<SyncUserResult> {
    try {
      // First, try to create auth user
      if (!userData.password) {
        return {
          success: false,
          error: 'Password is required to create a new user',
        };
      }

      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            full_name: userData.full_name || '',
          },
        },
      });

      if (signUpError) {
        return {
          success: false,
          error: `Failed to create auth user: ${signUpError.message}`,
        };
      }

      if (!authData.user) {
        return {
          success: false,
          error: 'User creation failed: No user data returned',
        };
      }

      const userId = authData.user.id;

      // Wait a moment for the database trigger to create the profile
      await new Promise((resolve) => setTimeout(resolve, 500));

      // Create or update profile
      const profileResult = await this.createOrUpdateProfile(userId, userData);

      return {
        success: profileResult.success,
        userId,
        profile: profileResult.profile,
        error: profileResult.error,
        message: 'User created and synced successfully',
      };
    } catch (error) {
      console.error('Error syncing user via profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Create or update a profile in the profiles table
   */
  private static async createOrUpdateProfile(
    userId: string,
    userData: RekindleUserData
  ): Promise<{ success: boolean; profile?: Profile; error?: string }> {
    try {
      // Check if profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 is "not found" error, which is expected for new users
        console.error('Error fetching profile:', fetchError);
      }

      const profileData = {
        id: userId,
        email: userData.email,
        full_name: userData.full_name || null,
        tokens: userData.tokens ?? 5,
        ...(userData.is_admin !== undefined && { is_admin: userData.is_admin }),
      };

      if (existingProfile) {
        // Update existing profile
        const { data: updatedProfile, error: updateError } = await supabase
          .from('profiles')
          .update({
            email: userData.email,
            full_name: userData.full_name || existingProfile.full_name,
            ...(userData.tokens !== undefined && { tokens: userData.tokens }),
            ...(userData.is_admin !== undefined && { is_admin: userData.is_admin }),
            updated_at: new Date().toISOString(),
          })
          .eq('id', userId)
          .select()
          .single();

        if (updateError) {
          return {
            success: false,
            error: `Failed to update profile: ${updateError.message}`,
          };
        }

        return {
          success: true,
          profile: updatedProfile as Profile,
        };
      } else {
        // Create new profile
        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert(profileData)
          .select()
          .single();

        if (insertError) {
          // If unique constraint violation, profile might have been created by trigger
          if (insertError.code === '23505') {
            // Try to fetch the profile that was created
            await new Promise((resolve) => setTimeout(resolve, 500));
            const { data: fetchedProfile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();

            if (fetchedProfile) {
              return {
                success: true,
                profile: fetchedProfile as Profile,
              };
            }
          }

          return {
            success: false,
            error: `Failed to create profile: ${insertError.message}`,
          };
        }

        return {
          success: true,
          profile: newProfile as Profile,
        };
      }
    } catch (error) {
      console.error('Error creating/updating profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Update an existing user's profile data
   * Use this when you only want to update profile without creating auth user
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<Pick<RekindleUserData, 'full_name' | 'tokens' | 'is_admin'>>
  ): Promise<SyncUserResult> {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .update({
          ...updates,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to update profile: ${error.message}`,
        };
      }

      return {
        success: true,
        userId,
        profile: profile as Profile,
        message: 'Profile updated successfully',
      };
    } catch (error) {
      console.error('Error updating profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Get user profile by email
   */
  static async getUserByEmail(email: string): Promise<Profile | null> {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('email', email)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // Not found
        }
        throw error;
      }

      return data as Profile;
    } catch (error) {
      console.error('Error fetching user by email:', error);
      return null;
    }
  }
}

