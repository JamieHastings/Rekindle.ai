import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
  recipient_name: string;
  relationship_length: string;
  occasion: string | null;
  additional_details: string | null;
  character_length: string;
  generated_content: string;
  is_favorite: boolean;
  created_at: string;
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
