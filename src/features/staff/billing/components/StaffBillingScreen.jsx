import React, { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAuth } from '@/features/shared/auth';
import {
  fetchOrders,
  subscribeToOrders,
  settleOrder,
} from '@/features/shared/orders/api/ordersApi';
import toast from 'react-hot-toast';
import {
  Banknote,
  CreditCard,
  Printer,
  CheckCircle2,
  FileText,
  Clock,
} from 'lucide-react';

export function StaffBillingScreen() {
  const { venue } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all'); // all | pending | paid
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  const loadData = async () => {
    try {
      const o = await fetchOrders(venue?.id);
      setOrders(Array.isArray(o) ? o : []);
    } catch {
      setOrders([]);
    }
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToOrders(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [venue?.id]);

  const handleSettle = async (orderId, method) => {
    await settleOrder(orderId, method);
    toast.success(`Bill marked as settled via ${method.toUpperCase()}!`);
    loadData();
    if (selectedReceiptOrder?.id === orderId) {
      setSelectedReceiptOrder((prev) => ({
        ...prev,
        payment_status: 'paid',
        payment_method: method,
        status: 'completed',
      }));
    }
  };

  const ordersList = orders || [];

  const filteredOrders = ordersList.filter((o) => {
    if (filter === 'pending') return o.payment_status === 'pending';
    if (filter === 'paid') return o.payment_status === 'paid' || o.status === 'completed';
    return true;
  });

  const totalPendingDue = ordersList
    .filter((o) => o.payment_status === 'pending')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const totalSettledToday = ordersList
    .filter((o) => o.payment_status === 'paid' || o.status === 'completed')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-[#F4F5F7]">
            POS Billing & Settlement
          </h1>
          <p className="text-xs text-[#8A8F9C] mt-1">
            Process guest table bills, accept counter cash, and print tax receipts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-xl bg-[#0E1016] border border-amber-400/25 text-right">
            <span className="text-[10px] font-mono font-medium text-amber-400 block uppercase tracking-wider">Pending Due</span>
            <span className="text-base font-mono font-bold text-amber-300">
              {formatCurrency(totalPendingDue)}
            </span>
          </div>
          <div className="px-4 py-2 rounded-xl bg-[#0E1016] border border-[#C6FF3D]/25 text-right">
            <span className="text-[10px] font-mono font-medium text-[#C6FF3D] block uppercase tracking-wider">Settled Today</span>
            <span className="text-base font-mono font-bold text-[#C6FF3D]">
              {formatCurrency(totalSettledToday)}
            </span>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2">
        {[
          { id: 'all', label: 'All Transactions' },
          { id: 'pending', label: '⏳ Pending Settlement' },
          { id: 'paid', label: '✓ Settled & Paid' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              filter === tab.id
                ? 'bg-[#C6FF3D] text-[#07080B] font-semibold shadow-sm'
                : 'bg-[#0E1016] text-[#8A8F9C] hover:text-[#F4F5F7] border border-white/[0.08]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Billing Records Table */}
      <div className="rounded-card bg-[#0E1016] border border-white/[0.08] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#141721] border-b border-white/[0.08] text-[#8A8F9C] font-mono font-medium uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Invoice / Table</th>
                <th className="px-5 py-3.5">Items Ordered</th>
                <th className="px-5 py-3.5">Subtotal</th>
                <th className="px-5 py-3.5">Tax (5%)</th>
                <th className="px-5 py-3.5">Total Amount</th>
                <th className="px-5 py-3.5">Payment Status</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-[#8A8F9C] font-mono text-xs">
                    No billing records found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isPaid = o.payment_status === 'paid' || o.status === 'completed';

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="h-8 w-8 rounded-full bg-[#141721] border border-white/[0.08] text-[#C6FF3D] font-mono font-bold text-xs flex items-center justify-center">
                            T-{o.table_number}
                          </span>
                          <div>
                            <span className="font-mono text-xs font-semibold text-[#F4F5F7] block">
                              {o.id}
                            </span>
                            <span className="text-[10px] font-mono text-[#8A8F9C]">
                              Round #{o.round_number} &bull; {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate text-[#8A8F9C]">
                        {(o.items || []).map((it) => `${it.qty}x ${it.name}`).join(', ')}
                      </td>
                      <td className="px-5 py-4 font-mono text-[#8A8F9C]">
                        {formatCurrency(o.subtotal)}
                      </td>
                      <td className="px-5 py-4 font-mono text-[#8A8F9C]">
                        {formatCurrency(o.tax)}
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-[#F4F5F7] text-sm">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="px-5 py-4">
                        {isPaid ? (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                            ✓ Paid ({o.payment_method || 'counter'})
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 border border-amber-400/30">
                            Pending Counter Settle
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setSelectedReceiptOrder(o)}
                            className="h-8 text-xs font-medium rounded-full border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]"
                          >
                            <FileText className="h-3.5 w-3.5 mr-1" strokeWidth={1.5} /> View Receipt
                          </Button>
                          {!isPaid && (
                            <Button
                              size="sm"
                              onClick={() => handleSettle(o.id, 'counter')}
                              className="h-8 text-xs font-medium rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e]"
                            >
                              Settle (Cash)
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Digital Tax Receipt Modal */}
      <Modal
        isOpen={Boolean(selectedReceiptOrder)}
        onClose={() => setSelectedReceiptOrder(null)}
        title="Restaurant Tax Invoice Receipt"
        size="sm"
      >
        {selectedReceiptOrder && (
          <div className="space-y-4 py-2 font-mono text-xs">
            {/* Printable Receipt Paper Card */}
            <div className="p-5 rounded-card bg-[#141721] border border-dashed border-white/[0.15] space-y-3 text-[#F4F5F7]">
              <div className="text-center border-b border-dashed border-white/[0.12] pb-3">
                <h3 className="font-heading font-bold text-sm text-[#F4F5F7] uppercase tracking-wider">
                  {venue?.name || 'TableSuite Restaurant'}
                </h3>
                <p className="text-[11px] text-[#8A8F9C]">GSTIN: 19AAACC1206D1ZM</p>
                <p className="text-[10px] text-[#8A8F9C] mt-0.5">
                  Invoice #{selectedReceiptOrder.id} &bull; Table T-{selectedReceiptOrder.table_number}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-1.5 text-[11px]">
                {(selectedReceiptOrder.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.qty}x {it.name}</span>
                    <span className="text-[#8A8F9C]">{formatCurrency(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-white/[0.12] pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-[#8A8F9C]">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedReceiptOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-[#8A8F9C]">
                  <span>CGST (2.5%)</span>
                  <span>{formatCurrency(selectedReceiptOrder.tax / 2)}</span>
                </div>
                <div className="flex justify-between text-[#8A8F9C]">
                  <span>SGST (2.5%)</span>
                  <span>{formatCurrency(selectedReceiptOrder.tax / 2)}</span>
                </div>
                <div className="border-t border-white/[0.12] pt-2 flex justify-between font-bold text-sm text-[#F4F5F7]">
                  <span>GRAND TOTAL</span>
                  <span className="text-[#C6FF3D]">{formatCurrency(selectedReceiptOrder.total)}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-white/[0.12] text-[10px] text-[#8A8F9C]">
                Payment: {selectedReceiptOrder.payment_status === 'paid' ? `PAID VIA ${selectedReceiptOrder.payment_method?.toUpperCase()}` : 'PENDING COUNTER SETTLEMENT'}
                <br />Thank you for visiting!
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-1 font-sans">
              <Button
                size="md"
                variant="outline"
                className="flex-1 font-medium rounded-full border-white/[0.12] text-[#F4F5F7] hover:border-white/[0.25]"
                onClick={() => {
                  window.print();
                }}
              >
                <Printer className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Print Receipt
              </Button>
              {selectedReceiptOrder.payment_status !== 'paid' && selectedReceiptOrder.status !== 'completed' && (
                <Button
                  size="md"
                  className="flex-1 font-semibold rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e]"
                  onClick={() => handleSettle(selectedReceiptOrder.id, 'cash')}
                >
                  Mark as Paid
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
