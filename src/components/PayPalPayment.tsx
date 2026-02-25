import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { useState } from "react";

interface PayPalPaymentProps {
  amount: string; // e.g., "5.99"
  description: string; // e.g., "Rekindle - Love Letter with Template"
  messageType: string;
  onSuccess: (orderId: string) => void;
  onError: (error: any) => void;
}

export function PayPalPayment({
  amount,
  description,
  messageType,
  onSuccess,
  onError,
}: PayPalPaymentProps) {
  const [isPaying, setIsPaying] = useState(false);

  const paypalClientId = import.meta.env.VITE_PAYPAL_CLIENT_ID;
  const paypalMode = import.meta.env.VITE_PAYPAL_MODE || 'sandbox';

  if (!paypalClientId) {
    console.error('❌ VITE_PAYPAL_CLIENT_ID is not set in environment variables');
    return (
      <div className="p-4 bg-red-100 border border-red-400 text-red-700 rounded">
        <p>PayPal is not configured. Please add VITE_PAYPAL_CLIENT_ID to your .env file.</p>
      </div>
    );
  }

  const initialOptions = {
    clientId: paypalClientId,
    currency: "USD",
    intent: "capture",
  };

  return (
    <div className="paypal-container">
      {isPaying && (
        <div className="mb-4 p-4 bg-blue-50 rounded-lg text-center">
          <p className="text-blue-800">Processing payment...</p>
        </div>
      )}
      
      <PayPalScriptProvider options={initialOptions}>
        <PayPalButtons
          style={{
            layout: "vertical",
            color: "gold",
            shape: "rect",
            label: "paypal",
          }}
          createOrder={(data, actions) => {
            setIsPaying(true);
            console.log('💳 Creating PayPal order:', { amount, description, messageType });
            
            return actions.order.create({
              purchase_units: [
                {
                  amount: {
                    value: amount,
                    currency_code: "USD",
                  },
                  description: description,
                  custom_id: messageType, // Track what they're buying
                },
              ],
              application_context: {
                brand_name: "Rekindle",
                shipping_preference: "NO_SHIPPING",
              },
            });
          }}
          onApprove={async (data, actions) => {
            try {
              const details = await actions.order!.capture();
              console.log("✅ Payment successful:", details);
              
              setIsPaying(false);
              onSuccess(data.orderID);
            } catch (error) {
              console.error("❌ Payment capture failed:", error);
              setIsPaying(false);
              onError(error);
            }
          }}
          onError={(err) => {
            console.error("❌ PayPal error:", err);
            setIsPaying(false);
            onError(err);
          }}
          onCancel={() => {
            console.log("⚠️ Payment cancelled");
            setIsPaying(false);
          }}
        />
      </PayPalScriptProvider>
    </div>
  );
}

