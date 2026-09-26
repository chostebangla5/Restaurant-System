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
  X,
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
    <span
      className={`w-6 text-center text-sm font-bold select-none ${pop ? 'scale-125' : ''} transition-transform`}
      style={{ color: 'var(--g-accent)' }}
    >
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
  const categoryRef = useRef(null);

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

  // Get the active category name for display
  const activeCategoryName = categories.find(c => c.id === activeCategory)?.name || 'All';

  return (
    <div className="space-y-5 pb-32 font-sans w-full">

      {/* ─── Search Bar ─── */}
      <div className="relative">
        <Search
          className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 pointer-events-none"
          style={{ color: 'var(--g-text-muted)' }}
          strokeWidth={1.5}
        />
        <input
          type="text"
          placeholder="Search for dishes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="g-input w-full pl-11 pr-10 py-3 text-sm"
          style={{ borderRadius: 'var(--g-radius-pill)' }}
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full flex items-center justify-center transition-colors"
            style={{ background: 'var(--g-surface-2)', color: 'var(--g-text-muted)' }}
          >
            <X className="h-3 w-3" strokeWidth={2} />
          </button>
        )}
      </div>

      {/* ─── Veg Filter + Count ─── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Veg Toggle */}
          <button
            type="button"
            onClick={() => setVegOnly(!vegOnly)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer"
            style={{
              background: vegOnly ? 'var(--g-green-light)' : 'var(--g-surface)',
              border: `1px solid ${vegOnly ? 'rgba(27,166,114,0.2)' : 'var(--g-border)'}`,
              color: vegOnly ? 'var(--g-green)' : 'var(--g-text-secondary)',
            }}
          >
            <div className="relative h-4 w-7 rounded-full transition-colors"
              style={{ background: vegOnly ? 'var(--g-green)' : 'rgba(0,0,0,0.15)' }}>
              <div className={`absolute top-0.5 h-3 w-3 rounded-full bg-white transition-transform shadow-sm ${vegOnly ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-sm border flex items-center justify-center" style={{ borderColor: 'var(--g-green)' }}>
                <span className="h-1 w-1 rounded-full" style={{ background: 'var(--g-green)' }} />
              </span>
              Veg Only
            </span>
          </button>
        </div>

        <span className="text-xs font-medium px-2.5 py-1 rounded-full"
          style={{ background: 'var(--g-surface-2)', color: 'var(--g-text-muted)' }}>
          {filteredItems.length} {filteredItems.length === 1 ? 'dish' : 'dishes'}
        </span>
      </div>

      {/* ─── Category Tabs ─── */}
      {categories.length > 1 && (
        <div className="relative" ref={categoryRef}>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className="whitespace-nowrap px-4 py-2 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer"
                  style={{
                    ...(isActive
                      ? { background: 'var(--g-accent)', color: '#fff', fontWeight: 600, boxShadow: '0 2px 8px rgba(226,55,68,0.2)' }
                      : { background: 'var(--g-surface)', color: 'var(--g-text-secondary)', border: '1px solid var(--g-border)' }),
                  }}
                >
                  {cat.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ─── Chef's Special Featured Card ─── */}
      {chefSpecialItem && (
        <div
          className="g-card p-5 space-y-3 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, rgba(226,55,68,0.04) 0%, var(--g-surface) 60%)', borderColor: 'rgba(226,55,68,0.12)' }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <Flame className="h-3.5 w-3.5" style={{ color: 'var(--g-accent)' }} strokeWidth={1.5} />
              <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--g-accent)' }}>
                Chef&apos;s Special
              </span>
            </div>
            <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: 'var(--g-accent-light)', color: 'var(--g-accent)' }}>
              Recommended
            </span>
          </div>

          <div className="flex items-start gap-4">
            {chefSpecialItem.image_url && (
              <img
                src={chefSpecialItem.image_url}
                alt={chefSpecialItem.name}
                className="h-24 w-24 rounded-2xl object-cover shrink-0"
                style={{ border: '1px solid var(--g-border)' }}
                loading="lazy"
                decoding="async"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              {/* Veg/Non-veg indicator */}
              <div className="flex items-center gap-1.5 mb-1">
                <span
                  className="h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center p-0.5"
                  style={{ borderColor: chefSpecialItem.is_veg ? 'var(--g-green)' : 'var(--g-accent)' }}
                  title={chefSpecialItem.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                >
                  <span className="h-1.5 w-1.5 rounded-full"
                    style={{ background: chefSpecialItem.is_veg ? 'var(--g-green)' : 'var(--g-accent)' }} />
                </span>
                <span className="text-[11px] font-medium" style={{ color: 'var(--g-text-muted)' }}>
                  {chefSpecialItem.is_veg ? 'Veg' : 'Non-Veg'}
                </span>
              </div>

              <h3 className="font-bold text-base leading-snug tracking-tight" style={{ color: 'var(--g-text)' }}>
                {chefSpecialItem.name}
              </h3>

              {chefSpecialItem.description && (
                <p className="text-xs mt-1 leading-relaxed line-clamp-2" style={{ color: 'var(--g-text-muted)' }}>
                  {chefSpecialItem.description}
                </p>
              )}

              <div className="flex items-center justify-between mt-3">
                <span className="text-base font-bold" style={{ color: 'var(--g-text)' }}>
                  {formatCurrency(chefSpecialItem.price)}
                </span>
                {(() => {
                  const qty = getItemQty(chefSpecialItem.id);
                  return qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleAdd(chefSpecialItem)}
                      className="g-btn-primary h-9 px-5 text-xs flex items-center gap-1.5"
                    >
                      <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      <span>ADD</span>
                    </button>
                  ) : (
                    <div className="g-stepper flex items-center gap-0.5 p-1">
                      <button
                        type="button"
                        onClick={() => updateQty(chefSpecialItem.id, qty - 1)}
                        className="g-stepper-btn h-7 w-7 rounded-full flex items-center justify-center"
                      >
                        <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                      <QtyDisplay qty={qty} />
                      <button
                        type="button"
                        onClick={() => updateQty(chefSpecialItem.id, qty + 1)}
                        className="g-stepper-btn h-7 w-7 rounded-full flex items-center justify-center"
                      >
                        <Plus className="h-3.5 w-3.5" strokeWidth={2} />
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Menu Items List ─── */}
      <div>
        {/* Category heading */}
        {activeCategory !== 'all' && (
          <h2 className="text-lg font-bold mb-3 tracking-tight" style={{ color: 'var(--g-text)' }}>
            {activeCategoryName}
          </h2>
        )}

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="h-7 w-7 mx-auto animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--g-surface-3)', borderTopColor: 'var(--g-accent)' }} />
            <span className="text-xs" style={{ color: 'var(--g-text-muted)' }}>Loading menu…</span>
          </div>
        ) : regularItems.length === 0 && !chefSpecialItem ? (
          <div className="py-16 text-center max-w-sm mx-auto space-y-3">
            <div className="h-16 w-16 mx-auto rounded-full flex items-center justify-center"
              style={{ background: 'var(--g-surface-2)' }}>
              <UtensilsCrossed className="h-7 w-7" style={{ color: 'var(--g-text-muted)' }} strokeWidth={1.5} />
            </div>
            <p className="font-bold text-base" style={{ color: 'var(--g-text)' }}>No dishes found</p>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
              Try adjusting your search or category selection.
            </p>
            <button
              type="button"
              onClick={() => { setActiveCategory('all'); setSearchQuery(''); setVegOnly(false); }}
              className="text-xs font-medium cursor-pointer"
              style={{ color: 'var(--g-accent)' }}
            >
              Reset all filters
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {regularItems.map((item) => {
              const qty = getItemQty(item.id);
              return (
                <div
                  key={item.id}
                  className="g-card p-4 flex items-start gap-3.5 transition-all"
                >
                  {/* Text content */}
                  <div className="flex-1 min-w-0">
                    {/* Veg/Non-veg + Bestseller badges */}
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center p-0.5"
                        style={{ borderColor: item.is_veg ? 'var(--g-green)' : 'var(--g-accent)' }}
                        title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                      >
                        <span className="h-1.5 w-1.5 rounded-full"
                          style={{ background: item.is_veg ? 'var(--g-green)' : 'var(--g-accent)' }} />
                      </span>
                      {item.is_bestseller && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(245,158,11,0.08)', color: '#D97706', border: '1px solid rgba(245,158,11,0.15)' }}>
                          <Flame className="h-2.5 w-2.5" strokeWidth={2} />
                          Bestseller
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-sm leading-snug tracking-tight" style={{ color: 'var(--g-text)' }}>
                      {item.name}
                    </h3>

                    <span className="text-sm font-bold mt-1 block" style={{ color: 'var(--g-text)' }}>
                      {formatCurrency(item.price)}
                    </span>

                    {item.description && (
                      <p className="text-xs line-clamp-2 mt-1 leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Image + Add Button Column */}
                  <div className="flex flex-col items-center gap-2 shrink-0">
                    {item.image_url && (
                      <img
                        src={item.image_url}
                        alt={item.name}
                        className="h-[100px] w-[100px] rounded-xl object-cover"
                        style={{ border: '1px solid var(--g-border)' }}
                        loading="lazy"
                        decoding="async"
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}

                    {qty === 0 ? (
                      <button
                        type="button"
                        onClick={() => handleAdd(item)}
                        className="h-9 px-5 min-w-[90px] rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1 transition-all active:scale-95"
                        style={{
                          background: 'var(--g-surface)',
                          color: 'var(--g-accent)',
                          border: '1px solid rgba(226,55,68,0.25)',
                          boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
                        }}
                      >
                        ADD
                        <Plus className="h-3 w-3" strokeWidth={2.5} />
                      </button>
                    ) : (
                      <div className="flex items-center gap-0 rounded-lg overflow-hidden"
                        style={{
                          background: 'var(--g-accent)',
                          boxShadow: '0 2px 8px rgba(226,55,68,0.2)',
                        }}>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, qty - 1)}
                          aria-label={`Decrease quantity of ${item.name}`}
                          className="h-9 w-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Minus className="h-3.5 w-3.5" strokeWidth={2} />
                        </button>
                        <span className="w-7 text-center text-sm font-bold text-white select-none">
                          {qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(item.id, qty + 1)}
                          aria-label={`Increase quantity of ${item.name}`}
                          className="h-9 w-9 flex items-center justify-center text-white hover:bg-white/10 transition-colors cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5" strokeWidth={2} />
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

      {/* ─── Floating View Cart Bar ─── */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 max-w-lg w-full px-4 z-40">
          <Link
            to={`/t/${shortCode}/cart`}
            className="g-floating-bar w-full flex items-center justify-between px-5 py-3.5 active:scale-[0.98] transition-all font-sans group"
          >
            <div className="flex items-center gap-3">
              <span className="h-6 min-w-6 px-1.5 rounded-md text-[11px] font-bold flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.25)', color: '#fff' }}>
                {totalItemCount}
              </span>
              <span className="text-sm font-semibold">
                View Cart
              </span>
            </div>
            <div className="flex items-center gap-2 font-bold text-sm">
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
