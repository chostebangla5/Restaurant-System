import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Toggle';
import { useAuth } from '@/features/shared/auth';
import {
  fetchOrders,
  subscribeToOrders,
  updateOrderStatus,
  playOrderAlertSound,
} from '@/features/shared/orders/api/ordersApi';
import toast from 'react-hot-toast';
import {
  FireIcon,
  ClockIcon,
  CheckBadgeIcon,
  SpeakerWaveIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/solid';

export function StaffKitchenScreen() {
  const { venueId } = useAuth();
  const [orders, setOrders] = useState([]);
  const [selectedStation, setSelectedStation] = useState('all'); // all | hot | cold | bar
  const [tickedItems, setTickedItems] = useState({});
  const [soundEnabled, setSoundEnabled] = useState(true);

  const load = async () => {
    try {
      const data = await fetchOrders(venueId);
      // Kitchen is interested in active cooking/placed tickets
      const kitchenOrders = data.filter((o) =>
        ['placed', 'acknowledged', 'cooking'].includes(o.status)
      );
      setOrders(kitchenOrders);
    } catch (err) {
      console.warn('Failed to load kitchen orders:', err);
    }
  };

  useEffect(() => {
    load();
    const unsubscribe = subscribeToOrders(() => {
      load();
      if (soundEnabled) playOrderAlertSound();
    });
    return () => unsubscribe();
  }, [venueId, soundEnabled]);

  const toggleItemTick = (orderId, itemIdx) => {
    const key = `${orderId}-${itemIdx}`;
    setTickedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleBumpTicket = async (orderId) => {
    await updateOrderStatus(orderId, 'ready');
    toast.success('Ticket bumped! Marked as READY FOR SERVICE 🚀');
    load();
  };

  const getStationOrders = () => {
    if (selectedStation === 'all') return orders;
    return orders.filter((o) =>
      (o.items || []).some((item) => (item.station || 'hot') === selectedStation)
    );
  };

  const getMinutesElapsed = (isoString) => {
    if (!isoString) return 0;
    return Math.floor((Date.now() - new Date(isoString).getTime()) / 60000);
  };

  const activeKitchenTickets = getStationOrders();

  return (
    <div className="space-y-6">
      {/* KDS Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-900 p-5 rounded-3xl border border-stone-800 text-white">
        <div>
          <div className="flex items-center gap-2">
            <FireIcon className="h-5 w-5 text-orange-500" />
            <h1 className="text-xl font-black tracking-tight">Kitchen Display System (KDS)</h1>
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
              {activeKitchenTickets.length} active tickets
            </span>
          </div>
          <p className="text-xs text-stone-400 mt-1">
            Realtime high-contrast station tickets. Cook, mark ready, and bump orders.
          </p>
        </div>

        {/* Station Tabs */}
        <div className="flex items-center gap-2 bg-stone-800/80 p-1 rounded-2xl border border-stone-700">
          {[
            { id: 'all', label: 'All Stations' },
            { id: 'hot', label: '🔥 Hot Kitchen' },
            { id: 'cold', label: '🥗 Cold / Salad' },
            { id: 'bar', label: '🍸 Drinks & Bar' },
          ].map((st) => (
            <button
              key={st.id}
              type="button"
              onClick={() => setSelectedStation(st.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedStation === st.id
                  ? 'bg-brand-primary text-white shadow-md'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Grid */}
      {activeKitchenTickets.length === 0 ? (
        <div className="py-24 text-center rounded-3xl bg-stone-900 border border-stone-800 text-stone-400 space-y-3">
          <div className="text-4xl">👨‍🍳</div>
          <h3 className="text-base font-bold text-white">Kitchen Queue is All Clear</h3>
          <p className="text-xs text-stone-400 max-w-sm mx-auto">
            No pending cooking tickets in this station right now. New guest QR orders will pop up instantly with sound alert.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {activeKitchenTickets.map((ticket) => {
            const mins = getMinutesElapsed(ticket.created_at);
            const isUrgent = mins >= 12;
            const isWarning = mins >= 8;

            return (
              <div
                key={ticket.id}
                className={`p-5 rounded-3xl bg-stone-900 border-2 transition-all shadow-xl flex flex-col justify-between ${
                  isUrgent
                    ? 'border-rose-500 shadow-rose-950/40 animate-pulse'
                    : isWarning
                    ? 'border-amber-500 shadow-amber-950/40'
                    : 'border-stone-700'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-11 w-11 rounded-2xl bg-brand-primary text-white font-black text-sm flex items-center justify-center shadow-lg shadow-brand-primary/30">
                        T-{ticket.table_number}
                      </span>
                      <div>
                        <span className="font-extrabold text-sm text-white block">
                          Round #{ticket.round_number}
                        </span>
                        <span className="text-[11px] text-stone-400 font-mono">
                          {ticket.id}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`px-3 py-1 rounded-xl text-xs font-black flex items-center gap-1.5 ${
                        isUrgent
                          ? 'bg-rose-500 text-white'
                          : isWarning
                          ? 'bg-amber-500 text-stone-950'
                          : 'bg-stone-800 text-stone-300'
                      }`}
                    >
                      <ClockIcon className="h-4 w-4" /> {mins}m elapsed
                    </div>
                  </div>

                  {/* Itemized Cooking Checklist */}
                  <div className="space-y-2 border-y border-stone-800 py-3">
                    {(ticket.items || []).map((item, idx) => {
                      const isTicked = tickedItems[`${ticket.id}-${idx}`];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItemTick(ticket.id, idx)}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 ${
                            isTicked
                              ? 'bg-stone-800/40 text-stone-500 line-through'
                              : 'bg-stone-800/80 text-white hover:bg-stone-800'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`h-5 w-5 rounded-md border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isTicked
                                  ? 'border-emerald-500 bg-emerald-500 text-white'
                                  : 'border-stone-600 bg-stone-700'
                              }`}
                            >
                              {isTicked && <CheckCircleIcon className="h-4 w-4" />}
                            </span>
                            <div>
                              <span className="text-sm font-extrabold text-brand-primary mr-1.5">
                                {item.qty}x
                              </span>
                              <span className="text-xs sm:text-sm font-bold">
                                {item.name}
                              </span>
                              {item.notes && (
                                <span className="block text-[11px] text-amber-400 font-medium not-italic mt-0.5">
                                  ⚠️ {item.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-md bg-stone-700 text-stone-300 shrink-0">
                            {item.station || 'hot'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {ticket.guest_notes && (
                    <p className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 p-2.5 rounded-xl font-medium">
                      Table Note: {ticket.guest_notes}
                    </p>
                  )}
                </div>

                {/* Bump Ticket Button */}
                <div className="pt-4">
                  <Button
                    size="lg"
                    onClick={() => handleBumpTicket(ticket.id)}
                    className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
                  >
                    <CheckBadgeIcon className="h-5 w-5" /> BUMP TICKET &bull; MARK READY
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
