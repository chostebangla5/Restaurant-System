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
  Users,
  Search,
  Plus,
  Download,
  Star,
  Phone,
  Mail,
  Trophy,
  Medal,
  Award,
  Calendar,
} from 'lucide-react';
import toast from 'react-hot-toast';

const TIER_CONFIG = {
  gold: { label: 'Gold', color: 'bg-amber-400/10 text-amber-300 border border-amber-400/25', Icon: Trophy },
  silver: { label: 'Silver', color: 'bg-white/[0.04] text-stone-300 border border-white/[0.12]', Icon: Medal },
  bronze: { label: 'Bronze', color: 'bg-[#C6FF3D]/10 text-[#C6FF3D] border border-[#C6FF3D]/25', Icon: Award },
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
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-[#F4F5F7]">Guests &amp; CRM</h1>
          <p className="text-xs text-[#8A8F9C] mt-1">Customer loyalty, visit history & engagement tracking</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Button size="md" variant="outline" onClick={handleExport} className="rounded-full border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]">
            <Download className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Export
          </Button>
          <Button size="md" onClick={handleAddGuest} className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
            <Plus className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Add Guest
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Guests"
            value={stats.total}
            icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
            color="text-sky-400 bg-sky-400/10 border border-sky-400/25"
          />
          <StatCard
            label="Gold Members"
            value={stats.gold}
            icon={<Trophy className="h-4 w-4" strokeWidth={1.5} />}
            color="text-amber-400 bg-amber-400/10 border border-amber-400/25"
          />
          <StatCard
            label="New This Month"
            value={stats.newThisMonth}
            icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}
            color="text-emerald-400 bg-emerald-400/10 border border-emerald-400/25"
          />
          <StatCard
            label="Total Points"
            value={stats.totalPoints.toLocaleString()}
            icon={<Star className="h-4 w-4" strokeWidth={1.5} />}
            color="text-[#C6FF3D] bg-[#C6FF3D]/10 border border-[#C6FF3D]/25"
          />
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#8A8F9C]" strokeWidth={1.5} />
        <input
          type="text"
          placeholder="Search by name, phone, or email..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 rounded-full text-xs bg-[#0E1016] border border-white/[0.08] text-[#F4F5F7] placeholder-[#8A8F9C] focus:border-[#C6FF3D] outline-none transition-all"
        />
      </div>

      {/* Guest Table */}
      <div className="rounded-card bg-[#0E1016] border border-white/[0.08] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C6FF3D] border-t-transparent" />
          </div>
        ) : guests.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <Users className="h-8 w-8 mx-auto text-[#8A8F9C]" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-[#F4F5F7]">No guests found</p>
            <p className="text-xs text-[#8A8F9C]">
              {searchTerm ? 'Try a different search term' : 'Guests are added automatically when they place orders, or add them manually'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#141721] text-left">
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Guest</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Phone</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Loyalty</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Points</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Joined</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {guests.map((guest) => {
                  const tier = TIER_CONFIG[guest.loyalty_tier] || TIER_CONFIG.bronze;
                  return (
                    <tr
                      key={guest.id}
                      className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                      onClick={() => handleOpenDetail(guest)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="h-8 w-8 rounded-full bg-[#141721] border border-white/[0.08] flex items-center justify-center font-mono font-bold text-xs text-[#C6FF3D]">
                            {(guest.name || guest.phone || 'G').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-semibold text-[#F4F5F7] block">
                              {guest.name || 'Unnamed Guest'}
                            </span>
                            {guest.email && (
                              <span className="text-[11px] text-[#8A8F9C]">{guest.email}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-[#8A8F9C] font-mono">
                        {guest.phone}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold ${tier.color}`}>
                          {tier.Icon && <tier.Icon className="h-3 w-3 shrink-0" strokeWidth={1.5} />} {tier.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono font-bold text-[#F4F5F7]">
                        {guest.loyalty_points?.toLocaleString() || 0}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-mono text-[#8A8F9C]">
                        {formatDate(guest.created_at)}
                      </td>
                      <td className="px-5 py-3.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEditGuest(guest);
                          }}
                          className="rounded-full text-xs text-[#8A8F9C] hover:text-[#F4F5F7]"
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
            <Button type="button" variant="ghost" onClick={() => setAddModalOpen(false)} className="flex-1 rounded-full text-[#8A8F9C] hover:text-[#F4F5F7]">
              Cancel
            </Button>
            <Button type="submit" isLoading={isSaving} className="flex-1 rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
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
              <div className="h-16 w-16 mx-auto rounded-full bg-[#141721] border border-[#C6FF3D]/30 flex items-center justify-center text-[#C6FF3D] font-mono font-bold text-xl">
                {(selectedGuest.name || selectedGuest.phone || 'G').slice(0, 2).toUpperCase()}
              </div>
              <div>
                <h3 className="text-base font-heading font-bold text-[#F4F5F7]">
                  {selectedGuest.name || 'Unnamed Guest'}
                </h3>
                <p className="text-xs text-[#8A8F9C] flex items-center justify-center gap-1.5 mt-1 font-mono">
                  <Phone className="h-3.5 w-3.5" strokeWidth={1.5} /> {selectedGuest.phone}
                </p>
                {selectedGuest.email && (
                  <p className="text-xs text-[#8A8F9C] flex items-center justify-center gap-1.5 mt-0.5">
                    <Mail className="h-3.5 w-3.5" strokeWidth={1.5} /> {selectedGuest.email}
                  </p>
                )}
              </div>
              {(() => {
                const guestTier = TIER_CONFIG[selectedGuest.loyalty_tier] || TIER_CONFIG.bronze;
                const TierIcon = guestTier.Icon;
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-semibold ${guestTier.color}`}>
                    {TierIcon && <TierIcon className="h-3.5 w-3.5 shrink-0" strokeWidth={1.5} />} {guestTier.label} Tier
                  </span>
                );
              })()}
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-card bg-[#141721] border border-white/[0.08] text-center">
                <p className="text-lg font-mono font-bold text-[#F4F5F7]">
                  {selectedGuest.loyalty_points?.toLocaleString() || 0}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C] mt-0.5">Loyalty Points</p>
              </div>
              <div className="p-3.5 rounded-card bg-[#141721] border border-white/[0.08] text-center">
                <p className="text-lg font-mono font-bold text-[#F4F5F7]">
                  {guestSessions.length}
                </p>
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C] mt-0.5">Total Visits</p>
              </div>
            </div>

            {selectedGuest.referral_code && (
              <div className="p-3.5 rounded-card bg-[#141721] border border-white/[0.08]">
                <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C] mb-1">Referral Code</p>
                <code className="text-xs font-mono text-[#C6FF3D]">{selectedGuest.referral_code}</code>
              </div>
            )}

            {/* Visit History */}
            <div>
              <h4 className="text-xs font-heading font-semibold text-[#F4F5F7] mb-3">Visit History</h4>
              {guestSessions.length > 0 ? (
                <div className="space-y-2">
                  {guestSessions.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between p-3 rounded-xl bg-[#141721] border border-white/[0.06]"
                    >
                      <div>
                        <p className="text-xs font-medium text-[#F4F5F7]">
                          Table {s.tables?.table_number || '—'}
                        </p>
                        <p className="text-[11px] font-mono text-[#8A8F9C]">{formatDate(s.opened_at)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-mono font-bold text-[#F4F5F7]">
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
                <p className="text-xs text-[#8A8F9C] text-center py-4 font-mono">No visit history yet</p>
              )}
            </div>

            <p className="text-[11px] font-mono text-[#8A8F9C] text-center">
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
    <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-xl ${color}`}>{icon}</span>
      </div>
      <p className="text-xl font-heading font-extrabold text-[#F4F5F7]">{value}</p>
      <p className="text-[11px] font-mono uppercase tracking-wider text-[#8A8F9C] mt-0.5">{label}</p>
    </div>
  );
}
