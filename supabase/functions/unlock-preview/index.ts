import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

import { corsHeaders } from "../_shared/cors.ts";

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

    const { previewId, generatedMessageId } = await req.json();

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
      const { data: bonusGranted, error: bonusError } = await supabaseAdmin.rpc("award_signup_bonus", {
        user_id: user.id
      });

      if (!bonusError && bonusGranted) {
        tokensAwarded = 3;
        message = "Welcome! Your message is unlocked and you received 3 free tokens!";
      }
    }

    await supabaseAdmin
      .from("preview_messages")
      .update({ unlocked_by_user_id: user.id })
      .eq("id", previewId);

    // Prefer full_content (client now sends it); fallback to preview_text for older rows
    const fullContent =
      preview.full_content ?? preview.preview_text ?? "";

    // Build input_data from preview form_data if available, otherwise reconstruct from preview fields
    const inputData = preview.form_data || {
      name: preview.recipient_name,
      relationshipLength: preview.relationship_length,
      tone: preview.tone,
      messageType: preview.message_type,
      occasion: preview.occasion,
      additionalDetails: preview.additional_details,
      characterLength: preview.character_length,
    };

    let savedMessage: { id: string } | null = null;

    if (generatedMessageId) {
      // Update existing anonymous row with full content and claim it (avoids duplicate in history)
      const { data: updated, error: updateError } = await supabaseAdmin
        .from("generated_messages")
        .update({
          user_id: user.id,
          generated_content: fullContent,
          is_preview: false,
          input_data: inputData,
        })
        .eq("id", generatedMessageId)
        .or("user_id.is.null,user_id.eq." + user.id)
        .select("id")
        .single();

      if (updateError) {
        console.error("❌ Failed to update existing message with full content:", updateError);
      } else if (updated) {
        savedMessage = { id: updated.id };
        console.log("✅ Updated existing message with full content:", updated.id);
      }
    }

    if (!savedMessage) {
      const { data: inserted, error: messageError } = await supabaseAdmin
        .from("generated_messages")
        .insert({
          user_id: user.id,
          message_type: preview.message_type,
          tone: preview.tone,
          generated_content: fullContent,
          input_data: inputData,
          is_preview: true,
        })
        .select()
        .single();

      if (messageError) {
        console.error("❌ Failed to save unlocked message to database:", messageError);
        console.error("   Error details:", {
          code: messageError.code,
          message: messageError.message,
          details: messageError.details,
          hint: messageError.hint,
        });
      } else if (inserted) {
        savedMessage = { id: inserted.id };
        console.log("✅ Unlocked message saved to database successfully:", {
          messageId: inserted.id,
          messageType: preview.message_type,
          userId: user.id,
          wasPreview: true,
        });
      }
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
        fullContent,
        message,
        tokensAwarded: tokensAwarded > 0 ? tokensAwarded : undefined,
        messageId: savedMessage?.id || null, // Return messageId for regeneration
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