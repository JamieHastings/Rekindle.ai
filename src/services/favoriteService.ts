import { supabase } from '../lib/supabase';

export const toggleFavorite = async (
  messageId: string,
  currentState: boolean
): Promise<{ success: boolean; newState: boolean }> => {
  try {
    const { data, error } = await supabase
      .from('generated_messages')
      .update({ is_favorite: !currentState })
      .eq('id', messageId)
      .select('id');

    if (error) {
      console.error('❌ Error toggling favorite:', error);
      return { success: false, newState: currentState };
    }

    // No rows updated (e.g. RLS or row missing)
    if (!data || data.length === 0) {
      console.warn('Favorite update matched 0 rows');
      return { success: false, newState: currentState };
    }

    console.log(`✅ Favorite ${!currentState ? 'added' : 'removed'}`);
    return { success: true, newState: !currentState };
  } catch (err) {
    console.error('❌ Exception toggling favorite:', err);
    return { success: false, newState: currentState };
  }
};
