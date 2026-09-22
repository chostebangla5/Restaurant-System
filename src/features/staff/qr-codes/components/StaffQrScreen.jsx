import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/shared/auth';
import { fetchTables } from '@/features/staff/tables/api/tablesApi';
import {
  QrCodeIcon,
  PrinterIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

export function StaffQrScreen() {
  const { venueId, venue } = useAuth();
  const [tables, setTables] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadTables() {
      try {
        setIsLoading(true);
        const list = await fetchTables(venueId);
        setTables(list);
      } catch (err) {
        console.error('Failed to load tables for QR generator:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadTables();
  }, [venueId]);

  const venueName = venue?.name || 'TableSuite Restaurant';

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 dark:text-white">QR Code Generator & Print Studio</h2>
          <p className="text-xs text-stone-500">Design and print live branded table acrylic standees & stickers</p>
        </div>
        {tables.length > 0 && (
          <Button size="sm" onClick={handlePrint} className="gap-2">
            <PrinterIcon className="h-4 w-4" /> Print All QR Standees
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs font-semibold text-stone-400">
          Loading restaurant QR codes...
        </div>
      ) : tables.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <EmptyState
            icon={QrCodeIcon}
            title="No Tables Available for QR Generation"
            description="You haven't set up any dining tables yet. Add tables in Floor & Table Management to generate unique QR codes."
            actionLabel="Go to Floor Management"
            onAction={() => {}}
          />
          <div className="text-center mt-4">
            <Link to="/staff/tables">
              <Button size="md">+ Set Up Tables First</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 print:grid-cols-2">
          {tables.map((tbl) => {
            const tableUrl = `${window.location.origin}/t/${tbl.code}`;
            return (
              <div
                key={tbl.code}
                className="p-6 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800 shadow-lg text-center space-y-4 print:border-stone-300 print:shadow-none"
              >
                <div className="text-sm font-black text-brand-primary uppercase tracking-wider truncate">
                  {venueName}
                </div>
                <div className="inline-block p-4 rounded-2xl bg-white shadow-inner border border-stone-100">
                  <QRCodeSVG
                    value={tableUrl}
                    size={160}
                    level="H"
                    includeMargin
                  />
                </div>
                <div>
                  <div className="text-xl font-black text-stone-900 dark:text-white">
                    Table T-{tbl.number}
                  </div>
                  <p className="text-xs text-stone-400 mt-1">Scan QR code to order & pay</p>
                  <p className="text-[10px] font-mono text-stone-400 mt-0.5">Code: {tbl.code}</p>
                </div>

                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 print:hidden flex items-center justify-center">
                  <a
                    href={tableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-bold text-brand-primary hover:underline flex items-center gap-1"
                  >
                    Test Guest Link <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
