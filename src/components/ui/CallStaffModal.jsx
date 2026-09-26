import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Bell, Droplets, Utensils, Receipt, HelpCircle, Sparkles, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

const REASON_OPTIONS = [
  { id: 'water', label: 'Drinking Water', icon: Droplets, desc: 'Bring fresh drinking water' },
  { id: 'cutlery', label: 'Cutlery & Napkins', icon: Utensils, desc: 'Extra spoons, forks or tissues' },
  { id: 'bill', label: 'Request Bill', icon: Receipt, desc: 'Ready to pay the bill' },
  { id: 'assistance', label: 'Server Assistance', icon: HelpCircle, desc: 'Need waiter at the table' },
  { id: 'clean', label: 'Clean Table', icon: Sparkles, desc: 'Clear used plates or wipe table' },
];

export function CallStaffModal({ isOpen, onClose, tableData = {}, shortCode = '' }) {
  const [selectedReason, setSelectedReason] = useState('water');
  const [notes, setNotes] = useState('');
  const [isSent, setIsSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCallStaff = () => {
    setIsSubmitting(true);
    const reasonObj = REASON_OPTIONS.find((r) => r.id === selectedReason) || REASON_OPTIONS[0];

    const callPayload = {
      tableNumber: tableData.tableNumber || '1',
      tableName: tableData.venueName || 'Dining Room',
      shortCode: shortCode || '',
      reason: reasonObj.label,
      notes: notes.trim(),
      timestamp: Date.now(),
    };

    // 1. Broadcast to staff tabs
    try {
      if (typeof window !== 'undefined' && window.BroadcastChannel) {
        const syncChannel = new BroadcastChannel('tablesuite_realtime_sync');
        syncChannel.postMessage({
          type: 'CALL_STAFF',
          payload: callPayload,
          timestamp: Date.now(),
        });
        syncChannel.close();
      }
    } catch (e) {
      console.warn('BroadcastChannel error:', e);
    }

    // 2. Dispatch window event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('tablesuite_orders_change', {
          detail: { type: 'CALL_STAFF', payload: callPayload },
        })
      );
    }

    // 3. Save to localStorage for staff dashboard recovery
    try {
      const existing = JSON.parse(localStorage.getItem('tablesuite_staff_calls') || '[]');
      existing.unshift(callPayload);
      localStorage.setItem('tablesuite_staff_calls', JSON.stringify(existing.slice(0, 20)));
    } catch (err) {
      // ignore storage errors
    }

    setTimeout(() => {
      setIsSubmitting(false);
      setIsSent(true);
      toast.success(`Server called! Staff is on the way to Table ${tableData.tableNumber || ''}`, {
        duration: 3500,
        icon: '🔔',
      });

      // Auto close after 2.5s
      setTimeout(() => {
        setIsSent(false);
        setNotes('');
        onClose();
      }, 2500);
    }, 400);
  };

  const handleClose = () => {
    if (!isSubmitting) {
      setIsSent(false);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title=""
      size="sm"
      guestTheme={true}
    >
      <div className="space-y-4">
        {isSent ? (
          <div className="py-6 text-center space-y-3">
            <div
              className="h-16 w-16 mx-auto rounded-full flex items-center justify-center animate-bounce"
              style={{ background: 'var(--g-green-light)', border: '1px solid rgba(27,166,114,0.2)' }}
            >
              <CheckCircle2 className="h-9 w-9" style={{ color: 'var(--g-green)' }} strokeWidth={2} />
            </div>
            <h3 className="text-lg font-bold" style={{ color: 'var(--g-text)' }}>
              Staff Alerted!
            </h3>
            <p className="text-xs max-w-xs mx-auto leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
              A staff member has been notified and is coming to{' '}
              <span className="font-semibold text-gray-900">Table {tableData.tableNumber || 'your table'}</span>.
            </p>
          </div>
        ) : (
          <>
            {/* Header info */}
            <div className="flex items-center gap-3 pb-3 border-b" style={{ borderColor: 'var(--g-border)' }}>
              <div
                className="h-10 w-10 rounded-2xl flex items-center justify-center shrink-0"
                style={{ background: 'var(--g-accent-light)', border: '1px solid rgba(226,55,68,0.15)' }}
              >
                <Bell className="h-5 w-5" style={{ color: 'var(--g-accent)' }} strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-base font-bold tracking-tight" style={{ color: 'var(--g-text)' }}>
                  Call Staff
                </h3>
                <p className="text-xs" style={{ color: 'var(--g-text-muted)' }}>
                  Table {tableData.tableNumber || 'Dining'} &bull; Tap a service request below
                </p>
              </div>
            </div>

            {/* Quick Reason Options */}
            <div className="space-y-2 pt-1">
              <label className="text-xs font-semibold block" style={{ color: 'var(--g-text-secondary)' }}>
                What do you need assistance with?
              </label>
              <div className="grid grid-cols-1 gap-2">
                {REASON_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const isSelected = selectedReason === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedReason(opt.id)}
                      className="w-full flex items-center justify-between p-2.5 rounded-xl border transition-all text-left cursor-pointer"
                      style={{
                        background: isSelected ? 'var(--g-accent-light)' : 'var(--g-surface-2)',
                        borderColor: isSelected ? 'var(--g-accent)' : 'var(--g-border)',
                      }}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
                          style={{
                            background: isSelected ? 'var(--g-accent)' : 'var(--g-surface)',
                            color: isSelected ? '#fff' : 'var(--g-text-secondary)',
                          }}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </div>
                        <div>
                          <p
                            className="text-xs font-bold leading-tight"
                            style={{ color: isSelected ? 'var(--g-accent)' : 'var(--g-text)' }}
                          >
                            {opt.label}
                          </p>
                          <p className="text-[11px] leading-tight" style={{ color: 'var(--g-text-muted)' }}>
                            {opt.desc}
                          </p>
                        </div>
                      </div>
                      <div
                        className="h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0"
                        style={{
                          borderColor: isSelected ? 'var(--g-accent)' : 'var(--g-border)',
                        }}
                      >
                        {isSelected && (
                          <div className="h-2 w-2 rounded-full" style={{ background: 'var(--g-accent)' }} />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Note */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs font-semibold block" style={{ color: 'var(--g-text-secondary)' }}>
                Additional note <span className="font-normal text-[11px]" style={{ color: 'var(--g-text-muted)' }}>(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Warm water please, or bring spoon"
                maxLength={80}
                className="g-input w-full px-3.5 py-2 text-xs font-medium"
                style={{ borderRadius: '10px' }}
              />
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex items-center gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="w-1/3 py-2.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer text-center"
                style={{
                  background: 'var(--g-surface-2)',
                  borderColor: 'var(--g-border)',
                  color: 'var(--g-text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCallStaff}
                disabled={isSubmitting}
                className="w-2/3 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-98"
                style={{
                  background: 'linear-gradient(135deg, var(--g-accent) 0%, #C41E2D 100%)',
                  color: '#fff',
                }}
              >
                <Bell className="h-3.5 w-3.5" strokeWidth={2} />
                <span>{isSubmitting ? 'Calling…' : 'Notify Staff'}</span>
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}
