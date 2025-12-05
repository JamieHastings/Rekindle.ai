# Rekindle.ai n8n Integration Guide

This directory contains comprehensive documentation for integrating Rekindle.ai with n8n workflows to handle AI message generation, Stripe payments, and automated email communications.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Workflow Documentation](#workflow-documentation)
4. [Setup Instructions](#setup-instructions)
5. [Environment Configuration](#environment-configuration)
6. [Testing](#testing)
7. [Monitoring](#monitoring)
8. [Troubleshooting](#troubleshooting)

---

## Overview

This n8n integration replaces direct API calls with a sophisticated workflow system that provides:

- **AI Message Generation**: OpenAI-powered message creation with token management
- **Payment Processing**: Complete Stripe checkout and webhook handling
- **Email Automation**: Transactional and marketing emails via Resend/SendGrid
- **Database Integration**: Full Supabase integration for data persistence
- **Webhook Logging**: Comprehensive execution tracking and error handling

### Architecture

```
Frontend (React) → n8n Webhooks → External Services (OpenAI, Stripe, Email)
                          ↓
                   Supabase Database
```

---

## Prerequisites

### Required Accounts

1. **n8n Account**
   - Sign up at [n8n.io](https://n8n.io) (Cloud) or self-host
   - Recommended: n8n Cloud for ease of use and automatic updates

2. **OpenAI Account**
   - Create account at [platform.openai.com](https://platform.openai.com)
   - Generate API key with GPT-4 access
   - Add payment method for API usage

3. **Stripe Account**
   - Sign up at [stripe.com](https://stripe.com)
   - Complete account verification
   - Get API keys from Dashboard → Developers → API keys

4. **Email Service Provider**
   - **Resend** (Recommended): [resend.com](https://resend.com)
   - **SendGrid**: [sendgrid.com](https://sendgrid.com)
   - **Mailgun**: [mailgun.com](https://mailgun.com)
   - Verify domain and get API key

5. **Supabase Account**
   - Already configured for this project
   - Service role key needed for n8n workflows

---

## Workflow Documentation

This project includes four main workflows:

### 1. Message Generation Workflow
**File:** `01-message-generation-workflow.md`

Handles AI-powered message creation with:
- User authentication validation
- Token balance checking
- OpenAI API integration
- Database updates for tokens and messages
- Comprehensive error handling

### 2. Stripe Payment Workflow
**File:** `02-stripe-payment-workflow.md`

Manages payment processing including:
- Checkout session creation
- Webhook event handling
- Token balance updates
- Receipt email triggers
- Payment status tracking

### 3. Email Automation Workflows
**File:** `03-email-automation-workflows.md`

Provides automated email communications:
- Universal email sender
- Welcome emails for new users
- Payment receipts
- Gift card delivery
- Check-up emails for inactive users
- Low token notifications

---

## Setup Instructions

### Step 1: Set Up n8n

#### Option A: n8n Cloud (Recommended)
1. Go to [n8n.io](https://n8n.io) and sign up
2. Create a new workflow
3. Your webhook URLs will be: `https://YOUR-INSTANCE.app.n8n.cloud/webhook/...`

#### Option B: Self-Hosted
1. Install n8n:
   ```bash
   npm install n8n -g
   n8n start
   ```
2. Access at `http://localhost:5678`
3. Set up reverse proxy with SSL for production

### Step 2: Configure Environment Variables

#### In n8n (Settings → Environments):
```
SUPABASE_URL=https://pfjwgkqsnogekasjqmml.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
OPENAI_API_KEY=your-openai-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret
RESEND_API_KEY=your-resend-api-key (or SendGrid)
FROM_EMAIL=hello@rekindle.ai
APP_URL=https://your-app.com
WEBHOOK_SECRET=generate-secure-random-string
```

#### In Project `.env` file:
```
VITE_N8N_MESSAGE_GENERATION_WEBHOOK=https://your-n8n-instance/webhook/generate-message
VITE_N8N_STRIPE_CHECKOUT_WEBHOOK=https://your-n8n-instance/webhook/create-checkout
VITE_N8N_SEND_EMAIL_WEBHOOK=https://your-n8n-instance/webhook/send-email
VITE_N8N_WEBHOOK_SECRET=same-secure-random-string-as-above
```

### Step 3: Create Workflows in n8n

For each workflow file:

1. **Open n8n** and create a new workflow
2. **Follow the documentation** in the respective `.md` file
3. **Add nodes** as specified in the documentation
4. **Configure each node** with the provided settings
5. **Test the workflow** using the provided test examples
6. **Activate the workflow** when ready

**Important:** Start with the Message Generation workflow first, as it's the core functionality.

### Step 4: Configure Stripe Webhooks

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Enter your n8n webhook URL: `https://your-n8n-instance/webhook/stripe-events`
4. Select events to listen for:
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `payment_intent.payment_failed`
   - `charge.refunded`
5. Copy the **Signing secret** and add to n8n environment as `STRIPE_WEBHOOK_SECRET`

### Step 5: Set Up Email Service

#### For Resend:
1. Go to [resend.com](https://resend.com) and sign up
2. Add and verify your sending domain
3. Create API key
4. Configure DNS records (SPF, DKIM, DMARC)

#### For SendGrid:
1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create sender identity
3. Generate API key
4. Verify domain authentication

### Step 6: Import Email Templates

The email templates are in the `email-templates/` directory:
- `welcome-email.html`
- `receipt-email.html`
- `gift-card-email.html`
- `check-up-email.html`
- `low-tokens-email.html`

**In n8n:**
1. Create a "Function" node to load templates
2. Use mustache or similar for variable substitution
3. Or host templates on CDN and reference them

### Step 7: Test Everything

Run through the complete flow:

1. **Test Message Generation:**
   ```bash
   curl -X POST https://your-n8n-instance/webhook/generate-message \
     -H "Content-Type: application/json" \
     -H "X-Webhook-Secret: your-secret" \
     -d @test-message-request.json
   ```

2. **Test Stripe Checkout:**
   - Use Stripe test cards
   - Verify checkout session creation
   - Complete test payment
   - Check webhook delivery

3. **Test Emails:**
   - Send test emails to your own address
   - Verify all templates render correctly
   - Check deliverability

---

## Environment Configuration

### Security Best Practices

1. **Webhook Authentication:**
   - Always use `X-Webhook-Secret` header
   - Generate secure random strings (32+ characters)
   - Rotate secrets periodically

2. **API Key Management:**
   - Use n8n's credential system
   - Never commit keys to version control
   - Use different keys for dev/staging/prod

3. **Stripe Webhook Verification:**
   - Always verify webhook signatures
   - Use the verification code in the workflow docs

### Rate Limiting

Consider implementing rate limits:
- **Message Generation:** 10 requests per minute per user
- **Email Sending:** 100 emails per hour
- **Stripe Checkouts:** 20 per minute per user

---

## Testing

### Local Testing

1. **Use n8n Test Webhook:**
   - Click "Listen for Test Event" in webhook nodes
   - Send test requests from Postman or curl
   - Verify responses and database updates

2. **Stripe CLI for Webhooks:**
   ```bash
   stripe login
   stripe listen --forward-to https://your-n8n-instance/webhook/stripe-events
   stripe trigger checkout.session.completed
   ```

3. **Email Testing:**
   - Use [Mailtrap](https://mailtrap.io) for testing
   - Or send to your own email address
   - Check spam folder if not received

### Production Testing

1. Start with test mode for Stripe
2. Use small token packages for testing
3. Monitor n8n execution logs
4. Check Supabase database for correct data
5. Verify email delivery in email provider dashboard

---

## Monitoring

### n8n Execution Logs

Monitor in n8n Dashboard:
- **Executions:** View all workflow runs
- **Error Rate:** Track failed executions
- **Execution Time:** Monitor performance

### Database Queries

Check `n8n_webhook_logs` table:
```sql
-- Recent errors
SELECT * FROM n8n_webhook_logs
WHERE status = 'error'
ORDER BY created_at DESC
LIMIT 10;

-- Success rate by workflow
SELECT
  workflow_name,
  COUNT(*) as total,
  COUNT(*) FILTER (WHERE status = 'success') as successful,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'success') / COUNT(*), 2) as success_rate
FROM n8n_webhook_logs
WHERE created_at > NOW() - INTERVAL '24 hours'
GROUP BY workflow_name;
```

### Email Deliverability

Monitor in your email provider:
- Delivery rate (should be > 95%)
- Bounce rate (should be < 5%)
- Complaint rate (should be < 0.1%)
- Open rate (varies by email type)

### Stripe Dashboard

Track in [Stripe Dashboard](https://dashboard.stripe.com):
- Payment success rate
- Failed payments
- Refund requests
- Revenue metrics

---

## Troubleshooting

### Common Issues

#### 1. Message Generation Fails

**Symptoms:** "Failed to generate message" error

**Possible Causes:**
- OpenAI API key invalid or expired
- Insufficient OpenAI credits
- Rate limit exceeded
- Network timeout

**Solutions:**
- Verify API key in n8n credentials
- Check OpenAI usage dashboard
- Implement retry logic
- Increase timeout settings

#### 2. Stripe Webhooks Not Received

**Symptoms:** Payments succeed but tokens not added

**Possible Causes:**
- Webhook URL incorrect
- Webhook signature verification failing
- Firewall blocking webhooks

**Solutions:**
- Verify webhook URL in Stripe Dashboard
- Check webhook secret matches
- Test with Stripe CLI
- Review n8n logs for webhook calls

#### 3. Emails Not Delivered

**Symptoms:** Emails show as "sent" but not received

**Possible Causes:**
- SPF/DKIM not configured
- Email marked as spam
- Invalid recipient email
- Email service rate limit

**Solutions:**
- Configure DNS records properly
- Test with multiple email providers
- Check spam folder
- Review email service logs

#### 4. Authentication Errors

**Symptoms:** "Unauthorized" or "Invalid token" errors

**Possible Causes:**
- Expired JWT token
- Incorrect Supabase configuration
- User not logged in

**Solutions:**
- Check token expiration time
- Verify Supabase credentials
- Implement token refresh logic

#### 5. Database Errors

**Symptoms:** "Database error" or timeout messages

**Possible Causes:**
- RLS policies blocking queries
- Network connectivity issues
- Query timeout

**Solutions:**
- Review RLS policies
- Use service role key for admin operations
- Optimize slow queries
- Add database indexes

---

## Performance Optimization

### Message Generation
- Cache common prompts
- Use gpt-4o-mini for cost savings
- Implement request queuing for high load

### Stripe Payments
- Use Stripe's recommended retry logic
- Cache checkout sessions
- Implement idempotency keys

### Email Sending
- Batch emails when possible
- Use email service templates
- Implement proper retry logic

---

## Support

### Resources
- [n8n Documentation](https://docs.n8n.io)
- [OpenAI API Reference](https://platform.openai.com/docs)
- [Stripe API Docs](https://stripe.com/docs/api)
- [Resend Documentation](https://resend.com/docs)
- [Supabase Documentation](https://supabase.com/docs)

### Getting Help
- Check workflow execution logs in n8n
- Review database logs in Supabase
- Search n8n community forum
- Contact support for your email provider

---

## License

This integration documentation is part of the Rekindle.ai project.
