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
    <div className="space-y-6 pb-28 font-sans">
      {/* Elegant Greeting */}
      <div className="text-center py-2 space-y-1">
        <h2 className="font-heading text-xl sm:text-2xl font-bold text-text tracking-tight uppercase">
          Our Menu
        </h2>
        <p className="text-xs text-muted font-sans">
          Handcrafted with tradition &amp; love
        </p>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search dishes, drinks, desserts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-full border border-white/10 bg-surface pl-11 pr-4 py-2.5 text-xs text-text placeholder:text-muted/50 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 transition-colors"
        />
      </div>

      {/* Veg Toggle & Dish Count */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setVegOnly(!vegOnly)}
          className="flex items-center gap-2.5 cursor-pointer group"
        >
          <div className={`relative h-5 w-9 rounded-full transition-colors border border-white/10 ${vegOnly ? 'bg-emerald-500' : 'bg-surface-2'}`}>
            <div className={`absolute top-0.5 h-4 w-4 rounded-full transition-transform bg-text shadow-xs ${vegOnly ? 'translate-x-4 bg-bg' : 'translate-x-0.5'}`} />
          </div>
          <span className="text-xs font-medium text-text group-hover:text-white transition-colors flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Veg Only
          </span>
        </button>
        <span className="text-[11px] font-mono text-muted">
          {filteredItems.length} dishes
        </span>
      </div>

      {/* Category Tabs */}
      {categories.length > 1 && (
        <div className="relative pb-1">
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer ${
                    isActive
                      ? 'bg-accent text-bg font-semibold shadow-xs'
                      : 'bg-surface-2 text-muted hover:text-text border border-white/[0.06]'
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
        <div className="card-surface p-5 rounded-card border border-white/10 space-y-3.5 relative">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent" strokeWidth={1.5} />
            <span className="eyebrow text-accent">
              Chef&apos;s Special
            </span>
          </div>

          <div className="flex items-start gap-4">
            {chefSpecialItem.image_url && (
              <img
                src={chefSpecialItem.image_url}
                alt={chefSpecialItem.name}
                className="h-20 w-20 rounded-xl object-cover border border-white/10 shrink-0"
                loading="lazy"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Standard Veg / Non-Veg Square Indicator */}
                <span
                  className={`h-3 w-3 rounded-xs border flex items-center justify-center p-0.5 bg-surface shrink-0 ${
                    chefSpecialItem.is_veg
                      ? 'border-emerald-500'
                      : 'border-rose-500'
                  }`}
                  title={chefSpecialItem.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    chefSpecialItem.is_veg ? 'bg-emerald-500' : 'bg-rose-500'
                  }`} />
                </span>
              </div>
              <h3 className="font-heading font-bold text-text text-base leading-snug tracking-tight">
                {chefSpecialItem.name}
              </h3>
              {chefSpecialItem.description && (
                <p className="text-[11px] text-muted line-clamp-2 mt-1 leading-relaxed">
                  {chefSpecialItem.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-3">
                <span className="text-sm font-mono font-semibold text-accent">
                  {formatCurrency(chefSpecialItem.price)}
                </span>
                {(() => {
                  const qty = getItemQty(chefSpecialItem.id);
                  return qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleAdd(chefSpecialItem)}
                      className="h-7 px-3.5 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" strokeWidth={1.5} /> Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 border border-white/10 bg-surface-2 rounded-full p-1">
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
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 text-center space-y-3">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-xs font-mono text-muted">Loading menu…</span>
          </div>
        ) : regularItems.length === 0 && !chefSpecialItem ? (
          <div className="py-16 text-center card-surface p-6 space-y-2 rounded-card">
            <p className="font-heading font-bold text-text text-sm">No dishes found</p>
            <p className="text-[11px] text-muted">
              The kitchen is preparing something special for you.
            </p>
          </div>
        ) : (
          regularItems.map((item) => {
            const qty = getItemQty(item.id);
            return (
              <div
                key={item.id}
                className="card-surface p-4 rounded-card border border-white/[0.08] hover:border-white/20 flex items-center justify-between gap-4 transition-all"
              >
                {/* Left side info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    {/* Standard Green Veg / Red Non-veg Square Indicator */}
                    <span
                      className={`h-3 w-3 rounded-xs border flex items-center justify-center p-0.5 bg-surface shrink-0 ${
                        item.is_veg
                          ? 'border-emerald-500'
                          : 'border-rose-500'
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

                  <h3 className="font-heading font-bold text-text text-sm leading-snug tracking-tight">
                    {item.name}
                  </h3>

                  {item.description && (
                    <p className="text-[11px] text-muted line-clamp-2 mt-1 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-2.5">
                    <span className="text-xs sm:text-sm font-mono font-semibold text-accent">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </div>

                {/* Right side: Image & Add/Stepper */}
                <div className="flex flex-col items-end gap-2.5 shrink-0">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-16 w-16 rounded-xl object-cover border border-white/10 shrink-0"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}

                  {qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleAdd(item)}
                      className="h-7 px-3.5 rounded-full bg-accent text-bg text-xs font-semibold hover:bg-accent-hover transition-all cursor-pointer flex items-center gap-1"
                    >
                      <Plus className="h-3 w-3" strokeWidth={1.5} /> Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 border border-white/10 bg-surface-2 rounded-full p-1">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, qty - 1)}
                        className="h-6 w-6 rounded-full bg-surface text-text hover:bg-white/10 flex items-center justify-center text-xs transition-colors"
                      >
                        <Minus className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                      <QtyDisplay qty={qty} />
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, qty + 1)}
                        className="h-6 w-6 rounded-full bg-accent text-bg hover:bg-accent-hover flex items-center justify-center text-xs transition-colors"
                      >
                        <Plus className="h-3 w-3" strokeWidth={1.5} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Floating View Cart Bar */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-4 z-40">
          <Link
            to={`/t/${shortCode}/cart`}
            className="w-full flex items-center justify-between p-3.5 rounded-full bg-accent text-bg shadow-lift active:scale-[0.98] transition-all hover:bg-accent-hover font-sans"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-6 px-2.5 rounded-full bg-bg text-accent text-xs font-mono font-bold flex items-center justify-center">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="text-sm font-semibold tracking-tight">View Cart</span>
            </div>
            <div className="flex items-center gap-2 font-mono font-bold text-sm">
              <span>{formatCurrency(grandTotal)}</span>
              <ShoppingBag className="h-4 w-4" strokeWidth={1.5} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
