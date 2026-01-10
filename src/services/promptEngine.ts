// services/promptEngine.ts
import { FormData } from "../components/MessageForm";

// Template strings (loaded as constants for browser compatibility)
const TEMPLATES: Record<string, string> = {
  poem: `You are an expert relationship writer.  
Your task is to write a deeply meaningful and emotionally honest poem.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
- Your name: {{ your_name }}
- What happened / what you did wrong: {{ what_happened }}
- Desired tone: {{ tone }}
{% if short_description %}
- Additional context: {{ short_description }}
{% endif %}

INSTRUCTIONS:
- Write a poem that feels personal, authentic, and emotionally grounded.
- Avoid clichés unless they genuinely fit the tone.
- Keep the style consistent with {{ tone }}.
- The poem should feel like it is written directly from {{ your_name }} to {{ lover_name }}.
- The poem should be emotionally intelligent, taking accountability without sounding desperate.
- Do not include formatting like "**Poem:**". Output only the poem itself.

Now write the poem.`,

  letter: `You are an expert at writing emotionally intelligent and heartfelt love letters.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Recipient name: {{ recipient_name }}
- Tone: {{ tone }}
- Desired length: {{ length }}
- Key points to include: {{ key_points }}
{% if additional_details %}
- Additional details: {{ additional_details }}
{% endif %}

INSTRUCTIONS:
- Write a love letter directly from the sender to {{ recipient_name }}.
- Match the tone: {{ tone }}.
- Respect the chosen length: {{ length }}.
- Integrate all key points naturally in the letter.
- Use natural, human, mature emotional language.
- Avoid sounding generic or overly poetic unless requested.
- Do not use headers or labels like "Love Letter:" — output only the letter itself.

Now write the love letter.`,

  apology: `You are a specialist at crafting sincere, emotionally aware apology messages.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
- Significant message from lover: {{ significant_message }}
- Desired length: {{ length }}
- Tone: {{ tone }}
- Short description of what happened: {{ short_description }}

INSTRUCTIONS:
- Write an apology message as if written directly to {{ lover_name }}.
- The message should take responsibility without being self-pitying.
- Validate {{ lover_name }}'s emotions based on their significant message.
- Keep the tone consistent: {{ tone }}.
- Respect the desired length: {{ length }}.
- Avoid manipulation, guilt-tripping, or desperation.
- Do not add labels like "Apology Message:" — output only the message.

Now write the apology message.`,

  text: `You are an expert at writing natural, conversational voice note scripts.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
- Significant message from lover: {{ significant_message }}
- Desired length: {{ length }}
- Tone: {{ tone }}
- Short description of what happened: {{ short_description }}

INSTRUCTIONS:
- Write a script that sounds like a natural spoken voice note.
- It should feel human, casual, conversational, and emotionally aware.
- Respect the tone: {{ tone }}.
- Respect the length: {{ length }}.
- Include breathing pauses, hesitations, or natural speech rhythms if appropriate.
- Avoid overly formal writing.
- Do not add labels like "Voice Note:" — output only the script.

Now write the voice note script.`,

  giftcard: `You are an expert at writing short, meaningful gift card notes for relationships.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
- Your name: {{ your_name }}
- What happened / what you did wrong: {{ what_happened }}
- Tone: {{ tone }}
{% if short_description %}
- Additional context: {{ short_description }}
{% endif %}

INSTRUCTIONS:
- Write a short, heartfelt gift card message.
- Address {{ lover_name }} directly.
- Match the tone: {{ tone }}.
- Keep it concise but meaningful.
- Include a gentle acknowledgment of what happened, without overexplaining.
- End with your name.
- Do not add labels like "Gift Card:" — output only the message.

Now write the gift card message.`,

  rekindling: `You are an expert at writing heartfelt messages to rekindle romantic relationships.

RELATIONSHIP CONTEXT:
- Relationship status: {{ relationship_status }}
- Lover's name: {{ lover_name }}
{% if relationship_length %}
- Relationship length: {{ relationship_length }}
{% endif %}
- Tone: {{ tone }}
{% if additional_details %}
- Additional context: {{ additional_details }}
{% endif %}
{% if what_happened %}
- What happened: {{ what_happened }}
{% endif %}

INSTRUCTIONS:
- Write a sincere, hopeful message to rekindle a romantic relationship with {{ lover_name }}.
- This is about getting back together after a breakup or time apart.
- Express genuine feelings and reflection on what went wrong.
- Show personal growth and understanding.
- Convey hope for a fresh start while acknowledging the past.
- Be sincere, vulnerable, and hopeful (not desperate or manipulative).
- Match the tone: {{ tone }}.
- Keep it personal, authentic, and emotionally grounded.
- Do not include formatting like "**Rekindling Message:**". Output only the message itself.

Now write the rekindling message.`,
};

// Template file names mapped to message types (matching actual form messageType values)
const TEMPLATE_MAP: Record<string, string> = {
  poem: "poem",
  letter: "letter",
  apology: "apology",
  text: "text",
  giftcard: "giftcard",
  rekindling: "rekindling",
  birthday: "letter", // Birthday messages use the letter template
  support: "text", // Support messages use the text template
  closure: "letter", // Closure messages use the letter template
};

/**
 * Simple template renderer for browser compatibility
 * Replaces {{ variable }} and handles {% if variable %} blocks
 */
function renderTemplate(template: string, vars: Record<string, any>): string {
  let result = template;

  // Handle {% if variable %} blocks
  result = result.replace(/\{%\s*if\s+(\w+)\s*%\}([\s\S]*?)\{%\s*endif\s*%\}/g, (_match, varName, content) => {
    const value = vars[varName];
    if (value && value.toString().trim().length > 0) {
      return content;
    }
    return "";
  });

  // Replace {{ variable }} placeholders
  result = result.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, varName) => {
    const value = vars[varName];
    return value !== undefined && value !== null ? String(value) : "";
  });

  return result;
}

/**
 * Maps FormData fields to template variables (camelCase to snake_case)
 * and handles different field names for each message type
 */
function mapFormDataToTemplateVars(
  messageType: string,
  formData: FormData
): Record<string, any> {
  const templateVars: Record<string, any> = {
    relationship_status: formData.relationshipStatus || "",
  };

  switch (messageType) {
    case "poem":
      templateVars.lover_name = formData.loverName || "";
      templateVars.your_name = formData.yourName || "";
      templateVars.what_happened = formData.whatHappened || "";
      templateVars.tone = formData.poemTone || "romantic";
      templateVars.short_description = formData.shortDescription || "";
      break;

    case "letter":
      templateVars.recipient_name = formData.recipientName || "";
      templateVars.tone = formData.tone || "warm";
      templateVars.length = formData.length || "medium";
      templateVars.key_points = formData.keyPoints || "";
      templateVars.additional_details = formData.additionalDetails || "";
      break;

    case "apology":
      templateVars.lover_name = formData.apologyLoverName || "";
      templateVars.significant_message = formData.significantMessage || "";
      templateVars.length = formData.apologyLength || "medium";
      templateVars.tone = formData.apologyTone || "sincere";
      templateVars.short_description = formData.apologyDescription || "";
      break;

    case "text":
      templateVars.lover_name = formData.voicenoteLoverName || "";
      templateVars.significant_message = formData.voicenoteSignificantMessage || "";
      templateVars.length = formData.voicenoteLength || "medium";
      templateVars.tone = formData.voicenoteTone || "conversational";
      templateVars.short_description = formData.voicenoteDescription || "";
      break;

    case "giftcard":
      templateVars.lover_name = formData.giftCardLoverName || "";
      templateVars.your_name = formData.giftCardYourName || "";
      templateVars.what_happened = formData.giftCardWhatHappened || "";
      templateVars.tone = formData.giftCardTone || "warm";
      templateVars.short_description = formData.giftCardDescription || "";
      break;

    case "rekindling":
      // Rekindling uses backend form data format (from formMapper)
      templateVars.lover_name = formData.name || formData.loverName || "";
      templateVars.relationship_length = formData.relationshipLength || "";
      templateVars.tone = formData.tone || "heartfelt";
      templateVars.additional_details = formData.additionalDetails || "";
      templateVars.what_happened = formData.whatHappened || "";
      break;

    case "birthday":
      // Birthday messages use letter template structure
      templateVars.recipient_name = formData.name || formData.recipientName || "";
      templateVars.tone = formData.tone || "warm";
      templateVars.length = formData.length || formData.characterLength || "medium";
      templateVars.key_points = "";
      templateVars.additional_details = formData.additionalDetails || "";
      break;

    case "support":
      // Support messages use text template structure
      templateVars.lover_name = formData.name || "";
      templateVars.significant_message = "";
      templateVars.length = formData.length || formData.characterLength || "medium";
      templateVars.tone = formData.tone || "conversational";
      templateVars.short_description = formData.additionalDetails || "";
      break;

    case "closure":
      // Closure messages use letter template structure
      templateVars.recipient_name = formData.name || formData.recipientName || "";
      templateVars.tone = formData.tone || "sincere";
      templateVars.length = formData.length || formData.characterLength || "medium";
      templateVars.key_points = "";
      templateVars.additional_details = formData.additionalDetails || "";
      break;

    default:
      throw new Error(`Unknown message type: ${messageType}. Valid types: poem, letter, apology, text, giftcard, rekindling, birthday, support, closure`);
  }

  return templateVars;
}

/**
 * Renders a prompt template with form data
 * @param messageType - The message type (poem, letter, apology, text, giftcard, rekindling, birthday, support, closure)
 * @param formData - The form data from MessageForm component or backend form data
 * @returns The rendered prompt string ready to send to OpenAI
 * @throws Error if message type is invalid or template rendering fails
 */
export async function renderPromptFromForm(
  messageType: string,
  formData: FormData
): Promise<string> {
  // Validate message type
  const templateKey = TEMPLATE_MAP[messageType];
  if (!templateKey) {
    throw new Error(
      `Unknown message type: ${messageType}. Valid types: ${Object.keys(TEMPLATE_MAP).join(", ")}`
    );
  }

  // Get template
  const template = TEMPLATES[templateKey];
  if (!template) {
    throw new Error(`Template not found for message type: ${messageType}`);
  }

  // Map form data to template variables
  const templateVars = mapFormDataToTemplateVars(messageType, formData);

  // Render the template with user-provided values
  try {
    const renderedPrompt = renderTemplate(template, templateVars);

    if (!renderedPrompt || renderedPrompt.trim().length === 0) {
      throw new Error(
        "Rendered prompt is empty. Check template file and variables."
      );
    }

    return renderedPrompt.trim();
  } catch (err) {
    console.error("Prompt rendering error:", err);
    if (err instanceof Error) {
      throw new Error(`Failed to render prompt template: ${err.message}`);
    }
    throw new Error("Failed to render prompt template.");
  }
}
