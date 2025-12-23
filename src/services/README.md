# Services Documentation

This directory contains service modules for Rekindle.ai.

## OpenAI Service (`openaiService.ts`)

The OpenAI service provides functions to generate AI text using OpenAI's API.

### Setup

1. Create a `.env.local` file in the project root:
   ```env
   VITE_OPENAI_API_KEY=sk-your-api-key-here
   ```

2. Restart your dev server after adding the key.

### Functions

#### `generateAIText(prompt: string): Promise<string>`

Generates complete AI text (non-streaming). Returns the full response at once.

**Example:**
```typescript
import { generateAIText } from "@/services/openaiService";
import { renderPromptFromForm } from "@/services/promptEngine";
import { FormData } from "@/components/MessageForm";

const formData: FormData = {
  messageType: "poem",
  relationshipStatus: "broken up",
  loverName: "Sarah",
  yourName: "John",
  whatHappened: "I broke her trust",
  poemTone: "sincere",
  shortDescription: "A heartfelt poem",
};

// Step 1: Render the prompt from template
const prompt = await renderPromptFromForm("poem", formData);

// Step 2: Send to OpenAI
const aiMessage = await generateAIText(prompt);

console.log(aiMessage); // The generated message
```

#### `generateAITextStream(prompt: string): AsyncGenerator<string>`

Generates streaming AI text for typewriter UI effects. Yields text chunks as they arrive.

**Example:**
```typescript
import { generateAITextStream } from "@/services/openaiService";
import { renderPromptFromForm } from "@/services/promptEngine";

const prompt = await renderPromptFromForm("poem", formData);
let fullMessage = "";

// Stream chunks and update UI
for await (const chunk of generateAITextStream(prompt)) {
  fullMessage += chunk;
  // Update your UI with the new chunk
  setMessage(fullMessage);
}
```

### Error Handling

The service provides specific error messages for common issues:

- **Missing API Key**: "OpenAI API key is missing. Please add VITE_OPENAI_API_KEY to .env.local"
- **Invalid API Key**: "Invalid OpenAI API key. Please check your .env.local file."
- **Rate Limit**: "OpenAI rate limit exceeded. Please try again later."
- **Insufficient Quota**: "OpenAI account has insufficient quota. Please check your billing."

### Security Notes

⚠️ **Important**: Calling OpenAI directly from the browser exposes your API key in the client bundle.

**For Production:**
- Use Supabase Edge Functions to proxy requests
- Or use Vercel serverless functions
- Never commit `.env.local` to version control

## Prompt Engine (`promptEngine.ts`)

The prompt engine renders Nunjucks templates with form data.

### Usage

```typescript
import { renderPromptFromForm } from "@/services/promptEngine";
import { FormData } from "@/components/MessageForm";

const formData: FormData = {
  messageType: "poem",
  // ... other form fields
};

const renderedPrompt = await renderPromptFromForm("poem", formData);
// Returns the fully rendered prompt string
```

### Supported Message Types

- `poem` → `poem.njk`
- `letter` → `love-letter.njk`
- `apology` → `appology-mesaage.njk`
- `text` → `voicenote-script.njk`
- `giftcard` → `giftcard.njk`

## Complete Integration Example

```typescript
import { renderPromptFromForm } from "@/services/promptEngine";
import { generateAIText } from "@/services/openaiService";
import { FormData } from "@/components/MessageForm";

async function generateMessage(formData: FormData) {
  try {
    // 1. Render prompt from template
    const prompt = await renderPromptFromForm(
      formData.messageType,
      formData
    );

    // 2. Send to OpenAI
    const message = await generateAIText(prompt);

    // 3. Use the message
    return message;
  } catch (error) {
    console.error("Failed to generate message:", error);
    throw error;
  }
}
```

