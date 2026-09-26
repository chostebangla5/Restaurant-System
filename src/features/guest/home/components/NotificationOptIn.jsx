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

  /* ─── Shared light-theme inline styles ─── */
  const s = {
    card: {
      background: '#FFFFFF',
      border: '1px solid rgba(0,0,0,0.08)',
      boxShadow: '0 12px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05)',
    },
    accent: '#E23744',
    accentLight: 'rgba(226,55,68,0.08)',
    accentBorder: 'rgba(226,55,68,0.15)',
    text: '#1A1A1A',
    textSecondary: '#4A4A4A',
    textMuted: '#8C8C8C',
    surface2: '#F4F3EF',
    border: 'rgba(0,0,0,0.06)',
    green: '#1BA672',
    greenLight: 'rgba(27,166,114,0.08)',
    amber: '#D97706',
    amberLight: 'rgba(245,158,11,0.08)',
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
          <div className="flex items-center gap-3 rounded-2xl backdrop-blur-xl p-3.5"
            style={{ ...s.card, borderColor: 'rgba(27,166,114,0.2)' }}>
            <div className="flex-shrink-0 flex h-9 w-9 items-center justify-center rounded-xl"
              style={{ background: s.greenLight, color: s.green }}>
              <CheckCircle2 className="h-5 w-5" strokeWidth={2} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold" style={{ color: s.text }}>
                Table Offers Activated!
              </p>
              <p className="text-[11px] truncate" style={{ color: s.textMuted }}>
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
          <div className="relative overflow-hidden rounded-2xl backdrop-blur-xl p-4 sm:p-5 transition-all"
            style={s.card}>
            {/* Subtle Background Glow */}
            <div className="absolute -top-12 -right-12 h-36 w-36 rounded-full blur-3xl pointer-events-none"
              style={{ background: 'rgba(226,55,68,0.06)' }} />

            {/* Close Button */}
            <button
              onClick={handleDismiss}
              aria-label="Close notification prompt"
              className="absolute top-3 right-3 p-2 min-h-[36px] min-w-[36px] flex items-center justify-center rounded-full transition-colors z-10 cursor-pointer"
              style={{ color: s.textMuted }}
            >
              <X className="h-4 w-4" strokeWidth={1.75} />
            </button>

            {/* Header Perk Badge */}
            <div className="flex items-center gap-1.5 mb-2.5">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-wide uppercase"
                style={{ background: s.accentLight, border: `1px solid ${s.accentBorder}`, color: s.accent }}>
                <span className="h-1.5 w-1.5 rounded-full animate-ping" style={{ background: s.accent }} />
                Table Perk &bull; Live Offers
              </span>
            </div>

            {/* Content Section */}
            <div className="flex items-start gap-3.5 pr-6">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-2xl"
                style={{ background: s.accentLight, border: `1px solid ${s.accentBorder}`, color: s.accent }}>
                <Sparkles className="h-5 w-5" strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm sm:text-base font-bold leading-snug" style={{ color: s.text }}>
                  Unlock Secret Table Discounts
                </h4>
                <p className="text-xs mt-1 leading-relaxed" style={{ color: s.textMuted }}>
                  Get notified when {venueName} drops flash bill discounts, promo coupons, and chef specials.
                </p>
              </div>
            </div>

            {/* Feature Highlights Pills */}
            <div className="flex flex-wrap items-center gap-1.5 mt-3 pt-2" style={{ borderTop: `1px solid ${s.border}` }}>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{ background: s.surface2, border: `1px solid ${s.border}`, color: s.textSecondary }}>
                <Tag className="h-3 w-3" style={{ color: s.accent }} strokeWidth={1.5} />
                Instant Coupons
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{ background: s.surface2, border: `1px solid ${s.border}`, color: s.textSecondary }}>
                <Bell className="h-3 w-3" style={{ color: s.accent }} strokeWidth={1.5} />
                Flash Deals
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium"
                style={{ background: s.surface2, border: `1px solid ${s.border}`, color: s.textSecondary }}>
                ✨ Zero Spam
              </span>
            </div>

            {/* State A: Permission Blocked Instructions */}
            {permissionBlocked ? (
              <div className="mt-3.5 p-3 rounded-xl space-y-2"
                style={{ background: s.amberLight, border: `1px solid rgba(245,158,11,0.15)` }}>
                <div className="flex items-start gap-2" style={{ color: s.amber }}>
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" strokeWidth={1.75} />
                  <div className="text-[11px] leading-relaxed">
                    <strong className="block font-semibold" style={{ color: s.text }}>Notifications are blocked</strong>
                    <span style={{ color: s.textMuted }}>
                      Tap the <strong>lock icon 🔒</strong> in your address bar, tap <strong>Site Settings</strong> &rarr; <strong>Notifications</strong> &rarr; choose <strong>Allow</strong>.
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleEnable}
                    className="flex-1 py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                    style={{ background: s.accent, color: '#fff' }}
                  >
                    I Allowed It &bull; Retry
                  </button>
                  <button
                    type="button"
                    onClick={handleDismiss}
                    className="px-3 py-1.5 text-xs transition-colors cursor-pointer"
                    style={{ color: s.textMuted }}
                  >
                    Not Now
                  </button>
                </div>
              </div>
            ) : showInAppNotice ? (
              /* State B: In-App Browser (WhatsApp / Instagram / FB WebView) */
              <div className="mt-3.5 p-3 rounded-xl space-y-2.5"
                style={{ background: s.surface2, border: `1px solid ${s.border}` }}>
                <p className="text-[11px] leading-relaxed" style={{ color: s.text }}>
                  You are viewing this inside an in-app browser. Open in <strong>Chrome</strong> or <strong>Safari</strong> to enable table offers!
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                    style={{ background: s.accent, color: '#fff' }}
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
                    className="px-3 py-2 text-xs transition-colors cursor-pointer"
                    style={{ color: s.textMuted }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ) : showIOSGuide ? (
              /* State C: iOS Safari Add-To-Home-Screen Walkthrough */
              <div className="mt-3.5 p-3 rounded-xl space-y-2.5"
                style={{ background: s.surface2, border: `1px solid ${s.border}` }}>
                <div className="text-[11px] space-y-1.5" style={{ color: s.text }}>
                  <p className="font-semibold" style={{ color: s.accent }}>On iPhone / iPad:</p>
                  <div className="flex items-center gap-2 text-xs" style={{ color: s.textMuted }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: s.accentLight, color: s.accent }}>1</span>
                    <span>Tap Safari's <strong style={{ color: s.text }}>Share</strong> button (<Share className="inline h-3.5 w-3.5" style={{ color: s.accent }} strokeWidth={2} />)</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: s.textMuted }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: s.accentLight, color: s.accent }}>2</span>
                    <span>Select <strong style={{ color: s.text }}>Add to Home Screen</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-xs" style={{ color: s.textMuted }}>
                    <span className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold"
                      style={{ background: s.accentLight, color: s.accent }}>3</span>
                    <span>Open from Home Screen to receive live offer alerts!</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full py-2 rounded-full text-xs font-semibold transition-colors cursor-pointer"
                  style={{ background: s.accent, color: '#fff' }}
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
                  className="flex-1 flex items-center justify-center gap-2 rounded-full active:scale-[0.98] px-4 py-2.5 min-h-[42px] text-xs font-semibold transition-all disabled:opacity-60 cursor-pointer"
                  style={{
                    background: s.accent,
                    color: '#fff',
                    boxShadow: '0 4px 16px rgba(226,55,68,0.2)',
                  }}
                >
                  {isLoading ? (
                    <div className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" strokeWidth={2} />
                  )}
                  <span>{isLoading ? 'Enabling Offers...' : 'Enable Table Offers'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-full px-3.5 py-2.5 min-h-[42px] text-xs font-medium transition-colors cursor-pointer"
                  style={{ color: s.textMuted }}
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
