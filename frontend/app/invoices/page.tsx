'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import type { InvoiceListItem } from '@/types';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-600',
  OCR_REVIEW: 'bg-yellow-50 text-yellow-700',
  PENDING: 'bg-blue-50 text-blue-700',
  SUBMITTED: 'bg-indigo-50 text-indigo-700',
  REVIEW_NEEDED: 'bg-orange-50 text-orange-700',
  IN_APPROVAL: 'bg-purple-50 text-purple-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
  SCHEDULED: 'bg-cyan-50 text-cyan-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  VOID: 'bg-gray-200 text-gray-500',
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const fetchInvoices = async () => {
    setLoading(true);
    setError('');
    try {
      const params: Record<string, string> = { limit: '50' };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/api/v1/invoices', { params });
      setInvoices(data.items);
      setTotal(data.total);
    } catch (err) {
      console.error('Failed to fetch invoices', err);
      setError('Failed to load invoices. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoices(); }, [statusFilter]);

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); fetchInvoices(); };
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Invoices</h2>
              <p className="text-sm text-gray-500">{total} invoices</p>
            </div>
            <Link href="/invoices/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors">
              + New Invoice
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input type="text" placeholder="Search by invoice # or PO #..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">All Status</option>
                <option value="RECEIVED">Received</option>
                <option value="OCR_REVIEW">OCR Review</option>
                <option value="PENDING">Pending</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="REVIEW_NEEDED">Review Needed</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="PAID">Paid</option>
              </select>
              <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm">Search</button>
            </form>
          </div>

          {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No invoices found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Source</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Validation</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{inv.invoice_number || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{inv.invoice_date || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono">{fmt(inv.amount_total)}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{inv.source_channel}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[inv.status] || ''}`}>{inv.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {inv.validation_status && (
                          <span className={`text-xs px-2 py-0.5 rounded-full ${
                            inv.validation_status === 'PASS' ? 'bg-green-50 text-green-700' :
                            inv.validation_status === 'FAIL' ? 'bg-red-50 text-red-700' :
                            'bg-yellow-50 text-yellow-700'
                          }`}>{inv.validation_status}</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:text-blue-800 text-xs">View</Link>
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
