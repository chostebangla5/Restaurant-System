import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/shared/auth';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { OfferCard } from './OfferCard';
import { CreateOfferModal } from './CreateOfferModal';
import { SendOfferConfirmModal } from './SendOfferConfirmModal';
import {
  fetchOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOfferActive,
  getSubscriptionCount,
  sendOfferNotification,
  fetchNotificationHistory,
} from '../api/offersApi';
import {
  Plus,
  Megaphone,
  Bell,
  Clock,
  Send,
  CheckCircle,
  XCircle,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';

export function StaffOffersScreen() {
  const { venueId, orgId, user } = useAuth();

  // Offers state
  const [offers, setOffers] = useState([]);
  const [isLoadingOffers, setIsLoadingOffers] = useState(true);
  const [deviceCount, setDeviceCount] = useState(0);

  // Notification history
  const [history, setHistory] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [sendingOffer, setSendingOffer] = useState(null); // The offer being sent
  const [isCreating, setIsCreating] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendingOfferId, setSendingOfferId] = useState(null);

  // Load data
  const loadOffers = useCallback(async () => {
    if (!venueId) return;
    try {
      setIsLoadingOffers(true);
      const [offersData, count] = await Promise.all([
        fetchOffers(venueId),
        getSubscriptionCount(venueId),
      ]);
      setOffers(offersData);
      setDeviceCount(count);
    } catch (err) {
      console.error('Failed to load offers:', err);
      toast.error('Failed to load offers');
    } finally {
      setIsLoadingOffers(false);
    }
  }, [venueId]);

  const loadHistory = useCallback(async () => {
    if (!venueId) return;
    try {
      setIsLoadingHistory(true);
      const data = await fetchNotificationHistory(venueId);
      setHistory(data);
    } catch (err) {
      console.error('Failed to load history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  }, [venueId]);

  useEffect(() => {
    loadOffers();
    loadHistory();
  }, [loadOffers, loadHistory]);

  // Create / Edit offer
  const handleCreateOrEditOffer = async (formData) => {
    try {
      setIsCreating(true);
      if (editingOffer) {
        await updateOffer(editingOffer.id, formData);
        toast.success('Offer updated!');
      } else {
        await createOffer({
          orgId,
          venueId,
          ...formData,
        });
        toast.success('Offer created!');
      }
      setShowCreateModal(false);
      setEditingOffer(null);
      loadOffers();
    } catch (err) {
      console.error('Failed to save offer:', err);
      toast.error(err.message || 'Failed to save offer');
    } finally {
      setIsCreating(false);
    }
  };

  // Delete offer
  const handleDelete = async (offerId) => {
    if (!window.confirm('Delete this offer? This action cannot be undone.')) return;
    try {
      await deleteOffer(offerId);
      toast.success('Offer deleted');
      loadOffers();
    } catch (err) {
      toast.error('Failed to delete offer');
    }
  };

  // Toggle active
  const handleToggle = async (offerId, isActive) => {
    try {
      await toggleOfferActive(offerId, isActive);
      setOffers((prev) =>
        prev.map((o) => (o.id === offerId ? { ...o, is_active: isActive } : o))
      );
      toast.success(isActive ? 'Offer activated' : 'Offer deactivated');
    } catch (err) {
      toast.error('Failed to update offer');
    }
  };

  // Open edit modal
  const handleEdit = (offer) => {
    setEditingOffer(offer);
    setShowCreateModal(true);
  };

  // Open send confirmation
  const handleSendClick = (offer) => {
    if (deviceCount === 0) {
      toast.error('No devices subscribed yet. Guests need to enable notifications first.');
      return;
    }
    setSendingOffer(offer);
  };

  // Confirm send
  const handleConfirmSend = async () => {
    if (!sendingOffer) return;
    try {
      setIsSending(true);
      setSendingOfferId(sendingOffer.id);
      const result = await sendOfferNotification({
        offerId: sendingOffer.id,
        venueId,
        title: sendingOffer.title,
        message: sendingOffer.description || sendingOffer.title,
      });
      toast.success(`Sent to ${result.sent || deviceCount} device${(result.sent || deviceCount) !== 1 ? 's' : ''}!`);
      setSendingOffer(null);
      loadHistory();
    } catch (err) {
      console.error('Failed to send notifications:', err);
      toast.error(err.message || 'Failed to send notifications');
    } finally {
      setIsSending(false);
      setSendingOfferId(null);
    }
  };

  // Format time ago
  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diff = Math.floor((now - date) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-[#F4F5F7] flex items-center gap-2.5">
            <Megaphone className="h-5 w-5 text-[#C6FF3D]" strokeWidth={1.5} />
            Offers &amp; Coupons
          </h1>
          <p className="text-xs text-[#8A8F9C] mt-1">
            Create promotional offers, generate promo coupon codes, and send push notifications
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Device count indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#0E1016] border border-white/[0.08]">
            <Smartphone className="h-3.5 w-3.5 text-[#C6FF3D]" strokeWidth={1.5} />
            <span className="text-xs font-mono text-[#8A8F9C]">
              {deviceCount} device{deviceCount !== 1 ? 's' : ''} subscribed
            </span>
          </div>
          <Button
            size="md"
            onClick={() => {
              setEditingOffer(null);
              setShowCreateModal(true);
            }}
            leftIcon={<Plus className="h-4 w-4" strokeWidth={1.5} />}
            className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold"
          >
            Create Offer
          </Button>
        </div>
      </div>

      {/* Offers Grid */}
      {isLoadingOffers ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-48 rounded-card bg-[#0E1016] border border-white/[0.08] animate-pulse"
            />
          ))}
        </div>
      ) : offers.length === 0 ? (
        <div className="p-8 rounded-card bg-[#0E1016] border border-white/[0.08]">
          <EmptyState
            icon={Megaphone}
            title="No offers yet"
            description="Create your first promotional offer and send it as a push notification directly to your guests' phones."
            action={
              <Button
                size="sm"
                onClick={() => {
                  setEditingOffer(null);
                  setShowCreateModal(true);
                }}
                leftIcon={<Plus className="h-4 w-4" strokeWidth={1.5} />}
                className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold"
              >
                Create First Offer
              </Button>
            }
          />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <AnimatePresence mode="popLayout">
            {offers.map((offer) => (
              <OfferCard
                key={offer.id}
                offer={offer}
                deviceCount={deviceCount}
                onSend={handleSendClick}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onToggle={handleToggle}
                isSending={sendingOfferId === offer.id}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Sent Recently Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-heading font-semibold text-[#F4F5F7] flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#8A8F9C]" strokeWidth={1.5} />
            Sent recently
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadHistory}
            leftIcon={<RefreshCw className="h-3 w-3" strokeWidth={1.5} />}
            className="text-xs font-mono text-[#8A8F9C] hover:text-[#F4F5F7] rounded-full"
          >
            Refresh
          </Button>
        </div>

        {isLoadingHistory ? (
          <div className="space-y-3">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-16 rounded-xl bg-[#0E1016] border border-white/[0.08] animate-pulse"
              />
            ))}
          </div>
        ) : history.length === 0 ? (
          <div className="rounded-card border border-dashed border-white/[0.12] bg-[#0E1016] p-6 text-center">
            <Bell className="h-6 w-6 text-[#8A8F9C] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-xs text-[#8A8F9C]">
              No notifications sent yet. Create an offer and send it to your guests!
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {history.map((item, idx) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="flex items-center gap-4 rounded-xl border border-white/[0.08] bg-[#0E1016] p-4 hover:border-white/[0.18] transition-colors"
              >
                {/* Icon */}
                <div className="flex-shrink-0 flex h-10 w-10 items-center justify-center rounded-full bg-[#141721] border border-white/[0.08] text-[#C6FF3D]">
                  <Send className="h-4 w-4" strokeWidth={1.5} />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F4F5F7] truncate">
                    {item.title}
                  </p>
                  {item.message && (
                    <p className="text-xs text-[#8A8F9C] truncate mt-0.5">
                      {item.message}
                    </p>
                  )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0 font-mono text-xs">
                  <div className="flex items-center gap-1 text-emerald-400">
                    <CheckCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                    <span>
                      {item.devices_delivered}
                    </span>
                  </div>
                  {item.devices_failed > 0 && (
                    <div className="flex items-center gap-1 text-rose-400">
                      <XCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>
                        {item.devices_failed}
                      </span>
                    </div>
                  )}
                  <span className="text-[11px] text-[#8A8F9C] whitespace-nowrap">
                    {timeAgo(item.sent_at)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showCreateModal && (
        <CreateOfferModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingOffer(null);
          }}
          onSubmit={handleCreateOrEditOffer}
          editingOffer={editingOffer}
          isLoading={isCreating}
        />
      )}

      {/* Send Confirmation Modal */}
      {sendingOffer && (
        <SendOfferConfirmModal
          isOpen={!!sendingOffer}
          onClose={() => setSendingOffer(null)}
          onConfirm={handleConfirmSend}
          offerTitle={sendingOffer.title}
          deviceCount={deviceCount}
          isLoading={isSending}
        />
      )}
    </div>
  );
}
