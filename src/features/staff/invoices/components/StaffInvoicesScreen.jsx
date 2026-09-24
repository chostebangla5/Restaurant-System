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
  FileText,
  Search,
  Printer,
  Coins,
  Calendar,
  Percent,
  RefreshCw,
} from 'lucide-react';
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
          <h1 className="text-xl sm:text-2xl font-heading font-bold text-[#F4F5F7]">Invoices</h1>
          <p className="text-xs text-[#8A8F9C] mt-1">Tax invoices & billing history</p>
        </div>
        <Button size="md" variant="ghost" onClick={loadData} className="rounded-full text-xs font-mono text-[#8A8F9C] hover:text-[#F4F5F7]">
          <RefreshCw className="h-3.5 w-3.5 mr-1.5" strokeWidth={1.5} /> Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<Coins className="h-4 w-4" strokeWidth={1.5} />}
            color="text-[#C6FF3D] bg-[#C6FF3D]/10 border border-[#C6FF3D]/25"
          />
          <StatCard
            label="Total Invoices"
            value={stats.totalInvoices}
            icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
            color="text-sky-400 bg-sky-400/10 border border-sky-400/25"
          />
          <StatCard
            label="Avg Bill"
            value={formatCurrency(stats.avgBill)}
            icon={<Percent className="h-4 w-4" strokeWidth={1.5} />}
            color="text-emerald-400 bg-emerald-400/10 border border-emerald-400/25"
          />
          <StatCard
            label="Today"
            value={`${stats.todayCount} (${formatCurrency(stats.todayRevenue)})`}
            icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}
            color="text-amber-400 bg-amber-400/10 border border-amber-400/25"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8A8F9C]" strokeWidth={1.5} />
          <input
            type="text"
            placeholder="Search by invoice number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-full text-xs bg-[#0E1016] border border-white/[0.08] text-[#F4F5F7] placeholder-[#8A8F9C] focus:border-[#C6FF3D] outline-none transition-all"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3.5 py-2 rounded-full text-xs bg-[#0E1016] border border-white/[0.08] text-[#F4F5F7] outline-none focus:border-[#C6FF3D]"
          title="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3.5 py-2 rounded-full text-xs bg-[#0E1016] border border-white/[0.08] text-[#F4F5F7] outline-none focus:border-[#C6FF3D]"
          title="To date"
        />
        {(dateFrom || dateTo) && (
          <button
            onClick={() => { setDateFrom(''); setDateTo(''); }}
            className="px-3.5 py-2 rounded-full text-xs bg-white/[0.04] text-[#8A8F9C] hover:text-[#F4F5F7] border border-white/[0.08] transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Invoice Table */}
      <div className="rounded-card bg-[#0E1016] border border-white/[0.08] overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C6FF3D] border-t-transparent" />
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <FileText className="h-8 w-8 mx-auto text-[#8A8F9C]" strokeWidth={1.5} />
            <p className="text-sm font-semibold text-[#F4F5F7]">No invoices found</p>
            <p className="text-xs text-[#8A8F9C]">
              Invoices are generated when a table session is settled through Billing & POS
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/[0.08] bg-[#141721] text-left">
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Invoice #</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Date</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Table</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Subtotal</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Tax</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Total</th>
                  <th className="px-5 py-3 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {invoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-white/[0.02] transition-colors cursor-pointer"
                    onClick={() => handleViewDetail(inv.id)}
                  >
                    <td className="px-5 py-3.5">
                      <span className="text-xs font-bold font-mono text-[#C6FF3D]">
                        {inv.invoice_number}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#8A8F9C] font-mono">
                      {formatDate(inv.issued_at)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#F4F5F7] font-mono">
                      {inv.table_sessions?.tables?.table_number || '—'}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#8A8F9C] font-mono">
                      {formatCurrency(inv.subtotal)}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#8A8F9C] font-mono">
                      {formatCurrency(inv.tax_amount)}
                    </td>
                    <td className="px-5 py-3.5 text-xs font-mono font-bold text-[#F4F5F7]">
                      {formatCurrency(inv.total_amount)}
                    </td>
                    <td className="px-5 py-3.5">
                      <Button size="sm" variant="ghost" onClick={(e) => { e.stopPropagation(); handleViewDetail(inv.id); }} className="rounded-full text-xs text-[#8A8F9C] hover:text-[#F4F5F7]">
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
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#C6FF3D] border-t-transparent" />
          </div>
        ) : invoiceDetail ? (
          <div className="space-y-5 print-content">
            {/* Invoice Header */}
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-heading font-bold text-[#F4F5F7]">
                  {venue?.name || 'Restaurant'}
                </h3>
                <p className="text-[11px] text-[#8A8F9C] mt-1">{venue?.address || ''}</p>
                <p className="text-[11px] text-[#8A8F9C]">{venue?.phone || ''}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold font-mono text-[#C6FF3D]">
                  {invoiceDetail.invoice_number}
                </p>
                <p className="text-[11px] font-mono text-[#8A8F9C] mt-1">
                  {formatDateTime(invoiceDetail.issued_at)}
                </p>
                <p className="text-[11px] font-mono text-[#8A8F9C]">
                  Table: {invoiceDetail.table_sessions?.tables?.table_number || '—'}
                </p>
              </div>
            </div>

            <div className="border-t border-dashed border-white/[0.12]" />

            {/* Line Items */}
            <div>
              <table className="w-full">
                <thead>
                  <tr className="text-left">
                    <th className="pb-2 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C]">Item</th>
                    <th className="pb-2 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C] text-center">Qty</th>
                    <th className="pb-2 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C] text-right">Price</th>
                    <th className="pb-2 text-[10px] font-mono font-medium uppercase tracking-wider text-[#8A8F9C] text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {getInvoiceItems().map((item, idx) => (
                    <tr key={item.id || idx}>
                      <td className="py-2 text-xs text-[#F4F5F7] font-medium">{item.item_name}</td>
                      <td className="py-2 text-xs text-center text-[#8A8F9C] font-mono">{item.quantity}</td>
                      <td className="py-2 text-xs text-right text-[#8A8F9C] font-mono">{formatCurrency(item.price_at_order)}</td>
                      <td className="py-2 text-xs text-right font-mono font-semibold text-[#F4F5F7]">
                        {formatCurrency(item.price_at_order * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="border-t border-dashed border-white/[0.12]" />

            {/* Totals */}
            <div className="space-y-1.5 font-mono text-xs">
              <div className="flex justify-between text-[#8A8F9C]">
                <span>Subtotal</span>
                <span>{formatCurrency(invoiceDetail.subtotal)}</span>
              </div>
              {parseFloat(invoiceDetail.discount_amount || 0) > 0 && (
                <div className="flex justify-between text-[#C6FF3D]">
                  <span>Discount</span>
                  <span>-{formatCurrency(invoiceDetail.discount_amount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[#8A8F9C]">
                <span>Tax (GST)</span>
                <span>{formatCurrency(invoiceDetail.tax_amount)}</span>
              </div>
              <div className="border-t border-white/[0.12] pt-2 flex justify-between text-sm font-bold text-[#F4F5F7]">
                <span>Total</span>
                <span className="text-[#C6FF3D]">{formatCurrency(invoiceDetail.total_amount)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => { setDetailModalOpen(false); setInvoiceDetail(null); }} className="flex-1 rounded-full text-[#8A8F9C] hover:text-[#F4F5F7]">
                Close
              </Button>
              <Button onClick={handlePrint} className="flex-1 rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
                <Printer className="h-4 w-4 mr-1.5" strokeWidth={1.5} /> Print Invoice
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-xs text-[#8A8F9C] text-center py-8 font-mono">Invoice not found</p>
        )}
      </Modal>
    </div>
  );
}

// ─── Stat Card Component ──────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div className="p-4 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.18] transition-all">
      <div className="flex items-center justify-between mb-2">
        <span className={`p-2 rounded-xl ${color}`}>{icon}</span>
      </div>
      <p className="text-lg font-heading font-extrabold text-[#F4F5F7] truncate">{value}</p>
      <p className="text-[10px] font-mono uppercase tracking-wider text-[#8A8F9C] mt-0.5">{label}</p>
    </div>
  );
}
