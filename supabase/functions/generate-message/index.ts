import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { callOpenAI } from "../_shared/openai.ts";
import { getTokenCost, adjustUserTokens } from "../_shared/tokens.ts";
import { corsHeaders } from "../_shared/cors.ts";

interface MessageRequest {
  messageId?: string; // When set, update this stub instead of inserting (template preserved)
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
  templateId?: string; // Template ID if a design template is selected
  templateUrl?: string; // Template URL if available
  isPremium?: boolean; // true if this message requires payment (e.g., love letter with template)
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
    poem: "This is a poem. Focus on positive memories, what was special, and emotional connection.",
    apology: "This is an apology text message, not in a letter format. Focus on taking responsibility, expressing remorse, and showing commitment to change.",
    letter: "This is a love letter. Focus on expressing deep feelings, appreciation, and commitment.",
    text: "This is a voice note script. Write naturally as if speaking directly to them.",
    giftcard: "This is a gift card message. Keep it warm, personal, and heartfelt.",
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

    let requestData: MessageRequest & { prompt?: string };
    try {
      requestData = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid JSON body" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Client-rendered prompt only (openaiService → promptEngine). Returns { text }.
    if (typeof requestData.prompt === "string" && !requestData.messageType) {
      const prompt = requestData.prompt.trim();
      if (!prompt.length) {
        return new Response(
          JSON.stringify({ error: "Prompt cannot be empty" }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      try {
        const fullMessage = await callOpenAI({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content:
                "You are Rekindle.ai, an expert at writing authentic, emotional relationship messages. Write naturally as if you are the person sending the message.",
            },
            { role: "user", content: prompt },
            ],
          temperature: 0.85,
          max_tokens: 3000,
        });
        if (!fullMessage || fullMessage.trim().length === 0) {
          return new Response(
            JSON.stringify({ error: "Failed to generate message content" }),
            {
              status: 500,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
        return new Response(
          JSON.stringify({ text: fullMessage.trim() }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      } catch (err) {
        console.error("Error in raw prompt path:", err);
        return new Response(
          JSON.stringify({
            error: "Internal server error",
            details: err instanceof Error ? err.message : String(err),
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
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

    // When messageId is provided, we UPDATE an existing stub (template already saved by client)
    const messageId = requestData.messageId;
    const isUpdateFlow = !!messageId;

    // Extract template information from request (used only in legacy INSERT flow)
    const templateId = requestData.templateId;
    const templateUrl = requestData.templateUrl;
    const isPremium = requestData.isPremium;

    console.log('📋 Request:', {
      messageId,
      isUpdateFlow,
      messageType: requestData.messageType,
      hasTemplateId: !!templateId,
      hasTemplateUrl: !!templateUrl,
    });

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

    // First message is free: when updating a stub, count completed messages; otherwise count all
    let isFirstMessage: boolean;
    if (isUpdateFlow) {
      const { count: completedCount } = await supabaseAdmin
        .from("generated_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .neq("generated_content", "");
      isFirstMessage = (completedCount || 0) === 0;
    } else {
      const { count: messageCount } = await supabaseAdmin
        .from("generated_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);
      isFirstMessage = (messageCount || 0) === 0;
    }
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
    console.log("🤖 Calling OpenAI API...");
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

    // Validate that we got content from OpenAI
    if (!fullMessage || fullMessage.trim().length === 0) {
      console.error("❌ OpenAI returned empty or null content!");
      return new Response(
        JSON.stringify({ error: "Failed to generate message content" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("✅ OpenAI response received:", {
      contentLength: fullMessage.length,
      preview: fullMessage.substring(0, 100) + "...",
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

    // ✅ UPDATE flow: stub was created by client with template already saved
    if (isUpdateFlow && messageId) {
      const { data: updatedMessage, error: updateError } = await supabaseAdmin
        .from("generated_messages")
        .update({
          generated_content: fullMessage,
          status: "completed",
        })
        .eq("id", messageId)
        .eq("user_id", user.id)
        .select()
        .single();

      if (updateError) {
        console.error("❌ Failed to update message:", updateError);
        return new Response(
          JSON.stringify({ error: "Failed to update message", details: updateError.message }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      console.log("✅ Message updated with content, template preserved:", updatedMessage?.id);
      return new Response(
        JSON.stringify({
          preview: preview,
          full: fullMessage,
          messageId: messageId,
          tokens_remaining: tokenResult.tokens_remaining,
          is_first_message: isFirstMessage,
          tokens_deducted: actualTokenCost,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Legacy INSERT flow (no messageId: preview or old client)
    // Fetch template URL if templateId is provided but templateUrl is not
    let finalTemplateUrl: string | null = templateUrl || null;
    if (templateId && !finalTemplateUrl) {
      console.log('🔍 Fetching template URL for templateId:', templateId);
      try {
        const { data: template, error: templateError } = await supabaseAdmin
          .from("design_templates")
          .select("image_url")
          .eq("id", templateId)
          .eq("is_active", true)
          .single();
        
        if (!templateError && template) {
          finalTemplateUrl = template.image_url;
          console.log('✅ Template URL fetched:', finalTemplateUrl);
        } else {
          console.error('❌ Error fetching template:', templateError);
        }
      } catch (err) {
        console.error("❌ Exception fetching template:", err);
      }
    }

    // Determine if this is a premium message (requires payment)
    const finalIsPremium = isPremium || 
      (!!finalTemplateUrl && (requestData.messageType === 'letter' || requestData.messageType === 'love_letter' || requestData.messageType === 'giftcard'));

    const messageData = {
      user_id: user.id,
      message_type: requestData.messageType,
      tone: requestData.promptData.tone || "heartfelt",
      generated_content: fullMessage,
      template_url: finalTemplateUrl,
      paid: finalIsPremium,
      input_data: requestData.promptData,
      is_preview: false,
    };

    if (!messageData.generated_content || messageData.generated_content.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: "Generated content is empty. Cannot save message." }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: savedMessage, error: saveError } = await supabaseAdmin
      .from("generated_messages")
      .insert(messageData)
      .select()
      .single();

    if (saveError) {
      console.error("❌ Failed to save message to database:", saveError);
    } else {
      console.log("✅ Message saved to database successfully:", savedMessage?.id);
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
