import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { adjustUserTokens } from "../_shared/tokens.ts";

// Verify Fygaro webhook signature.
// Fygaro signs: HMAC-SHA256(secret, timestamp + "." + rawBody)
// Signature header format: "t=<unix_timestamp>,v1=<hex_digest>"
async function verifySignature(
  secret: string,
  rawBody: string,
  signatureHeader: string,
): Promise<void> {
  const parts = Object.fromEntries(
    signatureHeader.split(",").map((part) => part.split("=")),
  );
  const timestamp = parts["t"];
  const receivedHex = parts["v1"];

  if (!timestamp || !receivedHex) {
    throw new Error("Malformed Fygaro-Signature header");
  }

  // Replay protection: reject webhooks older than 5 minutes
  const age = Math.floor(Date.now() / 1000) - parseInt(timestamp, 10);
  if (age > 300) {
    throw new Error(`Webhook timestamp too old: ${age}s`);
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const signingInput = `${timestamp}.${rawBody}`;
  const computed = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );

  // Convert computed signature to hex
  const computedHex = Array.from(new Uint8Array(computed))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  // Constant-time comparison to prevent timing attacks
  if (computedHex.length !== receivedHex.length) {
    throw new Error("Invalid webhook signature");
  }
  let mismatch = 0;
  for (let i = 0; i < computedHex.length; i++) {
    mismatch |= computedHex.charCodeAt(i) ^ receivedHex.charCodeAt(i);
  }
  if (mismatch !== 0) {
    throw new Error("Invalid webhook signature");
  }
}

Deno.serve(async (req: Request) => {
  // Fygaro webhooks are POST — no CORS preflight needed
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  try {
    const secret = Deno.env.get("FYGARO_SECRET");
    if (!secret) throw new Error("FYGARO_SECRET not configured");

    const signatureHeader = req.headers.get("Fygaro-Signature");
    if (!signatureHeader) throw new Error("Missing Fygaro-Signature header");

    await verifySignature(secret, rawBody, signatureHeader);

    // NOTE: Adjust field names below to match Fygaro's actual webhook payload.
    // Check your Fygaro dashboard webhook logs for the exact field names.
    const body = JSON.parse(rawBody);
    const transactionId: string = body.transactionId ?? body.transaction_id;
    const status: string = body.status;
    const customReference: string =
      body.customReference ?? body.custom_reference;
    const paidAmount: string = body.amount;

    if (!transactionId || !customReference) {
      throw new Error(
        "Missing transactionId or customReference in webhook body",
      );
    }

    // Only process completed payments
    if (status !== "COMPLETED" && status !== "SUCCESS") {
      console.log(`⏭️ Ignoring non-completed payment status: ${status}`);
      return new Response("ok", { status: 200 });
    }

    // Idempotency: skip if this transaction was already processed
    const { data: existing } = await supabaseAdmin
      .from("token_transactions")
      .select("id")
      .filter("metadata->>fygaro_transaction_id", "eq", transactionId)
      .maybeSingle();

    if (existing) {
      console.log("⚠️ Transaction already processed:", transactionId);
      return new Response("ok", { status: 200 });
    }

    // Parse custom_reference: "userId|packageId"
    const [userId, packageId] = customReference.split("|");
    if (!userId || !packageId) {
      throw new Error(`Invalid custom_reference format: ${customReference}`);
    }

    // Look up the package to verify amount and get token count
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("token_packages")
      .select("price, tokens")
      .eq("id", packageId)
      .eq("is_active", true)
      .single();

    if (pkgError || !pkg) {
      throw new Error(`Package not found: ${packageId}`);
    }

    // Amount integrity check
    if (paidAmount !== undefined) {
      const paid = parseFloat(paidAmount);
      if (Math.abs(paid - pkg.price) > 0.01) {
        throw new Error(
          `Amount mismatch: paid ${paid}, expected ${pkg.price}`,
        );
      }
    }

    await adjustUserTokens(
      userId,
      pkg.tokens,
      `Purchased ${pkg.tokens} tokens via Fygaro`,
      { fygaro_transaction_id: transactionId, amount_paid: paidAmount },
    );

    console.log("✅ Fygaro tokens credited:", {
      userId,
      tokens: pkg.tokens,
      transactionId,
    });

    // Respond 200 immediately so Fygaro marks the webhook delivered
    return new Response("ok", { status: 200 });
  } catch (error) {
    console.error("❌ fygaro-webhook error:", error);
    // Return 400 for signature/validation failures (Fygaro won't retry)
    // Return 500 for processing errors (Fygaro will retry)
    const isValidationError =
      error instanceof Error &&
      (error.message.includes("signature") ||
        error.message.includes("timestamp") ||
        error.message.includes("Malformed"));
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: isValidationError ? 400 : 500 },
    );
  }
});
