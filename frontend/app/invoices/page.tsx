'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import type { InvoiceListItem } from '@/types';
import RequireRole from '@/components/common/RequireRole';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'badge-gray',
  OCR_REVIEW: 'badge-yellow',
  PENDING: 'badge-blue',
  SUBMITTED: 'badge-indigo',
  REVIEW_NEEDED: 'badge-orange',
  IN_APPROVAL: 'badge-purple',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  SCHEDULED: 'badge-cyan',
  PAID: 'badge-green',
  VOID: 'badge-gray',
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
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT']}>
          <div className="page-header">
            <div>
              <h2 className="page-title">Invoices</h2>
              <p className="page-subtitle">{total} invoices</p>
            </div>
            <Link href="/invoices/new" className="btn-primary">
              + New Invoice
            </Link>
          </div>

          <div className="filter-bar">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input type="text" placeholder="Search by invoice # or PO #..."
                value={search} onChange={(e) => setSearch(e.target.value)}
                className="input flex-1" />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="input">
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
              <button type="submit" className="btn-secondary">Search</button>
            </form>
          </div>

          {error && <div className="alert-error">{error}</div>}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : invoices.length === 0 ? (
              <div className="empty-state">No invoices found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">Invoice #</th>
                    <th className="table-th text-left">Date</th>
                    <th className="table-th text-right">Amount</th>
                    <th className="table-th text-left">Source</th>
                    <th className="table-th text-left">Status</th>
                    <th className="table-th text-left">Validation</th>
                    <th className="table-th text-left"></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv) => (
                    <tr key={inv.id} className="table-row">
                      <td className="table-td font-mono text-xs font-medium">{inv.invoice_number || '—'}</td>
                      <td className="table-td text-gray-600">{inv.invoice_date || '—'}</td>
                      <td className="table-td text-right font-mono">{fmt(inv.amount_total)}</td>
                      <td className="table-td">
                        <span className="badge-gray">{inv.source_channel}</span>
                      </td>
                      <td className="table-td">
                        <span className={STATUS_COLORS[inv.status] || ''}>{inv.status}</span>
                      </td>
                      <td className="table-td">
                        {inv.validation_status && (
                          <span className={
                            inv.validation_status === 'PASS' ? 'badge-green' :
                            inv.validation_status === 'FAIL' ? 'badge-red' :
                            'badge-yellow'
                          }>{inv.validation_status}</span>
                        )}
                      </td>
                      <td className="table-td">
                        <Link href={`/invoices/${inv.id}`} className="text-primary-600 hover:text-primary-700 font-medium text-xs">View</Link>
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
