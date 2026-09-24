import React from 'react';
import { Badge } from '@/components/ui/Badge';
import { Toggle } from '@/components/ui/Toggle';
import { formatCurrency } from '@/utils/formatCurrency';
import {
  Pencil,
  Trash2,
  Star,
  Flame,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const STATION_LABEL = {
  hot: { label: 'Hot', color: 'text-amber-400 bg-amber-400/10 border border-amber-400/25' },
  cold: { label: 'Cold', color: 'text-sky-400 bg-sky-400/10 border border-sky-400/25' },
  bar: { label: 'Bar', color: 'text-[#C6FF3D] bg-[#C6FF3D]/10 border border-[#C6FF3D]/25' },
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
        'group p-4 rounded-card bg-[#0E1016] border border-white/[0.08] transition-all duration-300 hover:border-white/[0.18]',
        !item.is_available && 'opacity-50'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Veg/Non-veg indicator */}
            {isVeg && (
              <span className="h-3.5 w-3.5 rounded-sm border border-emerald-500/80 flex items-center justify-center shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              </span>
            )}
            {isNonVeg && (
              <span className="h-3.5 w-3.5 rounded-sm border border-rose-500/80 flex items-center justify-center shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
              </span>
            )}

            <h4 className="font-heading font-semibold text-sm text-[#F4F5F7] truncate">
              {item.name}
            </h4>

            {item.is_bestseller && (
              <Badge variant="warning" size="sm">
                <Flame className="h-3 w-3 mr-1 inline" strokeWidth={1.5} /> Bestseller
              </Badge>
            )}

            {!item.is_available && (
              <Badge variant="danger" size="sm">86'd</Badge>
            )}
          </div>

          {/* Description */}
          {item.description && (
            <p className="text-xs text-[#8A8F9C] line-clamp-2 leading-relaxed">
              {item.description}
            </p>
          )}

          {/* Meta Row */}
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="font-mono text-sm font-bold text-[#F4F5F7]">
              {formatCurrency(item.price)}
            </span>
            <span
              className={cn(
                'text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full',
                station.color
              )}
            >
              {station.label}
            </span>
            {item.menu_categories?.name && (
              <span className="text-[10px] font-mono text-[#8A8F9C]">
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
            loading="lazy"
            decoding="async"
            className="h-16 w-16 rounded-xl object-cover shrink-0 border border-white/[0.08]"
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        )}
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-white/[0.06]">
        <div className="flex items-center gap-3">
          <Toggle
            checked={item.is_available}
            onChange={(val) => onToggleAvailability?.(item.id, val)}
            size="sm"
            label="Available"
          />
        </div>

        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={() => onToggleBestseller?.(item.id, !item.is_bestseller)}
            className={cn(
              'p-2 min-h-[36px] min-w-[36px] relative before:absolute before:-inset-1 before:content-[\'\'] touch-manipulation rounded-full transition-colors flex items-center justify-center',
              item.is_bestseller
                ? 'text-[#C6FF3D] bg-[#C6FF3D]/10'
                : 'text-[#8A8F9C] hover:bg-white/[0.06] hover:text-[#F4F5F7]'
            )}
            title={item.is_bestseller ? 'Remove bestseller' : 'Mark as bestseller'}
            aria-label={item.is_bestseller ? 'Remove bestseller' : 'Mark as bestseller'}
          >
            <Star className={cn('h-3.5 w-3.5', item.is_bestseller && 'fill-current')} strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onEdit?.(item)}
            className="p-2 min-h-[36px] min-w-[36px] relative before:absolute before:-inset-1 before:content-[\'\'] touch-manipulation rounded-full text-[#8A8F9C] hover:bg-white/[0.06] hover:text-[#F4F5F7] transition-colors flex items-center justify-center"
            title="Edit item"
            aria-label="Edit item"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
          <button
            type="button"
            onClick={() => onDelete?.(item)}
            className="p-2 min-h-[36px] min-w-[36px] relative before:absolute before:-inset-1 before:content-[\'\'] touch-manipulation rounded-full text-[#8A8F9C] hover:bg-rose-500/10 hover:text-rose-400 transition-colors flex items-center justify-center"
            title="Remove item"
            aria-label="Remove item"
          >
            <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  );
}
