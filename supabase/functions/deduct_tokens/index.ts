// supabase/functions/deduct_tokens/index.ts
// Secure Edge Function to deduct tokens from user account
// Uses service role key for atomic operations

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
    const cost = Number(body.cost ?? 0);
    const reason = String(body.reason ?? 'deduct_tokens');
    const messageType = String(body.messageType ?? '');

    // Validate cost
    if (!Number.isInteger(cost) || cost <= 0) {
      return new Response(
        JSON.stringify({ error: 'invalid_cost', message: 'Cost must be a positive integer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Calculate delta (negative to deduct)
    const delta = -Math.abs(cost);

    // Build reason string
    const reasonText = messageType 
      ? `${reason}: ${messageType} message`
      : reason;

    // Call the SQL function (RPC)
    const { data, error } = await adminClient.rpc('adjust_user_tokens', {
      p_user_id: userId,
      p_delta: delta,
      p_reason: reasonText,
    });

    if (error) {
      // Map Postgres exceptions to readable errors
      const errorMessage = error.message || String(error);
      
      if (errorMessage.includes('insufficient_tokens')) {
        return new Response(
          JSON.stringify({ 
            error: 'insufficient_tokens',
            message: errorMessage 
          }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
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
          error: 'deduction_failed',
          message: errorMessage 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Return success with remaining tokens
    return new Response(
      JSON.stringify({ 
        success: true,
        tokens_remaining: data,
        tokens_deducted: cost
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error('Error in deduct_tokens function:', err);
    return new Response(
      JSON.stringify({ 
        error: 'internal_error',
        message: err instanceof Error ? err.message : 'Internal server error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

