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
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 dark:bg-orange-950/40">
          <Send className="h-7 w-7 text-brand-primary" />
        </div>

        {/* Title */}
        <h3 className="text-lg font-bold text-stone-900 dark:text-white mb-2">
          Send to {deviceCount} phone{deviceCount !== 1 ? 's' : ''}
        </h3>

        {/* Description */}
        <p className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed max-w-sm mx-auto">
          <span className="font-semibold text-stone-800 dark:text-stone-200">"{offerTitle}"</span> goes to
          the notification bar of{' '}
          <span className="font-semibold text-brand-primary">{deviceCount} phone{deviceCount !== 1 ? 's' : ''}</span>{' '}
          now. It cannot be taken back.
        </p>

        {/* Actions */}
        <div className="flex items-center justify-center gap-3 mt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Keep things as they are
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            leftIcon={!isLoading && <Send className="h-3.5 w-3.5" />}
            className="bg-brand-primary hover:bg-brand-primary-hover shadow-lg shadow-orange-500/25"
          >
            Send now
          </Button>
        </div>
      </div>
    </Modal>
  );
}
