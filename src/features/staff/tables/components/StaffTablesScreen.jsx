import React, { useState, useEffect, useCallback } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { EmptyState } from '@/components/ui/EmptyState';
import { formatCurrency } from '@/utils/formatCurrency';
import { useAuth } from '@/features/shared/auth';
import {
  fetchTables,
  createTable,
  deleteTable,
} from '../api/tablesApi';
import {
  fetchOrders,
  subscribeToOrders,
  settleOrder,
} from '@/features/shared/orders/api/ordersApi';
import toast from 'react-hot-toast';
import {
  QrCodeIcon,
  TableCellsIcon,
  ArrowTopRightOnSquareIcon,
  UserGroupIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';

export function StaffTablesScreen() {
  const { venueId, orgId } = useAuth();
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTable, setSelectedTable] = useState(null);
  const [isAddTableOpen, setIsAddTableOpen] = useState(false);
  const [newTableNumber, setNewTableNumber] = useState('');
  const [newTableCapacity, setNewTableCapacity] = useState('4');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [tList, oList] = await Promise.all([
        fetchTables(venueId),
        fetchOrders(venueId),
      ]);
      setTables(Array.isArray(tList) ? tList : []);
      setOrders(Array.isArray(oList) ? oList : []);
    } catch (err) {
      console.error('Failed to load table/order data:', err);
      setTables([]);
      setOrders([]);
    } finally {
      setIsLoading(false);
    }
  }, [venueId]);

  useEffect(() => {
    loadData();
    const unsubscribe = subscribeToOrders(() => {
      loadData();
    });
    return () => unsubscribe();
  }, [loadData]);

  const getTableOrders = (table) => {
    return (orders || []).filter(
      (o) =>
        o &&
        (o.short_code?.toUpperCase() === table?.code?.toUpperCase() ||
          o.table_number === table?.number) &&
        o.status !== 'cancelled'
    );
  };

  const isTableOccupied = (table) => {
    const tableOrders = getTableOrders(table);
    return tableOrders.some((o) => o.status !== 'completed' && o.status !== 'served');
  };

  const handleSettleTable = async (table) => {
    try {
      const activeOrders = getTableOrders(table).filter((o) => o.status !== 'completed');
      for (const o of activeOrders) {
        await settleOrder(o.id, 'counter');
      }
      toast.success(`Table ${table.number} settled and freed!`);
      setSelectedTable(null);
      loadData();
    } catch (err) {
      console.error(err);
      toast.error('Failed to settle table');
    }
  };

  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!newTableNumber) {
      toast.error('Please enter a table number');
      return;
    }
    setIsSubmitting(true);
    try {
      await createTable({
        orgId,
        venueId,
        tableNumber: newTableNumber,
        capacity: newTableCapacity,
      });
      toast.success(`Table ${String(newTableNumber).padStart(2, '0')} created successfully!`);
      setIsAddTableOpen(false);
      setNewTableNumber('');
      setNewTableCapacity('4');
      loadData();
    } catch (err) {
      console.error('Error creating table:', err);
      toast.error(err.message || 'Failed to create table. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTable = async (table) => {
    if (!window.confirm(`Are you sure you want to remove Table T-${table.number}?`)) return;
    try {
      await deleteTable(table.id);
      toast.success(`Table T-${table.number} removed`);
      setSelectedTable(null);
      loadData();
    } catch (err) {
      toast.error(err.message || 'Failed to delete table');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-stone-900 dark:text-white">Floor & Table Management</h1>
          <p className="text-xs text-stone-500 mt-0.5">
            Real-time dining occupancy, multi-round session billing, and QR table shortcuts
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddTableOpen(true)}>
          + Add Table
        </Button>
      </div>

      {/* Tables Grid or Empty State */}
      {isLoading ? (
        <div className="py-20 text-center text-xs font-semibold text-stone-400">
          Loading dining floor layout...
        </div>
      ) : tables.length === 0 ? (
        <div className="p-8 rounded-3xl bg-white dark:bg-stone-900 border border-stone-200/80 dark:border-stone-800">
          <EmptyState
            icon={TableCellsIcon}
            title="No Tables Configured Yet"
            description="Set up your dining floor layout by adding your first restaurant table. Each table gets a unique QR code for guest ordering."
            actionLabel="+ Add Your First Table"
            onAction={() => setIsAddTableOpen(true)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {tables.map((t) => {
            const occupied = isTableOccupied(t);
            const tableOrders = getTableOrders(t);
            const activeOrders = tableOrders.filter((o) => o.status !== 'completed');
            const totalBill = activeOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

            return (
              <div
                key={t.id}
                onClick={() => setSelectedTable(t)}
                className={`p-5 rounded-3xl border transition-all cursor-pointer shadow-sm hover:scale-[1.02] flex flex-col justify-between ${
                  occupied
                    ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/20'
                    : 'bg-white dark:bg-stone-900 border-stone-200/80 dark:border-stone-800 hover:border-brand-primary/40'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xl font-black text-stone-900 dark:text-white">
                      T-{t.number}
                    </span>
                    <Badge variant={occupied ? 'warning' : 'success'} size="sm">
                      {occupied ? 'Occupied' : 'Free'}
                    </Badge>
                  </div>

                  <div className="flex items-center gap-1 text-xs text-stone-500 mt-2 font-medium">
                    <UserGroupIcon className="h-3.5 w-3.5" />
                    <span>Capacity: {t.capacity} seats</span>
                  </div>
                </div>

                <div className="pt-4 mt-2 border-t border-stone-100 dark:border-stone-800/80 flex items-center justify-between">
                  <div>
                    {occupied ? (
                      <span className="text-xs font-black text-brand-primary">
                        {formatCurrency(totalBill)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-stone-400">Available</span>
                    )}
                  </div>
                  <span className="text-[11px] font-mono text-stone-500 flex items-center gap-0.5 hover:text-brand-primary">
                    /t/{t.code}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Table Detail & Settle Modal */}
      <Modal
        isOpen={Boolean(selectedTable)}
        onClose={() => setSelectedTable(null)}
        title={selectedTable ? `Table T-${selectedTable.number} Overview` : ''}
        size="md"
      >
        {selectedTable && (() => {
          const tableOrders = getTableOrders(selectedTable);
          const activeOrders = tableOrders.filter((o) => o.status !== 'completed');
          const totalBill = activeOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

          return (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3.5 rounded-2xl bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700">
                <div>
                  <span className="text-xs text-stone-500 font-semibold block">Active Dining Status</span>
                  <span className="text-sm font-black text-stone-900 dark:text-white">
                    {activeOrders.length > 0 ? `${activeOrders.length} active round(s)` : 'Vacant Table'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-xs text-stone-500 font-semibold block">Total Due</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(totalBill)}
                  </span>
                </div>
              </div>

              {/* Active Orders List */}
              {activeOrders.length > 0 ? (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {activeOrders.map((o) => (
                    <div
                      key={o.id}
                      className="p-3 rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 text-xs flex items-center justify-between"
                    >
                      <div>
                        <span className="font-extrabold text-stone-900 dark:text-white">
                          Round #{o.round_number} &bull; {o.id}
                        </span>
                        <p className="text-[11px] text-stone-500 truncate max-w-xs mt-0.5">
                          {(o.items || []).map((it) => `${it.qty}x ${it.name}`).join(', ')}
                        </p>
                      </div>
                      <Badge variant={o.status === 'cooking' ? 'warning' : 'primary'} size="sm">
                        {o.status.toUpperCase()}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-stone-500 text-center py-4">
                  Table is currently vacant and clean.
                </p>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-2">
                {activeOrders.length > 0 && (
                  <Button
                    size="lg"
                    className="w-full font-bold"
                    onClick={() => handleSettleTable(selectedTable)}
                  >
                    Settle Bill & Free Table ({formatCurrency(totalBill)})
                  </Button>
                )}

                <a
                  href={`/t/${selectedTable.code}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-stone-300 dark:border-stone-700 text-xs font-bold text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4" /> Open Guest View (/t/{selectedTable.code})
                </a>

                <button
                  type="button"
                  onClick={() => handleDeleteTable(selectedTable)}
                  className="w-full flex items-center justify-center gap-1.5 p-2 text-xs font-bold text-rose-600 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-colors"
                >
                  <TrashIcon className="h-3.5 w-3.5" /> Remove Table
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Add Table Modal */}
      <Modal
        isOpen={isAddTableOpen}
        onClose={() => setIsAddTableOpen(false)}
        title="Add New Dining Table"
        size="sm"
      >
        <form onSubmit={handleAddTable} className="space-y-4 py-2">
          <Input
            label="Table Number"
            type="number"
            placeholder="E.g. 1"
            value={newTableNumber}
            onChange={(e) => setNewTableNumber(e.target.value)}
            required
            min="1"
          />
          <Input
            label="Seating Capacity"
            type="number"
            placeholder="E.g. 4"
            value={newTableCapacity}
            onChange={(e) => setNewTableCapacity(e.target.value)}
            required
            min="1"
          />
          <Button type="submit" size="lg" className="w-full font-bold" isLoading={isSubmitting}>
            Create Table & Generate QR
          </Button>
        </form>
      </Modal>
    </div>
  );
}
