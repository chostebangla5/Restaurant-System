import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Send, Pencil, Trash2, Percent, IndianRupee, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

export function OfferCard({
  offer,
  deviceCount = 0,
  onSend,
  onEdit,
  onDelete,
  onToggle,
  isSending = false,
}) {
  const [copied, setCopied] = useState(false);
  const isPercent = offer.discount_type === 'percent';
  const couponCode = offer.rule_json?.coupon_code;

  const handleCopyCode = () => {
    if (!couponCode) return;
    navigator.clipboard.writeText(couponCode);
    setCopied(true);
    toast.success(`Coupon "${couponCode}" copied to clipboard!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      className="group rounded-2xl border border-stone-200/80 dark:border-stone-800 bg-white dark:bg-stone-900 overflow-hidden transition-shadow hover:shadow-lg hover:shadow-stone-200/50 dark:hover:shadow-stone-950/50"
    >
      {/* Top gradient accent */}
      <div className={`h-1 w-full ${offer.is_active ? 'bg-gradient-to-r from-orange-500 to-amber-400' : 'bg-stone-300 dark:bg-stone-700'}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Discount badge */}
            <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl font-bold text-sm ${
              offer.is_active
                ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25'
                : 'bg-stone-200 text-stone-500 dark:bg-stone-800 dark:text-stone-400'
            }`}>
              {isPercent ? (
                <div className="text-center leading-none">
                  <span className="text-lg font-extrabold">{offer.discount_value}</span>
                  <span className="text-[10px] block -mt-0.5">%</span>
                </div>
              ) : (
                <div className="text-center leading-none">
                  <span className="text-[10px] block">₹</span>
                  <span className="text-lg font-extrabold">{offer.discount_value}</span>
                </div>
              )}
            </div>

            {/* Title + Meta */}
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-stone-900 dark:text-white truncate">
                {offer.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={offer.is_active ? 'success' : 'default'} size="sm">
                  {offer.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {offer.min_order_amount > 0 && (
                  <span className="text-[11px] text-stone-500">
                    Min ₹{offer.min_order_amount}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Active toggle */}
          <Toggle
            checked={offer.is_active}
            onChange={() => onToggle?.(offer.id, !offer.is_active)}
            size="sm"
          />
        </div>

        {/* Coupon Code Pill */}
        {couponCode && (
          <div className="mb-3 flex items-center justify-between px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/30 border border-dashed border-orange-300 dark:border-orange-800/60">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm">🏷️</span>
              <div className="min-w-0">
                <div className="text-[10px] font-semibold text-orange-600 dark:text-orange-400 uppercase tracking-wider">
                  Promo Coupon Code
                </div>
                <div className="font-mono font-black text-xs text-stone-900 dark:text-white truncate">
                  {couponCode}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 dark:text-orange-400 px-2 py-1 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors shrink-0"
              title="Copy Coupon Code"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-600" />
                  <span className="text-emerald-600">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Description / Message */}
        {offer.description && (
          <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed mb-4 line-clamp-2">
            {offer.description}
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between pt-3 border-t border-stone-100 dark:border-stone-800">
          {/* Send button */}
          <Button
            size="sm"
            variant={offer.is_active ? 'primary' : 'secondary'}
            disabled={!offer.is_active || deviceCount === 0}
            isLoading={isSending}
            onClick={() => onSend?.(offer)}
            leftIcon={<Send className="h-3.5 w-3.5" />}
            className={offer.is_active ? 'shadow-md shadow-orange-500/20' : ''}
          >
            Send to {deviceCount} phone{deviceCount !== 1 ? 's' : ''}
          </Button>

          {/* Edit + Delete */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit?.(offer)}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              <Pencil className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete?.(offer.id)}
              className="text-stone-400 hover:text-rose-500"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
