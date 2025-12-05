/*
  # Create Rekindle.ai Database Schema

  ## Overview
  This migration creates the core database structure for Rekindle.ai, an AI-powered relationship message generator.

  ## New Tables

  ### 1. `profiles`
  User profile information extending Supabase Auth
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text) - User's full name
  - `tokens` (integer) - Available token balance
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last profile update timestamp

  ### 2. `generated_messages`
  Stores all AI-generated messages for user history
  - `id` (uuid, primary key) - Unique message identifier
  - `user_id` (uuid) - Links to profiles(id)
  - `message_type` (text) - Type: apology, rekindling, birthday, support, closure
  - `tone` (text) - Tone: romantic, heartfelt, honest, apologetic, humorous
  - `recipient_name` (text) - Name of message recipient
  - `relationship_length` (text) - How long in relationship
  - `occasion` (text, optional) - Special occasion context
  - `additional_details` (text, optional) - User-provided context
  - `character_length` (text) - short, medium, long
  - `generated_content` (text) - The AI-generated message
  - `is_favorite` (boolean) - User favorited this message
  - `created_at` (timestamptz) - Generation timestamp

  ### 3. `token_transactions`
  Tracks all token purchases and usage
  - `id` (uuid, primary key) - Unique transaction identifier
  - `user_id` (uuid) - Links to profiles(id)
  - `transaction_type` (text) - Type: purchase, usage, refund
  - `amount` (integer) - Token amount (positive for purchase, negative for usage)
  - `description` (text) - Transaction description
  - `metadata` (jsonb, optional) - Additional transaction data
  - `created_at` (timestamptz) - Transaction timestamp

  ## Security

  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can only access their own data
  - Authenticated users required for all operations

  ### Policies
  Each table has separate policies for:
  - SELECT: Users can view own data
  - INSERT: Users can create own data
  - UPDATE: Users can update own data
  - DELETE: Users can delete own data

  ## Indexes
  - Indexes on user_id fields for fast queries
  - Index on message creation date for history sorting
  - Index on transaction creation date for transaction history
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  full_name text,
  tokens integer DEFAULT 0 NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Create generated_messages table
CREATE TABLE IF NOT EXISTS generated_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  message_type text NOT NULL,
  tone text NOT NULL,
  recipient_name text NOT NULL,
  relationship_length text NOT NULL,
  occasion text,
  additional_details text,
  character_length text DEFAULT 'medium' NOT NULL,
  generated_content text NOT NULL,
  is_favorite boolean DEFAULT false NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create token_transactions table
CREATE TABLE IF NOT EXISTS token_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  transaction_type text NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund')),
  amount integer NOT NULL,
  description text NOT NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_messages_user_id ON generated_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON generated_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON token_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON token_transactions(created_at DESC);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_transactions ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Generated messages policies
CREATE POLICY "Users can view own messages"
  ON generated_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own messages"
  ON generated_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own messages"
  ON generated_messages FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own messages"
  ON generated_messages FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Token transactions policies
CREATE POLICY "Users can view own transactions"
  ON token_transactions FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions"
  ON token_transactions FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Function to update profile updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, full_name, tokens)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    5
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();