import React, { useState, useEffect } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/formatCurrency';

const STATION_OPTIONS = [
  { value: 'hot', label: 'Hot Kitchen' },
  { value: 'cold', label: 'Cold / Salad' },
  { value: 'bar', label: 'Bar' },
];

const DIETARY_TAG_OPTIONS = [
  { value: 'veg', label: 'Veg', color: 'success' },
  { value: 'non-veg', label: 'Non-Veg', color: 'danger' },
  { value: 'gluten-free', label: 'Gluten-Free', color: 'default' },
  { value: 'spicy', label: 'Spicy 🌶️', color: 'warning' },
  { value: 'chef-special', label: 'Chef Special ⭐', color: 'primary' },
  { value: 'contains-nuts', label: 'Contains Nuts', color: 'default' },
];

export function MenuItemForm({
  isOpen,
  onClose,
  onSave,
  item = null,
  categories = [],
  isLoading = false,
}) {
  const isEdit = !!item;

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    categoryId: '',
    imageUrl: '',
    station: 'hot',
    dietaryTags: [],
    isBestseller: false,
    isAvailable: true,
  });

  useEffect(() => {
    if (item) {
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price?.toString() || '',
        categoryId: item.category_id || '',
        imageUrl: item.image_url || '',
        station: item.station || 'hot',
        dietaryTags: item.dietary_tags || [],
        isBestseller: item.is_bestseller || false,
        isAvailable: item.is_available ?? true,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        price: '',
        categoryId: categories[0]?.id || '',
        imageUrl: '',
        station: 'hot',
        dietaryTags: [],
        isBestseller: false,
        isAvailable: true,
      });
    }
  }, [item, isOpen, categories]);

  const handleField = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const toggleTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      dietaryTags: prev.dietaryTags.includes(tag)
        ? prev.dietaryTags.filter((t) => t !== tag)
        : [...prev.dietaryTags, tag],
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.categoryId) return;
    onSave(formData);
  };

  const previewPrice = parseFloat(formData.price) || 0;

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Menu Item' : 'New Menu Item'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Live Preview Card */}
        <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/50 border border-stone-200/80 dark:border-stone-800 flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {formData.dietaryTags.includes('veg') ? (
                <span className="h-3 w-3 rounded-sm border border-emerald-600 flex items-center justify-center p-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                </span>
              ) : formData.dietaryTags.includes('non-veg') ? (
                <span className="h-3 w-3 rounded-sm border border-rose-600 flex items-center justify-center p-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
                </span>
              ) : null}
              <span className="font-bold text-sm text-stone-900 dark:text-white truncate">
                {formData.name || 'Item Name'}
              </span>
              {formData.isBestseller && (
                <Badge variant="warning" size="sm">Must Try</Badge>
              )}
            </div>
            <p className="text-xs text-stone-500 line-clamp-1">
              {formData.description || 'Item description...'}
            </p>
            <div className="text-sm font-bold text-stone-900 dark:text-white">
              {formatCurrency(previewPrice)}
            </div>
          </div>
          {formData.imageUrl && (
            <img
              src={formData.imageUrl}
              alt=""
              className="h-16 w-16 rounded-xl object-cover shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
        </div>

        {/* Form Fields */}
        <Input
          label="Item Name"
          value={formData.name}
          onChange={handleField('name')}
          placeholder="e.g. Tandoori Paneer Tikka"
          required
        />

        <Input
          label="Description"
          value={formData.description}
          onChange={handleField('description')}
          placeholder="Brief appetizing description for guests"
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Price (₹)"
            type="number"
            step="0.01"
            min="0"
            value={formData.price}
            onChange={handleField('price')}
            placeholder="340.00"
            required
          />

          <Select
            label="Category"
            value={formData.categoryId}
            onChange={handleField('categoryId')}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            placeholder="Select category"
            required
          />
        </div>

        <Select
          label="Kitchen Station"
          value={formData.station}
          onChange={handleField('station')}
          options={STATION_OPTIONS}
        />

        <Input
          label="Image URL (optional)"
          value={formData.imageUrl}
          onChange={handleField('imageUrl')}
          placeholder="https://your-bucket.supabase.co/storage/..."
          helperText="Paste a direct link. Storage upload coming in a later step."
        />

        {/* Dietary Tags */}
        <div>
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
            Dietary Tags
          </label>
          <div className="flex flex-wrap gap-2">
            {DIETARY_TAG_OPTIONS.map((tag) => {
              const isActive = formData.dietaryTags.includes(tag.value);
              return (
                <button
                  key={tag.value}
                  type="button"
                  onClick={() => toggleTag(tag.value)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isActive
                      ? 'bg-brand-primary text-white border-brand-primary shadow-sm'
                      : 'bg-stone-100 text-stone-600 border-stone-200 hover:border-stone-300 dark:bg-stone-800 dark:text-stone-400 dark:border-stone-700'
                  }`}
                >
                  {tag.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3 pt-1">
          <Toggle
            checked={formData.isBestseller}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, isBestseller: val }))
            }
            label="Mark as Bestseller"
            description="Highlighted with a badge on the guest menu"
          />
          <Toggle
            checked={formData.isAvailable}
            onChange={(val) =>
              setFormData((prev) => ({ ...prev, isAvailable: val }))
            }
            label="Available for Ordering"
            description="Toggle off to 86 this item temporarily"
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-3 border-t border-stone-100 dark:border-stone-800">
          <Button variant="ghost" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading}>
            {isEdit ? 'Save Changes' : 'Add to Menu'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
