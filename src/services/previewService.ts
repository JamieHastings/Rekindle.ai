import { SessionManager } from '../utils/sessionManager';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

interface PreviewRequest {
  sessionId: string;
  name: string;
  relationshipLength: string;
  tone: string;
  messageType: string;
  occasion?: string;
  additionalDetails?: string;
  characterLength: string;
}

interface PreviewResponse {
  previewId: string;
  partialContent: string;
  expiresAt: string;
  remainingPreviews: number;
}

export class PreviewService {
  static async generatePreview(formData: any): Promise<PreviewResponse> {
    const session = SessionManager.getOrCreateSession();

    if (!session.canGeneratePreview) {
      throw new Error('Preview limit reached. Please sign up to continue!');
    }

    const request: PreviewRequest = {
      sessionId: session.id,
      name: formData.name,
      relationshipLength: formData.relationshipLength,
      tone: formData.tone,
      messageType: formData.messageType,
      occasion: formData.occasion,
      additionalDetails: formData.additionalDetails,
      characterLength: formData.characterLength,
    };

    const response = await fetch(`${SUPABASE_URL}/functions/v1/generate-preview`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify(request),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to generate preview');
    }

    const data = await response.json();

    SessionManager.incrementPreviewCount();

    return data;
  }

  static async unlockPreview(previewId: string, accessToken: string): Promise<{ fullContent: string; tokensAwarded?: number }> {
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
}
