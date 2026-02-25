// src/services/messageGenerator.ts
// Client-side message generation using OpenAI (replaces Edge Function)

import { renderPromptFromForm } from './promptEngine';
import { generateAIText } from './openaiService';
import type { FormData } from '../components/MessageForm';

/**
 * Generate a message using OpenAI from form data.
 * @param messageType - poem, letter, apology, text, giftcard
 * @param promptData - Form data (promptData from App.tsx)
 * @returns Generated message text
 */
export async function generateMessage(
  messageType: string,
  promptData: FormData | Record<string, unknown>
): Promise<string> {
  const prompt = await renderPromptFromForm(messageType, promptData as FormData);
  return generateAIText(prompt);
}
