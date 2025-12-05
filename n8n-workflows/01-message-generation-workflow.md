# n8n Workflow: Message Generation with OpenAI

## Overview
This workflow handles AI message generation requests from the Rekindle.ai frontend, validates user authentication, checks token balance, calls OpenAI API, and stores the generated message.

## Workflow Name
`rekindle-message-generation`

## Trigger
**Webhook Node** - POST endpoint
- URL Path: `/webhook/generate-message`
- Authentication: Header Auth
- Header Name: `X-Webhook-Secret`
- Expected Value: Your secure webhook secret (from .env)
- Response Mode: Wait for workflow to complete

---

## Nodes Configuration

### 1. Webhook Trigger
**Node Type:** Webhook
- **HTTP Method:** POST
- **Path:** `generate-message`
- **Authentication:** Header Auth
- **Response Code:** 200

**Expected Request Body:**
```json
{
  "name": "Sarah",
  "relationshipLength": "2 years",
  "tone": "romantic",
  "messageType": "rekindling",
  "occasion": "Anniversary",
  "additionalDetails": "We used to love watching sunsets together",
  "characterLength": "medium",
  "userId": "user-uuid-from-supabase",
  "accessToken": "supabase-jwt-token"
}
```

---

### 2. Validate Authentication
**Node Type:** Function
**Purpose:** Verify Supabase JWT token

**JavaScript Code:**
```javascript
// Extract data from webhook
const userId = $json.userId;
const accessToken = $json.accessToken;

if (!userId || !accessToken) {
  throw new Error('Missing authentication credentials');
}

// Pass data forward
return {
  ...items[0].json,
  validated: true
};
```

---

### 3. Check Token Balance
**Node Type:** Supabase
**Operation:** Select rows
- **Table:** profiles
- **Filter:** `id = {{$json.userId}}`
- **Fields:** tokens

**Conditional Logic:**
- If `tokens < 2` → Route to "Insufficient Tokens" node
- If `tokens >= 2` → Continue to OpenAI node

---

### 4. Insufficient Tokens Response
**Node Type:** Respond to Webhook
- **Status Code:** 402
- **Response Body:**
```json
{
  "error": "Insufficient tokens",
  "tokensRequired": 2,
  "tokensAvailable": "{{$json.tokens}}"
}
```

---

### 5. Build OpenAI Prompt
**Node Type:** Function
**Purpose:** Construct the prompt for OpenAI

**JavaScript Code:**
```javascript
const data = $json;

const lengthGuidance = {
  short: "Keep the message concise and to the point (2-3 short paragraphs).",
  medium: "Write a well-developed message (4-5 paragraphs).",
  long: "Create a detailed, heartfelt message (6-8 paragraphs)."
};

const toneGuidance = {
  romantic: "Use tender, loving language that expresses deep affection and desire to reconnect.",
  heartfelt: "Write with genuine emotion and sincerity, speaking from the heart.",
  honest: "Be direct, truthful, and authentic without sugar-coating or exaggeration.",
  apologetic: "Express genuine remorse and accountability for past actions.",
  humorous: "Keep it light and playful while still being sincere and meaningful."
};

const messageTypeGuidance = {
  poem: "Write a romantic poem with emotional depth and beautiful imagery.",
  letter: "Craft a heartfelt love letter that expresses deep emotions.",
  apology: "Focus on taking responsibility, expressing remorse, and showing commitment to change.",
  text: "Create a natural voicenote script that sounds conversational and authentic.",
  giftcard: "Write a warm, personal message suitable for a gift card."
};

const systemPrompt = `You are Rekindle.ai — an expert emotional communication assistant specializing in relationship messages.

RULES:
1. Sound natural and human - write as if you're the person sending this message.
2. NO clichés or generic phrases - every message should feel unique and personal.
3. NO manipulative tone - be genuine, honest, and respectful.
4. Use specific details from the user's input to make it personal.
5. Return ONLY the message itself - no introductions, explanations, or meta-commentary.
6. Do NOT use placeholder text like [Name] or [Occasion] - write as if speaking directly.
7. Write in first person, as the sender of the message.
8. Make it feel authentic, not like it was written by AI.

Message Context:
- Recipient: ${data.name}
- Relationship Length: ${data.relationshipLength}
- Tone: ${data.tone} - ${toneGuidance[data.tone]}
- Message Type: ${data.messageType} - ${messageTypeGuidance[data.messageType]}
${data.occasion ? `- Occasion: ${data.occasion}` : ""}
${data.additionalDetails ? `- Additional Context: ${data.additionalDetails}` : ""}
- Length: ${lengthGuidance[data.characterLength]}

Write a ${data.tone} ${data.messageType} message for ${data.name}. Make it personal, emotional, and natural. Use the context provided above to craft something that feels authentic and heartfelt.`;

return {
  ...items[0].json,
  openaiPrompt: systemPrompt
};
```

---

### 6. Call OpenAI API
**Node Type:** HTTP Request
- **Method:** POST
- **URL:** `https://api.openai.com/v1/chat/completions`
- **Authentication:** Header Auth
  - Header Name: `Authorization`
  - Value: `Bearer YOUR_OPENAI_API_KEY`
- **Headers:**
  - `Content-Type: application/json`

**Request Body:**
```json
{
  "model": "gpt-4o-mini",
  "messages": [
    {
      "role": "system",
      "content": "You are Rekindle.ai, an expert at writing authentic, emotional relationship messages. Write naturally as if you are the person sending the message."
    },
    {
      "role": "user",
      "content": "{{$json.openaiPrompt}}"
    }
  ],
  "temperature": 0.8,
  "max_tokens": 1000
}
```

---

### 7. Extract Generated Message
**Node Type:** Function

**JavaScript Code:**
```javascript
const openaiResponse = $json;
const generatedMessage = openaiResponse.choices[0]?.message?.content;

if (!generatedMessage) {
  throw new Error('No message generated from OpenAI');
}

return {
  ...items[0].json,
  generatedMessage: generatedMessage
};
```

---

### 8. Deduct Tokens
**Node Type:** Supabase
**Operation:** Update row
- **Table:** profiles
- **Filter:** `id = {{$json.userId}}`
- **Update Fields:**
  - `tokens = tokens - 2`

---

### 9. Record Transaction
**Node Type:** Supabase
**Operation:** Insert row
- **Table:** token_transactions
- **Fields:**
  - `user_id`: `{{$json.userId}}`
  - `transaction_type`: `usage`
  - `amount`: `-2`
  - `description`: `Generated {{$json.messageType}} message`
  - `metadata`:
  ```json
  {
    "message_type": "{{$json.messageType}}",
    "tone": "{{$json.tone}}"
  }
  ```

---

### 10. Save Generated Message
**Node Type:** Supabase
**Operation:** Insert row
- **Table:** generated_messages
- **Fields:**
  - `user_id`: `{{$json.userId}}`
  - `message_type`: `{{$json.messageType}}`
  - `tone`: `{{$json.tone}}`
  - `recipient_name`: `{{$json.name}}`
  - `relationship_length`: `{{$json.relationshipLength}}`
  - `occasion`: `{{$json.occasion}}`
  - `additional_details`: `{{$json.additionalDetails}}`
  - `character_length`: `{{$json.characterLength}}`
  - `generated_content`: `{{$json.generatedMessage}}`

---

### 11. Log Webhook Execution
**Node Type:** Supabase
**Operation:** Insert row
- **Table:** n8n_webhook_logs
- **Fields:**
  - `workflow_name`: `rekindle-message-generation`
  - `execution_id`: `{{$execution.id}}`
  - `status`: `success`
  - `request_payload`: `{{$json}}`
  - `response_payload`:
  ```json
  {
    "message": "{{$json.generatedMessage}}",
    "tokensRemaining": "{{$json.tokens - 2}}"
  }
  ```
  - `execution_time_ms`: `{{$execution.duration}}`

---

### 12. Success Response
**Node Type:** Respond to Webhook
- **Status Code:** 200
- **Response Body:**
```json
{
  "message": "{{$json.generatedMessage}}",
  "tokensRemaining": "{{$json.tokens - 2}}"
}
```

---

### 13. Error Handler (On Error)
**Node Type:** Error Trigger
**Connected to:** All nodes

**Error Response Node:**
**Node Type:** Respond to Webhook
- **Status Code:** 500
- **Response Body:**
```json
{
  "error": "Failed to generate message",
  "details": "{{$json.error}}"
}
```

**Log Error Node:**
**Node Type:** Supabase
**Operation:** Insert row
- **Table:** n8n_webhook_logs
- **Fields:**
  - `workflow_name`: `rekindle-message-generation`
  - `execution_id`: `{{$execution.id}}`
  - `status`: `error`
  - `error_message`: `{{$json.error}}`

---

## Environment Variables Required in n8n

1. `SUPABASE_URL` - Your Supabase project URL
2. `SUPABASE_SERVICE_KEY` - Supabase service role key (for admin operations)
3. `OPENAI_API_KEY` - Your OpenAI API key
4. `WEBHOOK_SECRET` - Secure secret for webhook authentication

---

## Testing

### Test Request (cURL):
```bash
curl -X POST https://your-n8n-instance.com/webhook/generate-message \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-webhook-secret" \
  -d '{
    "name": "Sarah",
    "relationshipLength": "2 years",
    "tone": "romantic",
    "messageType": "rekindling",
    "occasion": "Anniversary",
    "additionalDetails": "We used to love watching sunsets together",
    "characterLength": "medium",
    "userId": "your-test-user-uuid",
    "accessToken": "your-supabase-jwt-token"
  }'
```

### Expected Success Response:
```json
{
  "message": "The AI-generated message content...",
  "tokensRemaining": 3
}
```

---

## Monitoring & Alerts

1. Set up n8n workflow error notifications via email or Slack
2. Monitor `n8n_webhook_logs` table for failed executions
3. Track OpenAI API costs and usage
4. Alert when error rate exceeds 5%
5. Monitor average execution time (should be < 10 seconds)
