// @ts-nocheck
// ============================================================================
// Supabase Edge Function — Send Push Notifications
// Deploy with: supabase functions deploy send-push
// ============================================================================
//
// Environment variables required (set via Supabase Dashboard > Edge Functions > Secrets):
//   VAPID_SUBJECT       — e.g. "mailto:you@example.com"
//   VAPID_PUBLIC_KEY    — your VAPID public key (base64url)
//   VAPID_PRIVATE_KEY   — your VAPID private key (base64url)
//
// Generate VAPID keys: npx web-push generate-vapid-keys
// ============================================================================

declare const Deno: any;

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push helpers
function base64UrlToBase64(base64Url: string): string {
  let base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
  while (base64.length % 4) base64 += "=";
  return base64;
}

async function importVapidKeys(publicKey: string, privateKey: string) {
  const publicKeyBuffer = Uint8Array.from(
    atob(base64UrlToBase64(publicKey)),
    (c) => c.charCodeAt(0)
  );
  const privateKeyBuffer = Uint8Array.from(
    atob(base64UrlToBase64(privateKey)),
    (c) => c.charCodeAt(0)
  );
  return { publicKeyBuffer, privateKeyBuffer };
}

async function createJWT(
  subject: string,
  audience: string,
  privateKeyRaw: Uint8Array
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60, // 12 hours
    sub: subject,
  };

  const encoder = new TextEncoder();
  const headerB64 = btoa(JSON.stringify(header))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const payloadB64 = btoa(JSON.stringify(payload))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Import the private key for signing
  const key = await crypto.subtle.importKey(
    "pkcs8",
    convertECPrivateKey(privateKeyRaw),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    encoder.encode(unsignedToken)
  );

  // Convert DER signature to raw format
  const rawSig = derToRaw(new Uint8Array(signature));
  const sigB64 = btoa(String.fromCharCode(...rawSig))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");

  return `${unsignedToken}.${sigB64}`;
}

function convertECPrivateKey(rawKey: Uint8Array): ArrayBuffer {
  // Wrap raw 32-byte EC private key in PKCS#8 DER envelope for P-256
  const pkcs8Header = new Uint8Array([
    0x30, 0x81, 0x87, 0x02, 0x01, 0x00, 0x30, 0x13, 0x06, 0x07, 0x2a, 0x86,
    0x48, 0xce, 0x3d, 0x02, 0x01, 0x06, 0x08, 0x2a, 0x86, 0x48, 0xce, 0x3d,
    0x03, 0x01, 0x07, 0x04, 0x6d, 0x30, 0x6b, 0x02, 0x01, 0x01, 0x04, 0x20,
  ]);
  const pkcs8Footer = new Uint8Array([
    0xa1, 0x44, 0x03, 0x42, 0x00,
  ]);
  // For simplicity, we'll use a minimal PKCS8 wrapper
  const result = new Uint8Array(pkcs8Header.length + rawKey.length);
  result.set(pkcs8Header);
  result.set(rawKey, pkcs8Header.length);
  return result.buffer;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // If already 64 bytes, it's already raw
  if (der.length === 64) return der;

  // Parse DER SEQUENCE
  const raw = new Uint8Array(64);
  let offset = 2; // Skip SEQUENCE tag and length

  // Parse R
  if (der[offset] !== 0x02) return der;
  offset++;
  let rLen = der[offset++];
  let rOffset = offset;
  if (rLen === 33 && der[rOffset] === 0) {
    rOffset++;
    rLen = 32;
  }
  raw.set(der.slice(rOffset, rOffset + Math.min(rLen, 32)), 32 - Math.min(rLen, 32));
  offset = rOffset + rLen;

  // Parse S
  if (der[offset] !== 0x02) return der;
  offset++;
  let sLen = der[offset++];
  let sOffset = offset;
  if (sLen === 33 && der[sOffset] === 0) {
    sOffset++;
    sLen = 32;
  }
  raw.set(der.slice(sOffset, sOffset + Math.min(sLen, 32)), 64 - Math.min(sLen, 32));

  return raw;
}

async function sendWebPush(
  subscription: { endpoint: string; p256dh: string; auth_key: string },
  payload: string,
  vapidSubject: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; statusCode?: number; error?: string }> {
  try {
    const url = new URL(subscription.endpoint);
    const audience = `${url.protocol}//${url.host}`;

    const { privateKeyBuffer } = await importVapidKeys(
      vapidPublicKey,
      vapidPrivateKey
    );

    const jwt = await createJWT(vapidSubject, audience, privateKeyBuffer);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: `vapid t=${jwt}, k=${vapidPublicKey}`,
        TTL: "86400",
        Urgency: "high",
      },
      body: new TextEncoder().encode(payload),
    });

    if (response.status === 201 || response.status === 200) {
      return { success: true, statusCode: response.status };
    }

    return {
      success: false,
      statusCode: response.status,
      error: await response.text(),
    };
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const {
      offer_id,
      venue_id,
      title,
      message,
    } = await req.json();

    if (!venue_id || !title) {
      return new Response(
        JSON.stringify({ error: "venue_id and title are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get VAPID config
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@tablesuite.app";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with the user's auth token
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all active subscriptions for this venue
    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth_key")
      .eq("venue_id", venue_id)
      .eq("is_active", true);

    if (fetchError) {
      throw new Error(`Failed to fetch subscriptions: ${fetchError.message}`);
    }

    const total = subscriptions?.length || 0;
    let sent = 0;
    let failed = 0;

    // Prepare push payload
    const pushPayload = JSON.stringify({
      title,
      body: message || title,
      icon: "/icons/icon-192.png",
      badge: "/icons/badge-72.png",
      tag: `offer-${offer_id || Date.now()}`,
      url: "/",
      offerId: offer_id,
    });

    // Send to all subscribers
    const staleEndpoints: string[] = [];

    if (subscriptions && subscriptions.length > 0) {
      const results = await Promise.allSettled(
        subscriptions.map(async (sub: any) => {
          const result = await sendWebPush(
            sub,
            pushPayload,
            vapidSubject,
            vapidPublicKey,
            vapidPrivateKey
          );

          if (result.success) {
            sent++;
          } else {
            failed++;
            // If 404 or 410, endpoint is stale — mark for cleanup
            if (
              result.statusCode === 404 ||
              result.statusCode === 410
            ) {
              staleEndpoints.push(sub.endpoint);
            }
          }
          return result;
        })
      );
    }

    // Cleanup stale subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("endpoint", staleEndpoints);
    }

    // Log the notification send event
    const { data: userData } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    await supabase.from("offer_notifications").insert({
      offer_id: offer_id || null,
      venue_id,
      sent_by: userData?.user?.id || null,
      title,
      message: message || null,
      devices_targeted: total,
      devices_delivered: sent,
      devices_failed: failed,
    });

    return new Response(
      JSON.stringify({ sent, failed, total }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("send-push error:", err);
    return new Response(
      JSON.stringify({ error: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
