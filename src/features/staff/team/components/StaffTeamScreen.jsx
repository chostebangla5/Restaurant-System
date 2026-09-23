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

// Role config — colors, icons, labels (PetPooja-style)
const ROLE_CONFIG = {
  owner: {
    label: 'Owner',
    color: 'bg-amber-500',
    borderColor: 'border-l-amber-500',
    textColor: 'text-amber-700 dark:text-amber-400',
    bgLight: 'bg-amber-50 dark:bg-amber-950/30',
    badgeBorder: 'border-amber-200 dark:border-amber-800',
    icon: Crown,
  },
  manager: {
    label: 'Manager',
    color: 'bg-blue-500',
    borderColor: 'border-l-blue-500',
    textColor: 'text-blue-700 dark:text-blue-400',
    bgLight: 'bg-blue-50 dark:bg-blue-950/30',
    badgeBorder: 'border-blue-200 dark:border-blue-800',
    icon: Shield,
  },
  kitchen: {
    label: 'Kitchen',
    color: 'bg-rose-500',
    borderColor: 'border-l-rose-500',
    textColor: 'text-rose-700 dark:text-rose-400',
    bgLight: 'bg-rose-50 dark:bg-rose-950/30',
    badgeBorder: 'border-rose-200 dark:border-rose-800',
    icon: ChefHat,
  },
  waiter: {
    label: 'Waiter',
    color: 'bg-emerald-500',
    borderColor: 'border-l-emerald-500',
    textColor: 'text-emerald-700 dark:text-emerald-400',
    bgLight: 'bg-emerald-50 dark:bg-emerald-950/30',
    badgeBorder: 'border-emerald-200 dark:border-emerald-800',
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
      color: 'from-blue-500 to-blue-600',
      shadowColor: 'shadow-blue-500/25',
    },
    {
      title: 'Active Now',
      value: activeStaff,
      icon: UserCheck,
      color: 'from-emerald-500 to-emerald-600',
      shadowColor: 'shadow-emerald-500/25',
    },
    {
      title: 'Kitchen Staff',
      value: roleCounts.kitchen || 0,
      icon: ChefHat,
      color: 'from-rose-500 to-rose-600',
      shadowColor: 'shadow-rose-500/25',
    },
    {
      title: 'Floor Staff',
      value: (roleCounts.waiter || 0) + (roleCounts.manager || 0),
      icon: ConciergeBell,
      color: 'from-amber-500 to-amber-600',
      shadowColor: 'shadow-amber-500/25',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-brand-primary" />
            Staff Management
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Manage your team, roles, access & approvals
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowAddModal(true)}
          leftIcon={<UserPlus className="h-4 w-4" />}
        >
          Add Staff
        </Button>
      </div>

      {/* PetPooja-style Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => {
          const Icon = stat.icon;
          return (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${stat.color} p-5 text-white shadow-lg ${stat.shadowColor}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-white/80">{stat.title}</p>
                  <h3 className="text-3xl font-black mt-1">{stat.value}</h3>
                </div>
                <div className="h-12 w-12 rounded-xl bg-white/15 flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
              </div>
              <div className="absolute -right-4 -bottom-4 h-20 w-20 rounded-full bg-white/10" />
            </motion.div>
          );
        })}
      </div>

      {/* Pending Approvals Section (Admin Confirmation Panel) */}
      {pendingMembers.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
              </span>
              <h3 className="text-sm font-extrabold text-amber-900 dark:text-amber-200 uppercase tracking-wide">
                Pending Account Approvals ({pendingMembers.length})
              </h3>
            </div>
            <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">
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
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 p-5">
        <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
          Role Distribution
        </h3>
        <div className="flex rounded-full overflow-hidden h-3 bg-stone-100 dark:bg-stone-800">
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
                className={`${config.color} first:rounded-l-full last:rounded-r-full`}
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
              <div key={role} className="flex items-center gap-1.5">
                <span className={`h-2.5 w-2.5 rounded-full ${config.color}`} />
                <span className="text-xs font-semibold text-stone-600 dark:text-stone-300">
                  {config.label}
                </span>
                <span className="text-xs text-stone-400">{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border border-stone-200 bg-white pl-10 pr-4 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 dark:border-stone-800 dark:bg-stone-900 dark:text-stone-100 dark:placeholder:text-stone-500"
          />
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {['all', 'owner', 'manager', 'kitchen', 'waiter'].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                filterRole === r
                  ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/25'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-400 dark:hover:bg-stone-700'
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
            <div key={i} className="h-24 rounded-2xl bg-stone-100 dark:bg-stone-800 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
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
              <Button size="sm" onClick={() => setShowAddModal(true)} leftIcon={<UserPlus className="h-4 w-4" />}>
                Add First Staff
              </Button>
            ) : null
          }
        />
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
                  className={`group relative rounded-2xl border-2 border-l-4 ${config.borderColor} bg-white dark:bg-stone-900 transition-all hover:shadow-lg ${
                    member.is_active
                      ? 'border-stone-200/80 dark:border-stone-800 hover:shadow-stone-200/50 dark:hover:shadow-stone-950/50'
                      : 'border-stone-200/50 dark:border-stone-800/50 opacity-70'
                  }`}
                >
                  <div className="flex items-center gap-4 px-5 py-4">
                    {/* Avatar */}
                    <div className="relative flex-shrink-0">
                      <div
                        className={`h-12 w-12 rounded-xl flex items-center justify-center font-bold text-sm text-white shadow-md ${config.color}`}
                      >
                        {member.avatar_initials || member.full_name.slice(0, 2).toUpperCase()}
                      </div>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <h4 className="text-sm font-bold text-stone-900 dark:text-white truncate">
                          {member.full_name}
                        </h4>
                        {isCurrentUser && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-primary/10 text-brand-primary">
                            You
                          </span>
                        )}
                        <Badge
                          size="sm"
                          className={`${config.bgLight} ${config.textColor} border ${config.badgeBorder}`}
                        >
                          <RoleIcon className="h-3 w-3 mr-0.5" />
                          {config.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5">
                        <span className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                          <Mail className="h-3 w-3" />
                          {member.email}
                        </span>
                        {member.phone && (
                          <span className="hidden sm:flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                            <Phone className="h-3 w-3" />
                            {member.phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-[11px] text-stone-500 dark:text-stone-400">
                          <Clock className="h-3 w-3" />
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
                          onClick={() => setOpenMenuId(openMenuId === member.id ? null : member.id)}
                          className="p-2 rounded-xl text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800 dark:hover:text-stone-300 transition-colors"
                          title="Staff Options"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>

                        {/* Dropdown Menu */}
                        {openMenuId === member.id && (
                          <>
                            <div className="fixed inset-0 z-30" onClick={() => setOpenMenuId(null)} />
                            <div className="absolute right-0 top-full mt-1 z-40 w-48 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-2xl py-1">
                              <div className="px-3 py-1.5 border-b border-stone-100 dark:border-stone-700">
                                <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                                  Change Role
                                </p>
                              </div>
                              {Object.entries(ROLE_CONFIG).map(([roleKey, roleConf]) => (
                                <button
                                  key={roleKey}
                                  type="button"
                                  onClick={() => handleRoleChange(member, roleKey)}
                                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 transition-colors ${
                                    member.role === roleKey
                                      ? `${roleConf.bgLight} ${roleConf.textColor}`
                                      : 'text-stone-600 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700/50'
                                  }`}
                                >
                                  <roleConf.icon className="h-3.5 w-3.5" />
                                  {roleConf.label}
                                  {member.role === roleKey && <span className="ml-auto text-[10px] font-bold">✓</span>}
                                </button>
                              ))}

                              <div className="border-t border-stone-100 dark:border-stone-700 pt-1">
                                <button
                                  type="button"
                                  disabled={isCurrentUser}
                                  onClick={() => {
                                    setOpenMenuId(null);
                                    handleDelete(member);
                                  }}
                                  className={`w-full text-left px-3 py-2 text-xs font-semibold flex items-center gap-2 ${
                                    isCurrentUser
                                      ? 'text-stone-300 dark:text-stone-600 cursor-not-allowed'
                                      : 'text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                  }`}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
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
    <div className="p-4 rounded-xl bg-white dark:bg-stone-900 border border-amber-300/80 dark:border-amber-700/60 shadow-sm flex flex-col justify-between gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-10 w-10 rounded-xl bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-200 flex items-center justify-center font-bold text-xs shrink-0">
            {member.avatar_initials || member.full_name?.slice(0, 2).toUpperCase() || 'ST'}
          </div>
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-stone-900 dark:text-white truncate">
              {member.full_name}
            </h4>
            <p className="text-[11px] text-stone-500 truncate flex items-center gap-1 mt-0.5">
              <Mail className="h-3 w-3 shrink-0" />
              {member.email}
            </p>
          </div>
        </div>

        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 shrink-0">
          Pending
        </span>
      </div>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 pt-2 border-t border-stone-100 dark:border-stone-800">
        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-stone-400 font-medium">Assign Role:</span>
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="rounded-lg border border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-2 py-1 text-xs font-semibold text-stone-900 dark:text-white"
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
            className="text-xs border-rose-300 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 font-bold"
            onClick={onReject}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            Reject
          </Button>

          <Button
            size="sm"
            className="text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm shadow-emerald-600/20"
            onClick={() => onApprove(selectedRole)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
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
          <label className="block text-xs font-semibold text-stone-700 dark:text-stone-300 mb-2">
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
                  className={`relative flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                    isSelected
                      ? `${config.bgLight} ${config.badgeBorder} ${config.textColor} shadow-sm`
                      : 'border-stone-200 dark:border-stone-700 hover:border-stone-300 dark:hover:border-stone-600'
                  }`}
                >
                  <div className={`h-9 w-9 rounded-lg flex items-center justify-center text-white ${config.color}`}>
                    <RoleIcon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className={`text-xs font-bold ${isSelected ? config.textColor : 'text-stone-800 dark:text-stone-200'}`}>
                      {config.label}
                    </p>
                    <p className="text-[10px] text-stone-400 mt-0.5">
                      {roleKey === 'owner' && 'Full access'}
                      {roleKey === 'manager' && 'Manage orders & staff'}
                      {roleKey === 'kitchen' && 'KDS & menu access'}
                      {roleKey === 'waiter' && 'Orders & tables'}
                    </p>
                  </div>
                  {isSelected && (
                    <span className="absolute top-2 right-2 h-4 w-4 rounded-full bg-brand-primary flex items-center justify-center">
                      <span className="text-white text-[8px] font-bold">✓</span>
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
          <Button variant="ghost" size="sm" onClick={onClose} type="button">
            Cancel
          </Button>
          <Button type="submit" size="sm" isLoading={isLoading} leftIcon={<UserPlus className="h-3.5 w-3.5" />}>
            Add to Team
          </Button>
        </div>
      </form>
    </Modal>
  );
}
