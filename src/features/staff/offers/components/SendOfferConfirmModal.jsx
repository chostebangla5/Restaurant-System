import React from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Send } from 'lucide-react';

export function SendOfferConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  offerTitle,
  deviceCount,
  isLoading = false,
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showCloseButton={true}
      size="sm"
    >
      <div className="text-center py-2">
        {/* Icon */}
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#141721] border border-white/[0.08] text-[#C6FF3D]">
          <Send className="h-5 w-5" strokeWidth={1.5} />
        </div>

        {/* Title */}
        <h3 className="text-base font-heading font-bold text-[#F4F5F7] mb-2">
          Send to {deviceCount} phone{deviceCount !== 1 ? 's' : ''}
        </h3>

        {/* Description */}
        <p className="text-xs text-[#8A8F9C] leading-relaxed max-w-sm mx-auto">
          <span className="font-semibold text-[#F4F5F7]">"{offerTitle}"</span> goes to
          the notification bar of{' '}
          <span className="font-mono font-semibold text-[#C6FF3D]">{deviceCount} phone{deviceCount !== 1 ? 's' : ''}</span>{' '}
          now. It cannot be taken back.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="rounded-full border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]"
          >
            Keep things as they are
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            leftIcon={!isLoading && <Send className="h-3.5 w-3.5" strokeWidth={1.5} />}
            className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold"
          >
            Send now
          </Button>
        </div>
      </div>
    </Modal>
  );
}
