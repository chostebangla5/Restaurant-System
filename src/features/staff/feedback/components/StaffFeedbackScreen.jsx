import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/shared/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  fetchFeedback,
  fetchFeedbackStats,
} from '../api/feedbackApi';
import {
  ChatBubbleLeftEllipsisIcon,
  StarIcon,
  ArrowPathIcon,
  FunnelIcon,
  CalendarDaysIcon,
  FireIcon,
  SparklesIcon,
  MusicalNoteIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

export function StaffFeedbackScreen() {
  const { venueId } = useAuth();

  const [feedback, setFeedback] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [ratingFilter, setRatingFilter] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const loadData = useCallback(async () => {
    if (!venueId) return;
    setIsLoading(true);
    try {
      const [fbData, statsData] = await Promise.all([
        fetchFeedback(venueId, { rating: ratingFilter, dateFrom, dateTo }),
        fetchFeedbackStats(venueId),
      ]);
      setFeedback(fbData);
      setStats(statsData);
    } catch (err) {
      toast.error('Failed to load feedback');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, ratingFilter, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatRelative = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDate(dateStr);
  };

  const renderStars = (rating, maxStars = 5) => {
    return (
      <div className="flex items-center gap-0.5">
        {Array.from({ length: maxStars }, (_, i) => (
          i < rating ? (
            <StarSolidIcon key={i} className="h-3.5 w-3.5 text-amber-400" />
          ) : (
            <StarIcon key={i} className="h-3.5 w-3.5 text-stone-300 dark:text-stone-600" />
          )
        ))}
      </div>
    );
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-emerald-600';
    if (rating >= 3.5) return 'text-amber-600';
    if (rating >= 2.5) return 'text-orange-600';
    return 'text-rose-600';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">Feedback & Reviews</h2>
          <p className="text-xs text-stone-500">Guest ratings, comments & experience insights</p>
        </div>
        <Button size="sm" variant="ghost" onClick={loadData}>
          <ArrowPathIcon className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400">
                <StarIcon className="h-5 w-5" />
              </span>
            </div>
            <p className={`text-2xl font-black ${getRatingColor(stats.avgOverall)}`}>
              {stats.avgOverall > 0 ? stats.avgOverall.toFixed(1) : '—'}
            </p>
            <p className="text-[11px] text-stone-500 mt-0.5">Overall Rating</p>
            {stats.avgOverall > 0 && (
              <div className="mt-1">{renderStars(Math.round(stats.avgOverall))}</div>
            )}
          </div>

          <RatingStatCard
            label="Food Quality"
            value={stats.avgFood}
            icon={<FireIcon className="h-5 w-5" />}
            color="text-rose-600 bg-rose-50 dark:bg-rose-950/30 dark:text-rose-400"
          />
          <RatingStatCard
            label="Service"
            value={stats.avgService}
            icon={<SparklesIcon className="h-5 w-5" />}
            color="text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400"
          />
          <RatingStatCard
            label="Ambience"
            value={stats.avgAmbience}
            icon={<MusicalNoteIcon className="h-5 w-5" />}
            color="text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400"
          />
        </div>
      )}

      {/* Rating Distribution */}
      {stats && stats.totalReviews > 0 && (
        <div className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-stone-900 dark:text-white">Rating Distribution</h3>
            <span className="text-xs text-stone-500">
              {stats.totalReviews} total · {stats.thisMonth} this month
            </span>
          </div>
          <div className="space-y-2.5">
            {[5, 4, 3, 2, 1].map((star) => {
              const count = stats.distribution[star] || 0;
              const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0;
              return (
                <button
                  key={star}
                  onClick={() => setRatingFilter(ratingFilter === star ? null : star)}
                  className={`flex items-center gap-3 w-full group transition-opacity ${ratingFilter && ratingFilter !== star ? 'opacity-40' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-1 w-14 shrink-0">
                    <span className="text-xs font-bold text-stone-700 dark:text-stone-300">{star}</span>
                    <StarSolidIcon className="h-3.5 w-3.5 text-amber-400" />
                  </div>
                  <div className="flex-1 h-3 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        star >= 4 ? 'bg-emerald-500' : star === 3 ? 'bg-amber-500' : 'bg-rose-500'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-stone-500 w-12 text-right">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </button>
              );
            })}
          </div>
          {ratingFilter && (
            <button
              onClick={() => setRatingFilter(null)}
              className="mt-3 text-xs text-brand-primary font-semibold hover:underline"
            >
              Clear filter — showing {ratingFilter}★ reviews only
            </button>
          )}
        </div>
      )}

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <FunnelIcon className="h-4 w-4 text-stone-400" />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/60 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/30"
          title="From date"
        />
        <span className="text-xs text-stone-400">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/60 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/30"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs text-brand-primary font-semibold hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="py-16 text-center space-y-3 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
            <ChatBubbleLeftEllipsisIcon className="h-10 w-10 mx-auto text-stone-300 dark:text-stone-600" />
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No feedback yet</p>
            <p className="text-xs text-stone-400">
              {ratingFilter ? `No ${ratingFilter}★ reviews found. Try clearing the filter.` : 'Guest feedback will appear here after meals'}
            </p>
          </div>
        ) : (
          feedback.map((fb) => (
            <div
              key={fb.id}
              className="p-5 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Guest info + rating */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 dark:from-brand-primary/30 dark:to-brand-primary/10 flex items-center justify-center font-bold text-xs text-brand-primary shrink-0">
                    {(fb.guest_name || fb.guest_phone || 'G').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-bold text-stone-900 dark:text-white">
                        {fb.guest_name || 'Anonymous Guest'}
                      </h4>
                      <span className="text-[11px] text-stone-400">{formatRelative(fb.created_at)}</span>
                    </div>
                    {fb.guest_phone && (
                      <p className="text-[11px] text-stone-400 font-mono">{fb.guest_phone}</p>
                    )}
                    <div className="flex items-center gap-0.5 mt-1.5">
                      {renderStars(fb.rating)}
                      <span className="ml-1.5 text-xs font-bold text-stone-700 dark:text-stone-300">
                        {fb.rating}/5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Sub-ratings */}
                <div className="flex items-center gap-3 shrink-0">
                  {fb.food_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-stone-400 mb-0.5">Food</p>
                      <p className="text-xs font-bold text-stone-700 dark:text-stone-300">{fb.food_rating}/5</p>
                    </div>
                  )}
                  {fb.service_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-stone-400 mb-0.5">Service</p>
                      <p className="text-xs font-bold text-stone-700 dark:text-stone-300">{fb.service_rating}/5</p>
                    </div>
                  )}
                  {fb.ambience_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-stone-400 mb-0.5">Vibe</p>
                      <p className="text-xs font-bold text-stone-700 dark:text-stone-300">{fb.ambience_rating}/5</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comment */}
              {fb.comment && (
                <div className="mt-3 pl-[52px]">
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed italic">
                    "{fb.comment}"
                  </p>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ─── Rating Stat Card Component ───────────────────────────────────────────────
function RatingStatCard({ label, value, icon, color }) {
  const getRatingColor = (v) => {
    if (v >= 4.5) return 'text-emerald-600';
    if (v >= 3.5) return 'text-amber-600';
    if (v >= 2.5) return 'text-orange-600';
    return 'text-rose-600';
  };

  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-xl ${color}`}>{icon}</span>
      </div>
      <p className={`text-2xl font-black ${value > 0 ? getRatingColor(value) : 'text-stone-400'}`}>
        {value > 0 ? value.toFixed(1) : '—'}
      </p>
      <p className="text-[11px] text-stone-500 mt-0.5">{label}</p>
    </div>
  );
}
