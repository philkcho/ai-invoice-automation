'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { usePurchaseOrders } from '@/hooks/useApi';
import RequireRole from '@/components/common/RequireRole';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'badge-blue',
  PARTIALLY_INVOICED: 'badge-yellow',
  FULLY_INVOICED: 'badge-green',
  CLOSED: 'badge-gray',
  CANCELLED: 'badge-red',
};

export default function PurchaseOrdersPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = usePurchaseOrders({
    limit: 50,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const pos = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT']}>
          <div className="page-header">
            <div>
              <h2 className="page-title">Purchase Orders</h2>
              <p className="page-subtitle">{total} POs total</p>
            </div>
            <Link href="/purchase-orders/new"
              className="btn-primary">
              + New PO
            </Link>
          </div>

          <div className="filter-bar">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input type="text" placeholder="Search by PO number..."
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                className="input flex-1" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="input">
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="PARTIALLY_INVOICED">Partially Invoiced</option>
                <option value="FULLY_INVOICED">Fully Invoiced</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button type="submit" className="btn-secondary">
                Search
              </button>
            </form>
          </div>

          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : pos.length === 0 ? (
              <div className="empty-state">No purchase orders found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th">PO #</th>
                    <th className="table-th">Date</th>
                    <th className="table-th">Description</th>
                    <th className="table-th text-right">Total</th>
                    <th className="table-th text-right">Invoiced</th>
                    <th className="table-th text-right">Remaining</th>
                    <th className="table-th">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po) => (
                    <tr key={po.id} className="table-row">
                      <td className="table-td font-mono text-xs font-medium">{po.po_number}</td>
                      <td className="table-td text-gray-600">{po.po_date}</td>
                      <td className="table-td text-gray-700">{po.description || '\u2014'}</td>
                      <td className="table-td text-right font-mono">{fmt(po.amount_total)}</td>
                      <td className="table-td text-right font-mono">{fmt(po.amount_invoiced)}</td>
                      <td className="table-td text-right font-mono">{fmt(po.amount_remaining)}</td>
                      <td className="table-td">
                        <span className={STATUS_COLORS[po.status] || ''}>
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
