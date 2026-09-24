import React, { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCart } from '@/features/guest/cart/context/CartContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  Plus,
  Minus,
  ShoppingBag,
  Flame,
  Search,
  Sparkles,
  ArrowRight,
  UtensilsCrossed,
} from 'lucide-react';

/* ─── Quantity with pop animation ─── */
function QtyDisplay({ qty }) {
  const [pop, setPop] = useState(false);
  const prev = useRef(qty);

  useEffect(() => {
    if (qty !== prev.current) {
      setPop(true);
      const t = setTimeout(() => setPop(false), 200);
      prev.current = qty;
      return () => clearTimeout(t);
    }
  }, [qty]);

  return (
    <span className={`w-5 text-center text-xs font-mono font-bold text-text select-none ${pop ? 'scale-110' : ''} transition-transform`}>
      {qty}
    </span>
  );
}

export function GuestMenuScreen() {
  const { shortCode } = useParams();
  const { addToCart, updateQty, getItemQty, totalItemCount, grandTotal } = useCart();

  const [categories, setCategories] = useState([{ id: 'all', name: 'All' }]);
  const [items, setItems] = useState([]);
  const [activeCategory, setActiveCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [vegOnly, setVegOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load menu from Supabase filtered by the table's venue
  useEffect(() => {
    async function loadMenu() {
      if (!isSupabaseConfigured() || !shortCode) {
        setIsLoading(false);
        return;
      }
      try {
        setIsLoading(true);
        // 1. Resolve venue_id from table short code
        const { data: tableData } = await supabase
          .from('tables')
          .select('venue_id')
          .eq('short_code', shortCode)
          .single();

        if (!tableData?.venue_id) {
          setIsLoading(false);
          return;
        }

        const [catRes, itemRes] = await Promise.all([
          supabase
            .from('menu_categories')
            .select('*')
            .eq('venue_id', tableData.venue_id)
            .eq('is_active', true)
            .order('sort_order', { ascending: true }),
          supabase
            .from('menu_items')
            .select('*')
            .eq('venue_id', tableData.venue_id)
            .eq('is_available', true)
            .eq('is_deleted', false)
            .order('sort_order', { ascending: true }),
        ]);

        if (catRes.data && catRes.data.length > 0) {
          setCategories([{ id: 'all', name: 'All' }, ...catRes.data]);
        }
        if (itemRes.data) {
          setItems(
            itemRes.data.map((i) => ({
              id: i.id,
              name: i.name,
              description: i.description || '',
              price: Number(i.price) || 0,
              category: i.category_id,
              station: i.station || 'hot',
              is_bestseller: i.is_bestseller,
              is_veg: (i.dietary_tags || []).includes('veg'),
              tags: i.dietary_tags || [],
              image_url: i.image_url,
            }))
          );
        }
      } catch (err) {
        console.error('Error loading guest menu from Supabase:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadMenu();
  }, [shortCode]);

  const filteredItems = items.filter((item) => {
    const matchesCat = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVeg = !vegOnly || item.is_veg;
    return matchesCat && matchesSearch && matchesVeg;
  });

  // Separate Chef's Special (first bestseller) from the rest
  const chefSpecialItem = filteredItems.find((item) => item.is_bestseller);
  const regularItems = chefSpecialItem
    ? filteredItems.filter((item) => item.id !== chefSpecialItem.id)
    : filteredItems;

  const handleAdd = (item) => {
    addToCart(item);
  };

  return (
    <div className="space-y-8 pb-32 font-sans w-full">
      {/* Clean Page Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.06]">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 font-mono text-xs text-accent uppercase tracking-[0.16em]">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Digital Dining Menu</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-extrabold text-text tracking-tight">
            Curated Specialties &amp; Drinks
          </h1>
          <p className="text-xs sm:text-sm text-muted max-w-xl font-sans leading-relaxed">
            Handcrafted fresh to order. Customize items and dispatch seamlessly to the kitchen line.
          </p>
        </div>

        {/* Filter Summary & Dish Counter */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setVegOnly(!vegOnly)}
            className="flex items-center gap-2.5 px-3.5 py-2 min-h-[40px] rounded-full bg-surface-2 border border-white/10 hover:border-white/20 transition-all cursor-pointer group"
          >
            <div className={`relative h-4 w-7 rounded-full transition-colors ${vegOnly ? 'bg-emerald-500' : 'bg-white/20'}`}>
              <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform ${vegOnly ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs font-medium text-text group-hover:text-white transition-colors flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Veg Only
            </span>
          </button>

          <span className="font-mono text-xs text-muted bg-surface-2 px-3 py-1.5 rounded-full border border-white/10">
            {filteredItems.length} {filteredItems.length === 1 ? 'Dish' : 'Dishes'}
          </span>
        </div>
      </div>

      {/* Search Input Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted pointer-events-none" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search dishes, ingredients, beverages, desserts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-surface-2/70 backdrop-blur-md pl-11 pr-4 py-3 text-base sm:text-sm text-text placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-all shadow-sm"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-mono text-muted hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Category Tabs */}
      {categories.length > 1 && (
        <div className="relative">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 min-h-[40px] rounded-full text-xs font-medium touch-manipulation transition-all shrink-0 cursor-pointer flex items-center justify-center ${
                    isActive
                      ? 'bg-accent text-bg font-semibold shadow-[0_0_12px_rgba(198,255,61,0.2)]'
                      : 'bg-surface-2 text-muted hover:text-white border border-white/10 hover:border-white/20'
                  }`}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Chef's Special Featured Card */}
      {chefSpecialItem && (
        <div className="card-surface p-6 sm:p-7 rounded-card border border-accent/20 bg-gradient-to-r from-accent/[0.04] via-transparent to-transparent space-y-4 relative overflow-hidden group hover:border-accent/40 transition-all duration-300">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-accent" strokeWidth={1.5} />
              <span className="font-mono text-xs uppercase tracking-wider text-accent font-semibold">
                Chef&apos;s Signature Recommendation
              </span>
            </div>
            <span className="text-[10px] font-mono text-muted uppercase tracking-wider hidden sm:inline-block">
              Daily Special
            </span>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
            {chefSpecialItem.image_url && (
              <img
                src={chefSpecialItem.image_url}
                alt={chefSpecialItem.name}
                className="h-24 w-24 sm:h-28 sm:w-28 rounded-card object-cover border border-white/10 shrink-0 shadow-sm"
                loading="lazy"
                decoding="async"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span
                  className={`h-3.5 w-3.5 rounded-xs border flex items-center justify-center p-0.5 bg-surface shrink-0 ${
                    chefSpecialItem.is_veg ? 'border-emerald-500' : 'border-rose-500'
                  }`}
                  title={chefSpecialItem.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    chefSpecialItem.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                </span>
                <span className="text-[11px] font-mono text-muted uppercase">
                  {chefSpecialItem.is_veg ? 'Pure Veg' : 'Non-Veg'}
                </span>
              </div>

              <h3 className="font-heading font-extrabold text-lg sm:text-xl text-text leading-snug tracking-tight group-hover:text-white transition-colors">
                {chefSpecialItem.name}
              </h3>

              {chefSpecialItem.description && (
                <p className="text-xs text-muted mt-1 leading-relaxed max-w-xl font-sans">
                  {chefSpecialItem.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-4">
                <span className="text-base sm:text-lg font-mono font-bold text-accent">
                  {formatCurrency(chefSpecialItem.price)}
                </span>
                {(() => {
                  const qty = getItemQty(chefSpecialItem.id);
                  return qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleAdd(chefSpecialItem)}
                      className="h-8 px-5 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-all cursor-pointer flex items-center gap-1.5 shadow-sm active:scale-95"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>Add to Order</span>
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 border border-white/10 bg-surface-2 rounded-full p-1 shadow-sm">
                      <button
                        type="button"
                        onClick={() => updateQty(chefSpecialItem.id, qty - 1)}
                        className="h-6 w-6 rounded-full bg-surface text-text hover:bg-white/10 flex items-center justify-center text-xs transition-colors"
                      >
                        <Minus className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                      <QtyDisplay qty={qty} />
                      <button
                        type="button"
                        onClick={() => updateQty(chefSpecialItem.id, qty + 1)}
                        className="h-6 w-6 rounded-full bg-accent text-bg hover:bg-accent-hover flex items-center justify-center text-xs transition-colors"
                      >
                        <Plus className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Menu Items Grid */}
      <div>
        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-7 w-7 mx-auto animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs font-mono text-muted tracking-wider uppercase">Loading kitchen catalog…</span>
          </div>
        ) : regularItems.length === 0 && !chefSpecialItem ? (
          <div className="py-16 text-center card-surface p-8 space-y-3 rounded-card border border-white/10 max-w-md mx-auto">
            <UtensilsCrossed className="h-8 w-8 mx-auto text-muted/60" strokeWidth={1.5} />
            <p className="font-heading font-bold text-text text-base">No dishes found</p>
            <p className="text-xs text-muted leading-relaxed font-sans">
              No matching preparations found for your current filter. Try adjusting your search or category selection.
            </p>
            <button
              type="button"
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); setVegOnly(false); }}
              className="mt-2 text-xs font-mono text-accent hover:underline"
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
            {regularItems.map((item) => {
              const qty = getItemQty(item.id);
              return (
                <div
                  key={item.id}
                  className="card-surface p-5 rounded-card border border-white/[0.08] hover:border-white/25 flex flex-col justify-between gap-4 transition-all duration-300 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`h-3 w-3 rounded-xs border flex items-center justify-center p-0.5 bg-surface shrink-0 ${
                            item.is_veg ? 'border-emerald-500' : 'border-rose-500'
                          }`}
                          title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${
                            item.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                          }`} />
                        </span>
                        {item.is_bestseller && (
                          <span className="flex items-center gap-1 text-[10px] font-mono text-accent bg-accent/10 border border-accent/20 px-2 py-0.5 rounded-full">
                            <Flame className="h-2.5 w-2.5" strokeWidth={1.5} /> Popular
                          </span>
                        )}
                      </div>

                      <h3 className="font-heading font-bold text-text text-base leading-snug tracking-tight group-hover:text-white transition-colors">
                        {item.name}
                      </h3>

                      {item.description && (
                        <p className="text-xs text-muted line-clamp-2 mt-1.5 leading-relaxed font-sans">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-20 w-20 sm:h-22 sm:w-22 rounded-card object-cover border border-white/10 shrink-0 shadow-xs group-hover:scale-102 transition-transform duration-300"
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                  </div>

                  {/* Price & Action Row */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <span className="text-sm sm:text-base font-mono font-bold text-accent">
                      {formatCurrency(item.price)}
                    </span>

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAdd(item)}
                        className="h-9 px-4 min-h-[40px] rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-all cursor-pointer flex items-center gap-1 shadow-sm active:scale-95"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={1.5} /> Add
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 border border-white/10 bg-surface-2 rounded-full p-1 shadow-sm">
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, qty - 1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="h-7 w-7 min-h-[32px] min-w-[32px] rounded-full bg-surface text-text hover:bg-white/10 flex items-center justify-center text-xs transition-colors relative before:absolute before:-inset-2 before:content-['']"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                        <QtyDisplay qty={qty} />
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, qty + 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-7 w-7 min-h-[32px] min-w-[32px] rounded-full bg-accent text-bg hover:bg-accent-hover flex items-center justify-center text-xs transition-colors relative before:absolute before:-inset-2 before:content-['']"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating View Cart Bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-xl w-full px-4 z-40">
          <Link
            to={`/t/${shortCode}/cart`}
            className="w-full flex items-center justify-between px-6 py-4 rounded-full bg-accent text-bg shadow-lift hover:bg-accent-hover active:scale-[0.98] transition-all duration-300 font-sans group border border-accent-hover"
          >
            <div className="flex items-center gap-3">
              <span className="h-7 px-3 rounded-full bg-bg text-accent text-xs font-mono font-bold flex items-center justify-center shadow-xs">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="text-sm font-heading font-bold tracking-tight">
                Review Cart &amp; Order
              </span>
            </div>
            <div className="flex items-center gap-2.5 font-mono font-bold text-sm sm:text-base">
              <span>{formatCurrency(grandTotal)}</span>
              <ShoppingBag className="h-4 w-4 transition-transform group-hover:scale-110" strokeWidth={1.75} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

export default GuestMenuScreen;
