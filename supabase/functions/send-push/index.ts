// @ts-nocheck
// ============================================================================
// Supabase Edge Function — Send Push Notifications with Custom Venue Branding
// ============================================================================

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import webPush from "npm:web-push@3.6.7";

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    // Get VAPID config from Supabase Secrets
    const vapidSubject =
      Deno.env.get("VAPID_SUBJECT") || "mailto:admin@tablesuite.app";
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY") || "";
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY") || "";

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured in Supabase Secrets" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Configure web-push details
    webPush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

    // Create Supabase admin client
    const authHeader = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch venue details for custom branding & logo
    const { data: venue } = await supabase
      .from("venues")
      .select("name, logo_url")
      .eq("id", venue_id)
      .maybeSingle();

    const venueName = venue?.name || "TableSuite";
    const venueIcon =
      venue?.logo_url && venue.logo_url.startsWith("http")
        ? venue.logo_url
        : "https://ditoech.in/icons/icon-192.png";
    const badgeIcon = "https://ditoech.in/icons/badge-72.png";
    const promoBanner = "https://ditoech.in/icons/banner-promo.png";

    // Format notification title with restaurant brand name
    const finalTitle =
      venueName &&
      venueName !== "TableSuite" &&
      !title.toLowerCase().includes(venueName.toLowerCase())
        ? `${venueName} • ${title}`
        : title;

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
    const errors: string[] = [];

    // Prepare push payload with full branding, icon, badge, and promo banner
    const pushPayload = JSON.stringify({
      title: finalTitle,
      body: message || title,
      icon: venueIcon,
      badge: badgeIcon,
      image: promoBanner,
      tag: `offer-${offer_id || Date.now()}`,
      url: "/",
      offerId: offer_id,
      timestamp: Date.now(),
    });

    const staleEndpoints: string[] = [];

    if (subscriptions && subscriptions.length > 0) {
      await Promise.allSettled(
        subscriptions.map(async (sub: any) => {
          try {
            await webPush.sendNotification(
              {
                endpoint: sub.endpoint,
                keys: {
                  p256dh: sub.p256dh,
                  auth: sub.auth_key,
                },
              },
              pushPayload,
              {
                TTL: 86400,
                urgency: "high",
              }
            );
            sent++;
          } catch (pushErr: any) {
            failed++;
            const statusCode = pushErr?.statusCode || pushErr?.status || 500;
            const errMsg = pushErr?.body || pushErr?.message || String(pushErr);
            errors.push(`Status ${statusCode}: ${errMsg}`);
            console.error(`Push failure for endpoint ${sub.endpoint}:`, pushErr);

            // If subscription has expired or unregistered (HTTP 404 or 410 Gone)
            if (statusCode === 404 || statusCode === 410) {
              staleEndpoints.push(sub.endpoint);
            }
          }
        })
      );
    }

    // Cleanup stale/expired subscriptions
    if (staleEndpoints.length > 0) {
      await supabase
        .from("push_subscriptions")
        .update({ is_active: false })
        .in("endpoint", staleEndpoints);
    }

    // Identify sender
    let sentBy = null;
    if (authHeader) {
      try {
        const { data: userData } = await supabase.auth.getUser(
          authHeader.replace("Bearer ", "")
        );
        sentBy = userData?.user?.id || null;
      } catch {}
    }

    // Log to offer_notifications table
    await supabase.from("offer_notifications").insert({
      offer_id: offer_id || null,
      venue_id,
      sent_by: sentBy,
      title: finalTitle,
      message: message || null,
      devices_targeted: total,
      devices_delivered: sent,
      devices_failed: failed,
    });

    return new Response(
      JSON.stringify({
        sent,
        failed,
        total,
        errors: errors.slice(0, 5),
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err: any) {
    console.error("send-push global error:", err);
    return new Response(
      JSON.stringify({ error: err?.message || String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
