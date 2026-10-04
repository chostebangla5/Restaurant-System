import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { formatCurrency } from '@/utils/formatCurrency';
import { fetchGuestPreviousOrders } from '@/features/shared/orders/api/ordersApi';
import {
  User,
  Phone,
  Clock,
  ShoppingBag,
  CheckCircle2,
  Calendar,
  UtensilsCrossed,
  Receipt,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Check,
  X,
  Bell,
  RefreshCw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { CallStaffModal } from '@/components/ui/CallStaffModal';

export function GuestAccountScreen() {
  const { shortCode } = useParams();

  // Load stored guest profile from device
  const [guestName, setGuestName] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('tablesuite_guest_name') : '') || 'Dining Guest';
  });
  const [guestPhone, setGuestPhone] = useState(() => {
    return (typeof window !== 'undefined' ? localStorage.getItem('tablesuite_guest_phone') : '') || '';
  });

  // Edit Profile State
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(guestName === 'Dining Guest' ? '' : guestName);
  const [editPhone, setEditPhone] = useState(guestPhone);
  const [phoneError, setPhoneError] = useState('');

  // Orders State
  const [previousOrders, setPreviousOrders] = useState([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Call Staff Modal
  const [isCallStaffOpen, setIsCallStaffOpen] = useState(false);

  // Load previous orders whenever phone changes
  const loadOrders = async (phoneToUse, nameToUse) => {
    setIsLoadingOrders(true);
    try {
      const orders = await fetchGuestPreviousOrders({
        phone: phoneToUse || guestPhone,
        name: nameToUse || guestName,
        shortCode,
      });
      setPreviousOrders(Array.isArray(orders) ? orders : []);
    } catch (err) {
      console.warn('Error loading previous orders:', err);
      setPreviousOrders([]);
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    loadOrders(guestPhone, guestName);
  }, [guestPhone]);

  // Handle saving updated profile
  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    const cleanPhone = editPhone.replace(/[^\d+]/g, '').trim();
    const digitsOnly = cleanPhone.replace(/\D/g, '');

    if (cleanPhone && digitsOnly.length < 10) {
      setPhoneError('Please enter a valid 10-digit mobile number');
      return;
    }

    setPhoneError('');
    const newName = (editName.trim() || 'Dining Guest').slice(0, 80);
    setGuestName(newName);
    setGuestPhone(cleanPhone);

    if (typeof window !== 'undefined') {
      localStorage.setItem('tablesuite_guest_name', newName);
      if (cleanPhone) {
        localStorage.setItem('tablesuite_guest_phone', cleanPhone);
      } else {
        localStorage.removeItem('tablesuite_guest_phone');
      }
    }

    setIsEditing(false);
    toast.success('Profile details updated!');
    loadOrders(cleanPhone, newName);
  };

  const getInitials = (name) => {
    if (!name || name === 'Dining Guest') return 'G';
    return name
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  return (
    <div className="space-y-5 pb-28 font-sans w-full max-w-xl mx-auto">
      {/* ─── Profile Header Card ─── */}
      <div
        className="g-card p-5 relative overflow-hidden shadow-xs"
        style={{
          background: 'linear-gradient(135deg, rgba(226,55,68,0.03) 0%, var(--g-surface) 100%)',
          borderColor: 'rgba(226,55,68,0.15)',
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            {/* Avatar Circle */}
            <div
              className="h-14 w-14 rounded-2xl flex items-center justify-center font-extrabold text-lg text-white shadow-md shrink-0"
              style={{
                background: 'linear-gradient(135deg, var(--g-accent) 0%, #C41E2D 100%)',
              }}
            >
              {getInitials(guestName)}
            </div>

            {/* Profile Info */}
            <div className="min-w-0 flex-1">
              <h2 className="text-base font-bold truncate leading-tight" style={{ color: 'var(--g-text)' }}>
                {guestName}
              </h2>
              <div className="flex items-center gap-1.5 mt-1 text-xs" style={{ color: 'var(--g-text-muted)' }}>
                <Phone className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                <span className="font-semibold text-gray-800">
                  {guestPhone ? guestPhone : 'No mobile number added'}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span
                  className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full flex items-center gap-1"
                  style={{
                    background: guestPhone ? 'var(--g-green-light)' : 'var(--g-surface-2)',
                    color: guestPhone ? 'var(--g-green)' : 'var(--g-text-muted)',
                    border: '1px solid rgba(0,0,0,0.06)',
                  }}
                >
                  <ShieldCheck className="h-3 w-3" strokeWidth={2} />
                  <span>{guestPhone ? 'Priority Customer' : 'Guest Account'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          {!isEditing && (
            <button
              type="button"
              onClick={() => {
                setEditName(guestName === 'Dining Guest' ? '' : guestName);
                setEditPhone(guestPhone);
                setIsEditing(true);
              }}
              className="px-3 py-1.5 rounded-full text-xs font-semibold border flex items-center gap-1.5 transition-all cursor-pointer hover:bg-gray-50 active:scale-95 shrink-0"
              style={{
                background: 'var(--g-surface)',
                borderColor: 'var(--g-border)',
                color: 'var(--g-text)',
              }}
            >
              <Edit2 className="h-3 w-3" style={{ color: 'var(--g-accent)' }} />
              <span>Edit</span>
            </button>
          )}
        </div>

        {/* Inline Edit Form */}
        {isEditing && (
          <form onSubmit={handleSaveProfile} className="mt-4 pt-4 border-t space-y-3" style={{ borderColor: 'var(--g-border)' }}>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider mb-1" style={{ color: 'var(--g-text-secondary)' }}>
                Your Name
              </label>
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Rahul Sharma"
                className="g-input w-full px-3.5 py-2 text-xs font-medium"
                style={{ borderRadius: '10px' }}
                autoFocus
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[11px] font-bold uppercase tracking-wider" style={{ color: 'var(--g-text-secondary)' }}>
                  Mobile Number <span className="text-[10px] font-normal text-gray-400">(Priority ID for orders)</span>
                </label>
                {phoneError && (
                  <span className="text-[10px] font-medium" style={{ color: 'var(--g-accent)' }}>
                    {phoneError}
                  </span>
                )}
              </div>
              <input
                type="tel"
                value={editPhone}
                onChange={(e) => {
                  setEditPhone(e.target.value);
                  setPhoneError('');
                }}
                placeholder="e.g. 98765 43210"
                className="g-input w-full px-3.5 py-2 text-xs font-medium"
                style={{ borderRadius: '10px' }}
              />
              <p className="text-[10px] text-gray-500 mt-1">
                Your past orders and invoices are looked up using your mobile number as priority.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setPhoneError('');
                }}
                className="px-3.5 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer"
                style={{
                  background: 'var(--g-surface-2)',
                  borderColor: 'var(--g-border)',
                  color: 'var(--g-text-secondary)',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-xl text-xs font-bold text-white transition-all cursor-pointer active:scale-95 shadow-sm"
                style={{
                  background: 'linear-gradient(135deg, var(--g-accent) 0%, #C41E2D 100%)',
                }}
              >
                Save Details
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ─── Current Table Quick Access ─── */}
      <div className="grid grid-cols-2 gap-2.5">
        <Link
          to={`/t/${shortCode}`}
          className="g-card p-3 flex items-center gap-2.5 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer"
        >
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'var(--g-accent-light)', color: 'var(--g-accent)' }}
          >
            <UtensilsCrossed className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight" style={{ color: 'var(--g-text)' }}>
              Browse Menu
            </p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--g-text-muted)' }}>
              Add more dishes
            </p>
          </div>
        </Link>

        <button
          type="button"
          onClick={() => setIsCallStaffOpen(true)}
          className="g-card p-3 flex items-center gap-2.5 transition-all hover:scale-[1.01] active:scale-98 cursor-pointer text-left"
        >
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: 'rgba(245,158,11,0.1)', color: '#D97706' }}
          >
            <Bell className="h-4 w-4" strokeWidth={2} />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold leading-tight" style={{ color: 'var(--g-text)' }}>
              Call Staff
            </p>
            <p className="text-[10px] leading-tight" style={{ color: 'var(--g-text-muted)' }}>
              Water, bill, assistance
            </p>
          </div>
        </button>
      </div>

      {/* ─── Previous Orders Section ─── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4" style={{ color: 'var(--g-accent)' }} />
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--g-text)' }}>
              Previous Orders
            </h3>
          </div>
          <button
            type="button"
            onClick={() => loadOrders(guestPhone, guestName)}
            disabled={isLoadingOrders}
            className="text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
            style={{ color: 'var(--g-accent)' }}
          >
            <RefreshCw className={`h-3 w-3 ${isLoadingOrders ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Priority Phone Notice */}
        {guestPhone ? (
          <div
            className="p-2.5 rounded-xl text-xs flex items-center justify-between border"
            style={{
              background: 'var(--g-surface-2)',
              borderColor: 'var(--g-border)',
              color: 'var(--g-text-secondary)',
            }}
          >
            <span className="text-[11px]">
              Orders linked by mobile number: <strong className="text-gray-900">{guestPhone}</strong>
            </span>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
              Priority Sync Active
            </span>
          </div>
        ) : (
          <div
            className="p-3.5 rounded-2xl border space-y-2"
            style={{
              background: 'rgba(226,55,68,0.04)',
              borderColor: 'rgba(226,55,68,0.15)',
            }}
          >
            <p className="text-xs font-semibold leading-snug" style={{ color: 'var(--g-text)' }}>
              Looking for past receipts &amp; bills?
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
              Add your mobile number in your profile above. We prioritize mobile numbers to securely display all your past dining orders.
            </p>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="text-xs font-bold underline cursor-pointer"
              style={{ color: 'var(--g-accent)' }}
            >
              + Add mobile number now
            </button>
          </div>
        )}

        {/* Orders List */}
        {isLoadingOrders ? (
          <div className="py-12 text-center space-y-3">
            <div
              className="h-7 w-7 mx-auto animate-spin rounded-full border-2"
              style={{ borderColor: 'var(--g-surface-3)', borderTopColor: 'var(--g-accent)' }}
            />
            <p className="text-xs" style={{ color: 'var(--g-text-muted)' }}>
              Looking up your orders…
            </p>
          </div>
        ) : previousOrders.length === 0 ? (
          <div className="g-card p-8 text-center space-y-3">
            <div
              className="h-12 w-12 mx-auto rounded-full flex items-center justify-center"
              style={{ background: 'var(--g-surface-2)' }}
            >
              <ShoppingBag className="h-6 w-6 text-gray-400" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-bold text-sm" style={{ color: 'var(--g-text)' }}>
                No Previous Orders Found
              </p>
              <p className="text-xs max-w-xs mx-auto mt-1 leading-relaxed" style={{ color: 'var(--g-text-muted)' }}>
                {guestPhone
                  ? `No previous orders found for mobile number ${guestPhone}. Orders placed at any table with this number will appear here.`
                  : 'Orders you place will appear here automatically.'}
              </p>
            </div>
            <Link
              to={`/t/${shortCode}`}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-white transition-all active:scale-95 shadow-sm"
              style={{ background: 'var(--g-accent)' }}
            >
              <span>Explore Menu</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {previousOrders.map((ord) => {
              const isSettled = ord.is_settled || ord.status === 'completed' || ord.payment_status === 'paid';
              const isCancelled = ord.status === 'cancelled';
              const dateStr = ord.created_at
                ? new Date(ord.created_at).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : 'Recent Order';

              return (
                <div
                  key={ord.id}
                  className="g-card p-4 space-y-3 transition-all hover:border-gray-300"
                >
                  {/* Order Card Top Row */}
                  <div className="flex items-start justify-between gap-2 border-b pb-2.5" style={{ borderColor: 'var(--g-border)' }}>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs" style={{ color: 'var(--g-text)' }}>
                          Table {ord.table_number} &bull; Round #{ord.round_number}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span>{dateStr}</span>
                      </p>
                    </div>

                    {/* Status Pill */}
                    {isCancelled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                        Cancelled
                      </span>
                    ) : isSettled ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3" />
                        <span>Paid &amp; Settled</span>
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span className="capitalize">{ord.status}</span>
                      </span>
                    )}
                  </div>

                  {/* Items List */}
                  <div className="space-y-1.5">
                    {(ord.items || []).map((it, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs">
                        <span style={{ color: 'var(--g-text-secondary)' }}>
                          <span className="font-semibold text-gray-900">{it.qty}x</span> {it.name}
                        </span>
                        <span className="font-semibold" style={{ color: 'var(--g-text)' }}>
                          {formatCurrency(it.price * it.qty)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Order Total & Payment Summary */}
                  <div
                    className="flex items-center justify-between pt-2.5 border-t text-xs font-bold"
                    style={{ borderColor: 'var(--g-border)' }}
                  >
                    <span className="text-[11px] font-normal" style={{ color: 'var(--g-text-muted)' }}>
                      Paid via: <span className="font-semibold text-gray-800">{ord.payment_method}</span>
                    </span>
                    <div className="text-right">
                      <span className="text-sm font-extrabold" style={{ color: 'var(--g-text)' }}>
                        {formatCurrency(ord.total)}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Call Staff Modal */}
      <CallStaffModal
        isOpen={isCallStaffOpen}
        onClose={() => setIsCallStaffOpen(false)}
        tableData={{ tableNumber: 'Dining' }}
        shortCode={shortCode}
      />
    </div>
  );
}

export default GuestAccountScreen;
