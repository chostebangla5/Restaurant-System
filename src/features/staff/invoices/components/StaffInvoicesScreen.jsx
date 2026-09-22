import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/features/shared/auth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import {
  fetchInvoices,
  fetchInvoiceDetail,
  fetchInvoiceStats,
} from '../api/invoicesApi';
import {
  DocumentTextIcon,
  MagnifyingGlassIcon,
  PrinterIcon,
  CurrencyRupeeIcon,
  CalendarDaysIcon,
  ReceiptPercentIcon,
  ArrowPathIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

export function StaffInvoicesScreen() {
  const { venueId, venue } = useAuth();

  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Detail modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [invoiceDetail, setInvoiceDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const loadData = useCallback(async () => {
    if (!venueId) return;
    setIsLoading(true);
    try {
      const [invData, statsData] = await Promise.all([
        fetchInvoices(venueId, { search, dateFrom, dateTo }),
        fetchInvoiceStats(venueId),
      ]);
      setInvoices(invData);
      setStats(statsData);
    } catch (err) {
      toast.error('Failed to load invoices');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [venueId, search, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleViewDetail = async (invoiceId) => {
    setLoadingDetail(true);
    setDetailModalOpen(true);
    try {
      const detail = await fetchInvoiceDetail(invoiceId);
      setInvoiceDetail(detail);
    } catch (err) {
      toast.error('Failed to load invoice details');
      console.error(err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });
  };

  const formatCurrency = (val) => {
    return `₹${parseFloat(val || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
  };

  // Collect all order items from the invoice detail
  const getInvoiceItems = () => {
    if (!invoiceDetail?.table_sessions?.orders) return [];
    const items = [];
    for (const order of invoiceDetail.table_sessions.orders) {
      if (order.order_items) {
        items.push(...order.order_items);
      }
    }
    return items;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">Invoices</h2>
          <p className="text-xs text-stone-500">Tax invoices & billing history</p>
        </div>
        <Button size="sm" variant="ghost" onClick={loadData}>
          <ArrowPathIcon className="h-4 w-4" /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<CurrencyRupeeIcon className="h-5 w-5" />}
            color="text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 dark:text-emerald-400"
          />
          <StatCard
            label="Total Invoices"
            value={stats.totalInvoices}
            icon={<DocumentTextIcon className="h-5 w-5" />}
            color="text-blue-600 bg-blue-50 dark:bg-blue-950/30 dark:text-blue-400"
          />
          <StatCard
            label="Avg Bill"
            value={formatCurrency(stats.avgBill)}
            icon={<ReceiptPercentIcon className="h-5 w-5" />}
            color="text-purple-600 bg-purple-50 dark:bg-purple-950/30 dark:text-purple-400"
          />
          <StatCard
            label="Today"
            value={`${stats.todayCount} (${formatCurrency(stats.todayRevenue)})`}
            icon={<CalendarDaysIcon className="h-5 w-5" />}
            color="text-amber-600 bg-amber-50 dark:bg-amber-950/30 dark:text-amber-400"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-400" />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/60 text-stone-900 dark:text-white placeholder-stone-400 focus:ring-2 focus:ring-brand-primary/30 focus:border-brand-primary outline-none transition-all"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/60 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/30"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2.5 rounded-xl text-xs bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-700/60 text-stone-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-primary/30"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="px-3 py-2.5 rounded-xl text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Invoice Table */}
      <div className="rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <DocumentTextIcon className="h-10 w-10 mx-auto text-stone-300 dark:text-stone-600" />
            <p className="text-sm font-semibold text-stone-600 dark:text-stone-400">No invoices found</p>
            <p className="text-xs text-stone-400">
              Invoices are generated when a table session is settled through Billing & POS
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-stone-100 dark:border-stone-800 text-left">
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Invoice #</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Date</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Table</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Subtotal</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Tax</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Total</th>
                  <th className="px-5 py-3 text-[11px] font-bold uppercase tracking-wider text-stone-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-stone-50 dark:hover:bg-stone-800/30 transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(inv.id)}
                  >
                    <td className="px-5 py-3">
                      <span className="text-xs font-bold font-mono text-brand-primary">
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-xs text-stone-500">
                      {formatDate(inv.issued_at)}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone-600 dark:text-stone-400">
                      {inv.table_sessions?.tables?.table_number || '—'}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone-600 dark:text-stone-400">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="px-5 py-3 text-xs text-stone-500">
                      {formatCurrency(inv.tax_amount)}
                    </td>
                    <td className="px-5 py-3 text-xs font-bold text-stone-900 dark:text-white">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-5 py-3">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewDetail(inv.id); }}>
                        View
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => { setDetailModalOpen(false); setInvoiceDetail(null); }}
        title="Invoice Detail"
        size="lg"
      >
        {loadingDetail ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-brand-primary border-t-transparent" />
          </div>
        ) : invoiceDetail ? (
          <div className="space-y-5 print-content">
            {/* Invoice Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-stone-900 dark:text-white">
                  {venue?.name || 'Restaurant'}
                </h3>
                <p className="text-[11px] text-stone-500 mt-1">{venue?.address || ''}</p>
                <p className="text-[11px] text-stone-500">{venue?.phone || ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold font-mono text-brand-primary">
                  {invoiceDetail.invoice_number}
                </p>
                <p className="text-[11px] text-stone-500 mt-1">
                  {formatDateTime(invoiceDetail.issued_at)}
                </p>
                <p className="text-[11px] text-stone-500">
                  Table: {invoiceDetail.table_sessions?.tables?.table_number || '—'}
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-stone-200 dark:border-stone-700" />

            {/* Line Items */}
            <div>
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400">Item</th>
                    <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400 text-center">Qty</th>
                    <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400 text-right">Price</th>
                    <th className="pb-2 text-[11px] font-bold uppercase tracking-wider text-stone-400 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                  {getInvoiceItems().map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-2 text-xs text-stone-800 dark:text-stone-200">{item.item_name}</td>
                      <td className="py-2 text-xs text-center text-stone-600 dark:text-stone-400">{item.quantity}</td>
                      <td className="py-2 text-xs text-right text-stone-500">{formatCurrency(item.price_at_order)}</td>
                      <td className="py-2 text-xs text-right font-semibold text-stone-800 dark:text-stone-200">
                        {formatCurrency(item.price_at_order * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-dashed border-stone-200 dark:border-stone-700" />

            {/* Totals */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Subtotal</span>
                <span>{formatCurrency(invoiceDetail.subtotal)}</span>
              </div>
              {parseFloat(invoiceDetail.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-xs text-emerald-600">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoiceDetail.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-xs text-stone-600 dark:text-stone-400">
                <span>Tax (GST)</span>
                <span>{formatCurrency(invoiceDetail.tax_amount)}</span>
              </div>
              <div className="border-t border-stone-200 dark:border-stone-700 pt-2 flex justify-between text-sm font-black text-stone-900 dark:text-white">
                <span>Total</span>
                <span>{formatCurrency(invoiceDetail.total_amount)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => { setDetailModalOpen(false); setInvoiceDetail(null); }} className="flex-1">
                Close
              </Button>
              <Button onClick={handlePrint} className="flex-1">
                <PrinterIcon className="h-4 w-4" /> Print Invoice
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-stone-500 text-center py-8">Invoice not found</p>
        )}
      </Modal>
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="p-4 rounded-2xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-xl ${color}`}>{icon}</span>
      </div>
      <p className="text-lg font-black text-stone-900 dark:text-white truncate">{value}</p>
      <p className="text-[11px] text-stone-500 mt-0.5">{label}</p>
    </div>
  );
}
