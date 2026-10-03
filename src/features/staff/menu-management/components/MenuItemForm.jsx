import React, { useState, useEffect, useRef } from 'react';
import { Drawer } from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Badge } from '@/components/ui/Badge';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  Upload,
  Image as ImageIcon,
  Link as LinkIcon,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Utensils,
  Loader2,
  Sparkles,
} from 'lucide-react';
import {
  normalizeImageUrl,
  isLikelyWebpage,
  validateImageUrl,
  compressImageFile,
} from '@/utils/imageUrl';
import { getCatalogFoodImage } from '@/utils/foodImageMap';
import toast from 'react-hot-toast';

const STATION_OPTIONS = [
  { value: 'hot', label: 'Hot Kitchen' },
  { value: 'cold', label: 'Cold / Salad' },
  { value: 'bar', label: 'Bar' },
];

const DIETARY_TAG_OPTIONS = [
  { value: 'veg', label: 'Veg', color: 'success' },
  { value: 'non-veg', label: 'Non-Veg', color: 'danger' },
  { value: 'gluten-free', label: 'Gluten-Free', color: 'default' },
  { value: 'spicy', label: 'Spicy', color: 'warning' },
  { value: 'chef-special', label: 'Chef Special', color: 'primary' },
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

  const [imageMode, setImageMode] = useState('upload'); // 'upload' | 'url'
  const [urlStatus, setUrlStatus] = useState(null); // null | 'testing' | 'valid' | 'webpage' | 'error'
  const [isCompressing, setIsCompressing] = useState(false);
  const [previewFailed, setPreviewFailed] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (item) {
      const img = item.image_url || '';
      setFormData({
        name: item.name || '',
        description: item.description || '',
        price: item.price?.toString() || '',
        categoryId: item.category_id || '',
        imageUrl: img,
        station: item.station || 'hot',
        dietaryTags: item.dietary_tags || [],
        isBestseller: item.is_bestseller || false,
        isAvailable: item.is_available ?? true,
      });
      setImageMode(img.startsWith('data:image/') ? 'upload' : 'url');
      if (img && !img.startsWith('data:image/')) {
        setUrlStatus('valid');
      } else {
        setUrlStatus(null);
      }
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
      setImageMode('upload');
      setUrlStatus(null);
    }
    setPreviewFailed(false);
  }, [item, isOpen, categories]);

  const handleField = (field) => (e) => {
    setFormData((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleImageUrlChange = (e) => {
    const rawVal = e.target.value;
    setFormData((prev) => ({ ...prev, imageUrl: rawVal }));
    setPreviewFailed(false);

    if (!rawVal.trim()) {
      setUrlStatus(null);
      return;
    }

    if (isLikelyWebpage(rawVal)) {
      setUrlStatus('webpage');
      return;
    }

    const normalized = normalizeImageUrl(rawVal);
    setUrlStatus('testing');
    validateImageUrl(normalized).then((res) => {
      if (res.valid) {
        setUrlStatus('valid');
        if (normalized !== rawVal) {
          setFormData((prev) => ({ ...prev, imageUrl: normalized }));
        }
      } else {
        setUrlStatus('error');
      }
    });
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please choose a valid image file');
      return;
    }

    setIsCompressing(true);
    setPreviewFailed(false);
    try {
      const dataUrl = await compressImageFile(file, 600, 600, 0.85);
      setFormData((prev) => ({ ...prev, imageUrl: dataUrl }));
      setUrlStatus('valid');
      toast.success('Photo ready');
    } catch (err) {
      toast.error(err.message || 'Failed to process image');
    } finally {
      setIsCompressing(false);
    }
  };

  const handleClearImage = () => {
    setFormData((prev) => ({ ...prev, imageUrl: '' }));
    setUrlStatus(null);
    setPreviewFailed(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const toggleTag = (tag) => {
    setFormData((prev) => ({
      ...prev,
      dietaryTags: prev.dietaryTags.includes(tag)
        ? prev.dietaryTags.filter((t) => t !== tag)
        : [...prev.dietaryTags, tag],
    }));
  };

  const handleAutoSuggestPhoto = () => {
    const suggested = getCatalogFoodImage({ name: formData.name, description: formData.description });
    setFormData((prev) => ({ ...prev, imageUrl: suggested }));
    setUrlStatus('valid');
    setImageMode('url');
    setPreviewFailed(false);
    toast.success('Matched dish photo from catalog');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.price || !formData.categoryId) return;
    let finalImageUrl = formData.imageUrl ? normalizeImageUrl(formData.imageUrl) : '';
    // If empty or if user mistakenly pasted a webpage URL, auto-assign matching food photo
    if (!finalImageUrl || isLikelyWebpage(finalImageUrl)) {
      finalImageUrl = getCatalogFoodImage({ name: formData.name, description: formData.description });
    }
    onSave({
      ...formData,
      imageUrl: finalImageUrl,
    });
  };

  const previewPrice = parseFloat(formData.price) || 0;
  const normalizedPreviewUrl = formData.imageUrl ? normalizeImageUrl(formData.imageUrl) : '';
  const previewImageSrc = !previewFailed && normalizedPreviewUrl && !isLikelyWebpage(normalizedPreviewUrl)
    ? normalizedPreviewUrl
    : getCatalogFoodImage({ name: formData.name, description: formData.description });

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Menu Item' : 'New Menu Item'}
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Live Preview Card */}
        <div className="p-4 rounded-card bg-[#141721] border border-white/[0.08] flex items-center justify-between gap-4">
          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              {formData.dietaryTags.includes('veg') ? (
                <span className="h-3 w-3 rounded-sm border border-emerald-500 flex items-center justify-center p-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                </span>
              ) : formData.dietaryTags.includes('non-veg') ? (
                <span className="h-3 w-3 rounded-sm border border-rose-500 flex items-center justify-center p-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                </span>
              ) : null}
              <span className="font-heading font-semibold text-sm text-[#F4F5F7] truncate">
                {formData.name || 'Item Name'}
              </span>
              {formData.isBestseller && (
                <Badge variant="warning" size="sm">Must Try</Badge>
              )}
            </div>
            <p className="text-xs text-[#8A8F9C] line-clamp-1">
              {formData.description || 'Item description...'}
            </p>
            <div className="text-sm font-mono font-bold text-[#F4F5F7]">
              {formatCurrency(previewPrice)}
            </div>
          </div>
          <div className="relative h-16 w-16 rounded-xl overflow-hidden shrink-0 border border-white/[0.08] bg-[#0E1016] flex items-center justify-center">
            {previewImageSrc ? (
              <img
                src={previewImageSrc}
                alt={formData.name ? `${formData.name} preview` : 'Menu item preview'}
                loading="lazy"
                decoding="async"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
                onError={() => setPreviewFailed(true)}
              />
            ) : (
              <Utensils className="h-6 w-6 text-[#8A8F9C]/40" strokeWidth={1.5} />
            )}
          </div>
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

        {/* ─── Food Image Selector ─── */}
        <div className="space-y-2 rounded-xl border border-white/[0.08] bg-[#0E1016]/60 p-3.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <label className="text-xs font-mono uppercase tracking-wider text-[#8A8F9C] flex items-center gap-1.5">
              <ImageIcon className="h-3.5 w-3.5 text-[#C6FF3D]" strokeWidth={1.5} />
              Dish Photo
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleAutoSuggestPhoto}
                className="px-2.5 py-1 text-[11px] font-semibold rounded-md border border-[#C6FF3D]/30 bg-[#C6FF3D]/10 text-[#C6FF3D] hover:bg-[#C6FF3D]/20 transition-colors flex items-center gap-1"
                title="Automatically match a high-res photo for this dish"
              >
                <Sparkles className="h-3 w-3" />
                Auto-match
              </button>
              <div className="flex items-center gap-1 bg-[#141721] p-0.5 rounded-lg border border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setImageMode('upload')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 ${
                    imageMode === 'upload'
                      ? 'bg-[#C6FF3D] text-[#07080B] font-semibold shadow-xs'
                      : 'text-[#8A8F9C] hover:text-[#F4F5F7]'
                  }`}
                >
                  <Upload className="h-3 w-3" />
                  Upload
                </button>
                <button
                  type="button"
                  onClick={() => setImageMode('url')}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors flex items-center gap-1 ${
                    imageMode === 'url'
                      ? 'bg-[#C6FF3D] text-[#07080B] font-semibold shadow-xs'
                      : 'text-[#8A8F9C] hover:text-[#F4F5F7]'
                  }`}
                >
                  <LinkIcon className="h-3 w-3" />
                  Link URL
                </button>
              </div>
            </div>
          </div>

          {/* Mode 1: File Upload */}
          {imageMode === 'upload' && (
            <div className="space-y-2.5 pt-1">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="menu-item-photo-upload"
              />

              {formData.imageUrl && formData.imageUrl.startsWith('data:image/') ? (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#141721] border border-white/[0.08]">
                  <div className="flex items-center gap-3">
                    <img
                      src={formData.imageUrl}
                      alt="Uploaded food"
                      className="h-12 w-12 rounded-lg object-cover border border-white/[0.1]"
                    />
                    <div className="text-left">
                      <div className="text-xs font-medium text-[#F4F5F7] flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        Custom photo ready
                      </div>
                      <span className="text-[10px] text-[#8A8F9C]">Optimized for mobile & web</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-[#8A8F9C] hover:text-[#F4F5F7]"
                    >
                      Change
                    </Button>
                    <button
                      type="button"
                      onClick={handleClearImage}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Remove image"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isCompressing}
                  className="w-full border-2 border-dashed border-white/[0.12] hover:border-[#C6FF3D]/50 rounded-xl p-4 flex flex-col items-center justify-center gap-2 text-center transition-colors bg-[#141721]/50 cursor-pointer group"
                >
                  {isCompressing ? (
                    <>
                      <Loader2 className="h-6 w-6 text-[#C6FF3D] animate-spin" />
                      <span className="text-xs text-[#8A8F9C]">Optimizing photo…</span>
                    </>
                  ) : (
                    <>
                      <div className="h-10 w-10 rounded-full bg-white/[0.04] group-hover:bg-[#C6FF3D]/10 flex items-center justify-center text-[#8A8F9C] group-hover:text-[#C6FF3D] transition-colors">
                        <Upload className="h-5 w-5" strokeWidth={1.5} />
                      </div>
                      <div>
                        <span className="text-xs font-medium text-[#F4F5F7] group-hover:text-[#C6FF3D] transition-colors">
                          Click to select a food photo
                        </span>
                        <p className="text-[11px] text-[#8A8F9C] mt-0.5">
                          PNG, JPG, or WEBP from your phone or computer
                        </p>
                      </div>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Mode 2: Direct Image URL */}
          {imageMode === 'url' && (
            <div className="space-y-2 pt-1">
              <div className="relative">
                <Input
                  value={formData.imageUrl}
                  onChange={handleImageUrlChange}
                  placeholder="https://images.unsplash.com/... or direct .jpg / .png"
                  helperText="Paste direct image link (e.g. Unsplash, Google Drive, or Imgur)"
                />
                {formData.imageUrl && (
                  <button
                    type="button"
                    onClick={handleClearImage}
                    className="absolute right-2.5 top-8 p-1 rounded-md text-[#8A8F9C] hover:text-rose-400 hover:bg-white/[0.06] transition-colors"
                    title="Clear URL"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              {/* Status alerts */}
              {urlStatus === 'testing' && (
                <div className="flex items-center gap-2 text-[11px] text-amber-400/90 bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded-lg">
                  <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" />
                  <span>Verifying image link…</span>
                </div>
              )}

              {urlStatus === 'valid' && (
                <div className="flex items-center gap-2 text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-2 rounded-lg">
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                  <span>Image link verified successfully</span>
                </div>
              )}

              {urlStatus === 'webpage' && (
                <div className="space-y-2 text-[11px] text-amber-300 bg-amber-500/10 border border-amber-500/25 p-3 rounded-lg">
                  <div className="flex items-start gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <span>This looks like a recipe webpage rather than a direct image file.</span>
                  </div>
                  <p className="text-[11px] text-[#8A8F9C] pl-6 leading-relaxed">
                    To use an image from that page, right-click the dish picture and choose <strong className="text-[#F4F5F7]">"Copy Image Address"</strong>.
                  </p>
                  <div className="pl-6 pt-1 flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={handleAutoSuggestPhoto}
                      className="px-3 py-1.5 rounded-lg bg-[#C6FF3D] text-[#07080B] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#b8f52e] transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Auto-match verified photo for this dish
                    </button>
                    <button
                      type="button"
                      onClick={() => setImageMode('upload')}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.08] text-[#F4F5F7] font-medium text-xs flex items-center gap-1.5 hover:bg-white/[0.15] transition-colors cursor-pointer"
                    >
                      <Upload className="h-3.5 w-3.5" />
                      Upload photo from device
                    </button>
                  </div>
                </div>
              )}

              {urlStatus === 'error' && (
                <div className="space-y-2 text-[11px] text-rose-300 bg-rose-500/10 border border-rose-500/25 p-3 rounded-lg">
                  <div className="flex items-start gap-2 font-medium">
                    <AlertCircle className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <span>Unable to load image from this URL.</span>
                  </div>
                  <p className="text-[11px] text-[#8A8F9C] pl-6 leading-relaxed">
                    Please make sure the link points directly to an image (.jpg, .png, .webp) or click below to use the auto-matched verified dish photo.
                  </p>
                  <div className="pl-6 pt-1">
                    <button
                      type="button"
                      onClick={handleAutoSuggestPhoto}
                      className="px-3 py-1.5 rounded-lg bg-[#C6FF3D] text-[#07080B] font-semibold text-xs flex items-center gap-1.5 hover:bg-[#b8f52e] transition-colors cursor-pointer"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                      Auto-match verified photo for this dish
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Dietary Tags */}
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[#8A8F9C] mb-2">
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
                  className={`px-3 py-2 min-h-[38px] rounded-full text-xs font-medium border touch-manipulation transition-all ${
                    isActive
                      ? 'bg-[#C6FF3D] text-[#07080B] border-[#C6FF3D] font-semibold shadow-sm'
                      : 'bg-[#141721] text-[#8A8F9C] border-white/[0.08] hover:text-[#F4F5F7] hover:border-white/[0.2]'
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
        <div className="flex justify-end gap-3 pt-3 border-t border-white/[0.06]">
          <Button variant="ghost" onClick={onClose} type="button" className="rounded-full text-[#8A8F9C] hover:text-[#F4F5F7]">
            Cancel
          </Button>
          <Button type="submit" isLoading={isLoading} className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
            {isEdit ? 'Save Changes' : 'Add to Menu'}
          </Button>
        </div>
      </form>
    </Drawer>
  );
}
