'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

/* ---------- Types ---------- */

interface AwaitingItem {
  invoice_id: string;
  invoice_number: string | null;
  vendor_name: string | null;
  amount_total: number;
  currency_original: string;
  due_date: string | null;
  invoice_date: string | null;
  approved_at: string;
}

interface PaymentItem {
  id: string;
  invoice_id: string;
  payment_method: string;
  payment_status: string;
  scheduled_date: string | null;
  paid_date: string | null;
  amount_paid: number;
  transaction_ref: string | null;
  bank_name: string | null;
  notes: string | null;
  created_at: string;
  invoice_number: string | null;
  vendor_name: string | null;
  invoice_amount_total: number | null;
}

/* ---------- Constants ---------- */

const statusColors: Record<string, string> = {
  SCHEDULED: 'badge-blue',
  PROCESSING: 'badge-yellow',
  PAID: 'badge-green',
  FAILED: 'badge-red',
  VOID: 'badge-gray',
};

const methodLabels: Record<string, string> = {
  ACH: 'ACH', CHECK: 'Check', WIRE: 'Wire', CREDIT_CARD: 'Credit Card',
};

const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

/* ---------- Page ---------- */

export default function PaymentsPage() {
  const [tab, setTab] = useState<'awaiting' | 'records'>('awaiting');

  // Awaiting
  const [awaiting, setAwaiting] = useState<AwaitingItem[]>([]);
  const [awaitingTotal, setAwaitingTotal] = useState(0);
  const [awaitingLoading, setAwaitingLoading] = useState(true);

  // Records
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [recordsTotal, setRecordsTotal] = useState(0);
  const [recordsLoading, setRecordsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  // Schedule form
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    invoice_id: '', invoice_label: '', payment_method: 'ACH',
    scheduled_date: '', amount_paid: '', bank_name: '', notes: '',
  });
  const [error, setError] = useState('');

  const fetchAwaiting = async () => {
    setAwaitingLoading(true);
    try {
      const { data } = await api.get('/api/v1/payments/awaiting', { params: { limit: 50 } });
      setAwaiting(data.items);
      setAwaitingTotal(data.total);
    } catch { /* ignore */ } finally { setAwaitingLoading(false); }
  };

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/api/v1/payments', { params });
      setPayments(data.items);
      setRecordsTotal(data.total);
    } catch { /* ignore */ } finally { setRecordsLoading(false); }
  };

  useEffect(() => { fetchAwaiting(); fetchRecords(); }, []);
  useEffect(() => { fetchRecords(); }, [statusFilter]);

  const openSchedule = (item: AwaitingItem) => {
    setScheduleForm({
      invoice_id: item.invoice_id,
      invoice_label: item.invoice_number || item.invoice_id.slice(0, 8),
      payment_method: 'ACH',
      scheduled_date: '',
      amount_paid: item.amount_total.toString(),
      bank_name: '',
      notes: '',
    });
    setShowSchedule(true);
    setError('');
  };

  const handleSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/v1/payments', {
        invoice_id: scheduleForm.invoice_id,
        payment_method: scheduleForm.payment_method,
        scheduled_date: scheduleForm.scheduled_date,
        amount_paid: parseFloat(scheduleForm.amount_paid),
        bank_name: scheduleForm.bank_name || null,
        notes: scheduleForm.notes || null,
      });
      setShowSchedule(false);
      fetchAwaiting();
      fetchRecords();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleStatusAction = async (paymentId: string, action: string) => {
    const msgs: Record<string, string> = {
      process: 'Start processing this payment?',
      complete: 'Mark this payment as completed?',
      fail: 'Mark this payment as failed?',
      void: 'Void this payment?',
    };
    if (!confirm(msgs[action] || 'Are you sure?')) return;
    try {
      const body: Record<string, unknown> = {};
      if (action === 'complete') body.paid_date = new Date().toISOString().split('T')[0];
      await api.post(`/api/v1/payments/${paymentId}/${action}`, body);
      fetchRecords();
      fetchAwaiting();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT']}>
          <div className="page-header flex items-center justify-between mb-6">
            <div>
              <h2 className="page-title">Payments</h2>
            </div>
            {/* Tabs */}
            <div className="flex gap-2">
              <button onClick={() => setTab('awaiting')}
                className={tab === 'awaiting' ? 'btn-primary' : 'btn-secondary'}>
                Awaiting Payment {awaitingTotal > 0 && <span className="ml-1 bg-red-500 text-white text-xs rounded-full px-1.5 py-0.5">{awaitingTotal}</span>}
              </button>
              <button onClick={() => setTab('records')}
                className={tab === 'records' ? 'btn-primary' : 'btn-secondary'}>
                Payment Records ({recordsTotal})
              </button>
            </div>
          </div>

          {/* Schedule Modal */}
          {showSchedule && (
            <div className="card p-6 mb-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                Schedule Payment — {scheduleForm.invoice_label}
              </h3>
              {error && <div className="alert-error mb-3">{error}</div>}
              <form onSubmit={handleSchedule} className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Payment Method *</label>
                  <select value={scheduleForm.payment_method}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, payment_method: e.target.value })}
                    className="input w-full">
                    <option value="ACH">ACH</option>
                    <option value="CHECK">Check</option>
                    <option value="WIRE">Wire Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="label">Scheduled Date *</label>
                  <input type="date" required value={scheduleForm.scheduled_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Amount ($) *</label>
                  <input type="number" step="0.01" min="0.01" required
                    value={scheduleForm.amount_paid}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, amount_paid: e.target.value })}
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Bank Name</label>
                  <input value={scheduleForm.bank_name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, bank_name: e.target.value })}
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input value={scheduleForm.notes}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, notes: e.target.value })}
                    className="input w-full" />
                </div>
                <div className="flex items-end gap-2">
                  <button type="submit" className="btn-primary">Schedule</button>
                  <button type="button" onClick={() => setShowSchedule(false)} className="btn-secondary">Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* Tab: Awaiting Payment */}
          {tab === 'awaiting' && (
            <div className="card overflow-hidden">
              {awaitingLoading ? (
                <div className="loading-state">Loading...</div>
              ) : awaiting.length === 0 ? (
                <div className="empty-state">No invoices awaiting payment.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>
                      <th className="table-th text-left">Invoice #</th>
                      <th className="table-th text-left">Vendor</th>
                      <th className="table-th text-right">Amount</th>
                      <th className="table-th text-left">Invoice Date</th>
                      <th className="table-th text-left">Due Date</th>
                      <th className="table-th text-left">Approved</th>
                      <th className="table-th text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {awaiting.map((item) => (
                      <tr key={item.invoice_id} className="table-row">
                        <td className="table-td font-medium">
                          <Link href={`/invoices/${item.invoice_id}`} className="text-blue-600 hover:underline">
                            {item.invoice_number || item.invoice_id.slice(0, 8)}
                          </Link>
                        </td>
                        <td className="table-td text-gray-600">{item.vendor_name || '—'}</td>
                        <td className="table-td text-right font-mono">{fmt(item.amount_total)}</td>
                        <td className="table-td text-xs text-gray-500">{item.invoice_date || '—'}</td>
                        <td className="table-td text-xs text-gray-500">
                          {item.due_date || '—'}
                          {item.due_date && new Date(item.due_date) < new Date() && (
                            <span className="ml-1 text-red-500 font-medium">Overdue</span>
                          )}
                        </td>
                        <td className="table-td text-xs text-gray-500">{item.approved_at?.split('T')[0] || '—'}</td>
                        <td className="table-td text-center">
                          <button onClick={() => openSchedule(item)}
                            className="text-sm text-primary-600 hover:text-primary-700 font-medium">
                            Schedule Payment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {/* Tab: Payment Records */}
          {tab === 'records' && (
            <>
              <div className="flex gap-2 mb-4">
                {['', 'SCHEDULED', 'PAID'].map((s) => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={statusFilter === s ? 'btn-primary' : 'btn-secondary'}>
                    {s || 'All'}
                  </button>
                ))}
              </div>
              <div className="card overflow-hidden">
                {recordsLoading ? (
                  <div className="loading-state">Loading...</div>
                ) : payments.length === 0 ? (
                  <div className="empty-state">No payment records found.</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="table-header">
                      <tr>
                        <th className="table-th text-left">Invoice #</th>
                        <th className="table-th text-left">Vendor</th>
                        <th className="table-th text-left">Method</th>
                        <th className="table-th text-right">Amount</th>
                        <th className="table-th text-left">Scheduled</th>
                        <th className="table-th text-left">Paid</th>
                        <th className="table-th text-left">Ref</th>
                        <th className="table-th text-center">Status</th>
                        <th className="table-th text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="table-row">
                          <td className="table-td font-medium">
                            <Link href={`/invoices/${p.invoice_id}`} className="text-blue-600 hover:underline">
                              {p.invoice_number || p.invoice_id.slice(0, 8)}
                            </Link>
                          </td>
                          <td className="table-td text-gray-600">{p.vendor_name || '—'}</td>
                          <td className="table-td">
                            <span className="badge-gray">{methodLabels[p.payment_method] || p.payment_method}</span>
                          </td>
                          <td className="table-td text-right font-mono text-xs">{fmt(p.amount_paid)}</td>
                          <td className="table-td text-xs text-gray-500">{p.scheduled_date || '—'}</td>
                          <td className="table-td text-xs text-gray-500">{p.paid_date || '—'}</td>
                          <td className="table-td text-xs text-gray-500 font-mono">{p.transaction_ref || '—'}</td>
                          <td className="table-td text-center">
                            <span className={statusColors[p.payment_status] || ''}>{p.payment_status}</span>
                          </td>
                          <td className="table-td text-center">
                            <div className="flex gap-1 justify-center">
                              {p.payment_status === 'SCHEDULED' && (
                                <button onClick={() => handleStatusAction(p.id, 'complete')}
                                  className="text-green-600 hover:text-green-800 text-xs font-medium">Pay</button>
                              )}
                              {p.payment_status === 'PAID' && (
                                <span className="text-xs text-gray-400">Done</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          </RequireRole>
        </main>
      </div>
    </div>
  );
}
