import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/shared/auth';
import { isSupabaseConfigured } from '@/lib/supabase';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Toggle } from '@/components/ui/Toggle';
import { MenuItemCard } from './MenuItemCard';
import { CategoryForm } from './CategoryForm';
import { MenuItemForm } from './MenuItemForm';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  fetchItems,
  createItem,
  updateItem,
  softDeleteItem,
  toggleItemAvailability,
  toggleItemBestseller,
} from '../api/menuApi';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  BookOpenIcon,
  Bars3BottomLeftIcon,
  PencilIcon,
  TrashIcon,
  EyeSlashIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';
import toast from 'react-hot-toast';

// ─── Main Component ───────────────────────────────────────────────────────────

export function StaffMenuScreen() {
  const { venueId, orgId } = useAuth();
  const configured = isSupabaseConfigured();

  // State
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showUnavailable, setShowUnavailable] = useState(true);
  const [isLoadingCats, setIsLoadingCats] = useState(false);
  const [isLoadingItems, setIsLoadingItems] = useState(false);

  // Modals
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [itemFormOpen, setItemFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Drag state for category reorder
  const [dragIndex, setDragIndex] = useState(null);

  // ─── Load data ───

  const loadCategories = useCallback(async () => {
    if (!configured || !venueId) {
      setCategories([]);
      return;
    }
    setIsLoadingCats(true);
    try {
      const data = await fetchCategories(venueId);
      setCategories(data || []);
    } catch (err) {
      toast.error('Failed to load categories');
      console.error(err);
    } finally {
      setIsLoadingCats(false);
    }
  }, [venueId, configured]);

  const loadItems = useCallback(async () => {
    if (!configured || !venueId) {
      setItems([]);
      return;
    }
    setIsLoadingItems(true);
    try {
      const data = await fetchItems(venueId);
      setItems(data || []);
    } catch (err) {
      toast.error('Failed to load menu items');
      console.error(err);
    } finally {
      setIsLoadingItems(false);
    }
  }, [venueId, configured]);

  useEffect(() => {
    loadCategories();
    loadItems();
  }, [loadCategories, loadItems]);

  // ─── Category Actions ───

  const handleSaveCategory = async (formData) => {
    setIsSaving(true);
    try {
      if (editingCategory) {
        if (configured) {
          await updateCategory(editingCategory.id, formData);
        }
        toast.success('Category updated');
      } else {
        if (configured) {
          await createCategory({ orgId, venueId, ...formData });
        }
        toast.success('Category created');
      }
      await loadCategories();
      setCategoryModalOpen(false);
      setEditingCategory(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save category');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteCategory = async (cat) => {
    if (!window.confirm(`Delete "${cat.name}"? Items in this category will also be deleted.`)) {
      return;
    }
    try {
      if (configured) {
        await deleteCategory(cat.id);
      }
      toast.success('Category deleted');
      await loadCategories();
      await loadItems();
      if (selectedCategoryId === cat.id) {
        setSelectedCategoryId(null);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to delete category');
    }
  };

  // Category drag reorder
  const handleCatDragStart = (index) => (e) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleCatDragOver = (index) => (e) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    const reordered = [...categories];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(index, 0, moved);
    setCategories(reordered);
    setDragIndex(index);
  };

  const handleCatDragEnd = async () => {
    setDragIndex(null);
    if (configured) {
      try {
        await reorderCategories(categories.map((c) => c.id));
      } catch (err) {
        console.error('Reorder failed:', err);
        await loadCategories();
      }
    }
  };

  // ─── Item Actions ───

  const handleSaveItem = async (formData) => {
    setIsSaving(true);
    try {
      if (editingItem) {
        if (configured) {
          await updateItem(editingItem.id, formData);
        }
        toast.success('Item updated');
      } else {
        if (configured) {
          await createItem({ orgId, venueId, ...formData });
        }
        toast.success('Item added to menu');
      }
      await loadItems();
      setItemFormOpen(false);
      setEditingItem(null);
    } catch (err) {
      toast.error(err.message || 'Failed to save item');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Remove "${item.name}" from the menu?`)) return;
    try {
      if (configured) {
        await softDeleteItem(item.id);
      }
      toast.success('Item removed');
      await loadItems();
    } catch (err) {
      toast.error(err.message || 'Failed to remove item');
    }
  };

  const handleToggleAvailability = async (id, isAvailable) => {
    try {
      if (configured) {
        await toggleItemAvailability(id, isAvailable);
      }
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_available: isAvailable } : i))
      );
      toast.success(isAvailable ? 'Item is now available' : 'Item marked as 86\'d');
    } catch (err) {
      toast.error('Failed to update availability');
    }
  };

  const handleToggleBestseller = async (id, isBestseller) => {
    try {
      if (configured) {
        await toggleItemBestseller(id, isBestseller);
      }
      setItems((prev) =>
        prev.map((i) => (i.id === id ? { ...i, is_bestseller: isBestseller } : i))
      );
    } catch (err) {
      toast.error('Failed to update bestseller');
    }
  };

  // ─── Filtering ───

  const filteredItems = items.filter((item) => {
    const matchesCat = !selectedCategoryId || item.category_id === selectedCategoryId;
    const matchesSearch = !searchQuery || item.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAvail = showUnavailable || item.is_available;
    return matchesCat && matchesSearch && matchesAvail;
  });

  const itemCountForCat = (catId) => items.filter((i) => i.category_id === catId).length;

  // ─── Render ───

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">Menu & Catalog Studio</h2>
          <p className="text-xs text-stone-500">
            {categories.length} categories · {items.length} items
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => {
              setEditingCategory(null);
              setCategoryModalOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4" /> Category
          </Button>
          <Button
            size="sm"
            onClick={() => {
              setEditingItem(null);
              setItemFormOpen(true);
            }}
          >
            <PlusIcon className="h-4 w-4" /> New Item
          </Button>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ─── Category Sidebar ─── */}
        <div className="lg:w-56 shrink-0 space-y-2">
          <p className="text-[11px] uppercase tracking-wider font-bold text-stone-400 dark:text-stone-500 px-1">
            Categories (drag to reorder)
          </p>

          {/* All Items */}
          <button
            type="button"
            onClick={() => setSelectedCategoryId(null)}
            className={cn(
              'w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all',
              !selectedCategoryId
                ? 'bg-brand-primary text-white shadow-sm'
                : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
          >
            <span>All Items</span>
            <Badge size="sm" variant={!selectedCategoryId ? 'accent' : 'default'}>
              {items.length}
            </Badge>
          </button>

          {/* Category List */}
          {categories.map((cat, index) => (
            <div
              key={cat.id}
              draggable
              onDragStart={handleCatDragStart(index)}
              onDragOver={handleCatDragOver(index)}
              onDragEnd={handleCatDragEnd}
              className={cn(
                'group flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-grab active:cursor-grabbing',
                selectedCategoryId === cat.id
                  ? 'bg-brand-primary text-white shadow-sm'
                  : 'text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800',
                dragIndex === index && 'opacity-50'
              )}
            >
              <button
                type="button"
                onClick={() => setSelectedCategoryId(cat.id)}
                className="flex items-center gap-2 flex-1 min-w-0 text-left"
              >
                <Bars3BottomLeftIcon className="h-3.5 w-3.5 opacity-40 shrink-0" />
                <span className="truncate">{cat.name}</span>
              </button>
              <div className="flex items-center gap-1">
                <Badge
                  size="sm"
                  variant={selectedCategoryId === cat.id ? 'accent' : 'default'}
                >
                  {itemCountForCat(cat.id)}
                </Badge>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingCategory(cat);
                    setCategoryModalOpen(true);
                  }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all"
                  title="Edit category"
                >
                  <PencilIcon className="h-3 w-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteCategory(cat);
                  }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-white/20 transition-all"
                  title="Delete category"
                >
                  <TrashIcon className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}

          {categories.length === 0 && !isLoadingCats && (
            <div className="p-4 text-center text-xs text-stone-500">
              No categories yet. Create one to start adding menu items.
            </div>
          )}
        </div>

        {/* ─── Items Grid ─── */}
        <div className="flex-1 space-y-4">
          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-sm">
              <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
              <input
                type="text"
                placeholder="Search menu items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100"
              />
            </div>
            <div className="flex items-center gap-3">
              <Toggle
                checked={showUnavailable}
                onChange={setShowUnavailable}
                size="sm"
                label="Show 86'd"
              />
              <span className="text-xs text-stone-400">
                {filteredItems.length} item{filteredItems.length !== 1 ? 's' : ''}
              </span>
            </div>
          </div>

          {/* Items */}
          {filteredItems.length > 0 ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredItems.map((item) => (
                <MenuItemCard
                  key={item.id}
                  item={item}
                  onEdit={(i) => {
                    setEditingItem(i);
                    setItemFormOpen(true);
                  }}
                  onDelete={handleDeleteItem}
                  onToggleAvailability={handleToggleAvailability}
                  onToggleBestseller={handleToggleBestseller}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              icon={BookOpenIcon}
              title={searchQuery ? 'No items match your search' : 'No menu items yet'}
              description={
                searchQuery
                  ? `Try a different search term or clear the filter.`
                  : 'Add your first menu item to get started. Guests will see these on the QR ordering page.'
              }
              action={
                !searchQuery && (
                  <Button
                    size="sm"
                    onClick={() => {
                      setEditingItem(null);
                      setItemFormOpen(true);
                    }}
                  >
                    <PlusIcon className="h-4 w-4" /> Add First Item
                  </Button>
                )
              }
            />
          )}
        </div>
      </div>

      {/* ─── Modals ─── */}
      <CategoryForm
        isOpen={categoryModalOpen}
        onClose={() => {
          setCategoryModalOpen(false);
          setEditingCategory(null);
        }}
        onSave={handleSaveCategory}
        category={editingCategory}
        isLoading={isSaving}
      />

      <MenuItemForm
        isOpen={itemFormOpen}
        onClose={() => {
          setItemFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveItem}
        item={editingItem}
        categories={categories}
        isLoading={isSaving}
      />
    </div>
  );
}
