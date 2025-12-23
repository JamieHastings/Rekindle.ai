import { SessionManager } from '../utils/sessionManager';
import { renderPromptFromForm } from './promptEngine';
import { generateAIText } from './openaiService';
import { FormData } from '../components/MessageForm';

const PREVIEW_LIMIT = 3;
const PREVIEW_LENGTH = 200; // Characters to show in preview

interface PreviewResponse {
  previewId: string;
  partialContent: string;
  expiresAt: string;
  remainingPreviews: number;
}

export class PreviewService {
  /**
   * Generate a preview message using OpenAI (for non-logged-in users)
   * This replaces the old Supabase Edge Function call
   */
  static async generatePreview(formData: any): Promise<PreviewResponse> {
    const session = SessionManager.getOrCreateSession();

    if (!session.canGeneratePreview) {
      throw new Error('Preview limit reached. Please sign up to continue!');
    }

    try {
      // Convert backend form data to FormData format
      const messageTypeMap: Record<string, string> = {
        'rekindling': 'poem',
        'birthday': 'letter',
        'apology': 'apology',
        'support': 'text',
      };

      const frontendMessageType = messageTypeMap[formData.messageType] || 'poem';

      // Create FormData object from backend data
      const frontendFormData: FormData = {
        messageType: frontendMessageType,
        relationshipStatus: 'unsure', // Default for preview
        // Map fields based on message type
        ...(frontendMessageType === 'poem' && {
          loverName: formData.name,
          yourName: 'You',
          whatHappened: formData.additionalDetails || '',
          poemTone: formData.tone,
          shortDescription: formData.additionalDetails || '',
        }),
        ...(frontendMessageType === 'letter' && {
          recipientName: formData.name,
          tone: formData.tone,
          length: formData.characterLength,
          keyPoints: formData.additionalDetails || '',
          additionalDetails: formData.additionalDetails || '',
        }),
        ...(frontendMessageType === 'apology' && {
          apologyLoverName: formData.name,
          significantMessage: formData.additionalDetails || '',
          apologyLength: formData.characterLength,
          apologyTone: formData.tone,
          apologyDescription: formData.additionalDetails || '',
        }),
        ...(frontendMessageType === 'text' && {
          voicenoteLoverName: formData.name,
          voicenoteSignificantMessage: formData.additionalDetails || '',
          voicenoteLength: formData.characterLength,
          voicenoteTone: formData.tone,
          voicenoteDescription: formData.additionalDetails || '',
        }),
      };

      // Step 1: Render prompt from template
      const prompt = await renderPromptFromForm(frontendMessageType, frontendFormData);

      // Step 2: Generate full message using OpenAI
      const fullContent = await generateAIText(prompt);

      // Step 3: Create preview (truncate to first 200 characters)
      const partialContent = fullContent.substring(0, PREVIEW_LENGTH).trim() + '...';

      // Step 4: Increment preview count
      SessionManager.incrementPreviewCount();

      // Step 5: Calculate remaining previews
      const remainingPreviews = Math.max(0, PREVIEW_LIMIT - session.previewCount);

      // Step 6: Create preview ID (simple timestamp-based ID for client-side storage)
      const previewId = `preview_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Store full content in session storage (for unlock functionality)
      try {
        const previewData = {
          id: previewId,
          fullContent,
          partialContent,
          messageType: formData.messageType,
          tone: formData.tone,
          recipientName: formData.name,
          createdAt: new Date().toISOString(),
        };
        const storedPreviews = JSON.parse(sessionStorage.getItem('previews') || '[]');
        storedPreviews.push(previewData);
        // Keep only last 10 previews
        const recentPreviews = storedPreviews.slice(-10);
        sessionStorage.setItem('previews', JSON.stringify(recentPreviews));
      } catch (err) {
        console.error('Error storing preview:', err);
      }

      return {
        previewId,
        partialContent,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
        remainingPreviews,
      };
    } catch (err) {
      console.error('Error generating preview:', err);
      throw new Error(err instanceof Error ? err.message : 'Failed to generate preview');
    }
  }

  static async unlockPreview(previewId: string, accessToken: string): Promise<{ fullContent: string; tokensAwarded?: number; messageId?: string }> {
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
        body: JSON.stringify({ previewId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unlock preview');
      }

      return await response.json();
    }

    throw new Error('Preview not found and unlock service unavailable');
  }
}
