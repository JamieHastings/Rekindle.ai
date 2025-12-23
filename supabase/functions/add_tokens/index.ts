// supabase/functions/add_tokens/index.ts
// Secure Edge Function to add tokens to user account
// Typically called after successful payment or from admin actions

import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Missing environment variables' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get authorization header
    const authHeader = req.headers.get('authorization') || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return new Response(
        JSON.stringify({ error: 'no_auth', message: 'Authorization token required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate user token and get user ID
    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);

    if (userErr || !userData?.user) {
      return new Response(
        JSON.stringify({ 
          error: 'invalid_token', 
          message: userErr?.message || 'Invalid authentication token' 
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = userData.user.id;

    // Parse request body
    const body = await req.json();
    const amount = Number(body.amount ?? 0);
    const reason = String(body.reason ?? 'purchase');
    const paymentId = String(body.paymentId ?? '');
    const metadata = body.metadata || {};

    // Validate amount
    if (!Number.isInteger(amount) || amount <= 0) {
      return new Response(
        JSON.stringify({ error: 'invalid_amount', message: 'Amount must be a positive integer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate delta (positive to add)
    const delta = Math.abs(amount);

    // Build reason string
    const reasonText = paymentId 
      ? `${reason}: ${amount} tokens (Payment: ${paymentId})`
      : `${reason}: ${amount} tokens`;

    // Build metadata
    const transactionMetadata = {
      ...metadata,
      payment_id: paymentId || undefined,
      added_at: new Date().toISOString(),
    };

    // Call the SQL function (RPC)
    const { data, error } = await adminClient.rpc('adjust_user_tokens', {
      p_user_id: userId,
      p_delta: delta,
      p_reason: reasonText,
    });

    if (error) {
      const errorMessage = error.message || String(error);
      
      if (errorMessage.includes('profile_not_found')) {
        return new Response(
          JSON.stringify({ 
            error: 'profile_not_found',
            message: errorMessage 
          }),
          { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ 
          error: 'addition_failed',
          message: errorMessage 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success with new token balance
    return new Response(
      JSON.stringify({ 
        success: true,
        tokens_remaining: data,
        tokens_added: amount
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error in add_tokens function:', err);
    return new Response(
      JSON.stringify({ 
        error: 'internal_error',
        message: err instanceof Error ? err.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

