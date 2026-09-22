import { supabase } from '@/lib/supabase';

// ─── Categories ──────────────────────────────────────────────────────────────

export async function fetchCategories(venueId) {
  const { data, error } = await supabase
    .from('menu_categories')
    .select('*')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: true });

  if (error) throw error;
  return data || [];
}

export async function createCategory({ orgId, venueId, name, description = '' }) {
  // Get the next sort_order
  const { data: existing } = await supabase
    .from('menu_categories')
    .select('sort_order')
    .eq('venue_id', venueId)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('menu_categories')
    .insert({
      org_id: orgId,
      venue_id: venueId,
      name,
      description,
      sort_order: nextOrder,
      is_active: true,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateCategory(id, updates) {
  const { data, error } = await supabase
    .from('menu_categories')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase
    .from('menu_categories')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function reorderCategories(orderedIds) {
  // Batch update sort_order for each category
  const updates = orderedIds.map((id, index) => ({
    id,
    sort_order: index,
  }));

  for (const u of updates) {
    const { error } = await supabase
      .from('menu_categories')
      .update({ sort_order: u.sort_order })
      .eq('id', u.id);

    if (error) throw error;
  }
}

// ─── Menu Items ──────────────────────────────────────────────────────────────

export async function fetchItems(venueId, categoryId = null) {
  let query = supabase
    .from('menu_items')
    .select('*, menu_categories(name)')
    .eq('venue_id', venueId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: true });

  if (categoryId) {
    query = query.eq('category_id', categoryId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createItem({
  orgId,
  venueId,
  categoryId,
  name,
  description = '',
  price,
  imageUrl = '',
  station = 'hot',
  dietaryTags = [],
  isBestseller = false,
  isAvailable = true,
}) {
  // Get next sort_order
  const { data: existing } = await supabase
    .from('menu_items')
    .select('sort_order')
    .eq('venue_id', venueId)
    .eq('category_id', categoryId)
    .eq('is_deleted', false)
    .order('sort_order', { ascending: false })
    .limit(1);

  const nextOrder = existing?.[0]?.sort_order != null ? existing[0].sort_order + 1 : 0;

  const { data, error } = await supabase
    .from('menu_items')
    .insert({
      org_id: orgId,
      venue_id: venueId,
      category_id: categoryId,
      name,
      description,
      price: parseFloat(price),
      image_url: imageUrl,
      station,
      dietary_tags: dietaryTags,
      is_bestseller: isBestseller,
      is_available: isAvailable,
      sort_order: nextOrder,
    })
    .select('*, menu_categories(name)')
    .single();

  if (error) throw error;
  return data;
}

export async function updateItem(id, updates) {
  // Convert camelCase keys to snake_case for Supabase
  const mapped = {};
  if (updates.name !== undefined) mapped.name = updates.name;
  if (updates.description !== undefined) mapped.description = updates.description;
  if (updates.price !== undefined) mapped.price = parseFloat(updates.price);
  if (updates.categoryId !== undefined) mapped.category_id = updates.categoryId;
  if (updates.imageUrl !== undefined) mapped.image_url = updates.imageUrl;
  if (updates.station !== undefined) mapped.station = updates.station;
  if (updates.dietaryTags !== undefined) mapped.dietary_tags = updates.dietaryTags;
  if (updates.isBestseller !== undefined) mapped.is_bestseller = updates.isBestseller;
  if (updates.isAvailable !== undefined) mapped.is_available = updates.isAvailable;

  const { data, error } = await supabase
    .from('menu_items')
    .update(mapped)
    .eq('id', id)
    .select('*, menu_categories(name)')
    .single();

  if (error) throw error;
  return data;
}

export async function softDeleteItem(id) {
  const { error } = await supabase
    .from('menu_items')
    .update({ is_deleted: true, is_available: false })
    .eq('id', id);

  if (error) throw error;
}

export async function toggleItemAvailability(id, isAvailable) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_available: isAvailable })
    .eq('id', id)
    .select('*, menu_categories(name)')
    .single();

  if (error) throw error;
  return data;
}

export async function toggleItemBestseller(id, isBestseller) {
  const { data, error } = await supabase
    .from('menu_items')
    .update({ is_bestseller: isBestseller })
    .eq('id', id)
    .select('*, menu_categories(name)')
    .single();

  if (error) throw error;
  return data;
}
