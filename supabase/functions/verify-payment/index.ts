// @ts-nocheck
// ============================================================================
// Supabase Edge Function — Server-Side Payment & Webhook Verification
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
};

// Helper: Verify Razorpay HMAC-SHA256 Signature
async function verifyRazorpaySignature(
  orderId: string,
  paymentId: string,
  signature: string,
  secret: string
): Promise<boolean> {
  if (!secret || !signature) return false;
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  const messageData = encoder.encode(`${orderId}|${paymentId}`);

  const key = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBytes = await crypto.subtle.sign("HMAC", key, messageData);
  const hashHex = Array.from(new Uint8Array(signatureBytes))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  return hashHex === signature;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const body = await req.json();

    // 1. Direct Webhook Event from Razorpay
    if (body.event === "payment.captured" && body.payload?.payment?.entity) {
      const paymentEntity = body.payload.payment.entity;
      const rzpPaymentId = paymentEntity.id;
      const rzpOrderId = paymentEntity.order_id;
      const sessionId = paymentEntity.notes?.session_id;

      if (sessionId) {
        const { data, error } = await supabase.rpc("settle_table_bill", {
          p_session_id: sessionId,
          p_payment_method: "online",
          p_razorpay_payment_id: rzpPaymentId,
          p_razorpay_order_id: rzpOrderId,
        });

        if (error) {
          console.error("[verify-payment] Error settling via webhook:", error);
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        return new Response(JSON.stringify({ success: true, settled: data }), {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Client-initiated verification call
    const {
      session_id,
      venue_id,
      razorpay_payment_id,
      razorpay_order_id,
      razorpay_signature,
      payment_method = "online",
      split_details = null,
    } = body;

    if (!session_id) {
      return new Response(
        JSON.stringify({ error: "Missing required parameter: session_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Lookup Razorpay Key Secret if configured
    const rzpSecret = Deno.env.get("RAZORPAY_KEY_SECRET");
    if (rzpSecret && razorpay_order_id && razorpay_payment_id && razorpay_signature) {
      const isValid = await verifyRazorpaySignature(
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        rzpSecret
      );

      if (!isValid) {
        return new Response(
          JSON.stringify({ success: false, error: "Invalid payment signature" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Execute atomic settlement in database
    const { data: settleResult, error: settleErr } = await supabase.rpc("settle_table_bill", {
      p_session_id: session_id,
      p_payment_method: payment_method,
      p_split_details: split_details,
      p_razorpay_payment_id: razorpay_payment_id || null,
      p_razorpay_order_id: razorpay_order_id || null,
      p_razorpay_signature: razorpay_signature || null,
    });

    if (settleErr) {
      return new Response(JSON.stringify({ error: settleErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ success: true, result: settleResult }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
