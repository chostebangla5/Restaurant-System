import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/features/shared/auth';
import { getSalesAnalytics, subscribeToOrders } from '@/features/shared/orders/api/ordersApi';
import { formatCurrency } from '@/utils/formatCurrency';
import toast from 'react-hot-toast';
import {
  TrendingUp,
  IndianRupee,
  ShoppingBag,
  XCircle,
  Receipt,
  Download,
  Calendar,
  Clock,
  BarChart3,
  PieChart,
  ArrowUpRight,
  ArrowDownRight,
  Banknote,
  CreditCard,
  Hourglass,
  Sparkles,
  ChevronRight,
  FileText,
  Building2,
  FileSpreadsheet,
  Printer,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

// ── Period options ──────────────────────────────────────────────────
const PERIOD_OPTIONS = [
  { id: 'today', label: "Today's Sales", shortLabel: 'Today' },
  { id: 'yesterday', label: "Yesterday's Sales", shortLabel: 'Yesterday' },
  { id: 'week', label: 'Last 7 Days', shortLabel: '7 Days' },
  { id: 'month', label: 'Monthly Sales', shortLabel: 'Month' },
  { id: 'financial_year', label: 'Financial Year (FY)', shortLabel: 'FY (Apr-Mar)' },
  { id: 'year', label: 'Calendar Year', shortLabel: 'This Year' },
  { id: 'all', label: 'All-Time Sales', shortLabel: 'All Time' },
  { id: 'custom', label: 'Custom Range', shortLabel: 'Custom Date' },
];

function formatHour(h) {
  if (h === 0) return '12 AM';
  if (h === 12) return '12 PM';
  return h < 12 ? `${h} AM` : `${h - 12} PM`;
}

function formatDateShort(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateFull(dateStr) {
  if (!dateStr) return '--';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

// ── PDF-Ready Official GST Sales & Tax Statement ───────────────────
function generateSalesStatementHTML(data, venueName, gstin) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
  const timeStr = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  const periodLabel =
    PERIOD_OPTIONS.find((p) => p.id === data.period)?.label || data.period;

  const rangeStart = data.dateRange.start
    ? new Date(data.dateRange.start).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : 'Inception';
  const rangeEnd = data.dateRange.end
    ? new Date(data.dateRange.end).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      })
    : dateStr;

  const fc = (v) => {
    const num = Number(v) || 0;
    return `₹${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  let topItemsRows = '';
  (data.topItems || []).forEach((it, i) => {
    topItemsRows += `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${i + 1}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${it.name}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${it.qty}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${fc(it.revenue)}</td>
      </tr>`;
  });

  let dailyRows = '';
  (data.dailyRevenue || []).forEach((day) => {
    dailyRows += `
      <tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;">${formatDateFull(day.date)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${day.totalOrders || day.orders}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;">${day.completedOrders || 0}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:center;color:#d32f2f;">${day.cancelledOrders || 0}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${fc(day.grossRevenue || day.revenue)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;">${fc(day.gstAmount || 0)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${fc(day.netRevenue || day.revenue)}</td>
      </tr>`;
  });

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <title>Sales Statement - ${venueName}</title>
      <style>
        @media print {
          body { margin: 0; padding: 15px; }
          .no-print { display: none !important; }
        }
        body { font-family: 'Segoe UI', system-ui, -apple-system, sans-serif; color: #1a1a2e; max-width: 820px; margin: 0 auto; padding: 25px; line-height: 1.45; }
        .header { text-align: center; border-bottom: 3px solid #1a1a2e; padding-bottom: 16px; margin-bottom: 20px; }
        .header h1 { margin: 0; font-size: 24px; letter-spacing: 0.5px; text-transform: uppercase; }
        .header p { margin: 3px 0; font-size: 11px; color: #555; }
        .gstin-badge { display: inline-block; font-family: monospace; font-size: 12px; background: #eee; padding: 3px 8px; border-radius: 4px; font-weight: 600; margin: 4px 0; }
        .meta { display: flex; justify-content: space-between; margin-bottom: 20px; font-size: 11px; color: #444; background: #fafafa; padding: 10px 14px; border-radius: 6px; border: 1px solid #eee; }
        .section { margin-bottom: 22px; }
        .section h2 { font-size: 13px; text-transform: uppercase; letter-spacing: 0.8px; color: #1a1a2e; border-bottom: 2px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; font-weight: 700; }
        .summary-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .summary-item { display: flex; justify-content: space-between; padding: 7px 12px; background: #f8f9fa; border-radius: 5px; font-size: 12px; }
        .summary-item .label { color: #555; }
        .summary-item .value { font-weight: 600; }
        .highlight { background: #e8f5e9 !important; }
        .gst-row { background: #fff8e1 !important; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px; }
        th { background: #1a1a2e; color: white; padding: 7px 9px; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; }
        .print-btn-bar { text-align: right; margin-bottom: 15px; }
        .btn { background: #1a1a2e; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; font-size: 12px; }
        .footer { text-align: center; margin-top: 25px; padding-top: 15px; border-top: 2px solid #1a1a2e; font-size: 9.5px; color: #666; line-height: 1.5; }
      </style>
    </head>
    <body>
      <div class="print-btn-bar no-print">
        <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
      </div>

      <div class="header">
        <h1>${venueName || 'Restaurant'}</h1>
        <div class="gstin-badge">GSTIN: ${gstin || '19AAACC1206D1ZM'}</div>
        <p>SAC Code: <strong>996331</strong> (Restaurant and Food Takeaway Services)</p>
        <p><strong>OFFICIAL SALES & TAX SUMMARY STATEMENT</strong></p>
      </div>
      
      <div class="meta">
        <div>
          <strong>Statement Period:</strong> ${periodLabel}<br/>
          <strong>Effective Range:</strong> ${rangeStart} — ${rangeEnd}
        </div>
        <div style="text-align:right;">
          <strong>Generated Date:</strong> ${dateStr}<br/>
          <strong>Time of Generation:</strong> ${timeStr} IST
        </div>
      </div>

      <div class="section">
        <h2>1. Revenue & Tax Computation (Indian GST Regulations)</h2>
        <div class="summary-grid">
          <div class="summary-item highlight">
            <span class="label">Gross Taxable Revenue (Base Sales)</span>
            <span class="value">${fc(data.grossRevenue)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Discounts & Offers Applied</span>
            <span class="value" style="color:#d32f2f;">-${fc(data.totalDiscount)}</span>
          </div>
          <div class="summary-item gst-row">
            <span class="label">CGST @ ${data.gst.rate / 2}%</span>
            <span class="value">${fc(data.gst.cgst)}</span>
          </div>
          <div class="summary-item gst-row">
            <span class="label">SGST @ ${data.gst.rate / 2}%</span>
            <span class="value">${fc(data.gst.sgst)}</span>
          </div>
          <div class="summary-item" style="background:#c8e6c9;font-size:14px;border:1px solid #81c784;">
            <span class="label" style="font-weight:700;">NET REVENUE (Tax Paid Collection)</span>
            <span class="value" style="font-size:15px;font-weight:700;">${fc(data.netRevenue)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Total GST Tax Liability (5%)</span>
            <span class="value">${fc(data.gst.total)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>2. Order Statistics & Performance</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Total Orders Placed</span>
            <span class="value">${data.totalOrders}</span>
          </div>
          <div class="summary-item">
            <span class="label">Orders Completed & Served</span>
            <span class="value">${data.completedOrders}</span>
          </div>
          <div class="summary-item">
            <span class="label">Orders Cancelled / Void</span>
            <span class="value" style="color:#d32f2f;">${data.cancelledOrders}</span>
          </div>
          <div class="summary-item">
            <span class="label">Average Order Value (AOV)</span>
            <span class="value">${fc(data.avgOrderValue)}</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>3. Payment Mode Settlement Summary</h2>
        <div class="summary-grid">
          <div class="summary-item">
            <span class="label">Cash / Counter Collection (${data.paymentSplitCount.cash} bills)</span>
            <span class="value">${fc(data.paymentSplit.cash)}</span>
          </div>
          <div class="summary-item">
            <span class="label">UPI / Card / Online (${data.paymentSplitCount.online} bills)</span>
            <span class="value">${fc(data.paymentSplit.online)}</span>
          </div>
          <div class="summary-item">
            <span class="label">Pending Table Settlement (${data.paymentSplitCount.pending} bills)</span>
            <span class="value" style="color:#e65100;">${fc(data.paymentSplit.pending)}</span>
          </div>
        </div>
      </div>

      ${
        dailyRows
          ? `
      <div class="section">
        <h2>4. Date-Wise Daily Sales Ledger</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th style="text-align:center;">Total Bills</th>
              <th style="text-align:center;">Served</th>
              <th style="text-align:center;">Cancelled</th>
              <th style="text-align:right;">Taxable Sales</th>
              <th style="text-align:right;">GST (5%)</th>
              <th style="text-align:right;">Net Collection</th>
            </tr>
          </thead>
          <tbody>
            ${dailyRows}
          </tbody>
        </table>
      </div>`
          : ''
      }

      ${
        data.topItems && data.topItems.length > 0
          ? `
      <div class="section">
        <h2>5. Top Selling Items</h2>
        <table>
          <thead>
            <tr>
              <th style="text-align:center;width:40px;">#</th>
              <th>Item Name</th>
              <th style="text-align:center;width:70px;">Qty Sold</th>
              <th style="text-align:right;width:110px;">Total Revenue</th>
            </tr>
          </thead>
          <tbody>
            ${topItemsRows}
          </tbody>
        </table>
      </div>`
          : ''
      }

      <div class="footer">
        <p>Tax rates applied under GST Notification No. 11/2017-Central Tax (Rate) as amended: 5% GST (2.5% CGST + 2.5% SGST) without ITC for Standalone Restaurant Services.</p>
        <p>Amounts rounded off to nearest Rupee as per Section 170 of the Central Goods and Services Tax Act, 2017.</p>
        <p>This is an automated system generated statement &bull; TableSuite POS &bull; CONFIDENTIAL AUDIT RECORD</p>
      </div>
    </body>
    </html>
  `;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT: StaffSalesScreen
// ═══════════════════════════════════════════════════════════════════════
export function StaffSalesScreen() {
  const { venueId, venue } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const urlPeriod = searchParams.get('period');

  const [activePeriod, setActivePeriod] = useState(urlPeriod || 'today');
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return new Date(Date.now() + istOffset).toISOString().slice(0, 7); // 'YYYY-MM'
  });
  const [selectedYear, setSelectedYear] = useState(() => {
    const istOffset = 5.5 * 60 * 60 * 1000;
    return String(new Date(Date.now() + istOffset).getUTCFullYear());
  });
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [salesData, setSalesData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isDownloading, setIsDownloading] = useState(false);
  const containerRef = useRef(null);

  // Sync with URL query parameter
  useEffect(() => {
    if (urlPeriod && urlPeriod !== activePeriod) {
      setActivePeriod(urlPeriod);
    }
  }, [urlPeriod]);

  // ── Load sales data ───────────────────────────────────────────────
  const loadSalesData = useCallback(async () => {
    if (!venueId) return;
    setIsLoading(true);
    try {
      let customParam1 = null;
      let customParam2 = null;

      if (activePeriod === 'month') {
        customParam1 = selectedMonth; // e.g. '2026-09'
      } else if (activePeriod === 'year') {
        customParam1 = selectedYear; // e.g. '2026'
      } else if (activePeriod === 'custom') {
        customParam1 = customStart;
        customParam2 = customEnd;
      }

      const data = await getSalesAnalytics(
        venueId,
        activePeriod,
        customParam1,
        customParam2
      );
      if (data) {
        setSalesData(data);
      }
    } catch (err) {
      console.error('Failed to load sales data:', err);
      toast.error('Failed to load sales analytics');
    } finally {
      setIsLoading(false);
    }
  }, [venueId, activePeriod, selectedMonth, selectedYear, customStart, customEnd]);

  useEffect(() => {
    loadSalesData();
  }, [loadSalesData]);

  // Real-time synchronization on any order update
  useEffect(() => {
    const unsubscribe = subscribeToOrders(() => {
      loadSalesData();
    });
    return () => unsubscribe();
  }, [loadSalesData]);

  // ── Period change handler ─────────────────────────────────────────
  const handlePeriodChange = (periodId) => {
    setActivePeriod(periodId);
    setSearchParams({ period: periodId }, { replace: true });
  };

  // ── Download Print / PDF Statement ────────────────────────────────
  const handleDownloadStatement = () => {
    if (!salesData) return;
    setIsDownloading(true);

    try {
      const html = generateSalesStatementHTML(
        salesData,
        venue?.name || 'TableSuite Dining Venue',
        venue?.gstin || '19AAACC1206D1ZM'
      );

      const printWindow = window.open('', '_blank', 'width=950,height=750');
      if (printWindow) {
        printWindow.document.write(html);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
        }, 500);
      } else {
        toast.error('Pop-up blocked! Please allow pop-ups for this site to print statements.');
      }
    } catch (err) {
      console.error('Print statement error:', err);
      toast.error('Failed to generate statement');
    } finally {
      setIsDownloading(false);
    }
  };

  // ── Download CSV / Excel Audit Statement ──────────────────────────
  const handleDownloadCSV = () => {
    if (!salesData) return;
    try {
      const headers = [
        'Order ID',
        'Date (IST)',
        'Time (IST)',
        'Table',
        'Round',
        'Status',
        'Items Count',
        'Items Description',
        'Subtotal (₹)',
        'CGST 2.5% (₹)',
        'SGST 2.5% (₹)',
        'GST Total 5% (₹)',
        'Net Total (₹)',
        'Payment Mode',
      ];

      // Sanitize fields against CSV injection (=, +, -, @)
      const sanitizeCSV = (val) => {
        let str = String(val ?? '');
        if (/^[=+\-@\t\r]/.test(str)) {
          str = `'${str}`; // Prefix with single quote to disable formula execution
        }
        return `"${str.replace(/"/g, '""')}"`;
      };

      const rows = (salesData.exportOrders || []).map((o) => [
        sanitizeCSV(o.id),
        sanitizeCSV(o.date),
        sanitizeCSV(o.time),
        sanitizeCSV(o.table),
        sanitizeCSV(o.round),
        sanitizeCSV(o.status),
        sanitizeCSV(o.itemsCount),
        sanitizeCSV(o.itemsSummary),
        sanitizeCSV(o.subtotal.toFixed(2)),
        sanitizeCSV(o.cgst.toFixed(2)),
        sanitizeCSV(o.sgst.toFixed(2)),
        sanitizeCSV(o.gstTotal.toFixed(2)),
        sanitizeCSV(o.netTotal.toFixed(2)),
        sanitizeCSV(o.paymentMode),
      ]);

      const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `Sales_Statement_${activePeriod}_${new Date().toISOString().slice(0, 10)}.csv`
      );
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success('Sales CSV audit statement downloaded successfully!');
    } catch (err) {
      console.error('CSV export failed:', err);
      toast.error('Failed to export CSV statement');
    }
  };

  // ── Computed chart values ─────────────────────────────────────────
  const maxHourlyRevenue = salesData?.hourlyRevenue?.length
    ? Math.max(...salesData.hourlyRevenue.map((h) => h.revenue))
    : 0;

  const maxDailyRevenue = salesData?.dailyRevenue?.length
    ? Math.max(...salesData.dailyRevenue.map((d) => d.revenue))
    : 0;

  const totalPayments =
    (salesData?.paymentSplit?.cash || 0) +
    (salesData?.paymentSplit?.online || 0) +
    (salesData?.paymentSplit?.pending || 0);

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" ref={containerRef}>
      {/* ── Top Header Banner ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0E1016] p-5 sm:p-7 rounded-2xl border border-white/[0.08] relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/[0.04] via-transparent to-amber-500/[0.03] pointer-events-none" />

        <div className="space-y-1.5 relative z-10">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="font-mono text-[11px] font-medium uppercase tracking-wider text-[#8A8F9C]">
              {venue?.name || 'TableSuite'} • Sales & GST Statement Board
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-heading font-extrabold tracking-tight text-[#F4F5F7]">
            Restaurant Sales & Revenue Board
          </h1>
          <p className="text-xs text-[#8A8F9C] max-w-xl leading-relaxed">
            Real-time daily, monthly & yearly sales tracking. Indian GST compliant (5% rate, SAC 996331) with instant statement exports.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 relative z-10 shrink-0">
          <button
            type="button"
            onClick={handleDownloadCSV}
            disabled={!salesData || (salesData.exportOrders || []).length === 0}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-[#F4F5F7] border border-white/[0.12] font-semibold text-xs transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            title="Download CSV for Excel / Tally / CA Audit"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-400" strokeWidth={1.5} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handleDownloadStatement}
            disabled={isDownloading || !salesData}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#C6FF3D] text-[#07080B] font-semibold text-xs hover:bg-[#b8f52e] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-[#C6FF3D]/10"
            title="Download / Print GST Tax Statement"
          >
            <Printer className="h-4 w-4" strokeWidth={2} />
            {isDownloading ? 'Generating...' : 'Download Statement'}
          </button>
        </div>
      </div>

      {/* ── Period Selector Navigation ────────────────────────────── */}
      <div className="flex flex-col gap-3 p-3 rounded-2xl bg-[#0E1016] border border-white/[0.08]">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono text-[#8A8F9C] uppercase tracking-wider mr-1.5 flex items-center gap-1">
            <Calendar className="h-3.5 w-3.5" /> View Sales:
          </span>
          {PERIOD_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => handlePeriodChange(opt.id)}
              className={`px-3.5 py-1.5 min-h-[34px] rounded-xl text-xs font-medium touch-manipulation transition-all flex items-center justify-center ${
                activePeriod === opt.id
                  ? 'bg-[#C6FF3D] text-[#07080B] font-semibold shadow-sm shadow-[#C6FF3D]/20'
                  : 'bg-white/[0.03] text-[#8A8F9C] hover:text-[#F4F5F7] border border-white/[0.06] hover:border-white/[0.14]'
              }`}
            >
              {opt.shortLabel}
            </button>
          ))}
        </div>

        {/* ── Sub-pickers for Month, Year, and Custom ──────────────── */}
        {activePeriod === 'month' && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
            <span className="text-xs text-[#8A8F9C]">Select Month:</span>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#141721] border border-white/[0.12] text-xs text-[#F4F5F7] font-mono outline-none focus:border-[#C6FF3D]/50"
            />
          </div>
        )}

        {activePeriod === 'year' && (
          <div className="flex items-center gap-2 pt-2 border-t border-white/[0.06]">
            <span className="text-xs text-[#8A8F9C]">Select Year:</span>
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-1.5 rounded-lg bg-[#141721] border border-white/[0.12] text-xs text-[#F4F5F7] font-mono outline-none focus:border-[#C6FF3D]/50"
            >
              {['2024', '2025', '2026', '2027'].map((yr) => (
                <option key={yr} value={yr}>
                  {yr}
                </option>
              ))}
            </select>
          </div>
        )}

        {activePeriod === 'custom' && (
          <div className="flex flex-wrap items-end gap-3 pt-2 border-t border-white/[0.06]">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-[#8A8F9C] uppercase tracking-wider">
                Start Date
              </label>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#141721] border border-white/[0.12] text-xs text-[#F4F5F7] font-mono outline-none"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-mono text-[#8A8F9C] uppercase tracking-wider">
                End Date
              </label>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-[#141721] border border-white/[0.12] text-xs text-[#F4F5F7] font-mono outline-none"
              />
            </div>
            <button
              type="button"
              onClick={loadSalesData}
              disabled={!customStart || !customEnd}
              className="px-4 py-1.5 rounded-lg bg-[#C6FF3D] text-[#07080B] text-xs font-semibold hover:bg-[#b8f52e] transition-all disabled:opacity-40"
            >
              Apply Filter
            </button>
          </div>
        )}
      </div>

      {/* ── Loading Skeleton ─────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="h-32 rounded-2xl bg-[#0E1016] border border-white/[0.08] animate-pulse"
            />
          ))}
        </div>
      ) : salesData ? (
        <>
          {/* ── Core KPI Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Gross Revenue */}
            <div className="relative p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08] overflow-hidden group hover:border-emerald-500/30 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-emerald-500/10 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center">
                  <IndianRupee className="h-5 w-5 text-emerald-400" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-mono font-medium text-[#8A8F9C] uppercase tracking-wider">
                  Taxable Gross Sales
                </span>
              </div>
              <div className="font-mono font-extrabold text-2xl text-[#F4F5F7] tracking-tight">
                {formatCurrency(salesData.grossRevenue)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <ArrowUpRight className="h-3 w-3 text-emerald-400" strokeWidth={2} />
                <span className="text-[10px] font-mono text-emerald-400">
                  {salesData.completedOrders} orders served
                </span>
              </div>
            </div>

            {/* Net Revenue (with GST) */}
            <div className="relative p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08] overflow-hidden group hover:border-[#C6FF3D]/30 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#C6FF3D]/10 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-[#C6FF3D]/10 border border-[#C6FF3D]/25 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[#C6FF3D]" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-mono font-medium text-[#8A8F9C] uppercase tracking-wider">
                  Net Collection (Incl. GST)
                </span>
              </div>
              <div className="font-mono font-extrabold text-2xl text-[#C6FF3D] tracking-tight">
                {formatCurrency(salesData.netRevenue)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-mono text-[#8A8F9C]">
                  GST: {formatCurrency(salesData.gst.total)} (5% composite)
                </span>
              </div>
            </div>

            {/* Total Orders */}
            <div className="relative p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08] overflow-hidden group hover:border-sky-500/30 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-sky-500/10 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-sky-500/10 border border-sky-500/25 flex items-center justify-center">
                  <ShoppingBag className="h-5 w-5 text-sky-400" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-mono font-medium text-[#8A8F9C] uppercase tracking-wider">
                  Total Orders
                </span>
              </div>
              <div className="font-mono font-extrabold text-2xl text-[#F4F5F7] tracking-tight">
                {salesData.totalOrders}
              </div>
              <div className="flex items-center gap-1 mt-1">
                {salesData.cancelledOrders > 0 ? (
                  <>
                    <ArrowDownRight className="h-3 w-3 text-red-400" strokeWidth={2} />
                    <span className="text-[10px] font-mono text-red-400">
                      {salesData.cancelledOrders} cancelled
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> 0 cancellations
                  </span>
                )}
              </div>
            </div>

            {/* Avg Order Value */}
            <div className="relative p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08] overflow-hidden group hover:border-amber-500/30 transition-all">
              <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-amber-500/10 to-transparent rounded-bl-full" />
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center">
                  <Receipt className="h-5 w-5 text-amber-400" strokeWidth={1.5} />
                </div>
                <span className="text-[10px] font-mono font-medium text-[#8A8F9C] uppercase tracking-wider">
                  Avg. Order Value (AOV)
                </span>
              </div>
              <div className="font-mono font-extrabold text-2xl text-[#F4F5F7] tracking-tight">
                {formatCurrency(salesData.avgOrderValue)}
              </div>
              <div className="flex items-center gap-1 mt-1">
                <span className="text-[10px] font-mono text-[#8A8F9C]">
                  Per dining table check
                </span>
              </div>
            </div>
          </div>

          {/* ── GST Breakdown & Payment Split Cards ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* GST Card */}
            <div className="p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-4">
                <Building2 className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider">
                  Indian GST Audit
                </h3>
                <span className="ml-auto text-[9px] font-mono text-amber-400 px-2 py-0.5 bg-amber-500/10 rounded-full border border-amber-500/25">
                  SAC 996331
                </span>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#141721] border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-orange-400" />
                    <span className="text-xs text-[#8A8F9C]">Central GST (CGST 2.5%)</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-[#F4F5F7]">
                    {formatCurrency(salesData.gst.cgst)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-[#141721] border border-white/[0.06]">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-blue-400" />
                    <span className="text-xs text-[#8A8F9C]">State GST (SGST 2.5%)</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-[#F4F5F7]">
                    {formatCurrency(salesData.gst.sgst)}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                    <span className="text-xs font-semibold text-emerald-400">Total Tax Liability (5%)</span>
                  </div>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    {formatCurrency(salesData.gst.total)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payment Method Split */}
            <div className="p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-4">
                <PieChart className="h-4 w-4 text-sky-400" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider">
                  Payment Mode Distribution
                </h3>
              </div>
              <div className="space-y-3">
                {/* Cash */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Banknote className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                      <span className="text-xs text-[#8A8F9C]">Cash Counter</span>
                      <span className="text-[9px] font-mono text-[#8A8F9C]">
                        ({salesData.paymentSplitCount.cash})
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#F4F5F7]">
                      {formatCurrency(salesData.paymentSplit.cash)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#141721] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                      style={{
                        width: `${totalPayments > 0 ? (salesData.paymentSplit.cash / totalPayments) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Online / UPI */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <CreditCard className="h-3.5 w-3.5 text-sky-400" strokeWidth={1.5} />
                      <span className="text-xs text-[#8A8F9C]">UPI / Online / QR</span>
                      <span className="text-[9px] font-mono text-[#8A8F9C]">
                        ({salesData.paymentSplitCount.online})
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-[#F4F5F7]">
                      {formatCurrency(salesData.paymentSplit.online)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#141721] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400 transition-all duration-700"
                      style={{
                        width: `${totalPayments > 0 ? (salesData.paymentSplit.online / totalPayments) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Pending */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <Hourglass className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
                      <span className="text-xs text-[#8A8F9C]">Pending Bills</span>
                      <span className="text-[9px] font-mono text-[#8A8F9C]">
                        ({salesData.paymentSplitCount.pending})
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-amber-400">
                      {formatCurrency(salesData.paymentSplit.pending)}
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-[#141721] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-700"
                      style={{
                        width: `${totalPayments > 0 ? (salesData.paymentSplit.pending / totalPayments) * 100 : 0}%`,
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Financial Summary */}
            <div className="p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-4">
                <FileText className="h-4 w-4 text-violet-400" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider">
                  Statement Summary
                </h3>
              </div>
              <div className="space-y-2.5">
                <div className="flex justify-between p-2.5 rounded-lg bg-[#141721]">
                  <span className="text-xs text-[#8A8F9C]">Taxable Base Sales</span>
                  <span className="text-xs font-mono font-bold text-[#F4F5F7]">
                    {formatCurrency(salesData.grossRevenue)}
                  </span>
                </div>
                <div className="flex justify-between p-2.5 rounded-lg bg-[#141721]">
                  <span className="text-xs text-[#8A8F9C]">+ GST (5%)</span>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    +{formatCurrency(salesData.gst.total)}
                  </span>
                </div>
                {salesData.totalDiscount > 0 && (
                  <div className="flex justify-between p-2.5 rounded-lg bg-red-500/5 border border-red-500/10">
                    <span className="text-xs text-red-400">- Discounts / Coupons</span>
                    <span className="text-xs font-mono font-bold text-red-400">
                      -{formatCurrency(salesData.totalDiscount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between p-3 rounded-lg bg-[#C6FF3D]/5 border border-[#C6FF3D]/20">
                  <span className="text-xs font-bold text-[#C6FF3D]">
                    NET TOTAL COLLECTION
                  </span>
                  <span className="text-sm font-mono font-extrabold text-[#C6FF3D]">
                    {formatCurrency(salesData.netRevenue)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Date-Wise Daily Sales Ledger Table (MANDATORY REQUIREMENT) ── */}
          <div className="p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#C6FF3D]" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider">
                  Date-Wise Daily Sales Ledger & Audit Store
                </h3>
              </div>
              <span className="text-[10px] font-mono text-[#8A8F9C]">
                {salesData.dailyRevenue.length} day{salesData.dailyRevenue.length === 1 ? '' : 's'} recorded in this period
              </span>
            </div>

            <div className="rounded-xl border border-white/[0.08] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#141721] border-b border-white/[0.08] text-[#8A8F9C] font-mono font-medium uppercase tracking-wider text-[10px]">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3 text-center">Total Bills</th>
                      <th className="px-4 py-3 text-center">Served</th>
                      <th className="px-4 py-3 text-center">Cancelled</th>
                      <th className="px-4 py-3 text-right">Taxable Gross</th>
                      <th className="px-4 py-3 text-right">CGST (2.5%)</th>
                      <th className="px-4 py-3 text-right">SGST (2.5%)</th>
                      <th className="px-4 py-3 text-right">Net Sales</th>
                      <th className="px-4 py-3 text-right">Cash / UPI Split</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06] font-medium font-mono text-xs">
                    {salesData.dailyRevenue.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="px-4 py-8 text-center text-[#8A8F9C]">
                          No sales recorded in the selected period.
                        </td>
                      </tr>
                    ) : (
                      salesData.dailyRevenue.map((d) => (
                        <tr key={d.date} className="hover:bg-white/[0.02] transition-colors">
                          <td className="px-4 py-3 font-sans font-semibold text-[#F4F5F7] whitespace-nowrap">
                            {formatDateFull(d.date)}
                          </td>
                          <td className="px-4 py-3 text-center text-[#F4F5F7]">
                            {d.totalOrders}
                          </td>
                          <td className="px-4 py-3 text-center text-emerald-400">
                            {d.completedOrders}
                          </td>
                          <td className="px-4 py-3 text-center">
                            {d.cancelledOrders > 0 ? (
                              <span className="text-red-400 font-bold">{d.cancelledOrders}</span>
                            ) : (
                              <span className="text-[#8A8F9C]">0</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-[#F4F5F7]">
                            {formatCurrency(d.grossRevenue)}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-300/80">
                            {formatCurrency(d.cgst)}
                          </td>
                          <td className="px-4 py-3 text-right text-amber-300/80">
                            {formatCurrency(d.sgst)}
                          </td>
                          <td className="px-4 py-3 text-right text-[#C6FF3D] font-bold text-sm">
                            {formatCurrency(d.netRevenue)}
                          </td>
                          <td className="px-4 py-3 text-right text-[10px] text-[#8A8F9C]">
                            ₹{Math.round(d.cashRevenue)} / ₹{Math.round(d.onlineRevenue)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Revenue Chart & Top Items ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Chart */}
            <div className="p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-[#C6FF3D]" strokeWidth={1.5} />
                  <h3 className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider">
                    {activePeriod === 'today' || activePeriod === 'yesterday'
                      ? 'Hourly Revenue Distribution'
                      : 'Daily Revenue Distribution'}
                  </h3>
                </div>
                <Clock className="h-3.5 w-3.5 text-[#8A8F9C]" strokeWidth={1.5} />
              </div>

              {activePeriod === 'today' || activePeriod === 'yesterday' ? (
                <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
                  {salesData.hourlyRevenue.length === 0 ? (
                    <p className="text-xs text-[#8A8F9C] text-center py-8">
                      No hourly sales recorded
                    </p>
                  ) : (
                    salesData.hourlyRevenue.map((h) => (
                      <div key={h.hour} className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[#8A8F9C] w-12 shrink-0 text-right">
                          {formatHour(h.hour)}
                        </span>
                        <div className="flex-1 h-6 rounded-md bg-[#141721] overflow-hidden relative">
                          <div
                            className="h-full rounded-md bg-gradient-to-r from-[#C6FF3D]/80 to-[#C6FF3D]/40 transition-all duration-500"
                            style={{
                              width: `${maxHourlyRevenue > 0 ? (h.revenue / maxHourlyRevenue) * 100 : 0}%`,
                              minWidth: h.revenue > 0 ? '4px' : '0',
                            }}
                          />
                          {h.revenue > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-[#F4F5F7]">
                              {formatCurrency(h.revenue)}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-[#8A8F9C] w-8 shrink-0">
                          {h.orders}x
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                <div className="space-y-1.5 max-h-72 overflow-y-auto no-scrollbar">
                  {salesData.dailyRevenue.length === 0 ? (
                    <p className="text-xs text-[#8A8F9C] text-center py-8">
                      No sales data available
                    </p>
                  ) : (
                    [...salesData.dailyRevenue].reverse().map((d) => (
                      <div key={d.date} className="flex items-center gap-3">
                        <span className="text-[10px] font-mono text-[#8A8F9C] w-14 shrink-0 text-right">
                          {formatDateShort(d.date)}
                        </span>
                        <div className="flex-1 h-6 rounded-md bg-[#141721] overflow-hidden relative">
                          <div
                            className="h-full rounded-md bg-gradient-to-r from-sky-500/80 to-sky-400/40 transition-all duration-500"
                            style={{
                              width: `${maxDailyRevenue > 0 ? (d.revenue / maxDailyRevenue) * 100 : 0}%`,
                              minWidth: d.revenue > 0 ? '4px' : '0',
                            }}
                          />
                          {d.revenue > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-mono font-bold text-[#F4F5F7]">
                              {formatCurrency(d.revenue)}
                            </span>
                          )}
                        </div>
                        <span className="text-[9px] font-mono text-[#8A8F9C] w-8 shrink-0">
                          {d.orders}x
                        </span>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* Top Items */}
            <div className="p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                  <h3 className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider">
                    Top 10 Selling Items
                  </h3>
                </div>
                <span className="text-[9px] font-mono text-[#8A8F9C]">
                  By Revenue
                </span>
              </div>

              {salesData.topItems.length === 0 ? (
                <p className="text-xs text-[#8A8F9C] text-center py-8">
                  No items sold in this period
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto no-scrollbar">
                  {salesData.topItems.map((item, idx) => {
                    const maxItemRevenue = salesData.topItems[0]?.revenue || 1;
                    return (
                      <div
                        key={item.name}
                        className="flex items-center gap-3 p-2.5 rounded-xl bg-[#141721] border border-white/[0.06] hover:border-white/[0.12] transition-all"
                      >
                        <span
                          className={`h-7 w-7 rounded-lg flex items-center justify-center font-mono font-bold text-[10px] shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              : idx === 1
                                ? 'bg-slate-400/15 text-slate-300 border border-slate-400/30'
                                : idx === 2
                                  ? 'bg-orange-600/15 text-orange-400 border border-orange-600/30'
                                  : 'bg-white/[0.04] text-[#8A8F9C] border border-white/[0.08]'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-[#F4F5F7] truncate">
                              {item.name}
                            </span>
                            <span className="text-xs font-mono font-bold text-[#C6FF3D] shrink-0 ml-2">
                              {formatCurrency(item.revenue)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex-1 h-1.5 rounded-full bg-[#0E1016] overflow-hidden">
                              <div
                                className="h-full rounded-full bg-gradient-to-r from-[#C6FF3D]/60 to-[#C6FF3D]/30 transition-all duration-500"
                                style={{
                                  width: `${(item.revenue / maxItemRevenue) * 100}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] font-mono text-[#8A8F9C] shrink-0">
                              {item.qty} sold
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Table Performance ─────────────────────────────────── */}
          {salesData.tablePerformance.length > 0 && (
            <div className="p-5 rounded-2xl bg-[#0E1016] border border-white/[0.08]">
              <div className="flex items-center gap-2 mb-4">
                <Calendar className="h-4 w-4 text-sky-400" strokeWidth={1.5} />
                <h3 className="text-xs font-semibold text-[#F4F5F7] uppercase tracking-wider">
                  Table-wise Revenue Performance
                </h3>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {salesData.tablePerformance.map((t) => {
                  const maxTableRev = salesData.tablePerformance[0]?.revenue || 1;
                  const pct = Math.round((t.revenue / maxTableRev) * 100);
                  return (
                    <div
                      key={t.table}
                      className="p-3 rounded-xl bg-[#141721] border border-white/[0.06] text-center hover:border-sky-500/30 transition-all"
                    >
                      <div className="h-10 w-10 mx-auto rounded-full bg-sky-500/10 border border-sky-500/25 flex items-center justify-center text-sky-400 font-mono font-bold text-sm mb-2">
                        T-{t.table}
                      </div>
                      <div className="text-sm font-mono font-bold text-[#F4F5F7]">
                        {formatCurrency(t.revenue)}
                      </div>
                      <div className="text-[9px] font-mono text-[#8A8F9C] mt-0.5">
                        {t.orders} orders
                      </div>
                      <div className="h-1 mt-2 rounded-full bg-[#0E1016] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-400"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── Compliance Footer ────────────────────────────────── */}
          <div className="p-4 rounded-xl bg-[#0E1016]/50 border border-white/[0.05] text-center space-y-1">
            <p className="text-[10px] font-mono text-[#8A8F9C] leading-relaxed">
              GST computed at standard 5% (CGST 2.5% + SGST 2.5%) as per Indian GST Council guidelines for standalone restaurant services (without Input Tax Credit / ITC).
            </p>
            <p className="text-[10px] font-mono text-[#8A8F9C]">
              Tax and rounding off compliant with Section 170 of the CGST Act, 2017. All dates and cutoffs calculated under Indian Standard Time (IST, UTC+05:30).
            </p>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-40">
          <p className="text-sm text-[#8A8F9C]">
            Failed to load analytics. Please try again.
          </p>
        </div>
      )}
    </div>
  );
}
