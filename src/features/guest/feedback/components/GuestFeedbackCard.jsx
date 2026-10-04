import React, { useState, useEffect } from 'react';
import { Star, Check, MessageSquare, Send, ExternalLink, ThumbsUp, Heart, Sparkles } from 'lucide-react';
import { submitFeedback } from '@/features/staff/feedback/api/feedbackApi';
import toast from 'react-hot-toast';

export const FIRANGI_DHABA_GOOGLE_REVIEW_URL =
  'https://www.google.com/search?q=firangi+dhaba&oq=fir&gs_lcrp=EgZjaHJvbWUqCAgBEEUYJxg7MgYIABBFGDkyCAgBEEUYJxg7MgwIAhAAGEMYgAQYigUyDAgDEAAYQxiABBiKBTIPCAQQABhDGLEDGIAEGIoFMgYIBRBFGDwyBggGEEUYPTIGCAcQRRg90gEIMTg3MGowajmoAgawAgHxBcXZ_hbrLG46&sourceid=chrome&source=chrome.ob&ie=UTF-8#lrd=0x3a020b5c1e665a75:0x35b9182a3b42578,1,,,,';

const QUICK_TAGS = [
  'Delicious Food',
  'Quick Service',
  'Great Ambience',
  'Friendly Staff',
  'Generous Portions',
  'Authentic Taste',
];

const RATING_LABELS = {
  1: 'Poor 😞',
  2: 'Fair 😐',
  3: 'Good 🙂',
  4: 'Very Good! 😊',
  5: 'Exceptional! 🌟',
};

function GoogleReviewBanner({
  isHighlight = false,
  venueName = 'Firangi Dhaba',
  googleReviewUrl = FIRANGI_DHABA_GOOGLE_REVIEW_URL,
}) {
  return (
    <div
      className={`p-4 rounded-2xl transition-all border ${
        isHighlight
          ? 'bg-gradient-to-r from-amber-500/10 via-rose-500/10 to-amber-500/10 border-amber-500/30 shadow-sm'
          : 'bg-surface-2 border-border'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-base">🌟</span>
            <h4 className="font-bold text-sm text-text">
              Review {venueName} on Google
            </h4>
          </div>
          <p className="text-xs text-muted leading-relaxed">
            Loved your meal? Sharing your review on Google takes 10 seconds and helps our team immensely!
          </p>
        </div>

        <a
          href={googleReviewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs bg-[#4285F4] hover:bg-[#3367D6] text-white shadow-sm transition-all active:scale-95 shrink-0"
        >
          <span>Write a Google Review</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      </div>
    </div>
  );
}

export function GuestFeedbackCard({
  venueId,
  tableSessionId = null,
  guestName: initialName = '',
  guestPhone: initialPhone = '',
  googleReviewUrl = FIRANGI_DHABA_GOOGLE_REVIEW_URL,
  venueName = 'Firangi Dhaba',
  onSubmitted,
}) {
  const storageKey = `ts_feedback_submitted_${tableSessionId || venueId || 'guest'}`;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [foodRating, setFoodRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [ambienceRating, setAmbienceRating] = useState(5);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [guestName, setGuestName] = useState(initialName);
  const [guestPhone, setGuestPhone] = useState(initialPhone);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(() => {
    return typeof window !== 'undefined' && localStorage.getItem(storageKey) === 'true';
  });

  useEffect(() => {
    if (initialName && !guestName) setGuestName(initialName);
    if (initialPhone && !guestPhone) setGuestPhone(initialPhone);
  }, [initialName, initialPhone]);

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e?.preventDefault?.();
    if (!venueId) {
      toast.error('Unable to submit feedback at this moment.');
      return;
    }

    setIsSubmitting(true);
    try {
      const fullComment = [
        selectedTags.length > 0 ? `[Highlights: ${selectedTags.join(', ')}]` : '',
        comment.trim(),
      ]
        .filter(Boolean)
        .join(' ');

      await submitFeedback({
        venueId,
        tableSessionId,
        rating,
        foodRating,
        serviceRating,
        ambienceRating,
        comment: fullComment,
        guestName,
        guestPhone,
      });

      setIsSubmitted(true);
      if (typeof window !== 'undefined') {
        localStorage.setItem(storageKey, 'true');
      }
      toast.success('Thank you! Your feedback has been received.');
      onSubmitted?.();
    } catch (err) {
      console.error('Failed to submit feedback:', err);
      toast.error(err.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="g-card p-5 sm:p-6 space-y-5 text-center transition-all border border-emerald-500/20 bg-emerald-500/[0.02]">
        <div className="mx-auto w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500">
          <Heart className="w-7 h-7 fill-emerald-500/20" />
        </div>

        <div className="space-y-1.5">
          <h3 className="font-heading font-bold text-lg text-text">
            Thank you for dining with us!
          </h3>
          <p className="text-xs text-muted max-w-sm mx-auto leading-relaxed">
            Your review was shared directly with our head chef and management team. We hope to welcome you back soon!
          </p>
        </div>

        <GoogleReviewBanner
          isHighlight={true}
          venueName={venueName}
          googleReviewUrl={googleReviewUrl}
        />

        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsSubmitted(false)}
            className="text-[11px] text-muted hover:text-text underline cursor-pointer"
          >
            Edit your feedback
          </button>
        </div>
      </div>
    );
  }

  const activeRating = hoverRating || rating;

  return (
    <div className="g-card p-5 sm:p-6 space-y-5 transition-all">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 pb-3 border-b border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex p-1.5 rounded-lg bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Sparkles className="h-4 w-4" />
            </span>
            <h3 className="font-heading font-bold text-base text-text">
              How was your experience?
            </h3>
          </div>
          <p className="text-xs text-muted">
            Rate your visit to {venueName} — your feedback helps us serve you better.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Main 5-Star Rating */}
        <div className="text-center py-2 space-y-2">
          <div className="flex items-center justify-center gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="p-1 cursor-pointer transition-transform hover:scale-125 active:scale-95 touch-manipulation"
                aria-label={`Rate ${star} stars`}
              >
                <Star
                  className={`h-8 w-8 transition-colors ${
                    star <= activeRating
                      ? 'fill-amber-400 text-amber-400 drop-shadow-sm'
                      : 'text-border fill-transparent'
                  }`}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>
          <p className="font-semibold text-xs text-amber-500 min-h-[18px]">
            {RATING_LABELS[activeRating] || ''}
          </p>
        </div>

        {/* Quick Praise / Feedback Chips */}
        <div className="space-y-2">
          <label className="block text-xs font-medium text-text/80">
            What stood out to you?
          </label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_TAGS.map((tag) => {
              const isSelected = selectedTags.includes(tag);
              return (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-accent/15 border-accent text-accent font-semibold shadow-sm'
                      : 'bg-surface-2 border-border text-muted hover:text-text'
                  }`}
                >
                  {tag} {isSelected && '✓'}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sub-Ratings Accordion / Mini Grid */}
        <div className="grid grid-cols-3 gap-2 pt-1 pb-1">
          {[
            { label: 'Food', val: foodRating, set: setFoodRating },
            { label: 'Service', val: serviceRating, set: setServiceRating },
            { label: 'Ambience', val: ambienceRating, set: setAmbienceRating },
          ].map((cat) => (
            <div
              key={cat.label}
              className="p-2.5 rounded-xl bg-surface-2 border border-border text-center space-y-1.5"
            >
              <span className="text-[11px] font-medium text-muted block">
                {cat.label}
              </span>
              <div className="flex items-center justify-center gap-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => cat.set(s)}
                    className="cursor-pointer transition-transform hover:scale-110"
                    aria-label={`${cat.label} ${s} stars`}
                  >
                    <Star
                      className={`h-3.5 w-3.5 ${
                        s <= cat.val
                          ? 'fill-amber-400 text-amber-400'
                          : 'text-border fill-transparent'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Comment Box */}
        <div className="space-y-1.5">
          <label className="block text-xs font-medium text-text/80">
            Comments &amp; Suggestions (Optional)
          </label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us what you enjoyed, or how we can improve next time..."
            rows={2}
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2.5 text-xs text-text placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent resize-none transition-all"
          />
        </div>

        {/* Guest name/phone prefill */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <input
            type="text"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            placeholder="Your Name (Optional)"
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-xs text-text placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
          />
          <input
            type="tel"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            placeholder="Phone Number (Optional)"
            className="w-full rounded-xl border border-border bg-surface px-3.5 py-2 text-xs text-text placeholder:text-muted/60 focus:outline-none focus:ring-1 focus:ring-accent"
          />
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-3 rounded-xl font-bold text-xs bg-accent text-bg hover:opacity-90 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm active:scale-[0.98] disabled:opacity-50"
        >
          {isSubmitting ? (
            <div className="h-4 w-4 border-2 border-bg border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <Send className="h-3.5 w-3.5" />
              <span>Submit Restaurant Feedback</span>
            </>
          )}
        </button>

        {/* Direct Google Review Link option */}
        <div className="pt-2 border-t border-border">
          <GoogleReviewBanner
            isHighlight={false}
            venueName={venueName}
            googleReviewUrl={googleReviewUrl}
          />
        </div>
      </form>
    </div>
  );
}

export default GuestFeedbackCard;
