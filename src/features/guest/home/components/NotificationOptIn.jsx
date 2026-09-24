import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Bell, BellRing, X, Tag, Share } from 'lucide-react';
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  getExistingSubscription,
} from '@/lib/pushSubscription';
import { TRANSITION_EASE, DURATION_MODAL, DURATION_REDUCED } from '@/lib/motion';

/**
 * Guest-side notification opt-in banner — Tech Studio themed.
 * Shows a subtle, attractive prompt for guests to enable push notifications.
 *
 * Usage: <NotificationOptIn venueId="..." venueName="..." />
 */
export function NotificationOptIn({ venueId, venueName = 'this restaurant', guestId = null }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const shouldReduceMotion = useReducedMotion();

  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = typeof window !== 'undefined' && (window.navigator.standalone || window.matchMedia('(display-mode: standalone)').matches);
  const [isIOSPrompt, setIsIOSPrompt] = useState(false);

  useEffect(() => {
    // Check if dismissed this session (or forced via ?notif=1 for testing)
    const forceShow = typeof window !== 'undefined' && window.location.search.includes('notif=1');
    const dismissed = sessionStorage.getItem(`notif_dismissed_${venueId}`);
    if (dismissed && !forceShow) return;

    // On iOS Safari outside standalone PWA mode, Web Push is only supported if installed to Home Screen
    if (isIOS && !isStandalone) {
      const timer = setTimeout(() => {
        setIsIOSPrompt(true);
        setIsVisible(true);
      }, 2500);
      return () => clearTimeout(timer);
    }

    // Don't show if push not supported at all and not iOS
    if (!isPushSupported()) return;

    // Check if already subscribed
    let timerId;
    const checkSubscription = async () => {
      try {
        const existing = await getExistingSubscription();
        if (existing) {
          setIsSubscribed(true);
          return;
        }

        const permission = getPermissionStatus();
        if (permission === 'denied' && !forceShow) return; // User blocked it
        if (permission === 'granted') {
          // Already granted but not subscribed — auto-subscribe
          try {
            await subscribeToPush(venueId, guestId);
            setIsSubscribed(true);
            return;
          } catch {
            // Show prompt anyway
          }
        }

        // Show the opt-in after a slight delay
        timerId = setTimeout(() => setIsVisible(true), 2500);
      } catch (err) {
        console.warn('Subscription check error:', err);
      }
    };

    checkSubscription();
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [venueId, guestId, isIOS, isStandalone]);

  const handleSubscribe = async () => {
    try {
      setIsLoading(true);
      await subscribeToPush(venueId, guestId);
      setIsSubscribed(true);
      setIsVisible(false);
    } catch (err) {
      console.error('Failed to subscribe:', err);
      if (err.message?.includes('denied')) {
        setIsVisible(false);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDismiss = () => {
    setIsDismissed(true);
    setIsVisible(false);
    sessionStorage.setItem(`notif_dismissed_${venueId}`, 'true');
  };

  // If subscribed, show a brief success indicator
  if (isSubscribed) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 12 }}
          transition={{ duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_MODAL, ease: TRANSITION_EASE }}
          className="fixed bottom-6 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm pb-[env(safe-area-inset-bottom)]"
        >
          <div className="flex items-center gap-2.5 rounded-full bg-[#0E1016] px-4 py-3 text-[#C6FF3D] shadow-2xl border border-[#C6FF3D]/30 font-sans">
            <BellRing className="h-4 w-4 flex-shrink-0 text-[#C6FF3D]" strokeWidth={1.5} />
            <span className="text-xs font-semibold">Notifications enabled! You'll get the best deals.</span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={shouldReduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: shouldReduceMotion ? DURATION_REDUCED : DURATION_MODAL, ease: TRANSITION_EASE }}
          className="fixed bottom-6 left-4 right-4 z-50 sm:left-auto sm:right-6 sm:bottom-6 sm:max-w-sm pb-[env(safe-area-inset-bottom)]"
        >
          <div className="relative overflow-hidden rounded-card bg-[#0E1016] p-5 shadow-2xl border border-white/[0.08]">
            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              aria-label="Dismiss notification prompt"
              className="absolute top-2.5 right-2.5 p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.06] transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3.5">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#141721] border border-white/[0.08] text-[#C6FF3D]">
                <Tag className="h-4 w-4" strokeWidth={1.5} />
              </div>
              <div className="flex-1 pr-4">
                <h4 className="text-sm font-heading font-semibold text-[#F4F5F7] mb-1">
                  Get exclusive deals
                </h4>
                <p className="text-xs text-[#8A8F9C] leading-relaxed">
                  Enable notifications for offers &amp; discounts from {venueName}
                </p>
              </div>
            </div>

            {/* Action */}
            {isIOSPrompt ? (
              <div className="flex flex-col gap-2.5 mt-4">
                <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-[11px] text-[#F4F5F7]">
                  <Share className="h-4 w-4 text-[#C6FF3D] shrink-0" strokeWidth={1.75} />
                  <span>Tap <strong>Share</strong>, then <strong>Add to Home Screen</strong> to unlock live offers on iPhone.</span>
                </div>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="w-full flex items-center justify-center rounded-full bg-[#C6FF3D] hover:bg-[#b8f52e] px-4 py-2.5 min-h-[44px] text-xs font-semibold text-[#07080B] transition-all"
                >
                  Got it
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-4">
                <button
                  type="button"
                  onClick={handleSubscribe}
                  disabled={isLoading}
                  className="flex-1 flex items-center justify-center gap-2 rounded-full bg-[#C6FF3D] hover:bg-[#b8f52e] px-4 py-2.5 min-h-[44px] text-xs font-semibold text-[#07080B] transition-all disabled:opacity-60"
                >
                  {isLoading ? (
                    <div className="h-3.5 w-3.5 border-2 border-[#07080B]/30 border-t-[#07080B] rounded-full animate-spin" />
                  ) : (
                    <Bell className="h-3.5 w-3.5" strokeWidth={1.5} />
                  )}
                  {isLoading ? 'Enabling...' : 'Enable Offers'}
                </button>
                <button
                  type="button"
                  onClick={handleDismiss}
                  className="rounded-full px-3.5 py-2.5 min-h-[44px] text-xs font-medium text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.04] transition-colors"
                >
                  Not now
                </button>
              </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
