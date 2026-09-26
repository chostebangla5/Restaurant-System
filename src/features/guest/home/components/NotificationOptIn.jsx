import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import {
  Bell,
  BellRing,
  X,
  Tag,
  Share,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  getExistingSubscription,
  hasUserEnabledNotifications,
  markNotificationsEnabled,
  isInAppBrowser,
  isIOSDevice,
  isStandalonePWA,
} from '@/lib/pushSubscription';
import { TRANSITION_EASE, DURATION_MODAL, DURATION_REDUCED } from '@/lib/motion';

/**
 * Redesigned High-Converting Notification Opt-In Card.
 * 
 * Rules:
 * - If dismissed or ignored: DO NOT store permanent/session suppression.
 *   On page reload or re-scanning the QR code, the popup loops and shows again every time.
 * - If user enables notifications: Stores persistent enabled flag & PushManager subscription.
 *   Stops showing completely once enabled.
 * - Works reliably across Android Chrome, iOS Safari, PWA standalone, and In-App browsers.
 */
export function NotificationOptIn({
  venueId,
  venueName = 'this restaurant',
  guestId = null,
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissedThisView, setIsDismissedThisView] = useState(false);
  const [permissionBlocked, setPermissionBlocked] = useState(false);
  const [showInAppNotice, setShowInAppNotice] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const shouldReduceMotion = useReducedMotion();

  const isIOS = isIOSDevice();
  const isPWA = isStandalonePWA();
  const inAppBrowser = isInAppBrowser();

  useEffect(() => {
    // 1. If already enabled/subscribed for this venue, stop showing permanently
    if (hasUserEnabledNotifications(venueId)) {
      return;
    }

    let isMounted = true;
    let timerId;

    async function checkExisting() {
      try {
        // Check PushManager subscription
        const existingSub = await getExistingSubscription();
        if (existingSub) {
          markNotificationsEnabled(venueId);
          if (isMounted) setIsSubscribed(true);
          return;
        }

        // Check if native permission was already granted
        const perm = getPermissionStatus();
        if (perm === 'granted') {
          // Attempt silent auto-link
          try {
            await subscribeToPush(venueId, guestId);
            if (isMounted) {
              setIsSubscribed(true);
              markNotificationsEnabled(venueId);
            }
            return;
          } catch {
            // Fall through to show prompt
          }
        } else if (perm === 'denied') {
          if (isMounted) setPermissionBlocked(true);
        }

        // Show the prompt after 1.5s delay on initial load/scan
        timerId = setTimeout(() => {
          if (isMounted && !isDismissedThisView) {
            setIsVisible(true);
          }
        }, 1500);
      } catch (err) {
        console.warn('Notification opt-in init check:', err);
        // Still show prompt if supported
        timerId = setTimeout(() => {
          if (isMounted && !isDismissedThisView) {
            setIsVisible(true);
          }
        }, 1500);
      }
    }

    checkExisting();

    return () => {
      isMounted = false;
      if (timerId) clearTimeout(timerId);
    };
  }, [venueId, guestId, isDismissedThisView]);

  // Handle Enable click
  const handleEnable = async () => {
    // If in-app browser (e.g. Instagram/WhatsApp built-in webview)
    if (inAppBrowser) {
      setShowInAppNotice(true);
      return;
    }

    // If iOS Safari outside standalone PWA, guide user to Add to Home Screen
    if (isIOS && !isPWA) {
      setShowIOSGuide(true);
      return;
    }

    try {
      setIsLoading(true);
      setPermissionBlocked(false);
      await subscribeToPush(venueId, guestId);
      markNotificationsEnabled(venueId);
      setIsSubscribed(true);
      // Auto-hide success pill after 2.8s
      setTimeout(() => {
        setIsVisible(false);
      }, 2800);
    } catch (err) {
      console.warn('Subscription attempt message:', err?.message);
      if (
        err?.message?.includes('denied') ||
        err?.message?.includes('blocked') ||
        getPermissionStatus() === 'denied'
      ) {
        setPermissionBlocked(true);
      } else if (isIOS && !isPWA) {
        setShowIOSGuide(true);
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Dismiss for current view only — DOES NOT suppress on next page reload or QR scan
  const handleDismiss = () => {
    setIsDismissedThisView(true);
    setIsVisible(false);
    setShowIOSGuide(false);
    setShowInAppNotice(false);
  };

  // Copy current URL for in-app browser opening
  const handleCopyLink = () => {
    try {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(window.location.href);
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
      }
    } catch {}
  };

  // If already subscribed, render temporary success badge
  if (isSubscribed && isVisible) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : -20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : -20, scale: 0.95 }}
          transition={{
            duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_MODAL,
            ease: TRANSITION_EASE,
          }}
          className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:top-5 sm:max-w-md z-50 pointer-events-auto"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-[#0E1016]/98 backdrop-blur-xl p-3.5 text-[#F4F5F7] shadow-2xl border border-[#C6FF3D]/40 ring-1 ring-[#C6FF3D]/20">
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl bg-[#C6FF3D]/15 text-[#C6FF3D]">
              <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-heading font-bold text-[#F4F5F7]">
                Table Offers Activated!
              </p>
              <p className="text-[11px] text-[#8A8F9C] truncate">
                You will receive instant discounts &amp; specials from {venueName}.
              </p>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && !isDismissedThisView && !hasUserEnabledNotifications(venueId) && (
        <motion.div
          initial={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -24, scale: 0.96 }
          }
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={
            shouldReduceMotion
              ? { opacity: 0 }
              : { opacity: 0, y: -24, scale: 0.96 }
          }
          transition={{
            duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_MODAL,
            ease: TRANSITION_EASE,
          }}
          className="fixed top-4 left-3 right-3 sm:left-auto sm:right-6 sm:top-5 sm:max-w-md z-50 pointer-events-auto"
        >
          <div className="relative overflow-hidden rounded-3xl bg-[#0C0E14]/98 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.85)] border border-white/[0.12] ring-1 ring-white/5 transition-all">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full bg-[#C6FF3D]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 h-28 w-28 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              aria-label="Close notification prompt"
              className="absolute top-3 right-3 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.08] transition-colors z-10 cursor-pointer"
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>

            {/* Header Perk Badge */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#C6FF3D]/10 border border-[#C6FF3D]/25 text-[#C6FF3D] font-mono text-[10px] font-semibold tracking-wide uppercase">
                <span className="h-1.5 w-1.5 rounded-full bg-[#C6FF3D] animate-ping" />
                Table Perk &bull; Live Offers
              </span>
            </div>

            {/* Content Section */}
            <div className="flex items-start gap-3.5 pr-6">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-[#1A1E29] to-[#12151E] border border-white/10 text-[#C6FF3D] shadow-inner">
                <Sparkles className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm sm:text-base font-heading font-bold text-[#F4F5F7] leading-snug">
                  Unlock Secret Table Discounts
                </h4>
                <p className="text-xs text-[#8A8F9C] mt-1 leading-relaxed">
                  Get notified when {venueName} drops flash bill discounts, promo coupons, and chef specials.
                </p>
              </div>
            </div>

            {/* Feature Highlights Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2 border-t border-white/[0.06]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#A2A7B5] font-mono">
                <Tag className="h-3 w-3 text-[#C6FF3D]" strokeWidth={1.5} />
                Instant Coupons
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#A2A7B5] font-mono">
                <Bell className="h-3 w-3 text-[#C6FF3D]" strokeWidth={1.5} />
                Flash Deals
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/[0.04] border border-white/[0.06] text-[10px] text-[#A2A7B5] font-mono">
                ✨ Zero Spam
              </span>
            </div>

            {/* State A: Permission Blocked Instructions */}
            {permissionBlocked ? (
              <div className="mt-3.5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-2">
                <div className="flex items-start gap-2 text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="block font-semibold">Notifications are blocked in your browser</strong>
                    Tap the <strong>lock icon 🔒</strong> in your address bar, tap <strong>Site Settings</strong> &rarr; <strong>Notifications</strong> &rarr; choose <strong>Allow</strong>.
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleEnable}
                    className="flex-1 py-1.5 rounded-full bg-[#C6FF3D] text-[#07080B] text-xs font-semibold hover:bg-[#b8f52e] transition-colors"
                  >
                    I Allowed It &bull; Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-xs text-[#8A8F9C] hover:text-[#F4F5F7] transition-colors"
                  >
                    Not Now
                  </button>
                </div>
              </div>
            ) : showInAppNotice ? (
              /* State B: In-App Browser (WhatsApp / Instagram / FB WebView) */
              <div className="mt-3.5 p-3 rounded-2xl bg-[#141721] border border-white/10 space-y-2.5">
                <p className="text-[11px] text-[#F4F5F7] leading-relaxed">
                  You are viewing this inside an in-app browser. Open in <strong>Chrome</strong> or <strong>Safari</strong> to enable table offers!
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full bg-[#C6FF3D] text-[#07080B] text-xs font-semibold hover:bg-[#b8f52e] transition-colors"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="h-3.5 w-3.5" /> Link Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" /> Copy Link &amp; Open Chrome
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-3 py-2 text-xs text-[#8A8F9C] hover:text-[#F4F5F7] transition-colors"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : showIOSGuide ? (
              /* State C: iOS Safari Add-To-Home-Screen Walkthrough */
              <div className="mt-3.5 p-3 rounded-2xl bg-[#141721] border border-white/10 space-y-2.5">
                <div className="text-[11px] text-[#F4F5F7] space-y-1.5">
                  <p className="font-semibold text-[#C6FF3D]">On iPhone / iPad:</p>
                  <div className="flex items-center gap-2 text-xs text-[#8A8F9C]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white font-mono text-[10px]">1</span>
                    <span>Tap Safari's <strong className="text-white">Share</strong> button (<Share className="inline h-3.5 w-3.5 text-[#C6FF3D]" strokeWidth={2} />)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8A8F9C]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white font-mono text-[10px]">2</span>
                    <span>Select <strong className="text-white">Add to Home Screen</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-[#8A8F9C]">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-white font-mono text-[10px]">3</span>
                    <span>Open from Home Screen to receive live offer alerts!</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2 rounded-full bg-[#C6FF3D] text-[#07080B] text-xs font-semibold hover:bg-[#b8f52e] transition-colors"
                >
                  Got It
                </button>
              </div>
            ) : (
              /* State D: Normal Standard Opt-In Buttons */
              <div className="flex items-center gap-2.5 mt-4">
                <button
                  type="button"
                  onClick={handleEnable}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#C6FF3D] hover:bg-[#b8f52e] active:scale-[0.98] px-4 py-2.5 min-h-[42px] text-xs font-semibold text-[#07080B] transition-all shadow-[0_4px_16px_rgba(198,255,61,0.25)] hover:shadow-[0_4px_20px_rgba(198,255,61,0.4)] disabled:opacity-60 cursor-pointer"
                >
                  {isLoading ? (
                    <div className="h-3.5 w-3.5 border-2 border-[#07080B]/30 border-t-[#07080B] rounded-full animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  <span>{isLoading ? 'Enabling Offers...' : 'Enable Table Offers'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-full px-3.5 py-2.5 min-h-[42px] text-xs font-medium text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.05] transition-colors cursor-pointer"
                >
                  Maybe Later
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default NotificationOptIn;
