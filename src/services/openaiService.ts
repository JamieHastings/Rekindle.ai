// src/services/openaiService.ts

import OpenAI from "openai";

// Vite automatically loads .env.local, so VITE_OPENAI_API_KEY will be available
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.error(
    "❌ Missing OpenAI API Key. Add VITE_OPENAI_API_KEY to .env.local file"
  );
}

// Initialize OpenAI client
// Note: In production, consider proxying through Supabase Edge Functions
// to avoid exposing API keys in the browser
// Only initialize if API key exists to prevent errors
const openai = apiKey
  ? new OpenAI({
      apiKey: apiKey,
      dangerouslyAllowBrowser: true, // Required for browser usage
    })
  : null;

/**
 * Generate full text (non-streaming).
 * Use this when you want the entire AI response at once.
 * 
 * @param prompt - The rendered prompt from renderPromptFromForm()
 * @returns The complete AI-generated message
 * @throws Error if API key is missing, request fails, or response is empty
 */
export async function generateAIText(prompt: string): Promise<string> {
  if (!apiKey || !openai) {
    throw new Error(
      "OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to .env.local"
    );
  }

  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  // Log API key info (first 7 chars + last 4 chars for identification, not full key)
  const apiKeyPreview = apiKey ? `${apiKey.substring(0, 7)}...${apiKey.substring(apiKey.length - 4)}` : 'MISSING';
  console.log('🔍 OpenAI Request Debug Info:');
  console.log('  - API Key Preview:', apiKeyPreview);
  console.log('  - API Endpoint: https://api.openai.com/v1/chat/completions');
  console.log('  - Model: gpt-4o-mini');
  console.log('  - Request Source: Browser (direct client-side call)');
  console.log('  - Prompt Length:', prompt.length, 'characters');

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fixed: was "gpt-4.1-mini" (doesn't exist)
      messages: [
        {
          role: "system",
          content:
            "You are a specialist AI writer who helps people repair broken relationships, communicate empathy, rebuild trust and rekindle love. Write naturally as if you are the person sending the message.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 3000,
    });

    console.log('✅ OpenAI Response Received:');
    console.log('  - Response ID:', response.id);
    console.log('  - Model Used:', response.model);
    console.log('  - Tokens Used:', response.usage?.total_tokens || 'unknown');
    console.log('  - Prompt Tokens:', response.usage?.prompt_tokens || 'unknown');
    console.log('  - Completion Tokens:', response.usage?.completion_tokens || 'unknown');
    console.log('');
    console.log('📊 IMPORTANT: Where to find this request in OpenAI Dashboard:');
    console.log('  1. Go to https://platform.openai.com/usage');
    console.log('  2. Search for Response ID:', response.id);
    console.log('  3. Requests appear in the account that owns API key:', apiKeyPreview);
    console.log('  4. If you don\'t see it, check the account that owns this API key');

    const text = response.choices?.[0]?.message?.content;

    if (!text || text.trim().length === 0) {
      throw new Error("OpenAI returned an empty response.");
    }

    const trimmedText = text.trim();
    console.log('  - Generated Message Length:', trimmedText.length, 'characters');
    return trimmedText;
  } catch (err) {
    console.error("❌ OpenAI Error:", err);
    console.error("  - Error Type:", err instanceof Error ? err.constructor.name : typeof err);
    console.error("  - Error Message:", err instanceof Error ? err.message : String(err));
    
    // Provide more specific error messages
    if (err instanceof Error) {
      if (err.message.includes("401") || err.message.includes("Unauthorized")) {
        console.error("  - Issue: Invalid API key. The API key in .env.local may be incorrect or expired.");
        throw new Error("Invalid OpenAI API key. Please check your .env.local file.");
      }
      if (err.message.includes("429") || err.message.includes("rate limit")) {
        console.error("  - Issue: Rate limit exceeded. Too many requests to OpenAI API.");
        throw new Error("OpenAI rate limit exceeded. Please try again later.");
      }
      if (err.message.includes("insufficient_quota")) {
        console.error("  - Issue: Insufficient quota. The OpenAI account associated with this API key has no credits.");
        throw new Error("OpenAI account has insufficient quota. Please check your billing.");
      }
      throw new Error(`Failed to generate AI text: ${err.message}`);
    }
    
    throw new Error("Failed to generate AI text. Please try again.");
  }
}

/**
 * Generate streaming text for typewriter UI.
 * Returns an async generator that yields each chunk of text.
 * 
 * @param prompt - The rendered prompt from renderPromptFromForm()
 * @yields Text chunks as they arrive from OpenAI
 * @throws Error if API key is missing, request fails, or stream fails
 */
export async function* generateAITextStream(prompt: string) {
  if (!apiKey || !openai) {
    throw new Error(
      "OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to .env.local"
    );
  }

  if (!prompt || prompt.trim().length === 0) {
    throw new Error("Prompt cannot be empty");
  }

  try {
    const stream = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Fixed: was "gpt-4.1-mini" (doesn't exist)
      stream: true,
      messages: [
        {
          role: "system",
          content:
            "You are a compassionate relationship repair assistant who writes emotionally intelligent messages designed to fix broken love and rekindle trust. Write naturally as if you are the person sending the message.",
        },
        { role: "user", content: prompt },
      ],
      temperature: 0.85,
      max_tokens: 3000,
    });

    for await (const chunk of stream) {
      const text = chunk.choices[0]?.delta?.content;
      if (text) {
        yield text;
      }
    }
  } catch (err) {
    console.error("OpenAI Stream Error:", err);
    
    // Provide more specific error messages
    if (err instanceof Error) {
      if (err.message.includes("401") || err.message.includes("Unauthorized")) {
        throw new Error("Invalid OpenAI API key. Please check your .env.local file.");
      }
      if (err.message.includes("429") || err.message.includes("rate limit")) {
        throw new Error("OpenAI rate limit exceeded. Please try again later.");
      }
      if (err.message.includes("insufficient_quota")) {
        throw new Error("OpenAI account has insufficient quota. Please check your billing.");
      }
      throw new Error(`Failed to stream AI text: ${err.message}`);
    }
    
    throw new Error("Failed to stream AI text. Please try again.");
  }
}
