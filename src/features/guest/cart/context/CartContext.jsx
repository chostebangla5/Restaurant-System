import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createOrder } from '@/features/shared/orders/api/ordersApi';
import { validateCoupon, fetchAvailableCoupons } from '@/features/staff/offers/api/offersApi';
import toast from 'react-hot-toast';

const CartContext = createContext(null);

export function CartProvider({ children }) {
  const { shortCode = '' } = useParams();
  const navigate = useNavigate();

  // Scope cart storage by table shortCode so different tables have distinct carts
  const storageKey = `tablesuite_cart_${(shortCode || 'guest').toUpperCase()}`;
  const couponStorageKey = `tablesuite_coupon_${(shortCode || 'guest').toUpperCase()}`;

  const [items, setItems] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [appliedCoupon, setAppliedCoupon] = useState(() => {
    try {
      const saved = localStorage.getItem(couponStorageKey);
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [availableCoupons, setAvailableCoupons] = useState([]);
  const [isLoadingCoupons, setIsLoadingCoupons] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(items));
    } catch (e) {}
  }, [items, storageKey]);

  useEffect(() => {
    try {
      if (appliedCoupon) {
        localStorage.setItem(couponStorageKey, JSON.stringify(appliedCoupon));
      } else {
        localStorage.removeItem(couponStorageKey);
      }
    } catch (e) {}
  }, [appliedCoupon, couponStorageKey]);

  // Load available coupons for this table's venue
  const loadAvailableCoupons = useCallback(async () => {
    if (!shortCode) return;
    try {
      setIsLoadingCoupons(true);
      const list = await fetchAvailableCoupons(shortCode);
      setAvailableCoupons(list || []);
    } catch (e) {
      console.warn('Could not load available coupons:', e);
    } finally {
      setIsLoadingCoupons(false);
    }
  }, [shortCode]);

  useEffect(() => {
    loadAvailableCoupons();
  }, [loadAvailableCoupons]);

  const addToCart = (item) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex((i) => i.id === item.id);
      if (existingIdx > -1) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          qty: updated[existingIdx].qty + 1,
        };
        return updated;
      }
      return [
        ...prev,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price) || 0,
          station: item.station || 'hot',
          dietary_tag: item.tags?.[0] || 'veg',
          notes: '',
          qty: 1,
        },
      ];
    });
    toast.success(`Added ${item.name} to cart`, { id: `add-${item.id}`, duration: 1500 });
  };

  const updateQty = (itemId, qty) => {
    if (qty <= 0) {
      removeFromCart(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((i) => (i.id === itemId ? { ...i, qty } : i))
    );
  };

  const removeFromCart = (itemId) => {
    setItems((prev) => prev.filter((i) => i.id !== itemId));
  };

  const clearCart = () => {
    setItems([]);
    setAppliedCoupon(null);
    try {
      localStorage.removeItem(storageKey);
      localStorage.removeItem(couponStorageKey);
    } catch (e) {}
  };

  // Pricing calculations
  const totalItemCount = items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = items.reduce((sum, i) => sum + i.price * i.qty, 0);

  // Dynamic coupon discount calculation
  let discountAmount = 0;
  if (appliedCoupon && subtotal > 0) {
    if (appliedCoupon.discountType === 'percent') {
      discountAmount = Math.round((subtotal * appliedCoupon.discountValue) / 100);
      if (appliedCoupon.maxDiscountAmount && discountAmount > appliedCoupon.maxDiscountAmount) {
        discountAmount = appliedCoupon.maxDiscountAmount;
      }
    } else {
      discountAmount = Math.min(appliedCoupon.discountValue, subtotal);
    }
  }

  const discountedSubtotal = Math.max(0, subtotal - discountAmount);
  const tax = Math.round(discountedSubtotal * 0.05); // 5% GST on discounted amount
  const grandTotal = discountedSubtotal + tax;

  // Apply a coupon code
  const applyCoupon = async (code) => {
    if (!code || !code.trim()) {
      toast.error('Please enter a coupon code');
      return { success: false, error: 'Please enter a coupon code' };
    }

    try {
      const result = await validateCoupon({
        shortCode,
        code: code.trim(),
        subtotal,
      });

      if (!result.valid) {
        toast.error(result.error || 'Invalid coupon code');
        return { success: false, error: result.error };
      }

      setAppliedCoupon(result.coupon);
      toast.success(`Coupon "${result.coupon.code}" applied! 🎉`, { duration: 3000 });
      return { success: true, coupon: result.coupon };
    } catch (err) {
      toast.error(err.message || 'Failed to apply coupon');
      return { success: false, error: err.message };
    }
  };

  // Remove applied coupon
  const removeCoupon = () => {
    setAppliedCoupon(null);
    toast.success('Coupon removed', { duration: 2000 });
  };

  const getItemQty = (itemId) => {
    const item = items.find((i) => i.id === itemId);
    return item ? item.qty : 0;
  };

  const isItemInCart = (itemId) => {
    return items.some((i) => i.id === itemId);
  };

  const submitOrder = async ({
    paymentMethod = 'counter',
    paymentStatus = 'pending',
    guestNotes = '',
    tableNumber = shortCode.replace(/[^0-9]/g, '') || '01',
  }) => {
    if (items.length === 0) {
      toast.error('Your cart is empty');
      return null;
    }

    setIsSubmitting(true);
    try {
      const order = await createOrder({
        shortCode,
        tableNumber,
        items,
        subtotal,
        discountAmount,
        couponCode: appliedCoupon?.code || null,
        tax,
        total: grandTotal,
        paymentMethod,
        paymentStatus,
        guestNotes,
      });

      clearCart();
      toast.success('Order placed & sent to kitchen! 🍳', { duration: 4000 });
      navigate(`/t/${shortCode}/orders`);
      return order;
    } catch (err) {
      toast.error(err.message || 'Failed to place order');
      throw err;
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <CartContext.Provider
      value={{
        items,
        shortCode,
        addToCart,
        updateQty,
        removeFromCart,
        clearCart,
        totalItemCount,
        subtotal,
        discountAmount,
        discountedSubtotal,
        appliedCoupon,
        applyCoupon,
        removeCoupon,
        availableCoupons,
        isLoadingCoupons,
        loadAvailableCoupons,
        tax,
        grandTotal,
        getItemQty,
        isItemInCart,
        submitOrder,
        isSubmitting,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
