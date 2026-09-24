import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useAuth } from '@/features/shared/auth';
import { fetchTables } from '@/features/staff/tables/api/tablesApi';
import {
  QrCode,
  Printer,
  ExternalLink,
} from 'lucide-react';

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
          <h2 className="text-xl sm:text-2xl font-heading font-bold text-[#F4F5F7]">QR Code Generator & Print Studio</h2>
          <p className="text-xs text-[#8A8F9C] mt-1">Design and print live branded table acrylic standees & stickers</p>
        </div>
        {tables.length > 0 && (
          <Button size="sm" onClick={handlePrint} className="gap-2 rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">
            <Printer className="h-4 w-4" strokeWidth={1.5} /> Print All QR Standees
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="py-20 text-center text-xs font-mono text-[#8A8F9C]">
          Loading restaurant QR codes...
        </div>
      ) : tables.length === 0 ? (
        <div className="p-8 rounded-card bg-[#0E1016] border border-white/[0.08]">
          <EmptyState
            icon={QrCode}
            title="No Tables Available for QR Generation"
            description="You haven't set up any dining tables yet. Add tables in Floor & Table Management to generate unique QR codes."
            actionLabel="Go to Floor Management"
            onAction={() => {}}
          />
          <div className="text-center mt-4">
            <Link to="/staff/tables">
              <Button size="md" className="rounded-full bg-[#C6FF3D] text-[#07080B] hover:bg-[#b8f52e] font-semibold">+ Set Up Tables First</Button>
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
                className="p-6 rounded-card bg-[#0E1016] border border-white/[0.08] hover:border-white/[0.2] transition-all duration-300 text-center space-y-4 print:border-stone-300 print:bg-white print:text-black"
              >
                <div className="text-xs font-mono font-bold text-[#C6FF3D] uppercase tracking-wider truncate">
                  {venueName}
                </div>
                <div className="inline-block p-4 rounded-xl bg-white shadow-inner">
                  <QRCodeSVG
                    value={tableUrl}
                    size={160}
                    level="H"
                    includeMargin
                  />
                </div>
                <div>
                  <div className="text-lg font-heading font-bold text-[#F4F5F7] print:text-black">
                    Table T-{tbl.number}
                  </div>
                  <p className="text-xs text-[#8A8F9C] mt-1">Scan QR code to order & pay</p>
                  <p className="text-[10px] font-mono text-[#8A8F9C] mt-0.5">Code: {tbl.code}</p>
                </div>

                <div className="pt-3 border-t border-white/[0.06] print:hidden flex items-center justify-center">
                  <a
                    href={tableUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs font-mono text-[#C6FF3D] hover:underline flex items-center gap-1.5 transition-colors"
                  >
                    Test Guest Link <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
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
