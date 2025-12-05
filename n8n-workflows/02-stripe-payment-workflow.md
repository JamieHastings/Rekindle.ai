# n8n Workflow: Stripe Payment Processing

## Overview
This workflow handles token purchases through Stripe, creates checkout sessions, processes webhook events from Stripe, updates user token balances, and triggers receipt emails.

---

## Workflow 1: Create Stripe Checkout Session

### Workflow Name
`rekindle-stripe-checkout`

### Trigger
**Webhook Node** - POST endpoint
- URL Path: `/webhook/create-checkout`
- Authentication: Header Auth
- Response Mode: Wait for workflow to complete

---

### Nodes Configuration

#### 1. Webhook Trigger
**Node Type:** Webhook
- **HTTP Method:** POST
- **Path:** `create-checkout`
- **Authentication:** Header Auth

**Expected Request Body:**
```json
{
  "userId": "user-uuid",
  "accessToken": "supabase-jwt-token",
  "tokenPackage": "popular",
  "packageDetails": {
    "tokens": 15,
    "price": 2500,
    "label": "Popular"
  }
}
```

---

#### 2. Validate User
**Node Type:** Supabase
**Operation:** Select rows
- **Table:** profiles
- **Filter:** `id = {{$json.userId}}`
- **Fields:** id, email, full_name

---

#### 3. Create Stripe Checkout Session
**Node Type:** HTTP Request
- **Method:** POST
- **URL:** `https://api.stripe.com/v1/checkout/sessions`
- **Authentication:** Header Auth
  - Header: `Authorization: Bearer YOUR_STRIPE_SECRET_KEY`
- **Headers:**
  - `Content-Type: application/x-www-form-urlencoded`

**Request Body (form-urlencoded):**
```
mode=payment
success_url=https://your-app.com/payment/success?session_id={CHECKOUT_SESSION_ID}
cancel_url=https://your-app.com/payment/cancelled
customer_email={{$json.email}}
line_items[0][price_data][currency]=usd
line_items[0][price_data][product_data][name]=Rekindle.ai Tokens - {{$json.packageDetails.label}}
line_items[0][price_data][product_data][description]={{$json.packageDetails.tokens}} tokens for generating AI messages
line_items[0][price_data][unit_amount]={{$json.packageDetails.price}}
line_items[0][quantity]=1
metadata[user_id]={{$json.userId}}
metadata[token_count]={{$json.packageDetails.tokens}}
metadata[package_name]={{$json.tokenPackage}}
```

---

#### 4. Create Payment Record
**Node Type:** Supabase
**Operation:** Insert row
- **Table:** stripe_payments
- **Fields:**
  - `user_id`: `{{$json.userId}}`
  - `stripe_checkout_session_id`: `{{$json.id}}`
  - `amount_cents`: `{{$json.packageDetails.price}}`
  - `currency`: `usd`
  - `token_count`: `{{$json.packageDetails.tokens}}`
  - `status`: `pending`
  - `metadata`:
  ```json
  {
    "package_name": "{{$json.tokenPackage}}",
    "package_label": "{{$json.packageDetails.label}}"
  }
  ```

---

#### 5. Success Response
**Node Type:** Respond to Webhook
- **Status Code:** 200
- **Response Body:**
```json
{
  "checkoutUrl": "{{$json.url}}",
  "sessionId": "{{$json.id}}"
}
```

---

## Workflow 2: Handle Stripe Webhook Events

### Workflow Name
`rekindle-stripe-webhook-handler`

### Trigger
**Webhook Node** - POST endpoint
- URL Path: `/webhook/stripe-events`
- Authentication: None (Stripe signature verification)
- Response Mode: Immediately

**Note:** Configure this URL in your Stripe Dashboard under Webhooks

---

### Nodes Configuration

#### 1. Stripe Webhook Trigger
**Node Type:** Webhook
- **HTTP Method:** POST
- **Path:** `stripe-events`
- **Raw Body:** Enabled (required for signature verification)

---

#### 2. Verify Stripe Signature
**Node Type:** Function
**Purpose:** Verify webhook authenticity

**JavaScript Code:**
```javascript
const crypto = require('crypto');

const signature = $node["Webhook"].json.headers['stripe-signature'];
const payload = $node["Webhook"].binary.data;
const secret = 'YOUR_STRIPE_WEBHOOK_SECRET';

// Parse signature
const elements = signature.split(',');
const timestamp = elements.find(e => e.startsWith('t=')).split('=')[1];
const signatures = elements.filter(e => e.startsWith('v1='));

// Create expected signature
const signedPayload = `${timestamp}.${payload}`;
const expectedSignature = crypto
  .createHmac('sha256', secret)
  .update(signedPayload)
  .digest('hex');

// Verify signature
const isValid = signatures.some(s => {
  const sig = s.split('=')[1];
  return crypto.timingSafeEqual(
    Buffer.from(sig),
    Buffer.from(expectedSignature)
  );
});

if (!isValid) {
  throw new Error('Invalid Stripe signature');
}

return items[0].json;
```

---

#### 3. Switch by Event Type
**Node Type:** Switch
**Rules:**
- Route 1: `{{$json.type}} = checkout.session.completed`
- Route 2: `{{$json.type}} = payment_intent.succeeded`
- Route 3: `{{$json.type}} = payment_intent.payment_failed`

---

#### 4A. Handle Checkout Completed
**Node Type:** Function
**Purpose:** Extract session data

**JavaScript Code:**
```javascript
const session = $json.data.object;
const userId = session.metadata.user_id;
const tokenCount = parseInt(session.metadata.token_count);
const paymentIntentId = session.payment_intent;

return {
  userId,
  tokenCount,
  paymentIntentId,
  sessionId: session.id,
  amountCents: session.amount_total,
  customerEmail: session.customer_email
};
```

---

#### 4B. Update User Tokens
**Node Type:** Supabase
**Operation:** Execute SQL
- **SQL Query:**
```sql
UPDATE profiles
SET tokens = tokens + {{$json.tokenCount}}
WHERE id = '{{$json.userId}}'
RETURNING *;
```

---

#### 4C. Update Payment Record
**Node Type:** Supabase
**Operation:** Update row
- **Table:** stripe_payments
- **Filter:** `stripe_checkout_session_id = {{$json.sessionId}}`
- **Update Fields:**
  - `status`: `succeeded`
  - `stripe_payment_intent_id`: `{{$json.paymentIntentId}}`
  - `completed_at`: `{{$now}}`

---

#### 4D. Create Transaction Record
**Node Type:** Supabase
**Operation:** Insert row
- **Table:** token_transactions
- **Fields:**
  - `user_id`: `{{$json.userId}}`
  - `transaction_type`: `purchase`
  - `amount`: `{{$json.tokenCount}}`
  - `description`: `Purchased {{$json.tokenCount}} tokens via Stripe`
  - `metadata`:
  ```json
  {
    "stripe_session_id": "{{$json.sessionId}}",
    "stripe_payment_intent_id": "{{$json.paymentIntentId}}",
    "amount_cents": "{{$json.amountCents}}"
  }
  ```

---

#### 4E. Trigger Receipt Email
**Node Type:** HTTP Request
- **Method:** POST
- **URL:** `https://your-n8n-instance.com/webhook/send-email`
- **Body:**
```json
{
  "emailType": "receipt",
  "userId": "{{$json.userId}}",
  "recipientEmail": "{{$json.customerEmail}}",
  "data": {
    "tokenCount": "{{$json.tokenCount}}",
    "amountCents": "{{$json.amountCents}}",
    "transactionId": "{{$json.paymentIntentId}}"
  }
}
```

---

#### 5A. Handle Payment Failed
**Node Type:** Supabase
**Operation:** Update row
- **Table:** stripe_payments
- **Filter:** `stripe_payment_intent_id = {{$json.data.object.id}}`
- **Update Fields:**
  - `status`: `failed`
  - `metadata`: Add error details

---

#### 6. Log Webhook Event
**Node Type:** Supabase
**Operation:** Insert row
- **Table:** n8n_webhook_logs
- **Fields:**
  - `workflow_name`: `rekindle-stripe-webhook-handler`
  - `execution_id`: `{{$execution.id}}`
  - `status`: `success`
  - `request_payload`: `{{$json}}`

---

#### 7. Acknowledge Webhook
**Node Type:** Respond to Webhook
- **Status Code:** 200
- **Response Body:**
```json
{
  "received": true
}
```

---

## Environment Variables Required

1. `STRIPE_SECRET_KEY` - Your Stripe secret key
2. `STRIPE_WEBHOOK_SECRET` - Stripe webhook signing secret
3. `SUPABASE_URL` - Your Supabase project URL
4. `SUPABASE_SERVICE_KEY` - Supabase service role key
5. `N8N_SEND_EMAIL_WEBHOOK` - URL to email workflow

---

## Stripe Dashboard Configuration

### Webhook Endpoints
Add this endpoint in Stripe Dashboard → Developers → Webhooks:
- **URL:** `https://your-n8n-instance.com/webhook/stripe-events`
- **Events to listen for:**
  - `checkout.session.completed`
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
  - `charge.refunded`

---

## Testing

### Test Checkout Creation:
```bash
curl -X POST https://your-n8n-instance.com/webhook/create-checkout \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-webhook-secret" \
  -d '{
    "userId": "test-user-uuid",
    "accessToken": "test-token",
    "tokenPackage": "popular",
    "packageDetails": {
      "tokens": 15,
      "price": 2500,
      "label": "Popular"
    }
  }'
```

### Test with Stripe Test Cards:
- **Success:** `4242 4242 4242 4242`
- **Decline:** `4000 0000 0000 0002`
- Any future expiry date and CVC

### Test Webhook Locally:
Use Stripe CLI to forward webhooks:
```bash
stripe listen --forward-to https://your-n8n-instance.com/webhook/stripe-events
stripe trigger checkout.session.completed
```

---

## Error Handling

1. **Payment Declined:** Update payment record status to 'failed'
2. **Network Error:** Retry webhook delivery (Stripe automatically retries)
3. **Invalid Signature:** Reject webhook and log security incident
4. **Database Error:** Log error, send alert, allow Stripe to retry

---

## Monitoring

1. Track conversion rate (checkouts created vs completed)
2. Monitor failed payment attempts
3. Alert on repeated webhook failures
4. Track average time from checkout to completion
5. Monitor refund requests and amounts
