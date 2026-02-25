// Shared OpenAI client for Edge Functions

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");

if (!OPENAI_API_KEY) {
  throw new Error("Missing OPENAI_API_KEY environment variable");
}

export interface OpenAIRequest {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  max_tokens?: number;
}

export async function callOpenAI(request: OpenAIRequest): Promise<string> {
  console.log("📡 Calling OpenAI API with request:", {
    model: request.model,
    messages_count: request.messages?.length || 0,
    max_tokens: request.max_tokens,
  });

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const errorData = await response.text();
    console.error("❌ OpenAI API error:", errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  console.log("📥 OpenAI response received:", {
    has_choices: !!data.choices,
    choices_count: data.choices?.length || 0,
    first_choice: data.choices?.[0] ? {
      has_message: !!data.choices[0].message,
      has_content: !!data.choices[0].message?.content,
      content_length: data.choices[0].message?.content?.length || 0,
    } : null,
  });

  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    console.error("❌ No content in OpenAI response!");
    console.error("   Full response:", JSON.stringify(data, null, 2));
    throw new Error("No content in OpenAI response");
  }

  const trimmedContent = content.trim();
  
  console.log("✅ OpenAI content extracted:", {
    original_length: content.length,
    trimmed_length: trimmedContent.length,
    preview: trimmedContent.substring(0, 100) + "...",
  });

  return trimmedContent;
}

