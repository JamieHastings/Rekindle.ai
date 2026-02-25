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

// --- .njk template content (mirrors prompt-templates/*.njk for consistent regeneration) ---
const NJK_TEMPLATES: Record<string, string> = {
  poem: `You are an expert relationship writer.  
Your task is to write a deeply meaningful and emotionally honest poem.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
- Your name: {{ your_name }}
- What happened / what you did wrong: {{ what_happened }}
- Desired tone: {{ tone }}
{% if short_description %}
- Additional context: {{ short_description }}
{% endif %}

INSTRUCTIONS:
- Write a poem that feels personal, authentic, and emotionally grounded.
- Avoid clichés unless they genuinely fit the tone.
- Keep the style consistent with {{ tone }}.
- The poem should feel like it is written directly from {{ your_name }} to {{ lover_name }}.
- The poem should be emotionally intelligent, taking accountability without sounding desperate.
- Do not include formatting like "**Poem:**". Output only the poem itself.

Now write the poem.`,

  letter: `You are an expert at writing emotionally intelligent and heartfelt love letters.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Recipient name: {{ recipient_name }}
- Your name: {{ your_name }}
- Tone: {{ tone }}
- Desired length: {{ length }}
- Key points to include: {{ key_points }}
{% if additional_details %}
- Additional details: {{ additional_details }}
{% endif %}

INSTRUCTIONS:
- Write a love letter directly from {{ your_name }} to {{ recipient_name }}.
- Match the tone: {{ tone }}.
- Respect the chosen length: {{ length }}.
- Integrate all key points naturally in the letter.
- Use natural, human, mature emotional language.
- Avoid sounding generic or overly poetic unless requested.
- Do not use headers or labels like "Love Letter:" — output only the letter itself.

Now write the love letter.`,

  apology: `You are a specialist at crafting sincere, emotionally aware apology messages.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
- Significant message from lover: {{ significant_message }}
- Desired length: {{ length }}
- Tone: {{ tone }}
- Short description of what happened: {{ short_description }}

INSTRUCTIONS:
- Write an apology text message not in a letter format as if written directly to {{ lover_name }}.
- The message should take responsibility without being self-pitying.
- Validate {{ lover_name }}'s emotions based on their significant message.
- Keep the tone consistent: {{ tone }}.
- Respect the desired length: {{ length }}.
- Avoid manipulation, guilt-tripping, or desperation.
- Do not add labels like "Apology Message:" — output only the message.

Now write the apology text message.`,

  text: `You are an expert at writing natural, conversational voice note scripts.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
- Significant message from lover: {{ significant_message }}
- Desired length: {{ length }}
- Tone: {{ tone }}
- Short description of what happened: {{ short_description }}

INSTRUCTIONS:
- Write a script that sounds like a natural spoken voice note.
- It should feel human, casual, conversational, and emotionally aware.
- Respect the tone: {{ tone }}.
- Respect the length: {{ length }}.
- Include breathing pauses, hesitations, or natural speech rhythms if appropriate.
- Avoid overly formal writing.
- Do not add labels like "Voice Note:" — output only the script.

Now write the voice note script.`,

  giftcard: `You are an expert at writing short, meaningful gift card notes for relationships.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
- Your name: {{ your_name }}
- What happened / what you did wrong: {{ what_happened }}
- Tone: {{ tone }}
{% if short_description %}
- Additional context: {{ short_description }}
{% endif %}

INSTRUCTIONS:
- Write a short, heartfelt gift card message.
- Address {{ lover_name }} directly.
- Match the tone: {{ tone }}.
- Keep it concise but meaningful.
- Include a gentle acknowledgment of what happened, without overexplaining.
- End with your name.
- Do not add labels like "Gift Card:" — output only the message.

Now write the gift card message.`,
};

/** Simple {{ var }} and {% if var %}...{% endif %} renderer (matches frontend promptEngine). */
function renderNjkTemplate(template: string, vars: Record<string, string>): string {
  let out = template;
  out = out.replace(/\{%\s*if\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (_m, name, body) => {
    const v = vars[name];
    return v != null && String(v).trim().length > 0 ? body : "";
  });
  out = out.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, name) => {
    const v = vars[name];
    return v != null ? String(v) : "";
  });
  return out;
}

/** Build template variables from stored input_data (and legacy columns) per message type. */
function buildTemplateVars(
  messageType: string,
  input: Record<string, any>,
  existingMessage: { recipient_name?: string; tone?: string; relationship_length?: string; additional_details?: string | null; character_length?: string; occasion?: string | null }
): Record<string, string> {
  const rel = input.relationshipStatus ?? input.relationship_status ?? existingMessage.relationship_length ?? "";
  const tone = existingMessage.tone ?? input.tone ?? input.poemTone ?? input.apologyTone ?? input.voicenoteTone ?? input.giftCardTone ?? "heartfelt";
  const length = input.characterLength ?? input.length ?? input.apologyLength ?? input.voicenoteLength ?? existingMessage.character_length ?? "medium";

  const base: Record<string, string> = {
    relationship_status: rel,
    tone,
    length,
  };

  switch (messageType) {
    case "poem":
      return {
        ...base,
        lover_name: input.loverName ?? input.name ?? input.recipientName ?? existingMessage.recipient_name ?? "",
        your_name: input.yourName ?? "",
        what_happened: input.whatHappened ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
        short_description: input.shortDescription ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
      };
    case "letter":
      return {
        ...base,
        recipient_name: input.recipientName ?? input.name ?? input.loverName ?? existingMessage.recipient_name ?? "",
        your_name: input.yourName ?? "",
        key_points: input.keyPoints ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
        additional_details: input.additionalDetails ?? existingMessage.additional_details ?? "",
      };
    case "apology":
      return {
        ...base,
        lover_name: input.apologyLoverName ?? input.name ?? input.loverName ?? existingMessage.recipient_name ?? "",
        significant_message: input.significantMessage ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
        short_description: input.apologyDescription ?? input.short_description ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
      };
    case "text":
      return {
        ...base,
        lover_name: input.voicenoteLoverName ?? input.name ?? input.loverName ?? existingMessage.recipient_name ?? "",
        significant_message: input.voicenoteSignificantMessage ?? input.significantMessage ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
        short_description: input.voicenoteDescription ?? input.short_description ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
      };
    case "giftcard":
      return {
        ...base,
        lover_name: input.giftCardLoverName ?? input.name ?? input.loverName ?? existingMessage.recipient_name ?? "",
        your_name: input.giftCardYourName ?? input.yourName ?? "",
        what_happened: input.giftCardWhatHappened ?? input.whatHappened ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
        short_description: input.giftCardDescription ?? input.short_description ?? input.additionalDetails ?? existingMessage.additional_details ?? "",
      };
    default:
      return base;
  }
}

/** Use .njk template when available; otherwise fall back to legacy buildPrompt. */
function buildPromptForRegenerate(messageType: string, input: Record<string, any>, existingMessage: any): string {
  const template = NJK_TEMPLATES[messageType];
  if (template) {
    const vars = buildTemplateVars(messageType, input, existingMessage);
    const rendered = renderNjkTemplate(template, vars as Record<string, string>);
    if (rendered && rendered.trim().length > 0) return rendered.trim();
  }
  const promptData = {
    name: input.recipientName ?? input.name ?? input.loverName ?? existingMessage.recipient_name,
    relationshipLength: input.relationshipLength ?? existingMessage.relationship_length,
    tone: existingMessage.tone ?? input.tone,
    occasion: input.occasion ?? existingMessage.occasion,
    additionalDetails: input.additionalDetails ?? existingMessage.additional_details,
    characterLength: input.characterLength ?? input.length ?? existingMessage.character_length,
  };
  return buildPromptLegacy(messageType, promptData);
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

    // Rebuild prompt using same .njk templates as frontend (apology = text message not letter, etc.)
    const input = existingMessage.input_data || {};
    const prompt = buildPromptForRegenerate(existingMessage.message_type, input, existingMessage);

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
    // IMPORTANT: Column name is 'generated_content' (not 'generated_text')
    // Store previous version in metadata if needed
    const { error: updateError } = await supabaseAdmin
      .from("generated_messages")
      .update({
        generated_content: newMessage, // ✅ Column name: 'generated_content' - Update with regenerated message
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

// Legacy fallback when .njk template is missing or empty
function buildPromptLegacy(messageType: string, promptData: any): string {
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

