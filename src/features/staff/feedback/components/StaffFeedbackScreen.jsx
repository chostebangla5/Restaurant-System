import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/shared/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  fetchFeedback,
  fetchFeedbackStats,
} from '../api/feedbackApi';
import {
  MessageSquare,
  Star,
  RefreshCw,
  Filter,
  Calendar,
  Flame,
  Sparkles,
  Music,
} from 'lucide-react';
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
            <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" strokeWidth={1.5} />
          ) : (
            <Star key={i} className="h-3.5 w-3.5 text-white/20" strokeWidth={1.5} />
          )
        ))}
      </div>
    );
  };

  const getRatingColor = (rating) => {
    if (rating >= 4.5) return 'text-[#C6FF3D]';
    if (rating >= 3.5) return 'text-amber-400';
    if (rating >= 2.5) return 'text-amber-300';
    return 'text-rose-400';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-[#F4F5F7]">Feedback &amp; Reviews</h1>
          <p className="text-xs text-[#8A8F9C] mt-1">Guest ratings, comments & experience insights</p>
        </div>
        <Button size="md" variant="ghost" onClick={loadData} className="rounded-full text-xs font-mono text-[#8A8F9C] hover:text-[#F4F5F7]">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] transition-all">
            <div className="flex items-center justify-between mb-2">
              <span className="p-2 rounded-xl text-amber-400 bg-amber-400/10 border border-amber-400/25">
                <Star className="h-4 w-4" strokeWidth={1.5} />
              </span>
            </div>
            <p className={`text-2xl font-heading font-extrabold ${getRatingColor(stats.avgOverall)}`}>
              {stats.avgOverall > 0 ? stats.avgOverall.toFixed(1) : '—'}
            </p>
            <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C] mt-0.5">Overall Rating</p>
            {stats.avgOverall > 0 && (
              <div className="mt-1.5">{renderStars(Math.round(stats.avgOverall))}</div>
            )}
          </div>

          <RatingStatCard
            label="Food Quality"
            value={stats.avgFood}
            icon={<Flame className="h-4 w-4" strokeWidth={1.5} />}
            color="text-amber-400 bg-amber-400/10 border border-amber-400/25"
          />
          <RatingStatCard
            label="Service"
            value={stats.avgService}
            icon={<Sparkles className="h-4 w-4" strokeWidth={1.5} />}
            color="text-sky-400 bg-sky-400/10 border border-sky-400/25"
          />
          <RatingStatCard
            label="Ambience"
            value={stats.avgAmbience}
            icon={<Music className="h-4 w-4" strokeWidth={1.5} />}
            color="text-[#C6FF3D] bg-[#C6FF3D]/10 border border-[#C6FF3D]/25"
          />
        </div>
      )}

      {/* Rating Distribution */}
      {stats && stats.totalReviews > 0 && (
        <div className="p-5 rounded-card bg-[#0E1016] border border-white/[0.08]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-heading font-semibold text-[#F4F5F7]">Rating Distribution</h3>
            <span className="text-xs font-mono text-[#8A8F9C]">
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
                  <div className="flex items-center gap-1 w-14 shrink-0 font-mono">
                    <span className="text-xs font-semibold text-[#F4F5F7]">{star}</span>
                    <Star className="h-3 w-3 fill-amber-400 text-amber-400" strokeWidth={1.5} />
                  </div>
                  <div className="flex-1 h-2 rounded-full bg-[#141721] overflow-hidden border border-white/[0.06]">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        star >= 4 ? 'bg-[#C6FF3D]' : star === 3 ? 'bg-amber-400' : 'bg-rose-400'
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-[#8A8F9C] w-14 text-right">
                    {count} ({pct.toFixed(0)}%)
                  </span>
                </button>
              );
            })}
          </div>
          {ratingFilter && (
            <button
              onClick={() => setRatingFilter(null)}
              className="mt-3 text-xs font-mono text-[#C6FF3D] hover:underline"
            >
              Clear filter — showing {ratingFilter}-star reviews only
            </button>
          )}
        </div>
      )}

      {/* Date Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Filter className="h-3.5 w-3.5 text-[#8A8F9C]" strokeWidth={1.5} />
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3.5 py-1.5 rounded-full text-xs bg-[#0E1016] border border-white/[0.08] text-[#F4F5F7] outline-none focus:border-[#C6FF3D]"
          title="From date"
        />
        <span className="text-xs text-[#8A8F9C]">to</span>
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3.5 py-1.5 rounded-full text-xs bg-[#0E1016] border border-white/[0.08] text-[#F4F5F7] outline-none focus:border-[#C6FF3D]"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="text-xs font-mono text-[#C6FF3D] hover:underline"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C6FF3D] border-t-transparent" />
          </div>
        ) : feedback.length === 0 ? (
          <div className="py-16 text-center space-y-3 rounded-card bg-[#0E1016] border border-white/[0.08]">
            <MessageSquare className="h-8 w-8 mx-auto text-[#8A8F9C]" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-[#F4F5F7]">No feedback yet</p>
            <p className="text-xs text-[#8A8F9C]">
              {ratingFilter ? `No ${ratingFilter}-star reviews found. Try clearing the filter.` : 'Guest feedback will appear here after meals'}
            </p>
          </div>
        ) : (
          feedback.map((fb) => (
            <div
              key={fb.id}
              className="p-5 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                {/* Left: Guest info + rating */}
                <div className="flex items-start gap-3 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-[#141721] border border-white/[0.08] flex items-center justify-center font-mono font-bold text-xs text-[#C6FF3D] shrink-0">
                    {(fb.guest_name || fb.guest_phone || 'G').slice(0, 2).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-xs font-semibold text-[#F4F5F7]">
                        {fb.guest_name || 'Anonymous Guest'}
                      </h4>
                      <span className="text-[11px] font-mono text-[#8A8F9C]">{formatRelative(fb.created_at)}</span>
                    </div>
                    {fb.guest_phone && (
                      <p className="text-[11px] text-[#8A8F9C] font-mono">{fb.guest_phone}</p>
                    )}
                    <div className="flex items-center gap-1.5 mt-1.5">
                      {renderStars(fb.rating)}
                      <span className="text-xs font-mono font-bold text-[#F4F5F7]">
                        {fb.rating}/5
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Sub-ratings */}
                <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                  {fb.food_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-[#8A8F9C] mb-0.5">Food</p>
                      <p className="font-semibold text-[#F4F5F7]">{fb.food_rating}/5</p>
                    </div>
                  )}
                  {fb.service_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-[#8A8F9C] mb-0.5">Service</p>
                      <p className="font-semibold text-[#F4F5F7]">{fb.service_rating}/5</p>
                    </div>
                  )}
                  {fb.ambience_rating && (
                    <div className="text-center">
                      <p className="text-[10px] text-[#8A8F9C] mb-0.5">Vibe</p>
                      <p className="font-semibold text-[#F4F5F7]">{fb.ambience_rating}/5</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Comment */}
              {fb.comment && (
                <div className="mt-3 pl-12">
                  <p className="text-xs text-[#8A8F9C] leading-relaxed italic">
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
    if (v >= 4.5) return 'text-[#C6FF3D]';
    if (v >= 3.5) return 'text-amber-400';
    if (v >= 2.5) return 'text-amber-300';
    return 'text-rose-400';
  };

  return (
    <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-xl ${color}`}>{icon}</span>
      </div>
      <p className={`text-2xl font-heading font-extrabold ${value > 0 ? getRatingColor(value) : 'text-[#8A8F9C]'}`}>
        {value > 0 ? value.toFixed(1) : '—'}
      </p>
      <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C] mt-0.5">{label}</p>
    </div>
  );
}
