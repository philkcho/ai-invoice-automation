'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

interface PaymentItem {
  id: string;
  company_id: string;
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
  invoice_amount_total: number;
}

const statusColors: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700',
  PROCESSING: 'bg-yellow-50 text-yellow-700',
  PAID: 'bg-green-50 text-green-700',
  FAILED: 'bg-red-50 text-red-700',
  VOID: 'bg-gray-100 text-gray-500',
};

const methodLabels: Record<string, string> = {
  ACH: 'ACH',
  CHECK: 'Check',
  WIRE: 'Wire',
  CREDIT_CARD: 'Credit Card',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showSchedule, setShowSchedule] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    invoice_id: '',
    payment_method: 'ACH',
    scheduled_date: '',
    amount_paid: '',
    bank_name: '',
    notes: '',
  });
  const [error, setError] = useState('');

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/api/v1/payments', { params });
      setPayments(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      console.error('Failed to fetch payments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPayments(); }, [statusFilter]);

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
      setScheduleForm({ invoice_id: '', payment_method: 'ACH', scheduled_date: '', amount_paid: '', bank_name: '', notes: '' });
      fetchPayments();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleStatusAction = async (paymentId: string, action: string) => {
    const confirmMsg: Record<string, string> = {
      process: '결제 처리를 시작하시겠습니까?',
      complete: '결제를 완료 처리하시겠습니까?',
      fail: '결제를 실패 처리하시겠습니까?',
      void: '결제를 무효화하시겠습니까?',
    };
    if (!confirm(confirmMsg[action] || 'Are you sure?')) return;

    try {
      await api.post(`/api/v1/payments/${paymentId}/${action}`);
      fetchPayments();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Payments</h2>
              <p className="text-sm text-gray-500">{total} payments</p>
            </div>
            <div className="flex gap-2">
              {['', 'SCHEDULED', 'PROCESSING', 'PAID', 'FAILED', 'VOID'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors ${
                    statusFilter === s
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {s || 'All'}
                </button>
              ))}
              <button
                onClick={() => setShowSchedule(!showSchedule)}
                className="bg-blue-600 text-white px-4 py-1.5 rounded-md hover:bg-blue-700 text-sm transition-colors ml-2"
              >
                {showSchedule ? 'Cancel' : '+ Schedule'}
              </button>
            </div>
          </div>

          {showSchedule && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Schedule Payment</h3>
              {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}
              <form onSubmit={handleSchedule} className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Invoice ID *</label>
                  <input
                    required value={scheduleForm.invoice_id}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, invoice_id: e.target.value })}
                    placeholder="Paste approved invoice ID"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Payment Method *</label>
                  <select
                    value={scheduleForm.payment_method}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="ACH">ACH</option>
                    <option value="CHECK">Check</option>
                    <option value="WIRE">Wire Transfer</option>
                    <option value="CREDIT_CARD">Credit Card</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Scheduled Date *</label>
                  <input
                    type="date" required value={scheduleForm.scheduled_date}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, scheduled_date: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Amount ($) *</label>
                  <input
                    type="number" step="0.01" min="0.01" required
                    value={scheduleForm.amount_paid}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, amount_paid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Bank Name</label>
                  <input
                    value={scheduleForm.bank_name}
                    onChange={(e) => setScheduleForm({ ...scheduleForm, bank_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-end">
                  <button type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors">
                    Schedule
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : payments.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No payments found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Method</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Scheduled</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Paid</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Ref</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-blue-600">
                        {p.invoice_number || p.invoice_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{p.vendor_name || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {methodLabels[p.payment_method] || p.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        ${p.amount_paid.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.scheduled_date || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{p.paid_date || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500 font-mono">{p.transaction_ref || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[p.payment_status] || ''}`}>
                          {p.payment_status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex gap-1 justify-center flex-wrap">
                          {p.payment_status === 'SCHEDULED' && (
                            <>
                              <button onClick={() => handleStatusAction(p.id, 'process')}
                                className="text-blue-600 hover:text-blue-800 text-xs">Process</button>
                              <button onClick={() => handleStatusAction(p.id, 'complete')}
                                className="text-green-600 hover:text-green-800 text-xs">Complete</button>
                            </>
                          )}
                          {p.payment_status === 'PROCESSING' && (
                            <>
                              <button onClick={() => handleStatusAction(p.id, 'complete')}
                                className="text-green-600 hover:text-green-800 text-xs">Complete</button>
                              <button onClick={() => handleStatusAction(p.id, 'fail')}
                                className="text-red-600 hover:text-red-800 text-xs">Fail</button>
                            </>
                          )}
                          {!['VOID', 'PAID'].includes(p.payment_status) && (
                            <button onClick={() => handleStatusAction(p.id, 'void')}
                              className="text-gray-500 hover:text-gray-700 text-xs">Void</button>
                          )}
                        </div>
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
