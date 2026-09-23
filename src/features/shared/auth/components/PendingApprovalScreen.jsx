import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/Button';
import { Clock, ShieldAlert, RefreshCw, LogOut } from 'lucide-react';
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
    <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-3xl bg-stone-900 border border-stone-800 shadow-2xl p-8 text-center space-y-6">
        {/* Animated Icon */}
        <div className="mx-auto h-16 w-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center relative">
          <Clock className="h-8 w-8 animate-pulse" />
          <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-amber-500" />
        </div>

        {/* Content */}
        <div className="space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-amber-500 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
            Account Pending Approval
          </span>
          <h1 className="text-2xl font-black text-white pt-2">
            Awaiting Admin Review
          </h1>
          <p className="text-xs text-stone-400 leading-relaxed max-w-sm mx-auto">
            Your staff account for <strong className="text-stone-200">{venueName}</strong> has been registered. For security, an Administrator or Owner must accept your account before you can access the operational dashboard.
          </p>
        </div>

        {/* User Card */}
        <div className="p-4 rounded-2xl bg-stone-800/60 border border-stone-700/60 text-left text-xs space-y-1.5">
          <div className="flex justify-between items-center text-stone-400">
            <span>Name:</span>
            <span className="font-bold text-stone-200">{staffProfile?.full_name || user?.user_metadata?.full_name || 'Staff Member'}</span>
          </div>
          <div className="flex justify-between items-center text-stone-400">
            <span>Email:</span>
            <span className="font-bold text-stone-200">{user?.email}</span>
          </div>
          <div className="flex justify-between items-center text-stone-400">
            <span>Venue:</span>
            <span className="font-bold text-brand-primary">{venueName}</span>
          </div>
          <div className="flex justify-between items-center text-stone-400 pt-1 border-t border-stone-700/40">
            <span>Status:</span>
            <span className="font-bold text-amber-400 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping" />
              Pending Admin Review
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-3 pt-2">
          <Button
            size="lg"
            className="w-full font-bold bg-brand-primary hover:bg-brand-primary/90 text-white"
            onClick={handleCheckStatus}
            isLoading={isChecking}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
            Check Approval Status
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="w-full text-stone-400 hover:text-white hover:bg-stone-800 text-xs font-semibold"
            onClick={signOut}
          >
            <LogOut className="h-3.5 w-3.5 mr-1.5" />
            Sign Out
          </Button>
        </div>

        <p className="text-[11px] text-stone-500 pt-2">
          Contact your restaurant manager or owner to approve your access.
        </p>
      </div>
    </div>
  );
}
