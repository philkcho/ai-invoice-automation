'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { usePurchaseOrders } from '@/hooks/useApi';

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-blue-50 text-blue-700',
  PARTIALLY_INVOICED: 'bg-yellow-50 text-yellow-700',
  FULLY_INVOICED: 'bg-green-50 text-green-700',
  CLOSED: 'bg-gray-100 text-gray-600',
  CANCELLED: 'bg-red-50 text-red-700',
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
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Purchase Orders</h2>
              <p className="text-sm text-gray-500">{total} POs total</p>
            </div>
            <Link href="/purchase-orders/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors">
              + New PO
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input type="text" placeholder="Search by PO number..."
                value={searchInput} onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">All Status</option>
                <option value="OPEN">Open</option>
                <option value="PARTIALLY_INVOICED">Partially Invoiced</option>
                <option value="FULLY_INVOICED">Fully Invoiced</option>
                <option value="CLOSED">Closed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
              <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm">
                Search
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : pos.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No purchase orders found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">PO #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Invoiced</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Remaining</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {pos.map((po) => (
                    <tr key={po.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{po.po_number}</td>
                      <td className="px-4 py-3 text-gray-600">{po.po_date}</td>
                      <td className="px-4 py-3 text-gray-700">{po.description || '\u2014'}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(po.amount_total)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(po.amount_invoiced)}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(po.amount_remaining)}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[po.status] || ''}`}>
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
