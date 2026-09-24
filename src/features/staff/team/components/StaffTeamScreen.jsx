import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/features/shared/auth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Toggle } from '@/components/ui/Toggle';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  fetchStaffMembers,
  toggleStaffActive,
  updateStaffMember,
  removeStaffMember,
  approveStaffMember,
  subscribeToStaff,
} from '../api/teamApi';
import { inviteStaff } from '@/features/staff/settings/api/settingsApi';
import {
  Users,
  UserPlus,
  UserCheck,
  UserX,
  ChefHat,
  Crown,
  Shield,
  ConciergeBell,
  Clock,
  MoreVertical,
  Trash2,
  Phone,
  Mail,
  Search,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

// Role config — studio aesthetic tokens
const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    color: 'bg-[#C6FF3D] text-[#07080B]',
    borderColor: 'border-l-[#C6FF3D]',
    textColor: 'text-[#C6FF3D]',
    bgLight: 'bg-[#C6FF3D]/10',
    badgeBorder: 'border-[#C6FF3D]/25',
    icon: Crown,
  },
  manager: {
    label: 'Manager',
    color: 'bg-sky-400 text-[#07080B]',
    borderColor: 'border-l-sky-400',
    textColor: 'text-sky-400',
    bgLight: 'bg-sky-400/10',
    badgeBorder: 'border-sky-400/25',
    icon: Shield,
  },
  kitchen: {
    label: 'Kitchen',
    color: 'bg-amber-400 text-[#07080B]',
    borderColor: 'border-l-amber-400',
    textColor: 'text-amber-300',
    bgLight: 'bg-amber-400/10',
    badgeBorder: 'border-amber-400/25',
    icon: ChefHat,
  },
  waiter: {
    label: 'Waiter',
    color: 'bg-emerald-400 text-[#07080B]',
    borderColor: 'border-l-emerald-400',
    textColor: 'text-emerald-400',
    bgLight: 'bg-emerald-400/10',
    badgeBorder: 'border-emerald-400/25',
    icon: ConciergeBell,
  },
};

export function StaffTeamScreen() {
  const { user, venueId, orgId, role: currentUserRole } = useAuth();

  const [staff, setStaff] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState('all');

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Action menu tracking
  const [openMenuId, setOpenMenuId] = useState(null);
  const [menuDirection, setMenuDirection] = useState('down');

  const handleToggleMenu = (e, memberId) => {
    if (openMenuId === memberId) {
      setOpenMenuId(null);
      return;
    }
    const buttonRect = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - buttonRect.bottom;
    // If space below is less than 280px, open upwards so it never clips!
    setMenuDirection(spaceBelow < 280 ? 'up' : 'down');
    setOpenMenuId(memberId);
  };

  const loadStaff = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await fetchStaffMembers(venueId);
      setStaff(data);
    } catch (err) {
      console.error('Failed to load staff:', err);
      toast.error('Failed to load staff');
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    loadStaff();
    const unsubscribe = subscribeToStaff(loadStaff);
    return () => unsubscribe();
  }, [loadStaff]);

  // Separate into active and pending members
  const pendingMembers = staff.filter((s) => s.is_active === false);
  const activeMembers = staff.filter((s) => s.is_active !== false);

  // Stats
  const totalStaff = staff.length;
  const activeStaff = activeMembers.length;
  const roleCounts = activeMembers.reduce((acc, s) => {
    acc[s.role] = (acc[s.role] || 0) + 1;
    return acc;
  }, {});

  // Filtered active staff
  const filtered = activeMembers.filter((s) => {
    const matchesSearch =
      s.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === 'all' || s.role === filterRole;
    return matchesSearch && matchesRole;
  });

  // Time ago helper
  const timeAgo = (dateStr) => {
    if (!dateStr) return 'Unknown';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const handleToggleActive = async (member) => {
    try {
      await toggleStaffActive(member.id, !member.is_active);
      setStaff((prev) =>
        prev.map((s) => (s.id === member.id ? { ...s, is_active: !s.is_active } : s))
      );
      toast.success(member.is_active ? `${member.full_name} deactivated` : `${member.full_name} activated`);
    } catch (err) {
      toast.error('Failed to update status');
    }
  };

  const handleDelete = async (member) => {
    if (user?.email && member.email.toLowerCase() === user.email.toLowerCase()) {
      toast.error('You cannot delete your own currently logged-in account.');
      return;
    }

    if (!window.confirm(`Are you sure you want to remove ${member.full_name} (${member.email}) from staff?`)) {
      return;
    }

    // Optimistic UI removal
    setStaff((prev) => prev.filter((s) => s.id !== member.id));

    try {
      await removeStaffMember(member.id);
      toast.success(`${member.full_name} removed`);
      loadStaff();
    } catch (err) {
      console.error(err);
      toast.error('Failed to remove staff member');
      loadStaff();
    }
  };

  const handleRoleChange = async (member, newRole) => {
    // Optimistic UI update
    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, role: newRole } : s))
    );
    setOpenMenuId(null);

    try {
      await updateStaffMember(member.id, { role: newRole });
      toast.success(`${member.full_name} role updated to ${ROLE_CONFIG[newRole]?.label || newRole}`);
      loadStaff();
    } catch (err) {
      console.error(err);
      toast.error('Failed to update role');
      loadStaff();
    }
  };

  const handleApprove = async (member, assignedRole) => {
    const targetRole = assignedRole || member.role || 'waiter';

    // Optimistic UI update
    setStaff((prev) =>
      prev.map((s) => (s.id === member.id ? { ...s, is_active: true, role: targetRole } : s))
    );

    try {
      await approveStaffMember(member.id, targetRole);
      toast.success(`${member.full_name} approved and confirmed as ${ROLE_CONFIG[targetRole]?.label || targetRole}!`);
      loadStaff();
    } catch (err) {
      console.error(err);
      toast.error('Failed to approve staff member');
      loadStaff();
    }
  };

  // Summary stat cards
  const statCards = [
    {
      title: 'Total Staff',
      value: totalStaff,
      icon: Users,
      color: 'text-sky-400 bg-sky-400/10 border border-sky-400/25',
    },
    {
      title: 'Active Now',
      value: activeStaff,
      icon: UserCheck,
      color: 'text-[#C6FF3D] bg-[#C6FF3D]/10 border border-[#C6FF3D]/25',
    },
    {
      title: 'Kitchen Staff',
      value: roleCounts.kitchen || 0,
      icon: ChefHat,
      color: 'text-amber-400 bg-amber-400/10 border border-amber-400/25',
    },
    {
      title: 'Floor Staff',
      value: (roleCounts.waiter || 0) + (roleCounts.manager || 0),
      icon: ConciergeBell,
      color: 'text-emerald-400 bg-emerald-400/10 border border-emerald-400/25',
    },
  ];

  return (
    <div className="space-y-6 pb-48">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#F4F5F7] flex items-center gap-2.5">
            <Users className="h-5 w-5 text-[#C6FF3D]" strokeWidth={1.5} />
            Staff Management
          </h2>
          <p className="text-xs text-[#8A8F9C] mt-1">
            Manage your team, roles, access & approvals
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<UserPlus className="h-4 w-4" strokeWidth={1.5} />}
          className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold"
        >
          Add Staff
        </Button>
      </div>

      {/* Studio Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="p-5 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] transition-all space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-[#8A8F9C]">{stat.title}</span>
                <div className={`p-2 rounded-xl ${stat.color}`}>
                  <Icon className="h-4 w-4" strokeWidth={1.5} />
                </div>
              </div>
              <h3 className="text-2xl font-heading font-extrabold text-[#F4F5F7]">{stat.value}</h3>
            </motion.div>
          );
        })}
      </div>

      {/* Pending Approvals Section (Admin Confirmation Panel) */}
      {pendingMembers.length > 0 && (
        <div className="p-5 rounded-card bg-[#0E1016] border border-amber-400/30 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-400" />
              </span>
              <h3 className="text-xs font-mono font-bold text-amber-300 uppercase tracking-wider">
                Pending Account Approvals ({pendingMembers.length})
              </h3>
            </div>
            <p className="text-xs text-[#8A8F9C]">
              These staff accounts cannot access the portal until you confirm them.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {pendingMembers.map((member) => (
              <PendingStaffCard
                key={member.id}
                member={member}
                onApprove={(role) => handleApprove(member, role)}
                onReject={() => handleDelete(member)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Role Distribution Bar */}
      <div className="rounded-card bg-[#0E1016] border border-white/[0.08] p-5">
        <h3 className="text-xs font-mono font-medium text-[#8A8F9C] uppercase tracking-wider mb-3">
          Role Distribution
        </h3>
        <div className="flex rounded-full overflow-hidden h-2.5 bg-[#141721] border border-white/[0.06]">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => {
            const count = roleCounts[role] || 0;
            const percent = totalStaff > 0 ? (count / totalStaff) * 100 : 0;
            if (percent === 0) return null;
            return (
              <motion.div
                key={role}
                initial={{ width: 0 }}
                animate={{ width: `${percent}%` }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className={`${config.color.split(' ')[0]} first:rounded-l-full last:rounded-r-full`}
                title={`${config.label}: ${count}`}
              />
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-4 mt-3">
          {Object.entries(ROLE_CONFIG).map(([role, config]) => {
            const count = roleCounts[role] || 0;
            if (count === 0) return null;
            return (
              <div key={role} className="flex items-center gap-1.5 font-mono text-xs">
                <span className={`h-2 w-2 rounded-full ${config.color.split(' ')[0]}`} />
                <span className="text-[#8A8F9C]">
                  {config.label}
                </span>
                <span className="text-[#F4F5F7] font-semibold">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A8F9C]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-full border border-white/[0.08] bg-[#0E1016] pl-9 pr-4 py-2 text-xs text-[#F4F5F7] placeholder:text-[#8A8F9C] focus:border-[#C6FF3D] focus:outline-none transition-colors"
          />
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0 overflow-x-auto no-scrollbar">
          {['all', 'owner', 'manager', 'kitchen', 'waiter'].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all ${
                filterRole === r
                  ? 'bg-[#C6FF3D] text-[#07080B] font-semibold shadow-sm'
                  : 'bg-[#0E1016] text-[#8A8F9C] hover:text-[#F4F5F7] border border-white/[0.08]'
              }`}
            >
              {r === 'all' ? 'All' : ROLE_CONFIG[r]?.label || r}
            </button>
          ))}
        </div>
      </div>

      {/* Staff List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 rounded-card bg-[#0E1016] border border-white/[0.08] animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 rounded-card bg-[#0E1016] border border-white/[0.08]">
          <EmptyState
            icon={Users}
            title={searchQuery || filterRole !== 'all' ? 'No matching staff found' : 'No active staff members yet'}
            description={
              searchQuery || filterRole !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'Add your first team member or review pending registrations above.'
            }
            action={
              !searchQuery && filterRole === 'all' ? (
                <Button size="sm" onClick={() => setShowAddModal(true)} leftIcon={<UserPlus className="h-4 w-4" strokeWidth={1.5} />} className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
                  Add First Staff
                </Button>
              ) : null
            }
          />
        </div>
      ) : (
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {filtered.map((member, idx) => {
              const config = ROLE_CONFIG[member.role] || ROLE_CONFIG.waiter;
              const RoleIcon = config.icon;
              const isCurrentUser = Boolean(user?.email && member.email.toLowerCase() === user.email.toLowerCase());

              return (
                <motion.div
                  key={member.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ delay: idx * 0.04 }}
                  className={`group relative rounded-card border-l-2 ${config.borderColor} border border-white/[0.08] bg-[#0E1016] transition-all hover:border-white/[0.18] ${
                    member.is_active ? '' : 'opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className="h-10 w-10 rounded-full flex items-center justify-center font-mono font-bold text-xs bg-[#141721] border border-white/[0.12] text-[#F4F5F7]"
                      >
                        {member.avatar_initials || member.full_name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-sm font-heading font-semibold text-[#F4F5F7] truncate">
                          {member.full_name}
                        </h4>
                        {isCurrentUser && (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#C6FF3D]/10 text-[#C6FF3D] border border-[#C6FF3D]/30">
                            You
                          </span>
                        )}
                        <Badge
                          size="sm"
                          className={`${config.bgLight} ${config.textColor} border ${config.badgeBorder}`}
                        >
                          <RoleIcon className="h-3 w-3 mr-1 inline" strokeWidth={1.5} />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 font-mono text-[11px] text-[#8A8F9C]">
                        <span className="flex items-center gap-1">
                          <Mail className="h-3 w-3" strokeWidth={1.5} />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="hidden sm:flex items-center gap-1">
                            <Phone className="h-3 w-3" strokeWidth={1.5} />
                            {member.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" strokeWidth={1.5} />
                          {timeAgo(member.last_active || member.joined_at)}
                        </span>
                      </div>
                    </div>

                    {/* Stats + Actions */}
                    <div className="flex items-center gap-4 flex-shrink-0">
                      {/* Active toggle */}
                      <Toggle
                        checked={member.is_active}
                        onChange={() => handleToggleActive(member)}
                        size="sm"
                        label=""
                      />

                      {/* Actions dropdown */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => handleToggleMenu(e, member.id)}
                          className="p-1.5 rounded-full text-[#8A8F9C] hover:bg-white/[0.06] hover:text-[#F4F5F7] transition-colors"
                          title="Staff Options"
                        >
                          <MoreVertical className="h-4 w-4" strokeWidth={1.5} />
                        </button>

                        {/* Dropdown Menu (smart flip up/down so it never clips) */}
                        {openMenuId === member.id && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                            <div
                              className={`absolute right-0 ${
                                menuDirection === 'up' ? 'bottom-full mb-2' : 'top-full mt-2'
                              } z-50 w-52 bg-[#141721] border border-white/[0.12] rounded-xl shadow-2xl py-1.5`}
                            >
                              <div className="px-3.5 py-1.5 border-b border-white/[0.08]">
                                <p className="text-[9px] font-mono uppercase tracking-wider text-[#8A8F9C]">
                                  Change Role
                                </p>
                              </div>
                              <div className="py-1">
                                {Object.entries(ROLE_CONFIG).map(([roleKey, roleConf]) => (
                                  <button
                                    key={roleKey}
                                    type="button"
                                    onClick={() => handleRoleChange(member, roleKey)}
                                    className={`w-full text-left px-3.5 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors ${
                                      member.role === roleKey
                                        ? `${roleConf.bgLight} ${roleConf.textColor}`
                                        : 'text-[#8A8F9C] hover:text-[#F4F5F7] hover:bg-white/[0.04]'
                                    }`}
                                  >
                                    <roleConf.icon className="h-3.5 w-3.5" strokeWidth={1.5} />
                                    <span>{roleConf.label}</span>
                                    {member.role === roleKey && <span className="ml-auto text-[11px] font-mono font-bold">✓</span>}
                                  </button>
                                ))}
                              </div>

                              <div className="border-t border-white/[0.08] pt-1 px-1">
                                <button
                                  type="button"
                                  disabled={isCurrentUser}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDelete(member);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center gap-2 transition-colors ${
                                    isCurrentUser
                                      ? 'text-white/20 cursor-not-allowed'
                                      : 'text-rose-400 hover:bg-rose-500/10'
                                  }`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" strokeWidth={1.5} />
                                  Remove Staff
                                </button>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Add Staff Modal */}
      {showAddModal && (
        <AddStaffModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSubmit={async (data) => {
            try {
              setIsSaving(true);
              const result = await inviteStaff({
                venueId,
                orgId,
                fullName: data.fullName,
                email: data.email,
                role: data.role,
              });

              if (result?.tempPassword) {
                toast.success(
                  `Staff member added! Temporary login password: ${result.tempPassword}`,
                  { duration: 10000 }
                );
              } else {
                toast.success('Staff member added successfully!');
              }

              setShowAddModal(false);
              loadStaff();
            } catch (err) {
              console.error(err);
              toast.error(err.message || 'Failed to add staff');
            } finally {
              setIsSaving(false);
            }
          }}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}

// ============================================================================
// Pending Staff Card Component
// ============================================================================
function PendingStaffCard({ member, onApprove, onReject }) {
  const [selectedRole, setSelectedRole] = useState(member.role || 'waiter');

  return (
    <div className="p-4 rounded-xl bg-[#141721] border border-amber-400/25 flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-full bg-white/[0.04] border border-amber-400/30 text-amber-300 flex items-center justify-center font-mono font-bold text-xs shrink-0">
            {member.avatar_initials || member.full_name?.slice(0, 2).toUpperCase() || 'ST'}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-semibold text-[#F4F5F7] truncate">
              {member.full_name}
            </h4>
            <p className="text-[11px] font-mono text-[#8A8F9C] truncate flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3 shrink-0" strokeWidth={1.5} />
              {member.email}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-400/10 text-amber-300 border border-amber-400/30 shrink-0">
          Pending
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5 font-mono text-xs">
          <span className="text-[11px] text-[#8A8F9C]">Assign Role:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-full border border-white/[0.12] bg-[#0E1016] px-2.5 py-1 text-xs font-medium text-[#F4F5F7] focus:border-[#C6FF3D] outline-none"
          >
            <option value="waiter">Waiter</option>
            <option value="kitchen">Kitchen</option>
            <option value="manager">Manager</option>
            <option value="owner">Owner</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            className="text-xs border-rose-500/20 text-rose-400 hover:bg-rose-500/10 rounded-full font-medium"
            onClick={onReject}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
            Reject
          </Button>

          <Button
            size="sm"
            className="text-xs font-semibold rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e]"
            onClick={() => onApprove(selectedRole)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} />
            Approve & Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Add Staff Modal
// ============================================================================
function AddStaffModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('waiter');
  const [errors, setErrors] = useState({});

  const validate = () => {
    const newErrors = {};
    if (!fullName.trim()) newErrors.fullName = 'Name is required';
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(email)) newErrors.email = 'Invalid email';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({ fullName: fullName.trim(), email: email.trim(), role });
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add Staff Member" description="Invite a new team member to your venue" size="md">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-xs font-mono uppercase tracking-wider text-[#8A8F9C] mb-2">
            Select Role
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(ROLE_CONFIG).map(([roleKey, config]) => {
              const RoleIcon = config.icon;
              const isSelected = role === roleKey;
              return (
                <button
                  key={roleKey}
                  type="button"
                  onClick={() => setRole(roleKey)}
                  className={`relative flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                    isSelected
                      ? 'bg-[#141721] border-[#C6FF3D]/40 text-[#F4F5F7]'
                      : 'border-white/[0.08] hover:border-white/[0.18] bg-transparent text-[#8A8F9C]'
                  }`}
                >
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${config.bgLight} ${config.textColor}`}>
                    <RoleIcon className="h-4 w-4" strokeWidth={1.5} />
                  </div>
                  <div>
                    <p className={`text-xs font-semibold ${isSelected ? 'text-[#F4F5F7]' : 'text-[#8A8F9C]'}`}>
                      {config.label}
                    </p>
                    <p className="text-[10px] text-[#8A8F9C] mt-0.5">
                      {roleKey === 'owner' && 'Full access'}
                      {roleKey === 'manager' && 'Manage orders & staff'}
                      {roleKey === 'kitchen' && 'KDS & menu access'}
                      {roleKey === 'waiter' && 'Orders & tables'}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-[#C6FF3D] flex items-center justify-center text-[#07080B] text-[9px] font-bold">
                      ✓
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <Input
          label="Full Name"
          placeholder="e.g. Rahul Sharma"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          error={errors.fullName}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="e.g. rahul@restaurant.in"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          helperText="Staff member will receive access to log in"
        />

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose} type="button" className="rounded-full text-[#8A8F9C] hover:text-[#F4F5F7]">
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isLoading} leftIcon={<UserPlus className="h-3.5 w-3.5" strokeWidth={1.5} />} className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
            Add to Team
          </Button>
        </div>
      </form>
    </Modal>
  );
}
