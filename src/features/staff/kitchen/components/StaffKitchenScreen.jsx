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
  Flame,
  Clock,
  CheckCheck,
  CheckCircle2,
  ChefHat,
  AlertTriangle,
} from 'lucide-react';

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
      const kitchenOrders = (Array.isArray(data) ? data : []).filter((o) =>
        o && ['placed', 'acknowledged', 'cooking'].includes(o.status)
      );
      setOrders(kitchenOrders);
    } catch (err) {
      console.warn('Failed to load kitchen orders:', err);
      setOrders([]);
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
    try {
      await updateOrderStatus(orderId, 'ready');
      toast.success('Ticket bumped! Marked as READY FOR SERVICE 🚀');
      load();
    } catch (e) {
      console.error(e);
      toast.error('Failed to update ticket');
    }
  };

  const getStationOrders = () => {
    const list = orders || [];
    if (selectedStation === 'all') return list;
    return list.filter((o) =>
      o && (o.items || []).some((item) => (item.station || 'hot') === selectedStation)
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 bg-[#0E1016] p-6 rounded-card border border-white/[0.08] text-[#F4F5F7]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="h-7 w-7 rounded-full bg-[#141721] border border-[#C6FF3D]/30 flex items-center justify-center text-[#C6FF3D]">
              <Flame className="h-4 w-4" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-heading font-bold tracking-tight">Kitchen Display System (KDS)</h1>
            <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[#C6FF3D]/10 text-[#C6FF3D] border border-[#C6FF3D]/25">
              {activeKitchenTickets.length} active tickets
            </span>
          </div>
          <p className="text-xs text-[#8A8F9C] mt-1.5 leading-relaxed">
            Realtime high-contrast station tickets. Cook, mark ready, and bump orders.
          </p>
        </div>

        {/* Station Tabs */}
        <div className="flex items-center gap-1.5 bg-[#141721] p-1 rounded-full border border-white/[0.08] overflow-x-auto">
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
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap ${
                selectedStation === st.id
                  ? 'bg-[#C6FF3D] text-[#07080B] font-semibold shadow-sm'
                  : 'text-[#8A8F9C] hover:text-[#F4F5F7]'
              }`}
            >
              {st.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ticket Grid */}
      {activeKitchenTickets.length === 0 ? (
        <div className="py-24 text-center rounded-card bg-[#0E1016] border border-white/[0.08] text-[#8A8F9C] space-y-4">
          <div className="h-14 w-14 rounded-full bg-[#141721] border border-white/[0.08] text-[#C6FF3D] flex items-center justify-center mx-auto">
            <ChefHat className="h-7 w-7" strokeWidth={1.5} />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-heading font-semibold text-[#F4F5F7]">Kitchen Queue is All Clear</h3>
            <p className="text-xs text-[#8A8F9C] max-w-sm mx-auto leading-relaxed">
              No pending cooking tickets in this station right now. New guest QR orders will pop up instantly with sound alert.
            </p>
          </div>
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
                className={`p-5 rounded-card bg-[#0E1016] border transition-all duration-300 flex flex-col justify-between ${
                  isUrgent
                    ? 'border-rose-500/80 shadow-lg shadow-rose-950/20'
                    : isWarning
                    ? 'border-amber-400/80 shadow-lg shadow-amber-950/20'
                    : 'border-white/[0.08] hover:border-white/[0.18]'
                }`}
              >
                <div className="space-y-4">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="h-10 w-10 rounded-full bg-[#141721] border border-white/[0.12] text-[#C6FF3D] font-mono font-bold text-xs flex items-center justify-center">
                        T-{ticket.table_number}
                      </span>
                      <div>
                        <span className="font-mono font-semibold text-xs text-[#F4F5F7] block">
                          Round #{ticket.round_number}
                        </span>
                        <span className="text-[11px] text-[#8A8F9C] font-mono">
                          {ticket.id}
                        </span>
                      </div>
                    </div>

                    <div
                      className={`px-3 py-1 rounded-full text-xs font-mono flex items-center gap-1.5 border ${
                        isUrgent
                          ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                          : isWarning
                          ? 'bg-amber-400/15 text-amber-300 border-amber-400/30'
                          : 'bg-[#141721] text-[#8A8F9C] border-white/[0.08]'
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" strokeWidth={1.5} /> {mins}m elapsed
                    </div>
                  </div>

                  {/* Itemized Cooking Checklist */}
                  <div className="space-y-2 border-y border-white/[0.06] py-3">
                    {(ticket.items || []).map((item, idx) => {
                      const isTicked = tickedItems[`${ticket.id}-${idx}`];
                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItemTick(ticket.id, idx)}
                          className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-start justify-between gap-3 border ${
                            isTicked
                              ? 'bg-white/[0.02] border-white/[0.04] text-[#8A8F9C] line-through'
                              : 'bg-[#141721] border-white/[0.06] text-[#F4F5F7] hover:border-white/[0.15]'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`h-4 w-4 rounded-full border flex items-center justify-center shrink-0 mt-0.5 transition-colors ${
                                isTicked
                                  ? 'border-[#C6FF3D] bg-[#C6FF3D] text-[#07080B]'
                                  : 'border-white/[0.2] bg-white/[0.04]'
                              }`}
                            >
                              {isTicked && <CheckCircle2 className="h-3 w-3" strokeWidth={2} />}
                            </span>
                            <div>
                              <span className="font-mono text-xs font-bold text-[#C6FF3D] mr-1.5">
                                {item.qty}x
                              </span>
                              <span className="text-xs sm:text-sm font-medium">
                                {item.name}
                              </span>
                              {item.notes && (
                                <span className="block text-[11px] text-amber-300 font-mono mt-0.5">
                                  ⚠️ {item.notes}
                                </span>
                              )}
                            </div>
                          </div>

                          <span className="text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[#8A8F9C] shrink-0">
                            {item.station || 'hot'}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {ticket.guest_notes && (
                    <p className="text-xs bg-amber-400/10 border border-amber-400/20 text-amber-300 p-2.5 rounded-xl font-sans">
                      Table Note: {ticket.guest_notes}
                    </p>
                  )}
                </div>

                {/* Bump Ticket Button */}
                <div className="pt-4">
                  <Button
                    size="lg"
                    onClick={() => handleBumpTicket(ticket.id)}
                    className="w-full bg-[#C6FF3D] hover:bg-[#b8f52e] text-[#07080B] font-semibold text-xs tracking-wider flex items-center justify-center gap-2 rounded-full"
                  >
                    <CheckCheck className="h-4 w-4" strokeWidth={1.5} /> BUMP TICKET &bull; MARK READY
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
