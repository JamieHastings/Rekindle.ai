const SESSION_KEY = 'rekindle_session_id';
const PREVIEW_COUNT_KEY = 'rekindle_preview_count';
export const MAX_PREVIEWS = 3;

export interface Session {
  id: string;
  previewCount: number;
  canGeneratePreview: boolean;
}

export class SessionManager {
  static getOrCreateSession(): Session {
    let sessionId = localStorage.getItem(SESSION_KEY);

    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
      localStorage.setItem(SESSION_KEY, sessionId);
      localStorage.setItem(PREVIEW_COUNT_KEY, '0');
      console.log('🆕 New session created:', sessionId);
    }

    const previewCountStr = localStorage.getItem(PREVIEW_COUNT_KEY) || '0';
    const previewCount = parseInt(previewCountStr, 10);
    
    // Validate preview count (should be 0-3)
    const validPreviewCount = isNaN(previewCount) ? 0 : Math.max(0, Math.min(previewCount, MAX_PREVIEWS));
    
    // If count was invalid, reset it
    if (isNaN(previewCount) || previewCount < 0 || previewCount > MAX_PREVIEWS) {
      console.log('⚠️ Invalid preview count detected, resetting to 0:', previewCount);
      localStorage.setItem(PREVIEW_COUNT_KEY, '0');
    }

    const canGenerate = validPreviewCount < MAX_PREVIEWS;
    
    console.log('📊 Session Manager:', {
      sessionId,
      previewCount: validPreviewCount,
      maxPreviews: MAX_PREVIEWS,
      canGeneratePreview: canGenerate,
      remaining: MAX_PREVIEWS - validPreviewCount
    });

    return {
      id: sessionId,
      previewCount: validPreviewCount,
      canGeneratePreview: canGenerate,
    };
  }

  static incrementPreviewCount(): void {
    const count = parseInt(localStorage.getItem(PREVIEW_COUNT_KEY) || '0', 10);
    localStorage.setItem(PREVIEW_COUNT_KEY, String(count + 1));
  }

  static getRemainingPreviews(): number {
    const count = parseInt(localStorage.getItem(PREVIEW_COUNT_KEY) || '0', 10);
    return Math.max(0, MAX_PREVIEWS - count);
  }

  static clearSession(): void {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(PREVIEW_COUNT_KEY);
  }

  /**
   * Reset preview count (useful for testing or if user wants to start fresh)
   */
  static resetPreviewCount(): void {
    localStorage.setItem(PREVIEW_COUNT_KEY, '0');
    console.log('✅ Preview count reset to 0');
  }

  /**
   * Get current preview count (for debugging)
   */
  static getPreviewCount(): number {
    const count = parseInt(localStorage.getItem(PREVIEW_COUNT_KEY) || '0', 10);
    return isNaN(count) ? 0 : Math.max(0, Math.min(count, MAX_PREVIEWS));
  }
}

// Expose SessionManager globally for debugging (only in development)
if (typeof window !== 'undefined' && import.meta.env.DEV) {
  (window as any).SessionManager = SessionManager;
}
