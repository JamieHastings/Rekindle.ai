import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { callOpenAI } from "../_shared/openai.ts";
import { getTokenCost, adjustUserTokens } from "../_shared/tokens.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface MessageRequest {
  messageType: string;
  promptData: {
    name: string;
    relationshipLength?: string;
    tone: string;
    occasion?: string;
    additionalDetails?: string;
    characterLength?: string;
    // Message type specific fields
    loverName?: string;
    yourName?: string;
    recipientName?: string;
    poemTone?: string;
    apologyTone?: string;
    voicenoteTone?: string;
    [key: string]: any;
  };
  preview?: boolean;
}

function buildPrompt(data: MessageRequest): string {
  const { messageType, promptData } = data;

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

  const recipientName = promptData.name || promptData.loverName || promptData.recipientName || "them";
  const tone = promptData.tone || promptData.poemTone || promptData.apologyTone || promptData.voicenoteTone || "heartfelt";
  const length = promptData.characterLength || "medium";

  const systemPrompt = `You are Rekindle.ai — an expert emotional communication assistant specializing in relationship messages.

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

  return systemPrompt;
}

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
    const requestData: MessageRequest = await req.json();

    // Validate required fields
    if (!requestData.messageType || !requestData.promptData) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: messageType and promptData" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Get user profile using admin client
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

    // Check if this is the user's first message generation
    const { count: messageCount } = await supabaseAdmin
      .from("generated_messages")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);

    const isFirstMessage = (messageCount || 0) === 0;
    const isPreview = requestData.preview === true;

    // Calculate token cost
    const tokenCost = getTokenCost(requestData.messageType);
    
    // First message is FREE - no token deduction
    const actualTokenCost = isFirstMessage ? 0 : tokenCost;

    // Check tokens (only if not preview and not first message)
    if (!isPreview && !isFirstMessage && profile.tokens < tokenCost) {
      return new Response(
        JSON.stringify({ 
          error: "Insufficient tokens",
          tokens_required: tokenCost,
          tokens_available: profile.tokens,
        }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build prompt
    const prompt = buildPrompt(requestData);

    // Call OpenAI
    const fullMessage = await callOpenAI({
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

    // Create preview (first 2-3 lines, ~200 chars)
    const preview = fullMessage.substring(0, 200).trim() + "...";

    // If preview mode, return preview only
    if (isPreview) {
      return new Response(
        JSON.stringify({
          preview: preview,
          full: null,
          messageId: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deduct tokens using admin client (only if not first message)
    let tokenResult;
    if (actualTokenCost > 0) {
      tokenResult = await adjustUserTokens(
        user.id,
        -actualTokenCost,
        `Generated ${requestData.messageType} message`,
        {
          message_type: requestData.messageType,
          tone: requestData.promptData.tone,
        }
      );
    } else {
      // First message is free - get current token balance without deducting
      const { data: currentProfile } = await supabaseAdmin
        .from("profiles")
        .select("tokens")
        .eq("id", user.id)
        .single();
      
      tokenResult = {
        success: true,
        tokens_remaining: currentProfile?.tokens || 0,
      };
      
      console.log("🎁 First message is FREE - no tokens deducted");
    }

    // Save message to database using admin client
    const { data: savedMessage, error: saveError } = await supabaseAdmin
      .from("generated_messages")
      .insert({
        user_id: user.id,
        message_type: requestData.messageType,
        tone: requestData.promptData.tone || "heartfelt",
        recipient_name: requestData.promptData.name || requestData.promptData.loverName || requestData.promptData.recipientName || "",
        relationship_length: requestData.promptData.relationshipLength || "",
        occasion: requestData.promptData.occasion || null,
        additional_details: requestData.promptData.additionalDetails || null,
        character_length: requestData.promptData.characterLength || "medium",
        generated_content: fullMessage,
        input_data: requestData.promptData, // Store full form data as JSON
        is_preview: false, // This is a direct generation, not from preview
      })
      .select()
      .single();

    if (saveError) {
      console.error("❌ Failed to save message to database:", saveError);
      console.error("   Error details:", {
        code: saveError.code,
        message: saveError.message,
        details: saveError.details,
        hint: saveError.hint,
      });
      // Don't fail the request, message was generated successfully
      // But log the error for debugging
    } else {
      console.log("✅ Message saved to database successfully:", {
        messageId: savedMessage?.id,
        messageType: requestData.messageType,
        userId: user.id,
      });
    }

    return new Response(
      JSON.stringify({
        preview: preview,
        full: fullMessage,
        messageId: savedMessage?.id || null,
        tokens_remaining: tokenResult.tokens_remaining,
        is_first_message: isFirstMessage,
        tokens_deducted: actualTokenCost,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-message function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: error instanceof Error ? error.message : String(error) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
