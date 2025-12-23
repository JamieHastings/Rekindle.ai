// Test script for OpenAI service integration with prompt engine
// Run with: npx tsx scripts/test-openai-integration.ts
// 
// Prerequisites:
// 1. Create .env.local in project root with: VITE_OPENAI_API_KEY=sk-...
// 2. Install tsx if not already: npm install -g tsx

import { renderPromptFromForm } from "../src/services/promptEngine";
import { generateAIText } from "../src/services/openaiService";
import { FormData } from "../src/components/MessageForm";

async function testOpenAIIntegration() {
  console.log("🧪 Testing OpenAI Integration with Prompt Engine\n");

  // Test data matching FormData structure
  const testFormData: FormData = {
    messageType: "poem",
    relationshipStatus: "broken up",
    loverName: "Sarah",
    yourName: "John",
    whatHappened: "I broke her trust by lying about something important",
    poemTone: "sincere",
    shortDescription: "A heartfelt poem to express my deep regret",
  };

  try {
    // Step 1: Render prompt from template
    console.log("📝 Step 1: Rendering prompt from template...");
    const prompt = await renderPromptFromForm("poem", testFormData);
    console.log("✅ Prompt rendered successfully!");
    console.log("\n--- Rendered Prompt (first 200 chars) ---");
    console.log(prompt.substring(0, 200) + "...\n");

    // Step 2: Send to OpenAI
    console.log("🤖 Step 2: Sending prompt to OpenAI...");
    const aiResponse = await generateAIText(prompt);
    console.log("✅ OpenAI response received!");
    console.log("\n--- AI Generated Message ---");
    console.log(aiResponse);
    console.log("\n--- End of Message ---");

    // Step 3: Verify response
    if (aiResponse && aiResponse.trim().length > 0) {
      console.log("\n✅ SUCCESS: Integration test passed!");
      console.log(`📊 Response length: ${aiResponse.length} characters`);
    } else {
      console.error("\n❌ FAILED: OpenAI returned empty response");
      process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ FAILED: Integration test failed");
    if (error instanceof Error) {
      console.error(`Error: ${error.message}`);
      console.error("\n💡 Troubleshooting:");
      if (error.message.includes("API key")) {
        console.error("   - Check that VITE_OPENAI_API_KEY is set in .env.local");
        console.error("   - Restart your dev server after adding the key");
      } else if (error.message.includes("rate limit")) {
        console.error("   - You've hit OpenAI's rate limit. Wait a moment and try again.");
      } else if (error.message.includes("quota")) {
        console.error("   - Check your OpenAI account billing and quota");
      }
    }
    process.exit(1);
  }
}

// Run the test
testOpenAIIntegration();

