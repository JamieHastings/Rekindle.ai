const SESSION_KEY = 'rekindle_session_id';
const PREVIEW_COUNT_KEY = 'rekindle_preview_count';
const MAX_PREVIEWS = 3;

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
    }

    const previewCount = parseInt(localStorage.getItem(PREVIEW_COUNT_KEY) || '0', 10);

    return {
      id: sessionId,
      previewCount,
      canGeneratePreview: previewCount < MAX_PREVIEWS,
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
}
