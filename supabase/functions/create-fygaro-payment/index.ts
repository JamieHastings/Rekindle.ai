import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { supabaseAdmin } from "../_shared/supabaseAdmin.ts";
import { corsHeaders } from "../_shared/cors.ts";

function base64url(input: Uint8Array | string): string {
  const bytes =
    typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((b) => (binary += String.fromCharCode(b)));
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

async function buildJWT(
  header: Record<string, string>,
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const h = base64url(JSON.stringify(header));
  const p = base64url(JSON.stringify(payload));
  const signingInput = `${h}.${p}`;

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );

  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(signingInput),
  );
  return `${signingInput}.${base64url(new Uint8Array(sig))}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid token");

    const { tokenAmount } = await req.json();
    if (!tokenAmount) throw new Error("Missing tokenAmount");

    // Look up package server-side so the price can't be tampered with client-side
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from("token_packages")
      .select("id, price, tokens")
      .eq("tokens", tokenAmount)
      .eq("is_active", true)
      .single();

    if (pkgError || !pkg) {
      throw new Error(`No active package found for ${tokenAmount} tokens`);
    }

    const keyId = Deno.env.get("FYGARO_KEY_ID");
    const secret = Deno.env.get("FYGARO_SECRET");
    const buttonUrl = Deno.env.get("FYGARO_BUTTON_URL");

    if (!keyId || !secret || !buttonUrl) {
      throw new Error("Fygaro credentials not configured");
    }

    // custom_reference encodes who to credit and which package — parsed by fygaro-webhook
    const customReference = `${user.id}|${pkg.id}`;

    const jwtPayload = {
      amount: pkg.price.toFixed(2),
      currency: "USD",
      custom_reference: customReference,
      // JWT expires in 1 hour — user must complete checkout within that window
      exp: Math.floor(Date.now() / 1000) + 3600,
    };

    const jwt = await buildJWT(
      { alg: "HS256", typ: "JWT", kid: keyId },
      jwtPayload,
      secret,
    );

    const checkoutUrl = `${buttonUrl}?jwt=${jwt}`;

    return new Response(JSON.stringify({ checkoutUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("❌ create-fygaro-payment error:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
