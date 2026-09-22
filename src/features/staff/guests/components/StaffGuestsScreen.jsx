import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/shared/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Drawer } from '@/components/ui/Drawer';
import {
  fetchGuests,
  fetchGuestStats,
  fetchGuestSessions,
  createGuest,
  updateGuest,
  exportGuestsCsv,
} from '../api/guestsApi';
import {
  UserGroupIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowDownTrayIcon,
  StarIcon,
  PhoneIcon,
  EnvelopeIcon,
  TrophyIcon,
  ArrowPathIcon,
  UserIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolidIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

const TIER_CONFIG = {
  gold: { label: 'Gold', color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300', icon: '🥇' },
  silver: { label: 'Silver', color: 'bg-stone-100 text-stone-700 dark:bg-stone-700/30 dark:text-stone-300', icon: '🥈' },
  bronze: { label: 'Bronze', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300', icon: '🥉' },
};

export function StaffGuestsScreen() {
  const { orgId, venueId } = useAuth();

  const [guests, setGuests] = useState([]);
  const [stats, setStats] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Detail drawer
  const [selectedGuest, setSelectedGuest] = useState(null);
  const [guestSessions, setGuestSessions] = useState([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Form state
  const [formData, setFormData] = useState({ name: '', phone: '', email: '' });

  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsLoading(true);
    try {
      const [guestData, statsData] = await Promise.all([
        fetchGuests(orgId, searchTerm),
        fetchGuestStats(orgId),
      ]);
      setGuests(guestData);
      setStats(statsData);
    } catch (err) {
      toast.error('Failed to load guests');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [orgId, searchTerm]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenDetail = async (guest) => {
    setSelectedGuest(guest);
    setDrawerOpen(true);
    try {
      const sessions = await fetchGuestSessions(guest.id);
      setGuestSessions(sessions);
    } catch (err) {
      console.warn('Failed to load guest sessions:', err);
    }
  };

  const handleAddGuest = () => {
    setEditingGuest(null);
    setFormData({ name: '', phone: '', email: '' });
    setAddModalOpen(true);
  };

  const handleEditGuest = (guest) => {
    setEditingGuest(guest);
    setFormData({ name: guest.name || '', phone: guest.phone || '', email: guest.email || '' });
    setAddModalOpen(true);
  };

  const handleSaveGuest = async (e) => {
    e.preventDefault();
    if (!formData.phone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    setIsSaving(true);
    try {
      if (editingGuest) {
        await updateGuest(editingGuest.id, {
          name: formData.name || null,
          phone: formData.phone,
          email: formData.email || null,
        });
        toast.success('Guest updated');
      } else {
        await createGuest(orgId, formData);
        toast.success('Guest added');
      }
      setAddModalOpen(false);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to save guest');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (guests.length === 0) {
      toast.error('No guests to export');
      return;
    }
    exportGuestsCsv(guests);
    toast.success('Guest data exported');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatCurrency = (val) => {
    return `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">Guests & CRM</h2>
          <p className="text-xs text-stone-500">Customer loyalty, visit history & engagement tracking</p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={handleExport}>
            <ArrowDownTrayIcon className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" onClick={handleAddGuest}>
            <PlusIcon className="h-4 w-4" /> Add Guest
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Guests"
            value={stats.total}
            icon={<UserGroupIcon className="h-5 w-5" />}
            color="text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400"
          />
          <StatCard
            label="Gold Members"
            value={stats.gold}
            icon={<TrophyIcon className="h-5 w-5" />}
            color="text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
          />
          <StatCard
            label="New This Month"
            value={stats.newThisMonth}
            icon={<CalendarDaysIcon className="h-5 w-5" />}
            color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
          />
          <StatCard
            label="Total Points"
            value={stats.totalPoints.toLocaleString()}
            icon={<StarIcon className="h-5 w-5" />}
            color="text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400"
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/60 text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none transition-all"
        />
      </div>

      {/* Guest Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        ) : guests.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <UserGroupIcon className="h-10 w-10 mx-auto text-stone-300 dark:text-stone-600" />
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No guests found</p>
            <p className="text-xs text-stone-400">
              {searchTerm ? 'Try a different search term' : 'Guests are added automatically when they place orders, or add them manually'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 dark:border-stone-800 text-left">
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Guest</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Phone</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Loyalty</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Points</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Joined</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {guests.map((guest) => {
                  const tier = TIER_CONFIG[guest.loyalty_tier] || TIER_CONFIG.bronze;
                  return (
                    <tr
                      key={guest.id}
                      className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors cursor-pointer"
                      onClick={() => handleOpenDetail(guest)}
                    >
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="h-9 w-9 rounded-full bg-gradient-to-br from-brand-primary/20 to-brand-primary/5 dark:from-brand-primary/30 dark:to-brand-primary/10 flex items-center justify-center font-bold text-xs text-brand-primary">
                            {(guest.name || guest.phone || 'G').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-stone-900 dark:text-white block">
                              {guest.name || 'Unnamed Guest'}
                            </span>
                            {guest.email && (
                              <span className="text-[11px] text-stone-400">{guest.email}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-xs text-stone-600 dark:text-stone-400 font-mono">
                        {guest.phone}
                      </td>
                      <td className="px-5 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold ${tier.color}`}>
                          {tier.icon} {tier.label}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-xs font-semibold text-stone-700 dark:text-stone-300">
                        {guest.loyalty_points?.toLocaleString() || 0}
                      </td>
                      <td className="px-5 py-3 text-xs text-stone-500">
                        {formatDate(guest.created_at)}
                      </td>
                      <td className="px-5 py-3">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditGuest(guest);
                          }}
                        >
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Guest Modal */}
      <Modal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        title={editingGuest ? 'Edit Guest' : 'Add New Guest'}
      >
        <form onSubmit={handleSaveGuest} className="space-y-4">
          <Input
            label="Full Name"
            value={formData.name}
            onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
            placeholder="John Doe"
          />
          <Input
            label="Phone Number"
            value={formData.phone}
            onChange={(e) => setFormData((p) => ({ ...p, phone: e.target.value }))}
            placeholder="+91 98765 43210"
            required
          />
          <Input
            label="Email"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData((p) => ({ ...p, email: e.target.value }))}
            placeholder="john@example.com"
          />
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving} className="flex-1">
              {editingGuest ? 'Update Guest' : 'Add Guest'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Guest Detail Drawer */}
      <Drawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title="Guest Profile"
      >
        {selectedGuest && (
          <div className="space-y-6">
            {/* Guest Header */}
            <div className="text-center space-y-3">
              <div className="h-16 w-16 mx-auto rounded-full bg-gradient-to-br from-brand-primary to-amber-500 flex items-center justify-center text-white font-black text-xl shadow-lg shadow-brand-primary/30">
                {(selectedGuest.name || selectedGuest.phone || 'G').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900 dark:text-white">
                  {selectedGuest.name || 'Unnamed Guest'}
                </h3>
                <p className="text-xs text-stone-500 flex items-center justify-center gap-1 mt-1">
                  <PhoneIcon className="h-3.5 w-3.5" /> {selectedGuest.phone}
                </p>
                {selectedGuest.email && (
                  <p className="text-xs text-stone-500 flex items-center justify-center gap-1">
                    <EnvelopeIcon className="h-3.5 w-3.5" /> {selectedGuest.email}
                  </p>
                )}
              </div>
              <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold ${TIER_CONFIG[selectedGuest.loyalty_tier]?.color || TIER_CONFIG.bronze.color}`}>
                {TIER_CONFIG[selectedGuest.loyalty_tier]?.icon || '🥉'} {TIER_CONFIG[selectedGuest.loyalty_tier]?.label || 'Bronze'} Tier
              </span>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 text-center">
                <p className="text-lg font-black text-stone-900 dark:text-white">
                  {selectedGuest.loyalty_points?.toLocaleString() || 0}
                </p>
                <p className="text-[11px] text-stone-500">Loyalty Points</p>
              </div>
              <div className="p-3 rounded-xl bg-stone-50 dark:bg-stone-800/50 text-center">
                <p className="text-lg font-black text-stone-900 dark:text-white">
                  {guestSessions.length}
                </p>
                <p className="text-[11px] text-stone-500">Total Visits</p>
              </div>
            </div>

            {selectedGuest.referral_code && (
              <div className="p-3 rounded-xl bg-purple-50 dark:bg-purple-950/20 border border-purple-200/50 dark:border-purple-800/40">
                <p className="text-[11px] font-bold text-purple-700 dark:text-purple-400 mb-1">Referral Code</p>
                <code className="text-xs font-mono text-purple-900 dark:text-purple-200">{selectedGuest.referral_code}</code>
              </div>
            )}

            {/* Visit History */}
            <div>
              <h4 className="text-xs font-bold text-stone-700 dark:text-stone-300 mb-3">Visit History</h4>
              {guestSessions.length > 0 ? (
                <div className="space-y-2">
                  {guestSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-stone-50 dark:bg-stone-800/30 border border-stone-100 dark:border-stone-700/40"
                    >
                      <div>
                        <p className="text-xs font-semibold text-stone-800 dark:text-stone-200">
                          Table {s.tables?.table_number || '—'}
                        </p>
                        <p className="text-[11px] text-stone-500">{formatDate(s.opened_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-stone-900 dark:text-white">
                          {formatCurrency(s.total_amount)}
                        </p>
                        <Badge variant={s.status === 'settled' ? 'success' : 'default'} size="sm">
                          {s.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-400 text-center py-4">No visit history yet</p>
              )}
            </div>

            <p className="text-[11px] text-stone-400 text-center">
              Member since {formatDate(selectedGuest.created_at)}
            </p>
          </div>
        )}
      </Drawer>
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-xl ${color}`}>{icon}</span>
      </div>
      <p className="text-xl font-black text-stone-900 dark:text-white">{value}</p>
      <p className="text-[11px] text-stone-500 mt-0.5">{label}</p>
    </div>
  );
}
