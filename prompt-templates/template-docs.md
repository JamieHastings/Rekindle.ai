Rekindle.ai – Prompt Template Documentation

This folder contains all Nunjucks/Jinja-style prompt templates used to generate relationship-based content through OpenAI. Each template is dynamically filled with user input from message-type forms and rendered into a structured prompt before being sent to OpenAI.

This document explains:

Template structure

Variable naming rules

Expected output behavior

How templates are loaded and rendered

How developers (and AI tools like Cursor/Bolt.ai) should work with them

📁 Folder Structure
/prompt-templates
   poem.njk
   love-letter.njk
   apology.njk
   voicenote-script.njk
   gift-card.njk
   template-docs.md   ← (this file)

⚙️ How Templates Are Rendered

Rekindle.ai uses Nunjucks to render templates before sending them to OpenAI.

renderer.ts

import nunjucks from "nunjucks";

// Load templates from /prompt-templates
nunjucks.configure("prompt-templates", { autoescape: false });

export function renderPrompt(templateName: string, data: any) {
  return nunjucks.render(`${templateName}.njk`, data);
}


Usage example:

const filledPrompt = renderPrompt("poem", formValues);
const aiResponse = await openai.chat.completions.create({ prompt: filledPrompt });

🧩 General Template Rules

All templates MUST:

✔ Output ONLY the generated message

No explanation, no meta text, no disclaimers.

✔ Follow the tone and length requested
✔ Use emotionally intelligent human language

Empathy, accountability, vulnerability — not robotic AI style.

✔ Support “rekindling” context

Templates prioritize:

repairing relationships

apologizing meaningfully

expressing vulnerability

rebuilding trust

rekindling romance or affection

✔ Never reference AI or templates inside the output

No lines like “Here is your poem” or “This AI-generated content…”

🔧 Template Variables (Important)

Each .njk file receives form data.
Variables MUST match your frontend forms exactly so rendering never breaks.

✒️ 1. Poem Template Variables
relationship_status
lover_name
your_name
what_happened
tone
short_description

❤️ 2. Love Letter Variables
relationship_status
recipient_name
tone
length
key_points
additional_details

🙏 3. Apology Message Variables
relationship_status
lover_name
significant_message
length
tone
short_description

🎤 4. Voicenote Script Variables
relationship_status
lover_name
significant_message
length
tone
short_description

🎁 5. Gift Card Message Variables
relationship_status
lover_name
your_name
what_happened
tone
short_description

🧱 Template Output Requirements

All templates should follow these rules:

📌 1. No headers, labeling, or “AI-speaker” intros

Good:

I miss the warmth in your eyes…


Bad:

Here is your poem:
AI poem:
Dear [name]:

📌 2. Produce meaningful, emotionally grounded content

Avoid generic clichés.

📌 3. Match tone exactly

Examples:

“romantic”

“apologetic”

“heartfelt”

“hopeful”

“casual”

“deeply emotional”

📌 4. Respect length

Short → 2–3 sentences

Medium → 1–2 paragraphs

Long → multiple paragraphs

📌 5. Include rekindle/rebuilding-love framing

Focus templates on repairing or strengthening relationships.

➕ Adding New Templates

Whenever creating a new message type:

Create a <name>.njk file inside /prompt-templates

Add new variables to this documentation

Update the frontend form schema

Update backend API mapping

Ensure the template uses rekindle-style emotional language

👥 For AI Tools (Cursor, Bolt.ai, Claude, ChatGPT)

When modifying or generating new templates:

Maintain all variable names

Never add new variables without updating this file

Follow the emotional tone system

Keep templates compatible with Nunjucks

Don’t change folder structure