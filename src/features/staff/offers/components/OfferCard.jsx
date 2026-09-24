import React, { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { Send, Pencil, Trash2, Tag, Copy, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { TRANSITION_EASE, DURATION_ITEM } from '@/lib/motion';
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: DURATION_ITEM, ease: TRANSITION_EASE }}
      className="group rounded-card border border-white/[0.08] bg-[#0E1016] overflow-hidden transition-all duration-300 hover:border-white/[0.18]"
    >
      {/* Top hairline accent */}
      <div className={`h-[1px] w-full ${offer.is_active ? 'bg-[#C6FF3D]' : 'bg-white/[0.08]'}`} />

      <div className="p-5">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Discount badge */}
            <div className={`flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-xl font-mono text-sm border ${
              offer.is_active
                ? 'bg-[#141721] text-[#C6FF3D] border-[#C6FF3D]/30'
                : 'bg-white/[0.03] text-[#8A8F9C] border-white/[0.08]'
            }`}>
              {isPercent ? (
                <div className="text-center leading-none">
                  <span className="text-lg font-bold">{offer.discount_value}</span>
                  <span className="text-[10px] block -mt-0.5">%</span>
                </div>
              ) : (
                <div className="text-center leading-none">
                  <span className="text-[10px] block">₹</span>
                  <span className="text-lg font-bold">{offer.discount_value}</span>
                </div>
              )}
            </div>

            {/* Title + Meta */}
            <div className="min-w-0">
              <h3 className="text-sm font-heading font-semibold text-[#F4F5F7] truncate">
                {offer.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={offer.is_active ? 'success' : 'default'} size="sm">
                  {offer.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {offer.min_order_amount > 0 && (
                  <span className="text-[11px] font-mono text-[#8A8F9C]">
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
          <div className="mb-3 flex items-center justify-between px-3 py-2 rounded-xl bg-[#141721] border border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <Tag className="h-4 w-4 text-[#C6FF3D] shrink-0" strokeWidth={1.5} />
              <div className="min-w-0">
                <div className="text-[9px] font-mono text-[#8A8F9C] uppercase tracking-wider">
                  Promo Coupon Code
                </div>
                <div className="font-mono font-bold text-xs text-[#F4F5F7] truncate">
                  {couponCode}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="flex items-center gap-1 text-[11px] font-mono text-[#C6FF3D] hover:underline px-2 py-1 rounded-full transition-colors shrink-0"
              title="Copy Coupon Code"
            >
              {copied ? (
                <>
                  <Check className="h-3 w-3 text-emerald-400" strokeWidth={2} />
                  <span className="text-emerald-400">Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3 w-3" strokeWidth={1.5} />
                  <span>Copy</span>
                </>
              )}
            </button>
          </div>
        )}

        {/* Description / Message */}
        {offer.description && (
          <p className="text-xs text-[#8A8F9C] leading-relaxed mb-4 line-clamp-2">
            {offer.description}
          </p>
        )}

        {/* Actions row */}
        <div className="flex items-center justify-between pt-3 border-t border-white/[0.06]">
          {/* Send button */}
          <Button
            size="sm"
            variant={offer.is_active ? 'primary' : 'secondary'}
            disabled={!offer.is_active || deviceCount === 0}
            isLoading={isSending}
            onClick={() => onSend?.(offer)}
            leftIcon={<Send className="h-3.5 w-3.5" strokeWidth={1.5} />}
            className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold text-xs"
          >
            Send to {deviceCount} phone{deviceCount !== 1 ? 's' : ''}
          </Button>

          {/* Edit + Delete */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onEdit?.(offer)}
              className="rounded-full text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.04]"
            >
              <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete?.(offer.id)}
              className="rounded-full text-[#8A8F9C] hover:text-rose-400 hover:bg-rose-500/10"
            >
              <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
