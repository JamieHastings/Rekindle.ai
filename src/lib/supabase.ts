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
  is_admin: boolean;
  email_marketing: boolean;
  email_notifications: boolean;
  email_receipts: boolean;
  created_at: string;
  updated_at: string;
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

export type UserFeedback = {
  id: string;
  user_id: string;
  message_id: string;
  rating: number;
  comment: string | null;
  created_at: string;
};

export type DesignTemplate = {
  id: string;
  name: string;
  description: string | null;
  category: 'love_letter' | 'gift_card' | 'poem' | 'general';
  image_url: string;
  storage_path: string;
  is_active: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type EmailLog = {
  id: string;
  user_id: string | null;
  email_type: 'welcome' | 'receipt' | 'gift_card' | 'check_up' | 'low_tokens';
  recipient_email: string;
  subject: string;
  status: 'pending' | 'sent' | 'failed' | 'bounced';
  provider_message_id: string | null;
  metadata: Record<string, any>;
  sent_at: string | null;
  created_at: string;
};

export type StripePayment = {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string | null;
  stripe_checkout_session_id: string | null;
  amount_cents: number;
  currency: string;
  token_count: number;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  metadata: Record<string, any>;
  created_at: string;
  completed_at: string | null;
};
