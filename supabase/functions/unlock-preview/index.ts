import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  try {
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

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { previewId } = await req.json();

    if (!previewId) {
      return new Response(
        JSON.stringify({ error: "Preview ID is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: preview, error: previewError } = await supabaseAdmin
      .from("preview_messages")
      .select("*")
      .eq("id", previewId)
      .single();

    if (previewError || !preview) {
      return new Response(
        JSON.stringify({ error: "Preview not found or expired" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (new Date(preview.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Preview has expired" }),
        {
          status: 410,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (preview.unlocked_by_user_id && preview.unlocked_by_user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Preview already unlocked by another user" }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "User profile not found" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let tokensAwarded = 0;
    let message = "Message unlocked successfully!";

    if (!profile.signup_bonus_awarded) {
      const { error: bonusError } = await supabaseAdmin.rpc("award_signup_bonus", {
        user_id: user.id
      });

      if (!bonusError) {
        tokensAwarded = 5;
        message = "Welcome! Your message is unlocked and you received 5 free tokens!";
      }
    }

    await supabaseAdmin
      .from("preview_messages")
      .update({ unlocked_by_user_id: user.id })
      .eq("id", previewId);

    const { error: messageError } = await supabaseAdmin
      .from("generated_messages")
      .insert({
        user_id: user.id,
        message_type: preview.message_type,
        tone: preview.tone,
        recipient_name: preview.recipient_name,
        relationship_length: preview.relationship_length,
        occasion: preview.occasion,
        additional_details: preview.additional_details,
        character_length: preview.character_length,
        generated_content: preview.full_content,
        was_preview: true,
        preview_id: preview.id,
      });

    if (messageError) {
      console.error("Failed to save unlocked message:", messageError);
    }

    await supabaseAdmin
      .from("pending_purchases")
      .insert({
        preview_message_id: previewId,
        user_id: user.id,
        conversion_method: tokensAwarded > 0 ? "signup_bonus" : "token_purchase",
      });

    return new Response(
      JSON.stringify({
        fullContent: preview.full_content,
        message,
        tokensAwarded: tokensAwarded > 0 ? tokensAwarded : undefined,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in unlock-preview function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});