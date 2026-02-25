import { supabase } from '../lib/supabase';

export interface Message {
  id: string;
  user_id: string;
  message_type: string;
  tone: string;
  recipient_name: string;
  relationship_length: string;
  occasion?: string | null;
  additional_details?: string | null;
  character_length: string;
  generated_content: string;
  output_text?: string;
  is_favorite: boolean;
  created_at: string;
  is_preview?: boolean;
  template_url?: string | null;
  paid?: boolean;
  input_data?: Record<string, unknown>;
}

/** Derive display/metadata from row; prefer input_data, fallback to legacy columns */
function normalizeMessage(row: Record<string, any>): Message {
  const input = row.input_data || {};
  return {
    ...row,
    generated_content: row.generated_content || row.output_text || row.generated_text || '',
    recipient_name: row.recipient_name ?? input.recipientName ?? input.name ?? input.loverName ?? 'Unknown',
    relationship_length: row.relationship_length ?? input.relationshipLength ?? '',
    occasion: row.occasion ?? input.occasion ?? null,
    additional_details: row.additional_details ?? input.additionalDetails ?? null,
    character_length: row.character_length ?? input.characterLength ?? input.length ?? 'medium',
  } as Message;
}

/**
 * Fetch all messages for a user
 */
export const fetchUserMessages = async (userId: string): Promise<Message[]> => {
  const { data, error } = await supabase
    .from('generated_messages')
    .select('*')
    .eq('user_id', userId)
    .eq('is_preview', false) // Only show full messages, not previews
    .order('created_at', { ascending: false })
    .limit(1000);

  if (error) {
    console.error('Error fetching messages:', error);
    return [];
  }

  return (data || []).map((msg) => normalizeMessage(msg)) as Message[];
};

/**
 * Fetch a single message by ID
 */
export const fetchMessageById = async (messageId: string): Promise<Message | null> => {
  console.log('🔍 Fetching message with ID:', messageId);
  
  // Check if user is authenticated
  const { data: { user } } = await supabase.auth.getUser();
  console.log('👤 Current user:', user?.id);
  
  if (!user) {
    console.error('❌ No user authenticated!');
    return null;
  }

  // Use select('*') to get all columns that exist (safer than specifying each column)
  const { data, error } = await supabase
    .from('generated_messages')
    .select('*')
    .eq('id', messageId)
    .single();

  console.log('📦 Raw fetch result:', { 
    data: data ? {
      id: data.id,
      message_type: data.message_type,
      recipient_name: data.recipient_name,
      // Check both possible column names
      generated_content: data.generated_content ? `${data.generated_content.substring(0, 50)}...` : (data.generated_text ? `${data.generated_text.substring(0, 50)}...` : 'NULL/EMPTY'),
      generated_text: data.generated_text ? `${data.generated_text.substring(0, 50)}...` : 'NOT PRESENT',
      generated_content_length: data.generated_content?.length || data.generated_text?.length || 0,
      has_generated_content: !!(data.generated_content || data.generated_text),
      all_keys: Object.keys(data || {})
    } : null,
    error: error ? {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    } : null
  });

  if (error) {
    console.error('❌ Error fetching message:', error);
    console.error('   Error details:', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint
    });
    return null;
  }

  if (!data) {
    console.warn('⚠️ No data returned for message ID:', messageId);
    return null;
  }

  // Log the actual data structure
  console.log('📋 Full data object:', data);
  console.log('📋 Data keys:', Object.keys(data));
  console.log('📋 generated_content value:', data.generated_content);
  console.log('📋 generated_text value:', data.generated_text);
  console.log('📋 generated_content type:', typeof data.generated_content);
  console.log('📋 recipient_name value:', data.recipient_name);

  // Handle all possible content columns (generated_content, output_text, generated_text)
  const content = data.generated_content || (data as any).output_text || data.generated_text || '';
  
  // Check if content is actually null/undefined/empty
  if (!content || (typeof content === 'string' && content.trim().length === 0)) {
    console.warn('⚠️ WARNING: Message content is empty or null in database!');
    console.warn('   Available columns:', Object.keys(data));
    console.warn('   This might indicate a data issue or RLS policy problem');
  }

  const message = normalizeMessage({
    ...data,
    generated_content: content,
  });

  console.log('✅ Returning message:', {
    id: message.id,
    hasContent: !!message.generated_content,
    contentLength: message.generated_content.length,
    recipient: message.recipient_name
  });

  return message;
};

