import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Clock, RefreshCw, LogOut, ShieldAlert } from 'lucide-react';
import toast from 'react-hot-toast';

export function PendingApprovalScreen() {
  const { user, staffProfile, refreshProfiles, signOut } = useAuth();
  const [isChecking, setIsChecking] = useState(false);

  const venueName = staffProfile?.venues?.name || 'Restaurant';

  const handleCheckStatus = async () => {
    setIsChecking(true);
    try {
      await refreshProfiles();
      toast.success('Profile checked! If approved, the portal will load automatically.');
    } catch (err) {
      toast.error('Failed to check approval status');
    } finally {
      setIsChecking(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg text-text flex items-center justify-center p-4 selection:bg-accent selection:text-bg relative overflow-hidden font-sans">
      <div className="absolute inset-0 hero-radial-glow faint-grid pointer-events-none opacity-80" />

      <div className="relative z-10 w-full max-w-md rounded-card bg-surface border border-white/10 shadow-2xl p-8 sm:p-10 text-center space-y-6">
        {/* Animated Icon */}
        <div className="mx-auto h-14 w-14 rounded-full bg-white/[0.04] border border-white/10 text-accent flex items-center justify-center relative">
          <Clock className="h-6 w-6" strokeWidth={1.5} />
          <span className="absolute top-1 right-1 h-2.5 w-2.5 rounded-full bg-accent animate-pulse" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <span className="eyebrow text-accent inline-block px-3 py-1 rounded-full border border-accent/20 bg-accent/10">
            Account Pending Approval
          </span>
          <h1 className="font-heading text-2xl font-bold text-text pt-2 tracking-tight">
            Awaiting Admin Review
          </h1>
          <p className="text-xs text-muted leading-relaxed max-w-sm mx-auto font-sans">
            Your staff account for <strong className="text-text">{venueName}</strong> has been registered. For security, an Administrator or Owner must accept your account before you can access the operational dashboard.
          </p>
        </div>

        {/* User Card */}
        <div className="p-5 rounded-xl bg-surface-2 border border-white/[0.08] text-left text-xs space-y-2">
          <div className="flex justify-between items-center text-muted">
            <span>Name:</span>
            <span className="font-medium text-text">{staffProfile?.full_name || user?.user_metadata?.full_name || 'Staff Member'}</span>
          </div>
          <div className="flex justify-between items-center text-muted">
            <span>Email:</span>
            <span className="font-medium text-text">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center text-muted">
            <span>Venue:</span>
            <span className="font-medium text-accent">{venueName}</span>
          </div>
          <div className="flex justify-between items-center text-muted pt-2 border-t border-white/[0.08]">
            <span>Status:</span>
            <span className="font-medium text-accent flex items-center gap-1.5 font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Pending Admin Review
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            size="lg"
            className="w-full font-semibold bg-accent text-bg hover:bg-accent-hover"
            onClick={handleCheckStatus}
            isLoading={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} strokeWidth={1.5} />
            Check Approval Status
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-full text-muted hover:text-text text-xs font-medium"
            onClick={signOut}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} />
            Sign Out
          </Button>
        </div>

        <p className="text-[11px] text-muted/70 pt-2 font-mono">
          Contact your restaurant manager or owner to approve your access.
        </p>
      </div>
    </div>
  );
}
