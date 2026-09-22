import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';

export function CreateOfferModal({ isOpen, onClose, onSubmit, editingOffer = null, isLoading = false }) {
  const isEditing = !!editingOffer;

  const [title, setTitle] = useState(editingOffer?.title || '');
  const [description, setDescription] = useState(editingOffer?.description || '');
  const [discountType, setDiscountType] = useState(editingOffer?.discount_type || 'percent');
  const [discountValue, setDiscountValue] = useState(editingOffer?.discount_value?.toString() || '');
  const [minOrderAmount, setMinOrderAmount] = useState(editingOffer?.min_order_amount?.toString() || '0');
  const [couponCode, setCouponCode] = useState(editingOffer?.rule_json?.coupon_code || '');

  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!title.trim()) newErrors.title = 'Offer title is required';
    if (!discountValue || parseFloat(discountValue) <= 0) newErrors.discountValue = 'Enter a valid discount';
    if (discountType === 'percent' && parseFloat(discountValue) > 100) newErrors.discountValue = 'Percentage cannot exceed 100%';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      discountType,
      discountValue: parseFloat(discountValue),
      minOrderAmount: parseFloat(minOrderAmount) || 0,
      couponCode: couponCode ? couponCode.trim().toUpperCase() : null,
    });
  };

  // Preview text
  const previewText = title
    ? `${title}${discountValue ? ` — ${discountType === 'percent' ? `${discountValue}%` : `₹${discountValue}`} off` : ''}`
    : 'Your offer preview...';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Offer' : 'Create New Offer'}
      description={isEditing ? 'Update the offer details' : 'Set up a new promotional offer for your guests'}
      size="md"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Preview Banner */}
        <div className="rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 p-4 text-white">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">🏷️</span>
            <span className="font-bold text-sm">Notification Preview</span>
          </div>
          <p className="text-sm font-semibold opacity-95 truncate">{previewText}</p>
          {couponCode && (
            <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-black/25 text-[11px] font-mono font-bold tracking-wider uppercase border border-white/20">
              🏷️ Coupon: {couponCode.toUpperCase()}
            </div>
          )}
          {description && (
            <p className="text-xs opacity-80 mt-1 line-clamp-2">{description}</p>
          )}
        </div>

        {/* Title */}
        <Input
          label="Offer Title"
          placeholder="e.g. 20% off, Happy Hour Special, Buy 1 Get 1"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          error={errors.title}
        />

        {/* Coupon Code (Promo Code) */}
        <div>
          <Input
            label="Coupon Code (Optional)"
            placeholder="e.g. WELCOME20, TASTY50"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
            helperText="Guests can enter or paste this code during order checkout to apply this discount."
          />
        </div>

        {/* Discount Type + Value */}
        <div className="grid grid-cols-2 gap-3">
          <Select
            label="Discount Type"
            value={discountType}
            onChange={(e) => setDiscountType(e.target.value)}
            options={[
              { value: 'percent', label: 'Percentage (%)' },
              { value: 'flat', label: 'Flat Amount (₹)' },
            ]}
          />
          <Input
            label={discountType === 'percent' ? 'Discount %' : 'Discount ₹'}
            type="number"
            placeholder={discountType === 'percent' ? 'e.g. 20' : 'e.g. 100'}
            value={discountValue}
            onChange={(e) => setDiscountValue(e.target.value)}
            error={errors.discountValue}
          />
        </div>

        {/* Min Order Amount */}
        <Input
          label="Minimum Order Amount (₹)"
          type="number"
          placeholder="0 (no minimum)"
          value={minOrderAmount}
          onChange={(e) => setMinOrderAmount(e.target.value)}
          helperText="Leave 0 for no minimum order requirement"
        />

        {/* Message / Description */}
        <div className="w-full">
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-1.5">
            Message
          </label>
          <textarea
            rows={3}
            placeholder="Enter the notification message guests will see..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm text-stone-900 transition-all placeholder:text-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500 resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button
            type="submit"
            size="sm"
            isLoading={isLoading}
          >
            {isEditing ? 'Update Offer' : 'Create Offer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
