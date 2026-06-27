import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
export const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  tokens: number;
  created_at: string;
  updated_at: string;
  is_admin?: boolean;
};

export type GeneratedMessage = {
  id: string;
  user_id: string;
  message_type: string;
  tone: string;
  generated_content: string;
  is_favorite: boolean;
  created_at: string;
  template_url?: string | null;
  paid?: boolean;
  input_data?: Record<string, any>;
  is_preview?: boolean;
  status?: string;
  /** @deprecated Prefer input_data.recipientName / input_data.name */
  recipient_name?: string;
  /** @deprecated Prefer input_data.relationshipLength */
  relationship_length?: string;
  /** @deprecated Prefer input_data.occasion */
  occasion?: string | null;
  /** @deprecated Prefer input_data.additionalDetails */
  additional_details?: string | null;
  /** @deprecated Prefer input_data.characterLength / input_data.length */
  character_length?: string;
};

export type TokenTransaction = {
  id: string;
  user_id: string;
  transaction_type: 'purchase' | 'usage' | 'refund';
  amount: number;
  description: string;
  metadata: Record<string, any> | null;
  created_at: string;
};
