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

async function verifyPayPalOrder(orderId: string, accessToken: string) {
  const mode = Deno.env.get('PAYPAL_MODE') || 'sandbox';
  const baseUrl = mode === 'live'
    ? 'https://api-m.paypal.com'
    : 'https://api-m.sandbox.paypal.com';

  const response = await fetch(`${baseUrl}/v2/checkout/orders/${orderId}`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Failed to verify PayPal order: ${JSON.stringify(errorData)}`);
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

    const { orderId, userId, messageType, amount } = await req.json();

    if (!orderId || !userId || !messageType || !amount) {
      throw new Error('Missing required fields: orderId, userId, messageType, or amount');
    }

    if (userId !== user.id) {
      throw new Error('User ID mismatch');
    }

    console.log('💳 Verifying PayPal order:', { orderId, userId, messageType, amount });

    const accessToken = await getPayPalAccessToken();
    const order = await verifyPayPalOrder(orderId, accessToken);

    console.log('📦 Order details:', order);

    if (order.status !== 'COMPLETED') {
      throw new Error(`Payment not completed. Status: ${order.status}`);
    }

    const paidAmount = parseFloat(
      order.purchase_units[0].payments.captures[0].amount.value
    );

    console.log('💰 Payment amount:', paidAmount, 'Expected:', amount);

    // Verify amount matches
    if (Math.abs(paidAmount - amount) > 0.01) {
      throw new Error(`Payment amount mismatch. Expected: ${amount}, Got: ${paidAmount}`);
    }

    // Store payment record
    try {
      await supabaseAdmin.from('pdf_payments').insert({
        user_id: user.id,
        paypal_order_id: orderId,
        message_type: messageType,
        amount: paidAmount,
        status: 'completed',
        metadata: {
          order_details: order,
        },
      });
    } catch (err) {
      console.error('Failed to log payment (table may not exist):', err);
      // Continue anyway - payment is verified
    }

    console.log('✅ Payment verified and logged');

    return new Response(
      JSON.stringify({
        success: true,
        orderId: orderId,
        message: 'Payment verified successfully',
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

