import { supabase } from '../lib/supabase';

export interface SaveMessageData {
  type: string; // 'love-letter', 'poem', etc.
  text: string; // The generated message content
  templateUrl?: string; // URL of the design template if used
  recipientName: string;
  occasion?: string;
  isPremium?: boolean; // true for love letters/gift cards with templates
  [key: string]: any; // Allow additional fields
}

/**
 * Save a generated message to the database
 * This is a helper function that can be used after message generation
 * Note: The edge function also saves messages, but this can be used for additional saves or updates
 */
export const saveMessage = async (
  userId: string,
  messageData: SaveMessageData
): Promise<any | null> => {
  try {
    const input_data = {
      recipientName: messageData.recipientName,
      occasion: messageData.occasion,
      tone: messageData.tone,
      relationshipLength: messageData.relationshipLength,
      characterLength: messageData.characterLength,
      additionalDetails: messageData.additionalDetails,
      ...messageData,
    };
    const { data, error } = await supabase
      .from('generated_messages')
      .insert({
        user_id: userId,
        message_type: messageData.type,
        generated_content: messageData.text,
        template_url: messageData.templateUrl || null,
        paid: messageData.isPremium || false,
        input_data,
        tone: messageData.tone || 'heartfelt',
        status: 'completed',
        is_preview: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving message:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception saving message:', error);
    return null;
  }
};

