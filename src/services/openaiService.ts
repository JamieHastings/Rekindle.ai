import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export async function generateAIText(prompt: string): Promise<string> {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  const { data, error } = await supabase.functions.invoke("generate-message", {
    body: { prompt },
  });

  if (error) throw new Error(error.message);

  const text =
    data && typeof data === "object" && "text" in data
      ? (data as { text?: string }).text
      : undefined;

  if (!text || typeof text !== "string" || text.trim().length === 0) {
    throw new Error("No text returned from generate-message");
  }

  return text.trim();
}
