// src/admin/api.ts
import { supabase } from '../lib/supabase';

export async function fetchUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, created_at, is_admin, tokens');
  if (error) throw error;
  return data;
}

export async function fetchPayments() {
  const { data, error } = await supabase
    .from('stripe_payments')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;
  return data;
}

export async function fetchTemplates() {
  const { data, error } = await supabase.from('message_templates').select('*');
  if (error) throw error;
  return data;
}

export async function adjustTokens(userId: string, delta: number) {
  const { data, error } = await supabase.rpc('admin_adjust_tokens', { _user_id: userId, _delta: delta });
  if (error) throw error;
  return data;
}

export async function uploadTemplate(metadata: any, file: File) {
  // put file into storage
  const key = `templates/${Date.now()}_${file.name}`;
  const { error: upErr } = await supabase.storage
    .from('templates')
    .upload(key, file, { cacheControl: '3600', upsert: false });
  if (upErr) throw upErr;

  // insert metadata
  const { data, error } = await supabase.from('message_templates').insert([{ ...metadata, storage_path: key }]);
  if (error) throw error;
  return data;
}
