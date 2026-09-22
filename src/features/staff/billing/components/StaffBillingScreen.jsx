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
  BanknotesIcon,
  CreditCardIcon,
  PrinterIcon,
  CheckCircleIcon,
  DocumentTextIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export function StaffBillingScreen() {
  const { venue } = useAuth();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('all'); // all | pending | paid
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState(null);

  const loadData = async () => {
    const o = await fetchOrders();
    setOrders(o);
  };

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToOrders(() => {
      loadData();
    });
    return () => unsubscribe();
  }, []);

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

  const filteredOrders = orders.filter((o) => {
    if (filter === 'pending') return o.payment_status === 'pending';
    if (filter === 'paid') return o.payment_status === 'paid' || o.status === 'completed';
    return true;
  });

  const totalPendingDue = orders
    .filter((o) => o.payment_status === 'pending')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const totalSettledToday = orders
    .filter((o) => o.payment_status === 'paid' || o.status === 'completed')
    .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-stone-900 dark:text-white">
            POS Billing & Settlement
          </h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Process guest table bills, accept counter cash, and print tax receipts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-right">
            <span className="text-[10px] font-bold text-amber-600 block uppercase">Pending Due</span>
            <span className="text-base font-black text-amber-600">
              {formatCurrency(totalPendingDue)}
            </span>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-right">
            <span className="text-[10px] font-bold text-emerald-600 block uppercase">Settled Today</span>
            <span className="text-base font-black text-emerald-600">
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
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filter === tab.id
                ? 'bg-brand-primary text-white shadow-sm shadow-brand-primary/20'
                : 'bg-white dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Billing Records Table */}
      <div className="rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-50 dark:bg-stone-800/60 border-b border-stone-200/80 dark:border-stone-800 text-stone-400 font-bold uppercase tracking-wider text-[10px]">
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
            <tbody className="divide-y divide-stone-100 dark:divide-stone-800/80 font-medium">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-stone-400">
                    No billing records found.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((o) => {
                  const isPaid = o.payment_status === 'paid' || o.status === 'completed';

                  return (
                    <tr
                      key={o.id}
                      className="hover:bg-stone-50/70 dark:hover:bg-stone-800/40 transition-colors"
                    >
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2.5">
                          <span className="h-8 w-8 rounded-lg bg-brand-primary text-white font-black text-xs flex items-center justify-center">
                            T-{o.table_number}
                          </span>
                          <div>
                            <span className="font-extrabold text-stone-900 dark:text-white block">
                              {o.id}
                            </span>
                            <span className="text-[10px] text-stone-400">
                              Round #{o.round_number} &bull; {new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-4 max-w-xs truncate text-stone-600 dark:text-stone-300">
                        {(o.items || []).map((it) => `${it.qty}x ${it.name}`).join(', ')}
                      </td>
                      <td className="px-5 py-4 text-stone-500">
                        {formatCurrency(o.subtotal)}
                      </td>
                      <td className="px-5 py-4 text-stone-500">
                        {formatCurrency(o.tax)}
                      </td>
                      <td className="px-5 py-4 font-black text-stone-900 dark:text-white text-sm">
                        {formatCurrency(o.total)}
                      </td>
                      <td className="px-5 py-4">
                        {isPaid ? (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                            ✓ Paid ({o.payment_method || 'counter'})
                          </span>
                        ) : (
                          <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-600 border border-amber-500/20">
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
                            className="h-8 text-xs font-bold"
                          >
                            <DocumentTextIcon className="h-3.5 w-3.5 mr-1" /> View Receipt
                          </Button>
                          {!isPaid && (
                            <Button
                              size="sm"
                              onClick={() => handleSettle(o.id, 'counter')}
                              className="h-8 text-xs font-bold"
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
            <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-dashed border-stone-300 dark:border-stone-700 space-y-3">
              <div className="text-center border-b border-dashed border-stone-300 dark:border-stone-700 pb-3">
                <h3 className="font-black text-sm text-stone-900 dark:text-white uppercase tracking-wider font-sans">
                  {venue?.name || 'TableSuite Restaurant'}
                </h3>
                <p className="text-[11px] text-stone-500">GSTIN: 19AAACC1206D1ZM</p>
                <p className="text-[10px] text-stone-400">
                  Invoice #{selectedReceiptOrder.id} &bull; Table T-{selectedReceiptOrder.table_number}
                </p>
              </div>

              {/* Items */}
              <div className="space-y-1.5 text-[11px]">
                {(selectedReceiptOrder.items || []).map((it, idx) => (
                  <div key={idx} className="flex justify-between">
                    <span>{it.qty}x {it.name}</span>
                    <span>{formatCurrency(it.price * it.qty)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-dashed border-stone-300 dark:border-stone-700 pt-2 space-y-1 text-[11px]">
                <div className="flex justify-between text-stone-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(selectedReceiptOrder.subtotal)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>CGST (2.5%)</span>
                  <span>{formatCurrency(selectedReceiptOrder.tax / 2)}</span>
                </div>
                <div className="flex justify-between text-stone-500">
                  <span>SGST (2.5%)</span>
                  <span>{formatCurrency(selectedReceiptOrder.tax / 2)}</span>
                </div>
                <div className="border-t border-stone-200 dark:border-stone-700 pt-1.5 flex justify-between font-black text-sm text-stone-900 dark:text-white font-sans">
                  <span>GRAND TOTAL</span>
                  <span className="text-brand-primary">{formatCurrency(selectedReceiptOrder.total)}</span>
                </div>
              </div>

              <div className="text-center pt-2 border-t border-dashed border-stone-300 dark:border-stone-700 text-[10px] text-stone-400">
                Payment: {selectedReceiptOrder.payment_status === 'paid' ? `PAID VIA ${selectedReceiptOrder.payment_method?.toUpperCase()}` : 'PENDING COUNTER SETTLEMENT'}
                <br />Thank you for visiting!
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center gap-2 pt-1 font-sans">
              <Button
                size="md"
                variant="outline"
                className="flex-1 font-bold"
                onClick={() => {
                  window.print();
                }}
              >
                <PrinterIcon className="h-4 w-4 mr-1.5" /> Print Receipt
              </Button>
              {selectedReceiptOrder.payment_status !== 'paid' && selectedReceiptOrder.status !== 'completed' && (
                <Button
                  size="md"
                  className="flex-1 font-bold"
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
