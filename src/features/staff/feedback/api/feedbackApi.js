import { supabase } from '@/lib/supabase';

/**
 * Fetch all feedback for a venue
 */
export async function fetchFeedback(venueId, { rating = null, dateFrom = '', dateTo = '' } = {}) {
  let query = supabase
    .from('feedback')
    .select('*')
    .eq('venue_id', venueId)
    .order('created_at', { ascending: false });

  if (rating) {
    query = query.eq('rating', rating);
  }
  if (dateFrom) {
    query = query.gte('created_at', dateFrom);
  }
  if (dateTo) {
    query = query.lte('created_at', dateTo + 'T23:59:59Z');
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

/**
 * Get aggregate feedback stats for a venue
 */
export async function fetchFeedbackStats(venueId) {
  const { data: reviews, error } = await supabase
    .from('feedback')
    .select('rating, food_rating, service_rating, ambience_rating, created_at')
    .eq('venue_id', venueId);

  if (error) throw error;
  if (!reviews || reviews.length === 0) {
    return {
      totalReviews: 0,
      avgOverall: 0,
      avgFood: 0,
      avgService: 0,
      avgAmbience: 0,
      distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      thisMonth: 0,
    };
  }

  const avg = (arr) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

  const overallRatings = reviews.map((r) => r.rating);
  const foodRatings = reviews.filter((r) => r.food_rating).map((r) => r.food_rating);
  const serviceRatings = reviews.filter((r) => r.service_rating).map((r) => r.service_rating);
  const ambienceRatings = reviews.filter((r) => r.ambience_rating).map((r) => r.ambience_rating);

  const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  overallRatings.forEach((r) => { distribution[r] = (distribution[r] || 0) + 1; });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const thisMonth = reviews.filter((r) => r.created_at >= startOfMonth).length;

  return {
    totalReviews: reviews.length,
    avgOverall: avg(overallRatings),
    avgFood: avg(foodRatings),
    avgService: avg(serviceRatings),
    avgAmbience: avg(ambienceRatings),
    distribution,
    thisMonth,
  };
}
