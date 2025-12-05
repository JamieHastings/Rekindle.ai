import { supabase } from '../lib/supabase';

const N8N_WEBHOOK_SECRET = import.meta.env.VITE_N8N_WEBHOOK_SECRET;
const MESSAGE_GENERATION_URL = import.meta.env.VITE_N8N_MESSAGE_GENERATION_WEBHOOK;
const STRIPE_CHECKOUT_URL = import.meta.env.VITE_N8N_STRIPE_CHECKOUT_WEBHOOK;
const SEND_EMAIL_URL = import.meta.env.VITE_N8N_SEND_EMAIL_WEBHOOK;

const USE_N8N = MESSAGE_GENERATION_URL && MESSAGE_GENERATION_URL !== 'https://your-n8n-instance.com/webhook/generate-message';

interface GenerateMessageRequest {
  name: string;
  relationshipLength: string;
  tone: string;
  messageType: string;
  occasion?: string;
  additionalDetails?: string;
  characterLength: string;
}

interface GenerateMessageResponse {
  message: string;
  tokensRemaining: number;
}

interface CreateCheckoutRequest {
  tokenPackage: string;
  packageDetails: {
    tokens: number;
    price: number;
    label: string;
  };
}

interface CreateCheckoutResponse {
  checkoutUrl: string;
  sessionId: string;
}

interface SendEmailRequest {
  emailType: 'welcome' | 'receipt' | 'gift_card' | 'check_up' | 'low_tokens';
  recipientEmail: string;
  data: Record<string, any>;
}

export class N8nService {
  private static async makeAuthenticatedRequest<T>(
    url: string,
    body: any
  ): Promise<T> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        ...body,
        userId: session.user.id,
        accessToken: session.access_token,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `Request failed with status ${response.status}`);
    }

    return response.json();
  }

  static async generateMessage(
    request: GenerateMessageRequest
  ): Promise<GenerateMessageResponse> {
    if (!USE_N8N) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-message`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
            'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(request),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate message');
      }

      return response.json();
    }

    return this.makeAuthenticatedRequest<GenerateMessageResponse>(
      MESSAGE_GENERATION_URL,
      request
    );
  }

  static async createStripeCheckout(
    request: CreateCheckoutRequest
  ): Promise<CreateCheckoutResponse> {
    if (!USE_N8N) {
      throw new Error('Stripe checkout requires n8n webhook configuration');
    }

    return this.makeAuthenticatedRequest<CreateCheckoutResponse>(
      STRIPE_CHECKOUT_URL,
      request
    );
  }

  static async sendEmail(request: SendEmailRequest): Promise<{ success: boolean; emailId: string }> {
    if (!USE_N8N) {
      console.warn('Email sending requires n8n webhook configuration');
      return { success: false, emailId: '' };
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      throw new Error('Not authenticated');
    }

    const response = await fetch(SEND_EMAIL_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Secret': N8N_WEBHOOK_SECRET,
      },
      body: JSON.stringify({
        ...request,
        userId: session.user.id,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || 'Failed to send email');
    }

    return response.json();
  }

  static isConfigured(): boolean {
    return USE_N8N;
  }
}
