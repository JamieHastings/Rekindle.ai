import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";
import { adjustUserTokens } from "../_shared/tokens.ts";

const PAYPAL_MODE = Deno.env.get('PAYPAL_MODE') || 'sandbox';
const PAYPAL_BASE_URL = PAYPAL_MODE === 'live'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com';

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const auth = btoa(`${clientId}:${clientSecret}`);
  const response = await fetch(`${PAYPAL_BASE_URL}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error(`Failed to get PayPal access token: ${response.statusText}`);
  }

  const data = await response.json();
  return data.access_token;
}

async function capturePayPalOrder(orderId: string, accessToken: string) {
  const response = await fetch(`${PAYPAL_BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to capture PayPal order: ${JSON.stringify(errorData)}`);
  }

  return await response.json();
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error('Invalid token');

    const { orderId, tokenAmount } = await req.json();
    if (!orderId || !tokenAmount) throw new Error('Missing orderId or tokenAmount');

    // Idempotency: reject duplicate order processing
    const { data: existing } = await supabaseAdmin
      .from('token_transactions')
      .select('id')
      .filter('metadata->>paypal_order_id', 'eq', orderId)
      .maybeSingle();

    if (existing) {
      console.log('⚠️ Order already processed:', orderId);
      const { data: profile } = await supabaseAdmin
        .from('profiles').select('tokens').eq('id', user.id).single();
      return new Response(
        JSON.stringify({ success: true, tokens_added: 0, new_balance: profile?.tokens ?? 0, order_id: orderId }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Look up expected price from DB (source of truth)
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('token_packages')
      .select('price')
      .eq('tokens', tokenAmount)
      .eq('is_active', true)
      .single();

    if (pkgError || !pkg) {
      throw new Error(`No active package found for ${tokenAmount} tokens`);
    }

    const accessToken = await getPayPalAccessToken();
    const captureResult = await capturePayPalOrder(orderId, accessToken);

    if (captureResult.status !== 'COMPLETED') {
      throw new Error(`Payment not completed. Status: ${captureResult.status}`);
    }

    const paidAmount = parseFloat(
      captureResult.purchase_units[0].payments.captures[0].amount.value
    );

    if (Math.abs(paidAmount - pkg.price) > 0.01) {
      throw new Error(`Payment amount mismatch: paid ${paidAmount}, expected ${pkg.price}`);
    }

    console.log('💰 Payment verified:', { paidAmount, tokenAmount });

    const result = await adjustUserTokens(
      user.id,
      tokenAmount,
      `Purchased ${tokenAmount} tokens via PayPal`,
      { paypal_order_id: orderId, amount_paid: paidAmount }
    );

    console.log('✅ Tokens added:', { tokenAmount, newBalance: result.tokens_remaining });

    return new Response(
      JSON.stringify({
        success: true,
        tokens_added: tokenAmount,
        new_balance: result.tokens_remaining,
        order_id: orderId,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
