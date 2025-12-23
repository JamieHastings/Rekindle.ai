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
    console.error("OpenAI API error:", errorData);
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("No content in OpenAI response");
  }

  return content.trim();
}

