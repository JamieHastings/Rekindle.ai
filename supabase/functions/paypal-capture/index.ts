import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

async function getPayPalAccessToken(): Promise<string> {
  const clientId = Deno.env.get('PAYPAL_CLIENT_ID');
  const clientSecret = Deno.env.get('PAYPAL_CLIENT_SECRET');
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox';

  if (!clientId || !clientSecret) {
    throw new Error('PayPal credentials not configured');
  }

  const baseUrl = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const auth = btoa(`${clientId}:${clientSecret}`);

  const response = await fetch(`${baseUrl}/v1/oauth2/token`, {
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
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox';
  const baseUrl = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}/capture`, {
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
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      throw new Error('Invalid token');
    }

    console.log('✅ User authenticated:', user.id);

    const { orderId, tokenAmount } = await req.json();

    if (!orderId || !tokenAmount) {
      throw new Error('Missing orderId or tokenAmount');
    }

    console.log('💳 Capturing PayPal order:', { orderId, tokenAmount });

    const accessToken = await getPayPalAccessToken();
    const captureResult = await capturePayPalOrder(orderId, accessToken);

    console.log('📦 Capture result:', captureResult);

    if (captureResult.status !== 'COMPLETED') {
      throw new Error(`Payment not completed. Status: ${captureResult.status}`);
    }

    const paidAmount = parseFloat(
      captureResult.purchase_units[0].payments.captures[0].amount.value
    );

    console.log('💰 Payment amount:', paidAmount);

    const tokenPackages: { [key: number]: number } = {
      10: 5.00,
      25: 10.00,
      50: 18.00,
      100: 30.00,
    };

    const expectedAmount = tokenPackages[tokenAmount];
    if (!expectedAmount || Math.abs(paidAmount - expectedAmount) > 0.01) {
      throw new Error('Payment amount mismatch');
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('tokens')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw profileError;
    }

    const newTokenBalance = (profile.tokens || 0) + tokenAmount;

    const { error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({ tokens: newTokenBalance })
      .eq('id', user.id);

    if (updateError) {
      throw updateError;
    }

    console.log('✅ Tokens added:', { tokenAmount, newBalance: newTokenBalance });

    await supabaseAdmin.from('token_transactions').insert({
      user_id: user.id,
      transaction_type: 'credit',
      amount: tokenAmount,
      description: `Purchased ${tokenAmount} tokens via PayPal`,
      metadata: {
        paypal_order_id: orderId,
        amount_paid: paidAmount,
      },
    });

    try {
      await supabaseAdmin.from('stripe_payments').insert({
        user_id: user.id,
        amount: paidAmount,
        tokens_awarded: tokenAmount,
        status: 'completed',
        stripe_session_id: orderId,
        metadata: {
          payment_provider: 'paypal',
          paypal_order_id: orderId,
        },
      });
    } catch (err) {
      console.error('Failed to log payment (table may not exist):', err);
    }

    console.log('✅ Payment logged');

    return new Response(
      JSON.stringify({
        success: true,
        tokens_added: tokenAmount,
        new_balance: newTokenBalance,
        order_id: orderId,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
