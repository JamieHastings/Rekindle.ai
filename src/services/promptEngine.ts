// services/promptEngine.ts
import { FormData } from "../components/MessageForm";

// Load .njk prompt templates at build time (single source of truth)
import poemTemplate from "../../prompt-templates/poem.njk?raw";
import letterTemplate from "../../prompt-templates/love-letter.njk?raw";
import apologyTemplate from "../../prompt-templates/appology-mesaage.njk?raw";
import textTemplate from "../../prompt-templates/voicenote-script.njk?raw";
import giftcardTemplate from "../../prompt-templates/giftcard.njk?raw";

const TEMPLATES: Record<string, string> = {
  poem: poemTemplate,
  letter: letterTemplate,
  apology: apologyTemplate,
  text: textTemplate,
  giftcard: giftcardTemplate,
};

// Template file names mapped to message types (matching actual form messageType values)
const TEMPLATE_MAP: Record<string, string> = {
  poem: "poem",
  letter: "letter",
  apology: "apology",
  text: "text",
  giftcard: "giftcard",
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
      templateVars.your_name = formData.yourName || "";
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

    default:
      throw new Error(`Unknown message type: ${messageType}. Valid types: poem, letter, apology, text, giftcard`);
  }

  return templateVars;
}

/**
 * Renders a prompt template with form data
 * @param messageType - The message type (poem, letter, apology, text, giftcard)
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
