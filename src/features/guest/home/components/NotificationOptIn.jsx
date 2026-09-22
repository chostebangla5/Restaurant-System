import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, BellRing, X, Sparkles } from 'lucide-react';
import {
  isPushSupported,
  getPermissionStatus,
  subscribeToPush,
  getExistingSubscription,
} from '@/lib/pushSubscription';

/**
 * Guest-side notification opt-in banner — Royal Dhaba themed.
 * Shows a subtle, attractive prompt for guests to enable push notifications.
 *
 * Usage: <NotificationOptIn venueId="..." venueName="..." />
 */
export function NotificationOptIn({ venueId, venueName = 'this restaurant', guestId = null }) {
  const [isVisible, setIsVisible] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Don't show if push not supported
    if (!isPushSupported()) return;

    // Check if already dismissed this session
    const dismissed = sessionStorage.getItem(`notif_dismissed_${venueId}`);
    if (dismissed) return;

    // Check if already subscribed
    const checkSubscription = async () => {
      const existing = await getExistingSubscription();
      if (existing) {
        setIsSubscribed(true);
        return;
      }

      const permission = getPermissionStatus();
      if (permission === 'denied') return; // User blocked it
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

      // Show the opt-in after a delay
      const timer = setTimeout(() => setIsVisible(true), 3000);
      return () => clearTimeout(timer);
    };

    checkSubscription();
  }, [venueId, guestId]);

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
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 20 }}
          className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:max-w-sm"
        >
          <div className="flex items-center gap-2 rounded-2xl bg-[#D4AF37] px-4 py-3 text-[#2B0E14] shadow-xl font-body border border-[#E5C158]">
            <BellRing className="h-4 w-4 flex-shrink-0 text-[#2B0E14]" />
            <span className="text-sm font-bold">Notifications enabled! You'll get the best deals.</span>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      {isVisible && !isDismissed && (
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 40, scale: 0.95 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="fixed bottom-4 left-4 right-4 z-40 sm:left-auto sm:right-4 sm:max-w-sm"
        >
          <div className="relative overflow-hidden rounded-2xl bg-dhaba-plum p-4 shadow-2xl shadow-black/40 border border-dhaba-gold/20 font-body">
            {/* Decorative gold gradient corner */}
            <div className="absolute top-0 right-0 h-24 w-24 bg-gradient-to-bl from-dhaba-gold/15 to-transparent rounded-bl-full" />

            {/* Dismiss button */}
            <button
              onClick={handleDismiss}
              className="absolute top-3 right-3 p-1 rounded-lg text-dhaba-gold/30 hover:text-dhaba-gold/70 hover:bg-dhaba-gold/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Content */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-xl bg-dhaba-gold/15 border border-dhaba-gold/30 shadow-gold">
                <Sparkles className="h-5 w-5 text-dhaba-gold" />
              </div>
              <div className="flex-1 pr-4">
                <h4 className="text-sm font-bold text-dhaba-ivory mb-0.5 font-serif">
                  Get exclusive deals ✨
                </h4>
                <p className="text-xs text-dhaba-gold/50 leading-relaxed">
                  Enable notifications for offers & discounts from {venueName}
                </p>
              </div>
            </div>

            {/* Action */}
            <div className="flex items-center gap-2 mt-4">
              <button
                onClick={handleSubscribe}
                disabled={isLoading}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-dhaba-sindoor hover:bg-dhaba-sindoor-hover px-4 py-2.5 text-sm font-semibold text-dhaba-ivory transition-all active:scale-[0.98] shadow-sindoor disabled:opacity-60"
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Bell className="h-4 w-4" />
                )}
                {isLoading ? 'Enabling...' : 'Enable Offers'}
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-xl px-3 py-2.5 text-xs font-medium text-dhaba-gold/40 hover:text-dhaba-gold/70 hover:bg-dhaba-gold/10 transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
