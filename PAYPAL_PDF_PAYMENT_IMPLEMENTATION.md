# PayPal PDF Payment Implementation

## Overview
This implementation adds PayPal payment integration for PDF downloads of messages with design templates. Users must pay $5.99 to download a PDF when a template is used.

## ✅ What Was Implemented

### 1. Frontend Components

#### `PDFPaymentModal.tsx`
- PayPal payment modal component
- Uses `@paypal/react-paypal-js` SDK (already installed)
- Handles payment flow:
  - Creates PayPal order
  - Captures payment approval
  - Verifies payment with backend
  - Triggers PDF download on success

**Features:**
- Dynamic pricing (default $5.99)
- Product name based on message type
- Error handling and user feedback
- Processing state management

#### `PDFPreviewModal.tsx` (Updated)
- Added payment integration
- New props:
  - `requiresPayment?: boolean` - Enable payment requirement
  - `paymentPrice?: number` - Set payment amount (default $5.99)
- Payment flow:
  - Shows payment modal when download clicked (if payment required)
  - Automatically downloads PDF after successful payment
  - Updates button text to show price when payment required

#### `MessageDisplay.tsx` (Updated)
- Automatically enables payment when template is used
- Passes `requiresPayment={!!templateUrl}` to PDFPreviewModal
- Sets default price to $5.99

### 2. Backend Edge Function

#### `supabase/functions/verify-pdf-payment/index.ts`
- Verifies PayPal payments server-side
- Features:
  - User authentication via JWT
  - PayPal order verification via PayPal API
  - Amount validation
  - Payment record storage
  - Error handling

**Endpoint:** `POST /functions/v1/verify-pdf-payment`

**Request:**
```json
{
  "orderId": "PayPal order ID",
  "userId": "user-uuid",
  "messageType": "love_letter",
  "amount": 5.99
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "order-id",
  "message": "Payment verified successfully"
}
```

### 3. Database Schema

#### Migration: `20250115000000_create_pdf_payments_table.sql`
- Creates `pdf_payments` table
- Fields:
  - `id` (UUID, primary key)
  - `user_id` (UUID, foreign key to auth.users)
  - `paypal_order_id` (TEXT, unique)
  - `message_type` (TEXT)
  - `amount` (DECIMAL)
  - `status` (TEXT, default 'pending')
  - `metadata` (JSONB)
  - `created_at`, `updated_at` (TIMESTAMPTZ)

- RLS Policies:
  - Users can view their own payments
  - Service role (edge functions) can insert/update

- Indexes for performance:
  - `user_id`
  - `paypal_order_id`
  - `status`

## 🔧 Configuration

### Environment Variables Required

**Frontend (.env):**
```env
VITE_PAYPAL_CLIENT_ID=your_paypal_client_id
```

**Backend (Supabase Edge Function Secrets):**
```env
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_CLIENT_SECRET=your_paypal_secret
PAYPAL_MODE=sandbox  # or 'live' for production
```

## 📋 Usage

### Basic Flow

1. User generates a message with a template
2. User clicks "Download PDF"
3. `PDFPreviewModal` opens
4. If template is used, payment is required
5. User clicks "Download PDF - $5.99"
6. `PDFPaymentModal` opens with PayPal buttons
7. User completes PayPal payment
8. Backend verifies payment
9. PDF automatically downloads

### Code Example

```tsx
<PDFPreviewModal
  isOpen={showPDFPreview}
  onClose={() => setShowPDFPreview(false)}
  message={message}
  templateUrl={templateUrl}  // If present, payment required
  messageType="love_letter"
  requiresPayment={!!templateUrl}  // Auto-enabled when template exists
  paymentPrice={5.99}
/>
```

## 🔒 Security

1. **Server-Side Verification**: All payments verified on backend
2. **JWT Authentication**: User must be authenticated
3. **Amount Validation**: Payment amount verified against expected value
4. **Order ID Uniqueness**: Prevents duplicate payment processing
5. **RLS Policies**: Users can only view their own payments

## 🧪 Testing

### Test Payment Flow

1. Generate a message with a template
2. Click "Download PDF"
3. Verify payment modal appears
4. Use PayPal sandbox test account
5. Complete payment
6. Verify PDF downloads automatically
7. Check `pdf_payments` table for record

### PayPal Sandbox Test Accounts

Use PayPal sandbox test accounts for testing:
- Test buyer account (for payments)
- Test seller account (your app)

## 📝 Notes

- Payment is only required when `templateUrl` is present
- Messages without templates download for free
- Payment amount is configurable per message type
- All payments are logged in `pdf_payments` table
- Edge function uses service_role to bypass RLS for inserts

## 🚀 Next Steps

1. Run database migration:
   ```bash
   supabase migration up
   ```

2. Deploy edge function:
   ```bash
   supabase functions deploy verify-pdf-payment
   ```

3. Set environment variables in Supabase dashboard

4. Test with PayPal sandbox

5. Switch to live mode for production

## 🔍 Troubleshooting

### Payment Not Verifying
- Check PayPal credentials in edge function secrets
- Verify `PAYPAL_MODE` is set correctly (sandbox/live)
- Check edge function logs in Supabase dashboard

### PDF Not Downloading After Payment
- Check browser console for errors
- Verify `onPaymentSuccess` callback is called
- Check `paymentCompleted` state in PDFPreviewModal

### Authorization Errors
- Ensure user is logged in
- Check session is valid
- Verify JWT token is passed in headers

