import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { callOpenAI } from "../_shared/openai.ts";
import { adjustUserTokens } from "../_shared/tokens.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface RegenerateRequest {
  messageId: string;
}

const REGENERATE_TOKEN_COST = 2;

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

    // Get authorization header
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

    // Initialize Supabase client with user's token
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Verify user authentication
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

    // Parse request body
    const requestData: RegenerateRequest = await req.json();

    if (!requestData.messageId) {
      return new Response(
        JSON.stringify({ error: "Missing messageId" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get existing message using admin client
    const { data: existingMessage, error: messageError } = await supabaseAdmin
      .from("generated_messages")
      .select("*")
      .eq("id", requestData.messageId)
      .eq("user_id", user.id) // Ensure user owns the message
      .single();

    if (messageError || !existingMessage) {
      return new Response(
        JSON.stringify({ error: "Message not found or access denied" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check user's token balance
    const { data: profile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("tokens")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (profile.tokens < REGENERATE_TOKEN_COST) {
      return new Response(
        JSON.stringify({
          error: "Insufficient tokens",
          tokens_required: REGENERATE_TOKEN_COST,
          tokens_available: profile.tokens,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Rebuild prompt from existing message data
    const promptData = {
      name: existingMessage.recipient_name,
      relationshipLength: existingMessage.relationship_length,
      tone: existingMessage.tone,
      occasion: existingMessage.occasion,
      additionalDetails: existingMessage.additional_details,
      characterLength: existingMessage.character_length,
    };

    const prompt = buildPrompt(existingMessage.message_type, promptData);

    // Call OpenAI to regenerate
    const newMessage = await callOpenAI({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are Rekindle.ai, an expert at writing authentic, emotional relationship messages. Write naturally as if you are the person sending the message.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.85,
      max_tokens: 3000,
    });

    // Deduct tokens
    const tokenResult = await adjustUserTokens(
      user.id,
      -REGENERATE_TOKEN_COST,
      `Regenerated ${existingMessage.message_type} message`,
      {
        message_id: requestData.messageId,
        message_type: existingMessage.message_type,
      }
    );

    // Update message with new content
    // Store previous version in metadata if needed
    const { error: updateError } = await supabaseAdmin
      .from("generated_messages")
      .update({
        generated_content: newMessage,
        // Optionally store version history in metadata
        // metadata: { previous_versions: [...existingMessage.metadata?.previous_versions || [], existingMessage.generated_content] }
      })
      .eq("id", requestData.messageId);

    if (updateError) {
      console.error("Failed to update message:", updateError);
      // Don't fail, message was regenerated successfully
    }

    return new Response(
      JSON.stringify({
        success: true,
        newMessage: newMessage,
        tokens_remaining: tokenResult.tokens_remaining,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in regenerate-message function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

// Helper function to build prompt (same as generate-message)
function buildPrompt(messageType: string, promptData: any): string {
  const lengthGuidance: Record<string, string> = {
    short: "Keep the message concise and to the point (2-3 short paragraphs).",
    medium: "Write a well-developed message (4-5 paragraphs).",
    long: "Create a detailed, heartfelt message (6-8 paragraphs).",
    small: "Keep the message concise and to the point (2-3 short paragraphs).",
    large: "Create a detailed, heartfelt message (6-8 paragraphs).",
  };

  const toneGuidance: Record<string, string> = {
    romantic: "Use tender, loving language that expresses deep affection and desire to reconnect.",
    heartfelt: "Write with genuine emotion and sincerity, speaking from the heart.",
    honest: "Be direct, truthful, and authentic without sugar-coating or exaggeration.",
    apologetic: "Express genuine remorse and accountability for past actions.",
    humorous: "Keep it light and playful while still being sincere and meaningful.",
    sincere: "Be genuine, honest, and authentic.",
    remorseful: "Express deep regret and accountability.",
    playful: "Keep it light and fun while still being meaningful.",
    warm: "Use warm, affectionate language.",
  };

  const messageTypeGuidance: Record<string, string> = {
    poem: "This is a poem about rekindling a relationship. Focus on positive memories, what was special, and hope for reconnection.",
    rekindling: "This is about rekindling a relationship. Focus on positive memories, what was special, and hope for reconnection.",
    apology: "This is an apology message. Focus on taking responsibility, expressing remorse, and showing commitment to change.",
    letter: "This is a love letter. Focus on expressing deep feelings, appreciation, and commitment.",
    birthday: "This is a birthday message. Focus on celebrating them, expressing appreciation, and making them feel special.",
    support: "This is a supportive message. Focus on being there for them, offering comfort, and showing you care.",
    text: "This is a voice note script. Write naturally as if speaking directly to them.",
    giftcard: "This is a gift card message. Keep it warm, personal, and heartfelt.",
    closure: "This is about finding closure. Focus on acceptance, gratitude for shared experiences, and moving forward with peace.",
  };

  const recipientName = promptData.name || "them";
  const tone = promptData.tone || "heartfelt";
  const length = promptData.characterLength || "medium";

  return `You are Rekindle.ai — an expert emotional communication assistant specializing in relationship messages.

RULES:
1. Sound natural and human - write as if you're the person sending this message.
2. NO clichés or generic phrases - every message should feel unique and personal.
3. NO manipulative tone - be genuine, honest, and respectful.
4. Use specific details from the user's input to make it personal.
5. Return ONLY the message itself - no introductions, explanations, or meta-commentary.
6. Do NOT use placeholder text like [Name] or [Occasion] - write as if speaking directly.
7. Write in first person, as the sender of the message.
8. Make it feel authentic, not like it was written by AI.

Message Context:
- Recipient: ${recipientName}
${promptData.relationshipLength ? `- Relationship Length: ${promptData.relationshipLength}` : ""}
- Tone: ${tone} - ${toneGuidance[tone] || "Be genuine and heartfelt"}
- Message Type: ${messageType} - ${messageTypeGuidance[messageType] || "Write a meaningful message"}
${promptData.occasion ? `- Occasion: ${promptData.occasion}` : ""}
${promptData.additionalDetails ? `- Additional Context: ${promptData.additionalDetails}` : ""}
- Length: ${lengthGuidance[length] || lengthGuidance.medium}

Write a ${tone} ${messageType} message for ${recipientName}. Make it personal, emotional, and natural. Use the context provided above to craft something that feels authentic and heartfelt.`;
}

