import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { adjustUserTokens } from "../_shared/tokens.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Token packages mapping
const TOKEN_PACKAGES: Record<string, number> = {
  "1": 1,
  "5": 5,
  "25": 25,
  "50": 50,
  "100": 100,
};

// Price mapping (for validation)
const PRICE_MAP: Record<string, number> = {
  "1": 1.00,
  "5": 3.00,
  "25": 22.00,
  "50": 40.00,
  "100": 75.00,
};

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Get Stripe webhook secret from environment
    const stripeWebhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");

    if (!stripeWebhookSecret || !stripeSecretKey) {
      console.error("Missing Stripe environment variables");
      return new Response(
        JSON.stringify({ error: "Stripe not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get Stripe signature from headers
    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response(
        JSON.stringify({ error: "Missing Stripe signature" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get raw body for signature verification
    const body = await req.text();

    // Verify webhook signature using Stripe SDK
    // Note: You'll need to import Stripe SDK or use fetch to verify
    // For now, we'll parse the event directly
    // In production, use: stripe.webhooks.constructEvent(body, signature, stripeWebhookSecret)

    const event = JSON.parse(body);

    // Handle different event types
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const customerEmail = session.customer_email;
      const amountTotal = session.amount_total; // in cents
      const metadata = session.metadata || {};

      // Get user ID from metadata or customer email
      let userId = metadata.user_id;

      // If no user_id in metadata, try to find by email
      if (!userId && customerEmail) {
        const { data: profile } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("email", customerEmail)
          .single();

        if (profile) {
          userId = profile.id;
        }
      }

      if (!userId) {
        console.error("Could not find user for purchase:", { customerEmail, metadata });
        return new Response(
          JSON.stringify({ error: "User not found" }),
          {
            status: 404,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Determine token amount from metadata or price
      let tokenAmount = metadata.tokens ? parseInt(metadata.tokens) : null;

      // If not in metadata, calculate from price
      if (!tokenAmount) {
        const priceInDollars = amountTotal / 100;
        // Find matching package
        for (const [tokens, price] of Object.entries(PRICE_MAP)) {
          if (Math.abs(price - priceInDollars) < 0.01) {
            tokenAmount = parseInt(tokens);
            break;
          }
        }
      }

      if (!tokenAmount || !TOKEN_PACKAGES[tokenAmount.toString()]) {
        console.error("Invalid token amount:", tokenAmount);
        return new Response(
          JSON.stringify({ error: "Invalid token package" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Add tokens to user account
      const tokenResult = await adjustUserTokens(
        userId,
        tokenAmount,
        "token_purchase",
        {
          stripe_session_id: session.id,
          stripe_customer_email: customerEmail,
          amount_paid: amountTotal / 100,
          payment_method: session.payment_method_types?.[0] || "unknown",
        }
      );

      // Log purchase in stripe_payments table if it exists
      try {
        await supabaseAdmin.from("stripe_payments").insert({
          user_id: userId,
          stripe_session_id: session.id,
          amount: amountTotal / 100,
          tokens_awarded: tokenAmount,
          status: "completed",
          metadata: {
            customer_email: customerEmail,
            payment_intent: session.payment_intent,
          },
        });
      } catch (err) {
        console.error("Failed to log payment (table may not exist):", err);
        // Don't fail the request
      }

      return new Response(
        JSON.stringify({
          success: true,
          tokens_awarded: tokenAmount,
          tokens_remaining: tokenResult.tokens_remaining,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Handle payment_intent.succeeded as fallback
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object;
      const metadata = paymentIntent.metadata || {};

      const userId = metadata.user_id;
      if (!userId) {
        return new Response(
          JSON.stringify({ error: "User ID not found in metadata" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const tokenAmount = metadata.tokens ? parseInt(metadata.tokens) : null;
      if (!tokenAmount) {
        return new Response(
          JSON.stringify({ error: "Token amount not found in metadata" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const tokenResult = await adjustUserTokens(
        userId,
        tokenAmount,
        "token_purchase",
        {
          stripe_payment_intent_id: paymentIntent.id,
          amount_paid: paymentIntent.amount / 100,
        }
      );

      return new Response(
        JSON.stringify({
          success: true,
          tokens_awarded: tokenAmount,
          tokens_remaining: tokenResult.tokens_remaining,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Event type not handled
    return new Response(
      JSON.stringify({ message: "Event type not handled", type: event.type }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in purchase-tokens function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

