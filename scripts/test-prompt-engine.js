// Test script for promptEngine.ts
// Run with: node scripts/test-prompt-engine.js

import nunjucks from "nunjucks";
import { readFileSync } from "fs";
import { join } from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, "..");

// Configure nunjucks
nunjucks.configure(join(projectRoot, "prompt-templates"), {
  autoescape: false,
});

// Test data matching FormData structure
const testFormData = {
  relationshipStatus: "broken up",
  loverName: "Sarah",
  yourName: "John",
  whatHappened: "I broke her trust by lying",
  poemTone: "sincere",
  shortDescription: "A heartfelt poem to express my regret",
};

// Test poem template
console.log("Testing Poem Template...\n");
try {
  const templateVars = {
    relationship_status: testFormData.relationshipStatus,
    lover_name: testFormData.loverName,
    your_name: testFormData.yourName,
    what_happened: testFormData.whatHappened,
    tone: testFormData.poemTone,
    short_description: testFormData.shortDescription,
  };

  const rendered = nunjucks.render("poem.njk", templateVars);
  console.log("✅ Poem template rendered successfully!");
  console.log("\n--- Rendered Prompt ---");
  console.log(rendered);
  console.log("\n--- End of Prompt ---\n");
} catch (error) {
  console.error("❌ Error rendering poem template:", error.message);
}

// Test love letter template
console.log("Testing Love Letter Template...\n");
try {
  const letterData = {
    relationship_status: "unsure",
    recipient_name: "Sarah",
    tone: "heartfelt",
    length: "medium",
    key_points: "Thank them for always being there",
    additional_details: "We've been through a lot together",
  };

  const rendered = nunjucks.render("love-letter.njk", letterData);
  console.log("✅ Love letter template rendered successfully!");
  console.log("\n--- Rendered Prompt ---");
  console.log(rendered);
  console.log("\n--- End of Prompt ---\n");
} catch (error) {
  console.error("❌ Error rendering love letter template:", error.message);
}

console.log("✅ All tests completed!");

