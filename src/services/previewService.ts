// src/services/previewService.ts

import { supabase } from '../lib/supabase';
import { SessionManager, MAX_PREVIEWS } from '../utils/sessionManager';
import { generateAIText } from './openaiService';
import { renderPromptFromForm } from './promptEngine';

interface PreviewResponse {
  previewId: string;
  partialContent: string;
  fullMessage: string;
  remainingPreviews: number;
}

export const PreviewService = {
  generatePreview: async (formData: any): Promise<PreviewResponse> => {
    const session = SessionManager.getOrCreateSession();

    if (!session.canGeneratePreview) {
      throw new Error('Preview limit reached. Please sign up to continue.');
    }

    console.log('🔄 Generating preview with session:', session.id);

    // Generate the full message using AI
    // Note: renderPromptFromForm requires messageType and formData
    // We'll extract messageType from formData and pass both
    const messageType = formData.messageType || 'poem';
    const prompt = await renderPromptFromForm(messageType, formData);
    // Note: generateAIText only takes one parameter (prompt), not messageType
    const fullMessage = await generateAIText(prompt);

    // Create preview (first 350 characters)
    const previewLength = 350;
    const partialContent = fullMessage.substring(0, previewLength) + '...';

    // Try to save preview to database
    let savedPreviewId = '';

    try {
      console.log('💾 Attempting to save preview to database...');

      const { data: savedPreview, error } = await supabase
        .from('preview_messages')
        .insert({
          user_id: null,
          session_id: session.id,
          message_type: formData.messageType,
          input_data: formData,
          preview_text: fullMessage,
          full_content: fullMessage, // So unlock-preview can save full poem to generated_messages
        })
        .select()
        .single();

      if (error) {
        console.error('❌ Failed to save preview:', error);
      } else {
        console.log('✅ Preview saved:', savedPreview.id);
        savedPreviewId = savedPreview.id;
      }
    } catch (err) {
      console.error('❌ Exception saving preview:', err);
    }

    // Increment preview count
    SessionManager.incrementPreviewCount();
    const updatedSession = SessionManager.getOrCreateSession();
    // Calculate remaining since Session interface doesn't have .remaining property
    const remainingPreviews = Math.max(0, MAX_PREVIEWS - updatedSession.previewCount);

    return {
      partialContent,
      fullMessage,
      previewId: savedPreviewId,
      remainingPreviews,
    };
  },

  unlockPreview: async (previewId: string, accessToken: string): Promise<{ fullContent: string; tokensAwarded?: number; messageId?: string }> => {
    // Try to get from session storage first
    try {
      const storedPreviews = JSON.parse(sessionStorage.getItem('previews') || '[]');
      const preview = storedPreviews.find((p: any) => p.id === previewId);
      
      if (preview && preview.fullContent) {
        return {
          fullContent: preview.fullContent,
          tokensAwarded: 3, // Award 3 tokens for signup
          messageId: null, // Client-side previews don't have messageId yet - will be created by unlock-preview edge function
        };
      }
    } catch (err) {
      console.error('Error reading from session storage:', err);
    }

    // Fallback to Supabase Edge Function if available
    const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
    const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

    if (SUPABASE_URL && SUPABASE_ANON_KEY) {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/unlock-preview`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          previewId,
          generatedMessageId: options?.generatedMessageId ?? undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock preview');
      }

      return await response.json();
    }

    throw new Error('Preview not found and unlock service unavailable');
  },
};
