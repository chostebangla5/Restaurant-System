import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  PencilIcon,
  TrashIcon,
  StarIcon,
  FireIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { cn } from '@/lib/utils';

const STATION_LABEL = {
  hot: { label: 'Hot', color: 'text-orange-600 bg-orange-50 dark:bg-orange-950/30 dark:text-orange-400' },
  cold: { label: 'Cold', color: 'text-sky-600 bg-sky-50 dark:bg-sky-950/30 dark:text-sky-400' },
  bar: { label: 'Bar', color: 'text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400' },
};

export function MenuItemCard({
  item,
  onEdit,
  onDelete,
  onToggleAvailability,
  onToggleBestseller,
}) {
  const station = STATION_LABEL[item.station] || STATION_LABEL.hot;
  const isVeg = item.dietary_tags?.includes('veg');
  const isNonVeg = item.dietary_tags?.includes('non-veg');

  return (
    <div
      className={cn(
        'group p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm transition-all hover:shadow-md hover:border-brand-primary/30',
        !item.is_available && 'opacity-60'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Veg/Non-veg indicator */}
            {isVeg && (
              <span className="h-3.5 w-3.5 rounded-sm border-2 border-emerald-600 flex items-center justify-center shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
              </span>
            )}
            {isNonVeg && (
              <span className="h-3.5 w-3.5 rounded-sm border-2 border-rose-600 flex items-center justify-center shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-600" />
              </span>
            )}

            <h4 className="font-bold text-sm text-stone-900 dark:text-white truncate">
              {item.name}
            </h4>

            {item.is_bestseller && (
              <Badge variant="warning" size="sm">
                <FireIcon className="h-3 w-3" /> Bestseller
              </Badge>
            )}

            {!item.is_available && (
              <Badge variant="danger" size="sm">86'd</Badge>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-stone-500 dark:text-stone-400 line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Meta Row */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-bold text-stone-900 dark:text-white">
              {formatCurrency(item.price)}
            </span>
            <span
              className={cn(
                'text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider',
                station.color
              )}
            >
              {station.label}
            </span>
            {item.menu_categories?.name && (
              <span className="text-[10px] font-medium text-stone-400 dark:text-stone-500">
                {item.menu_categories.name}
              </span>
            )}
          </div>
        </div>

        {/* Image */}
        {item.image_url && (
          <img
            src={item.image_url}
            alt={item.name}
            className="h-16 w-16 rounded-xl object-cover shrink-0 border border-stone-100 dark:border-stone-800"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-3">
          <Toggle
            checked={item.is_available}
            onChange={(val) => onToggleAvailability?.(item.id, val)}
            size="sm"
            label="Available"
          />
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onToggleBestseller?.(item.id, !item.is_bestseller)}
            className={cn(
              'p-2 rounded-lg transition-colors',
              item.is_bestseller
                ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30'
                : 'text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800'
            )}
            title={item.is_bestseller ? 'Remove bestseller' : 'Mark as bestseller'}
          >
            {item.is_bestseller ? (
              <StarIconSolid className="h-4 w-4" />
            ) : (
              <StarIcon className="h-4 w-4" />
            )}
          </button>
          <button
            type="button"
            onClick={() => onEdit?.(item)}
            className="p-2 rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-200 transition-colors"
            title="Edit item"
          >
            <PencilIcon className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(item)}
            className="p-2 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400 transition-colors"
            title="Remove item"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
