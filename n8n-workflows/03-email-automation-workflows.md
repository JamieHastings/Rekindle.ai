# n8n Workflows: Email Automation System

## Overview
This document covers all email automation workflows for Rekindle.ai including welcome emails, receipts, gift cards, check-ups, and low token notifications.

---

## Workflow 1: Universal Email Sender

### Workflow Name
`rekindle-email-sender`

### Trigger
**Webhook Node** - POST endpoint
- URL Path: `/webhook/send-email`
- Authentication: Header Auth

---

### Nodes Configuration

#### 1. Webhook Trigger
**Expected Request Body:**
```json
{
  "emailType": "welcome|receipt|gift_card|check_up|low_tokens",
  "userId": "user-uuid",
  "recipientEmail": "user@example.com",
  "data": {
    // Dynamic data based on email type
  }
}
```

---

#### 2. Get User Profile
**Node Type:** Supabase
**Operation:** Select rows
- **Table:** profiles
- **Filter:** `id = {{$json.userId}}`
- **Fields:** full_name, email, email_preferences

---

#### 3. Check Email Preferences
**Node Type:** IF
**Conditions:**
- Welcome emails: Always send
- Receipts: Check `email_receipts = true`
- Marketing (check_up): Check `email_marketing = true`
- Notifications (low_tokens): Check `email_notifications = true`

---

#### 4. Switch by Email Type
**Node Type:** Switch
**Routes:**
- Route 1: `welcome`
- Route 2: `receipt`
- Route 3: `gift_card`
- Route 4: `check_up`
- Route 5: `low_tokens`

---

### Email Type Routes

#### Route 1: Welcome Email
**Template Variables:**
```javascript
{
  recipientName: $json.full_name || 'there',
  freeTokens: 5,
  appUrl: 'https://rekindle.ai'
}
```

**Subject:** "Welcome to Rekindle.ai - Your Journey Begins"

**HTML Template:** (See email-templates section)

---

#### Route 2: Receipt Email
**Template Variables:**
```javascript
{
  recipientName: $json.full_name,
  tokenCount: $json.data.tokenCount,
  amountCents: $json.data.amountCents,
  amountDollars: ($json.data.amountCents / 100).toFixed(2),
  transactionId: $json.data.transactionId,
  transactionDate: new Date().toLocaleDateString(),
  receiptUrl: `https://rekindle.ai/receipts/${$json.data.transactionId}`
}
```

**Subject:** "Receipt for Your Rekindle.ai Token Purchase"

---

#### Route 3: Gift Card Email
**Template Variables:**
```javascript
{
  recipientName: $json.data.recipientName,
  senderName: $json.data.senderName,
  message: $json.data.message,
  template: $json.data.template,
  giftCardUrl: `https://rekindle.ai/gift-cards/${$json.data.giftCardId}`
}
```

**Subject:** "You've Received a Gift Card from {{senderName}}"

---

#### Route 4: Check-up Email
**Template Variables:**
```javascript
{
  recipientName: $json.full_name,
  daysSinceLastUse: $json.data.daysSinceLastUse,
  currentTokens: $json.data.currentTokens,
  appUrl: 'https://rekindle.ai'
}
```

**Subject:** "We Miss You! Come Back to Rekindle.ai"

---

#### Route 5: Low Tokens Email
**Template Variables:**
```javascript
{
  recipientName: $json.full_name,
  currentTokens: $json.data.currentTokens,
  purchaseUrl: 'https://rekindle.ai?action=buy-tokens'
}
```

**Subject:** "You're Running Low on Tokens"

---

#### 5. Send Email (Resend/SendGrid)
**Node Type:** HTTP Request (or use dedicated n8n email node)

**For Resend:**
- **Method:** POST
- **URL:** `https://api.resend.com/emails`
- **Headers:**
  - `Authorization: Bearer YOUR_RESEND_API_KEY`
  - `Content-Type: application/json`

**Body:**
```json
{
  "from": "Rekindle.ai <hello@rekindle.ai>",
  "to": ["{{$json.recipientEmail}}"],
  "subject": "{{$json.emailSubject}}",
  "html": "{{$json.emailHtml}}",
  "tags": [
    {
      "name": "email_type",
      "value": "{{$json.emailType}}"
    }
  ]
}
```

---

#### 6. Log Email
**Node Type:** Supabase
**Operation:** Insert row
- **Table:** email_logs
- **Fields:**
  - `user_id`: `{{$json.userId}}`
  - `email_type`: `{{$json.emailType}}`
  - `recipient_email`: `{{$json.recipientEmail}}`
  - `subject`: `{{$json.emailSubject}}`
  - `status`: `sent`
  - `provider_message_id`: `{{$json.id}}`
  - `sent_at`: `{{$now}}`

---

#### 7. Success Response
**Node Type:** Respond to Webhook
```json
{
  "success": true,
  "emailId": "{{$json.id}}"
}
```

---

#### 8. Error Handler
**Node Type:** Error Trigger

**Log Failed Email:**
- **Table:** email_logs
- **Fields:**
  - `status`: `failed`
  - `metadata`: Include error details

**Retry Logic:**
- Retry 3 times with exponential backoff
- If still fails, send alert to admin

---

## Workflow 2: Scheduled Check-up Emails

### Workflow Name
`rekindle-scheduled-checkups`

### Trigger
**Cron Node** - Runs daily at 10 AM
- **Expression:** `0 10 * * *`

---

### Nodes Configuration

#### 1. Find Inactive Users
**Node Type:** Supabase
**Operation:** Execute SQL
```sql
SELECT
  p.id,
  p.email,
  p.full_name,
  p.tokens,
  EXTRACT(DAY FROM NOW() - MAX(gm.created_at)) as days_since_last_use
FROM profiles p
LEFT JOIN generated_messages gm ON p.id = gm.user_id
WHERE p.email_marketing = true
GROUP BY p.id, p.email, p.full_name, p.tokens
HAVING
  MAX(gm.created_at) IS NULL OR
  MAX(gm.created_at) < NOW() - INTERVAL '7 days'
LIMIT 100;
```

---

#### 2. Loop Through Users
**Node Type:** Loop
- For each user found

---

#### 3. Call Email Sender
**Node Type:** HTTP Request
- **URL:** `https://your-n8n-instance.com/webhook/send-email`
- **Body:**
```json
{
  "emailType": "check_up",
  "userId": "{{$json.id}}",
  "recipientEmail": "{{$json.email}}",
  "data": {
    "daysSinceLastUse": "{{$json.days_since_last_use}}",
    "currentTokens": "{{$json.tokens}}"
  }
}
```

---

#### 4. Delay Between Emails
**Node Type:** Wait
- **Time:** 2 seconds
- **Purpose:** Rate limiting

---

## Workflow 3: Low Token Notifications

### Workflow Name
`rekindle-low-token-alerts`

### Trigger
**Cron Node** - Runs daily at 9 AM
- **Expression:** `0 9 * * *`

---

### Nodes Configuration

#### 1. Find Low Token Users
**Node Type:** Supabase
**Operation:** Execute SQL
```sql
SELECT
  p.id,
  p.email,
  p.full_name,
  p.tokens
FROM profiles p
WHERE
  p.tokens < 2
  AND p.email_notifications = true
  AND NOT EXISTS (
    SELECT 1 FROM email_logs el
    WHERE el.user_id = p.id
    AND el.email_type = 'low_tokens'
    AND el.sent_at > NOW() - INTERVAL '7 days'
  )
LIMIT 100;
```

---

#### 2. Loop and Send
**Node Type:** Loop + HTTP Request
- Similar to check-up workflow
- Email type: `low_tokens`

---

## Workflow 4: Welcome Email on Signup

### Workflow Name
`rekindle-welcome-email`

### Trigger
**Supabase Database Trigger**
- Listen to `profiles` table inserts

**Alternative Trigger:**
Call from frontend after successful signup

---

### Nodes Configuration

#### 1. Wait for User Creation
**Node Type:** Wait
- **Time:** 30 seconds
- **Purpose:** Ensure user is fully created

---

#### 2. Send Welcome Email
**Node Type:** HTTP Request
- **URL:** `https://your-n8n-instance.com/webhook/send-email`
- **Body:**
```json
{
  "emailType": "welcome",
  "userId": "{{$json.id}}",
  "recipientEmail": "{{$json.email}}",
  "data": {}
}
```

---

## Environment Variables Required

1. `RESEND_API_KEY` or `SENDGRID_API_KEY` - Email service API key
2. `SUPABASE_URL` - Supabase project URL
3. `SUPABASE_SERVICE_KEY` - Service role key
4. `FROM_EMAIL` - Sender email address
5. `APP_URL` - Frontend application URL

---

## Email Service Provider Setup

### Option 1: Resend (Recommended)
- Sign up at resend.com
- Verify your domain
- Generate API key
- Configure SPF and DKIM records

### Option 2: SendGrid
- Sign up at sendgrid.com
- Create API key with "Mail Send" permissions
- Verify sender identity
- Configure domain authentication

### Option 3: Mailgun
- Sign up at mailgun.com
- Add and verify domain
- Get API credentials
- Configure DNS records

---

## Testing

### Test Email Sending:
```bash
curl -X POST https://your-n8n-instance.com/webhook/send-email \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Secret: your-secret" \
  -d '{
    "emailType": "welcome",
    "userId": "test-user-id",
    "recipientEmail": "test@example.com",
    "data": {}
  }'
```

### Test with Real Email Addresses
1. Use your own email for testing
2. Check spam folder if not received
3. Verify all links work correctly
4. Test unsubscribe functionality

---

## Deliverability Best Practices

1. **Domain Authentication:**
   - Set up SPF, DKIM, and DMARC records
   - Use a dedicated sending domain

2. **Content Quality:**
   - Avoid spam trigger words
   - Include plain text version
   - Add unsubscribe link
   - Use proper HTML structure

3. **Sender Reputation:**
   - Start with low volume
   - Gradually increase sending
   - Monitor bounce and complaint rates
   - Clean invalid email addresses

4. **Engagement:**
   - Respect email preferences
   - Segment your audience
   - Send relevant content
   - Monitor open and click rates

---

## Monitoring & Analytics

### Track These Metrics:
1. **Delivery Rate:** % of emails successfully delivered
2. **Open Rate:** % of emails opened
3. **Click Rate:** % of links clicked
4. **Bounce Rate:** % of emails bounced
5. **Complaint Rate:** % marked as spam
6. **Unsubscribe Rate:** % of unsubscribes

### Set Up Alerts For:
- Delivery rate drops below 95%
- Bounce rate exceeds 5%
- Complaint rate exceeds 0.1%
- Any email type failing repeatedly

### Dashboard Queries:
```sql
-- Email performance by type
SELECT
  email_type,
  COUNT(*) as total_sent,
  COUNT(*) FILTER (WHERE status = 'sent') as delivered,
  COUNT(*) FILTER (WHERE status = 'failed') as failed,
  COUNT(*) FILTER (WHERE status = 'bounced') as bounced
FROM email_logs
WHERE created_at > NOW() - INTERVAL '30 days'
GROUP BY email_type;
```

---

## Compliance & Legal

### Required Elements:
1. **Unsubscribe Link:** In all marketing emails
2. **Physical Address:** In email footer
3. **CAN-SPAM Compliance:** Follow US regulations
4. **GDPR Compliance:** For EU users
5. **Privacy Policy Link:** In emails

### Email Preferences Page:
Create a page where users can:
- Manage email preferences
- Unsubscribe from specific types
- Update email address
- Request data deletion
