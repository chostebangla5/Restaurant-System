import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/features/shared/auth';
import {
  fetchActiveStaffCalls,
  acknowledgeStaffCall,
  resolveStaffCall,
  subscribeToStaffCalls,
} from '@/features/staff/service-calls/api/staffCallsApi';
import { playOrderAlertSound } from '@/features/shared/orders/api/ordersApi';
import toast from 'react-hot-toast';
import {
  Bell,
  Droplets,
  Utensils,
  Receipt,
  HelpCircle,
  Sparkles,
  Check,
  CheckCheck,
  Clock,
  X,
} from 'lucide-react';

const REASON_ICONS = {
  'Drinking Water': Droplets,
  'Cutlery & Napkins': Utensils,
  'Request Bill': Receipt,
  'Server Assistance': HelpCircle,
  'Clean Table': Sparkles,
};

function getElapsed(createdAt) {
  const diff = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m ago`;
}

export function ServiceCallsPanel({ compact = false }) {
  const { venueId, staffProfile } = useAuth();
  const [calls, setCalls] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const prevCountRef = useRef(0);

  const loadCalls = async () => {
    try {
      const data = await fetchActiveStaffCalls(venueId);
      // Play alert if new calls
      if (data.length > prevCountRef.current && prevCountRef.current > 0) {
        playOrderAlertSound();
        const newest = data[0];
        if (newest) {
          toast(`🔔 Table ${newest.table_number}: ${newest.reason}`, {
            duration: 5000,
            style: {
              background: '#141721',
              color: '#F4F5F7',
              border: '1px solid rgba(198,255,61,0.3)',
            },
          });
        }
      }
      prevCountRef.current = data.length;
      setCalls(data);
    } catch (err) {
      console.warn('Failed to load staff calls:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCalls();
    const unsub = subscribeToStaffCalls(venueId, () => {
      loadCalls();
    });
    // Also poll every 30s as fallback
    const interval = setInterval(loadCalls, 30000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [venueId]);

  const handleAcknowledge = async (callId) => {
    try {
      await acknowledgeStaffCall(callId);
      setCalls((prev) =>
        prev.map((c) => (c.id === callId ? { ...c, status: 'acknowledged' } : c))
      );
      toast.success('Call acknowledged — heading to table');
    } catch (err) {
      toast.error('Failed to acknowledge call');
    }
  };

  const handleResolve = async (callId) => {
    try {
      await resolveStaffCall(callId, staffProfile?.id);
      setCalls((prev) => prev.filter((c) => c.id !== callId));
      toast.success('Call resolved ✓');
    } catch (err) {
      toast.error('Failed to resolve call');
    }
  };

  const pendingCalls = calls.filter((c) => c.status === 'pending');
  const acknowledgedCalls = calls.filter((c) => c.status === 'acknowledged');

  if (isLoading) {
    return (
      <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08]">
        <div className="py-6 text-center text-xs font-mono text-[#8A8F9C]">Loading service calls...</div>
      </div>
    );
  }

  if (compact && calls.length === 0) return null;

  return (
    <div className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          {pendingCalls.length > 0 && (
            <span className="h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse" />
          )}
          <div className="h-8 w-8 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center">
            <Bell className="h-4 w-4 text-rose-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-sm font-heading font-bold text-[#F4F5F7]">
              Service Calls
            </h2>
            <p className="text-[10px] font-mono text-[#8A8F9C]">
              {pendingCalls.length} pending • {acknowledgedCalls.length} in-progress
            </p>
          </div>
        </div>
        {calls.length > 0 && (
          <Badge variant="danger" size="sm">
            {calls.length} Active
          </Badge>
        )}
      </div>

      {/* Calls List */}
      {calls.length === 0 ? (
        <div className="py-8 text-center">
          <div className="h-12 w-12 mx-auto rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mb-3">
            <Bell className="h-5 w-5 text-[#8A8F9C]" strokeWidth={1.5} />
          </div>
          <p className="text-xs text-[#8A8F9C]">No active service calls</p>
          <p className="text-[10px] text-[#8A8F9C]/60 mt-1">
            Calls from guests will appear here in real-time
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {calls.map((call) => {
            const ReasonIcon = REASON_ICONS[call.reason] || HelpCircle;
            const isPending = call.status === 'pending';
            const isAcknowledged = call.status === 'acknowledged';

            return (
              <div
                key={call.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  isPending
                    ? 'bg-rose-500/[0.06] border-rose-500/20 animate-pulse-subtle'
                    : 'bg-amber-500/[0.04] border-amber-500/15'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    {/* Table Badge */}
                    <div
                      className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 font-mono font-bold text-xs ${
                        isPending
                          ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      T-{call.table_number}
                    </div>

                    <div className="min-w-0">
                      {/* Reason + Status */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1.5">
                          <ReasonIcon className="h-3.5 w-3.5 text-[#F4F5F7]" strokeWidth={1.75} />
                          <span className="text-xs font-semibold text-[#F4F5F7]">
                            {call.reason}
                          </span>
                        </div>
                        <Badge
                          variant={isPending ? 'danger' : 'warning'}
                          size="sm"
                        >
                          {isPending ? 'PENDING' : 'ON THE WAY'}
                        </Badge>
                      </div>

                      {/* Notes */}
                      {call.notes && (
                        <p className="text-[11px] text-[#8A8F9C] mt-1 truncate max-w-xs">
                          "{call.notes}"
                        </p>
                      )}

                      {/* Time */}
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-[#8A8F9C]" strokeWidth={1.5} />
                        <span className="text-[10px] font-mono text-[#8A8F9C]">
                          {getElapsed(call.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {isPending && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleAcknowledge(call.id)}
                        className="h-8 text-[10px] border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50"
                      >
                        <Check className="h-3 w-3 mr-1" strokeWidth={2} />
                        On it
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleResolve(call.id)}
                      className="h-8 text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
                    >
                      <CheckCheck className="h-3 w-3 mr-1" strokeWidth={2} />
                      Done
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
