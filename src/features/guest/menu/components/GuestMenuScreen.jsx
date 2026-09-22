import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatCurrency';
import { useCart } from '@/features/guest/cart/context/CartContext';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import {
  PlusIcon,
  MinusIcon,
  ShoppingBagIcon,
  FireIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/solid';

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
    <span className={`w-5 text-center text-xs font-extrabold text-[#201512] select-none ${pop ? 'animate-qty-pop' : ''}`}>
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
    <div className="space-y-5 pb-28 font-body">
      {/* ═══ Elegant Greeting ═══ */}
      <div className="text-center py-2">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-[#F6EEDD] tracking-[0.12em] uppercase drop-shadow-md">
          Our Menu
        </h2>
        <p className="text-xs font-semibold text-[#E5C158] mt-1 font-body tracking-wide">
          Handcrafted with tradition & love
        </p>
      </div>

      {/* ═══ Search Bar ═══ */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E5C158]" />
        <input
          type="text"
          placeholder="Search dishes, drinks, desserts..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-xl border border-[#E5C158]/30 bg-[#3D1A22] pl-10 pr-4 py-2.5 text-xs font-body text-[#FFFDF7] placeholder:text-[#E5C158]/60 focus:border-[#E5C158] focus:outline-none focus:ring-1 focus:ring-[#E5C158]/40 transition-colors"
        />
      </div>

      {/* ═══ Veg Toggle ═══ */}
      <div className="flex items-center justify-between px-1">
        <button
          type="button"
          onClick={() => setVegOnly(!vegOnly)}
          className="flex items-center gap-2 group cursor-pointer"
        >
          <div className={`relative h-5 w-9 rounded-full transition-colors ${vegOnly ? 'bg-[#16A34A]' : 'bg-[#4A2230]'} border border-[#16A34A]/50`}>
            <div className={`absolute top-0.5 h-4 w-4 rounded-full shadow-sm transition-transform ${vegOnly ? 'translate-x-4 bg-white' : 'translate-x-0.5 bg-[#FFFDF7]'}`} />
          </div>
          <span className="text-xs font-bold text-[#F6EEDD] group-hover:text-[#E5C158] transition-colors flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#16A34A]" />
            Veg Only
          </span>
        </button>
        <span className="text-[11px] font-bold text-[#E5C158]">
          {filteredItems.length} dishes
        </span>
      </div>

      {/* ═══ Category Tabs with Scoped Gold Underline ═══ */}
      {categories.length > 1 && (
        <div className="relative border-b border-[#E5C158]/20 pb-1">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar -mx-4 px-4">
            {categories.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategory(cat.id)}
                  className={`whitespace-nowrap px-4 py-2 text-xs font-serif font-bold transition-all shrink-0 relative tracking-wider cursor-pointer ${
                    isActive
                      ? 'text-[#E5C158]'
                      : 'text-[#F6EEDD]/75 hover:text-[#FFFDF7]'
                  }`}
                >
                  {cat.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-3 right-3 h-[2.5px] bg-[#E5C158] rounded-full shadow-[0_2px_8px_rgba(229,193,88,0.6)]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Chef's Special Featured Card ═══ */}
      {chefSpecialItem && (
        <div className="chef-special-card p-4 space-y-3 shadow-[0_4px_20px_rgba(212,175,55,0.25)] border-2 border-[#D4AF37]">
          <div className="flex items-center gap-2">
            <FireIcon className="h-4 w-4 text-[#D4AF37]" />
            <span className="font-serif text-xs font-bold text-[#A68520] tracking-widest uppercase">
              Chef's Special
            </span>
          </div>
          <div className="flex items-center gap-4">
            {chefSpecialItem.image_url && (
              <img
                src={chefSpecialItem.image_url}
                alt={chefSpecialItem.name}
                className="h-24 w-24 rounded-xl object-cover border-2 border-[#D4AF37] shadow-gold"
                loading="lazy"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {/* Standard Veg / Non-Veg Indicator */}
                <span
                  className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center p-0.5 bg-white shadow-xs ${
                    chefSpecialItem.is_veg
                      ? 'border-[#16A34A]'
                      : 'border-[#DC2626]'
                  }`}
                  title={chefSpecialItem.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${
                    chefSpecialItem.is_veg ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                  }`} />
                </span>
              </div>
              <h3 className="font-serif text-lg sm:text-xl font-bold text-[#201512] leading-snug tracking-wide">
                {chefSpecialItem.name}
              </h3>
              {chefSpecialItem.description && (
                <p className="text-[11px] text-[#5A4D47] line-clamp-2 mt-1 leading-relaxed font-body">
                  {chefSpecialItem.description}
                </p>
              )}
              <div className="flex items-center justify-between mt-2.5">
                <span className="text-base font-bold text-[#9A7314] font-serif tracking-wide">
                  {formatCurrency(chefSpecialItem.price)}
                </span>
                {(() => {
                  const qty = getItemQty(chefSpecialItem.id);
                  return qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleAdd(chefSpecialItem)}
                      className="h-8 px-4 rounded-lg bg-[#C83200] text-[#F6EEDD] text-xs font-bold hover:bg-[#A82A00] active:scale-95 transition-all shadow-sindoor cursor-pointer"
                    >
                      <PlusIcon className="h-3 w-3 mr-1 inline" /> Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1.5 border border-[#C9A227]/50 bg-[#EDE3CC] rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQty(chefSpecialItem.id, qty - 1)}
                        className="h-7 w-7 rounded-md bg-[#2B0E14] text-[#E5C158] flex items-center justify-center text-xs hover:bg-[#3D1A22] transition-colors"
                      >
                        <MinusIcon className="h-3 w-3" />
                      </button>
                      <QtyDisplay qty={qty} />
                      <button
                        type="button"
                        onClick={() => updateQty(chefSpecialItem.id, qty + 1)}
                        className="h-7 w-7 rounded-md bg-[#C83200] text-white flex items-center justify-center text-xs hover:bg-[#A82A00] transition-colors"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ Menu Items Grid ═══ */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="h-6 w-6 mx-auto animate-spin rounded-full border-2 border-dhaba-gold border-t-transparent mb-3" />
            <span className="text-xs text-[#E5C158] font-body font-semibold">Loading menu…</span>
          </div>
        ) : regularItems.length === 0 && !chefSpecialItem ? (
          <div className="py-16 text-center royal-card p-6 space-y-2">
            <p className="font-serif font-bold text-[#201512] text-sm">No dishes found</p>
            <p className="text-[11px] text-[#5A4D47] font-body">
              The kitchen is preparing something special for you.
            </p>
          </div>
        ) : (
          regularItems.map((item) => {
            const qty = getItemQty(item.id);
            return (
              <div
                key={item.id}
                className="royal-card p-3.5 flex items-center justify-between gap-3 transition-all hover:border-[#D4AF37]/60"
              >
                {/* Left side info */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {/* Standard Green Veg / Red Non-veg Square Indicator */}
                    <span
                      className={`h-3.5 w-3.5 rounded-sm border-2 flex items-center justify-center p-0.5 bg-white shadow-xs ${
                        item.is_veg
                          ? 'border-[#16A34A]'
                          : 'border-[#DC2626]'
                      }`}
                      title={item.is_veg ? 'Vegetarian' : 'Non-Vegetarian'}
                    >
                      <span className={`h-1.5 w-1.5 rounded-full ${
                        item.is_veg ? 'bg-[#16A34A]' : 'bg-[#DC2626]'
                      }`} />
                    </span>
                    {item.is_bestseller && (
                      <span className="flex items-center gap-1 text-[10px] font-bold text-[#A68520] bg-[#D4AF37]/15 border border-[#D4AF37]/40 px-2 py-0.5 rounded-md shadow-xs">
                        <FireIcon className="h-3 w-3 text-[#D4AF37]" /> Popular
                      </span>
                    )}
                  </div>

                  <h3 className="font-serif font-bold text-[#201512] text-base leading-snug tracking-wide">
                    {item.name}
                  </h3>

                  {item.description && (
                    <p className="text-[11px] text-[#5A4D47] line-clamp-2 mt-0.5 leading-relaxed font-body">
                      {item.description}
                    </p>
                  )}

                  <div className="mt-2">
                    <span className="text-sm sm:text-base font-bold text-[#9A7314] font-serif tracking-wide">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </div>

                {/* Right side: Image & Add/Stepper */}
                <div className="flex flex-col items-end gap-2 shrink-0">
                  {item.image_url && (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="h-16 w-16 rounded-xl object-cover border border-dhaba-gold/20 shadow-sm"
                      loading="lazy"
                      onError={(e) => { e.target.style.display = 'none'; }}
                    />
                  )}

                  {qty === 0 ? (
                    <button
                      type="button"
                      onClick={() => handleAdd(item)}
                      className="h-7 px-3 rounded-lg bg-dhaba-sindoor text-dhaba-ivory text-xs font-bold hover:bg-dhaba-sindoor-hover active:scale-95 transition-all shadow-sm border border-dhaba-sindoor"
                    >
                      <PlusIcon className="h-3 w-3 mr-1 inline" /> Add
                    </button>
                  ) : (
                    <div className="flex items-center gap-1 border border-dhaba-gold/30 bg-dhaba-ivory rounded-lg p-0.5">
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, qty - 1)}
                        className="h-6 w-6 rounded-md bg-dhaba-plum text-dhaba-gold flex items-center justify-center text-xs hover:bg-dhaba-plum-light transition-colors"
                      >
                        <MinusIcon className="h-3 w-3" />
                      </button>
                      <QtyDisplay qty={qty} />
                      <button
                        type="button"
                        onClick={() => updateQty(item.id, qty + 1)}
                        className="h-6 w-6 rounded-md bg-dhaba-sindoor text-white flex items-center justify-center text-xs hover:bg-dhaba-sindoor-hover transition-colors"
                      >
                        <PlusIcon className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ═══ Floating View Cart Bar ═══ */}
      {totalItemCount > 0 && (
        <div className="fixed bottom-4 left-0 right-0 max-w-md mx-auto px-4 z-40 animate-slide-up-spring">
          <Link
            to={`/t/${shortCode}/cart`}
            className="w-full flex items-center justify-between p-3.5 rounded-2xl bg-dhaba-sindoor text-dhaba-ivory shadow-xl shadow-dhaba-sindoor/30 active:scale-[0.98] transition-transform font-body"
          >
            <div className="flex items-center gap-2.5">
              <span className="h-6 px-2 rounded-full bg-white/20 text-xs font-bold flex items-center justify-center backdrop-blur-sm">
                {totalItemCount} {totalItemCount === 1 ? 'item' : 'items'}
              </span>
              <span className="text-sm font-bold">View Cart</span>
            </div>
            <div className="flex items-center gap-1.5 font-bold text-sm">
              <span>{formatCurrency(grandTotal)}</span>
              <ShoppingBagIcon className="h-4 w-4" />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}
