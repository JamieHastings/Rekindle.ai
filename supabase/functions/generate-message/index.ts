import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MessageRequest {
  name: string;
  relationshipLength: string;
  tone: "romantic" | "heartfelt" | "honest" | "apologetic" | "humorous";
  messageType: "apology" | "rekindling" | "birthday" | "support" | "closure";
  occasion?: string;
  additionalDetails?: string;
  characterLength: "short" | "medium" | "long";
}

function buildPrompt(data: MessageRequest): string {
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
    apology: "This is an apology message. Focus on taking responsibility, expressing remorse, and showing commitment to change.",
    rekindling: "This is about rekindling a relationship. Focus on positive memories, what was special, and hope for reconnection.",
    birthday: "This is a birthday message. Focus on celebrating them, expressing appreciation, and making them feel special.",
    support: "This is a supportive message. Focus on being there for them, offering comfort, and showing you care.",
    closure: "This is about finding closure. Focus on acceptance, gratitude for shared experiences, and moving forward with peace."
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

    // Get the authorization header
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

    // Initialize Supabase client
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
    if (!requestData.name || !requestData.relationshipLength || !requestData.tone || !requestData.messageType || !requestData.characterLength) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check user's token balance
    const { data: profile, error: profileError } = await supabase
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

    const TOKEN_COST = 2;
    if (profile.tokens < TOKEN_COST) {
      return new Response(
        JSON.stringify({ error: "Insufficient tokens" }),
        {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Build the prompt
    const prompt = buildPrompt(requestData);

    // Call OpenAI API
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
    const generatedMessage = openaiData.choices[0]?.message?.content;

    if (!generatedMessage) {
      return new Response(
        JSON.stringify({ error: "No message generated" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Deduct tokens
    const { error: deductError } = await supabase
      .from("profiles")
      .update({ tokens: profile.tokens - TOKEN_COST })
      .eq("id", user.id);

    if (deductError) {
      console.error("Failed to deduct tokens:", deductError);
    }

    // Record token transaction
    const { error: transactionError } = await supabase
      .from("token_transactions")
      .insert({
        user_id: user.id,
        transaction_type: "usage",
        amount: -TOKEN_COST,
        description: `Generated ${requestData.messageType} message`,
        metadata: {
          message_type: requestData.messageType,
          tone: requestData.tone,
        },
      });

    if (transactionError) {
      console.error("Failed to record transaction:", transactionError);
    }

    // Save generated message to database
    const { error: saveError } = await supabase
      .from("generated_messages")
      .insert({
        user_id: user.id,
        message_type: requestData.messageType,
        tone: requestData.tone,
        recipient_name: requestData.name,
        relationship_length: requestData.relationshipLength,
        occasion: requestData.occasion || null,
        additional_details: requestData.additionalDetails || null,
        character_length: requestData.characterLength,
        generated_content: generatedMessage,
      });

    if (saveError) {
      console.error("Failed to save message:", saveError);
    }

    return new Response(
      JSON.stringify({ 
        message: generatedMessage,
        tokensRemaining: profile.tokens - TOKEN_COST
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-message function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});