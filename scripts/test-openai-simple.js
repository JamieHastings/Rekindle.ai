// Simple test script for OpenAI service (Node.js compatible)
// Run with: node scripts/test-openai-simple.js
// 
// Note: This requires the API key to be set as an environment variable
// since Node.js doesn't automatically load .env.local like Vite does
// 
// Usage: VITE_OPENAI_API_KEY=sk-... node scripts/test-openai-simple.js

import OpenAI from "openai";

const apiKey = process.env.VITE_OPENAI_API_KEY;

if (!apiKey) {
  console.error("❌ Missing VITE_OPENAI_API_KEY environment variable");
  console.error("   Usage: VITE_OPENAI_API_KEY=sk-... node scripts/test-openai-simple.js");
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: apiKey,
});

async function testOpenAI() {
  console.log("🧪 Testing OpenAI API Connection\n");

  const testPrompt = `You are an expert relationship writer.  
Your task is to write a deeply meaningful and emotionally honest poem.

RELATIONSHIP CONTEXT:
- Relationship status: broken up
- Lover's name: Sarah
- Your name: John
- What happened / what you did wrong: I broke her trust
- Desired tone: sincere

INSTRUCTIONS:
- Write a poem that feels personal, authentic, and emotionally grounded.
- The poem should feel like it is written directly from John to Sarah.
- Do not include formatting like "**Poem:**". Output only the poem itself.

Now write the poem.`;

  try {
    console.log("🤖 Sending test request to OpenAI...\n");
    
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a specialist AI writer who helps people repair broken relationships, communicate empathy, rebuild trust and rekindle love.",
        },
        { role: "user", content: testPrompt },
      ],
      temperature: 0.85,
      max_tokens: 3000,
    });

    const text = response.choices?.[0]?.message?.content;

    if (!text || text.trim().length === 0) {
      console.error("❌ OpenAI returned an empty response");
      process.exit(1);
    }

    console.log("✅ SUCCESS: OpenAI API is working!");
    console.log(`📊 Response length: ${text.length} characters\n`);
    console.log("--- AI Generated Message ---");
    console.log(text);
    console.log("\n--- End of Message ---");
  } catch (error) {
    console.error("\n❌ FAILED: OpenAI API test failed");
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      
      if (error.message.includes("401") || error.message.includes("Unauthorized")) {
        console.error("\n💡 Invalid API key. Please check your VITE_OPENAI_API_KEY.");
      } else if (error.message.includes("429") || error.message.includes("rate limit")) {
        console.error("\n💡 Rate limit exceeded. Please wait and try again.");
      } else if (error.message.includes("insufficient_quota")) {
        console.error("\n💡 Insufficient quota. Please check your OpenAI billing.");
      }
    }
    process.exit(1);
  }
}

testOpenAI();

