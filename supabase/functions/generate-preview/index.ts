import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PreviewRequest {
  sessionId: string;
  name: string;
  relationshipLength: string;
  tone: "romantic" | "heartfelt" | "honest" | "apologetic" | "humorous";
  messageType: "poem" | "letter" | "apology" | "text" | "giftcard";
  occasion?: string;
  additionalDetails?: string;
  characterLength: "short" | "medium" | "long";
}

function buildPrompt(data: PreviewRequest): string {
  const lengthGuidance = {
    short: "Keep the message concise and to the point (2-3 short paragraphs).",
    medium: "Write a well-developed message (4-5 paragraphs).",
    long: "Create a detailed, heartfelt message (6-8 paragraphs)."
  };

  const toneGuidance = {
    romantic: "Use tender, loving language that expresses deep affection and desire to reconnect.",
    heartfelt: "Write with genuine emotion and sincerity, speaking from the heart.",
    honest: "Be direct, truthful, and authentic without sugar-coating or exaggeration.",
    apologetic: "Express genuine remorse and accountability for past actions.",
    humorous: "Keep it light and playful while still being sincere and meaningful."
  };

  const messageTypeGuidance = {
    poem: "Write a romantic poem with emotional depth and beautiful imagery.",
    letter: "Craft a heartfelt love letter that expresses deep emotions.",
    apology: "Focus on taking responsibility, expressing remorse, and showing commitment to change.",
    text: "Create a natural voicenote script that sounds conversational and authentic.",
    giftcard: "Write a warm, personal message suitable for a gift card."
  };

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
- Recipient: ${data.name}
- Relationship Length: ${data.relationshipLength}
- Tone: ${data.tone} - ${toneGuidance[data.tone]}
- Message Type: ${data.messageType} - ${messageTypeGuidance[data.messageType]}
${data.occasion ? `- Occasion: ${data.occasion}` : ""}
${data.additionalDetails ? `- Additional Context: ${data.additionalDetails}` : ""}
- Length: ${lengthGuidance[data.characterLength]}

Write a ${data.tone} ${data.messageType} message for ${data.name}. Make it personal, emotional, and natural. Use the context provided above to craft something that feels authentic and heartfelt.`;

  return systemPrompt;
}

function truncateToPreview(fullText: string): string {
  const sentences = fullText.match(/[^.!?]+[.!?]+/g) || [];

  if (sentences.length === 0) {
    return fullText.substring(0, 200) + '...';
  }

  let preview = '';
  let sentenceCount = 0;

  for (const sentence of sentences) {
    const testPreview = preview + sentence;

    if (testPreview.length >= 150 && sentenceCount >= 1) {
      break;
    }

    if (testPreview.length > 300) {
      break;
    }

    preview = testPreview;
    sentenceCount++;

    if (sentenceCount >= 3) {
      break;
    }
  }

  return preview.trim() + '...';
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

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const requestData: PreviewRequest = await req.json();

    if (!requestData.sessionId || !requestData.name || !requestData.relationshipLength ||
        !requestData.tone || !requestData.messageType || !requestData.characterLength) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { count } = await supabase
      .from("preview_messages")
      .select("*", { count: "exact", head: true })
      .eq("session_id", requestData.sessionId)
      .gte("created_at", new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

    if (count && count >= 3) {
      return new Response(
        JSON.stringify({
          error: "Preview limit reached. Sign up to continue generating messages!",
          limit_reached: true
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const prompt = buildPrompt(requestData);

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are Rekindle.ai, an expert at writing authentic, emotional relationship messages. Write naturally as if you are the person sending the message."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to generate message" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiData = await openaiResponse.json();
    const fullContent = openaiData.choices[0]?.message?.content;

    if (!fullContent) {
      return new Response(
        JSON.stringify({ error: "No message generated" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const partialContent = truncateToPreview(fullContent);

    const { data: previewMessage, error: insertError } = await supabase
      .from("preview_messages")
      .insert({
        session_id: requestData.sessionId,
        message_type: requestData.messageType,
        tone: requestData.tone,
        recipient_name: requestData.name,
        relationship_length: requestData.relationshipLength,
        occasion: requestData.occasion || null,
        additional_details: requestData.additionalDetails || null,
        character_length: requestData.characterLength,
        partial_content: partialContent,
        full_content: fullContent,
        form_data: requestData,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Failed to save preview:", insertError);
      return new Response(
        JSON.stringify({ error: "Failed to save preview message" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        previewId: previewMessage.id,
        partialContent: partialContent,
        expiresAt: previewMessage.expires_at,
        remainingPreviews: Math.max(0, 2 - (count || 0))
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-preview function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});