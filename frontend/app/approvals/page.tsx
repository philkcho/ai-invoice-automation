'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

interface ApprovalItem {
  id: string;
  company_id: string;
  invoice_id: string;
  submission_round: number;
  step: number;
  approver_role: string;
  approver_id: string | null;
  status: string;
  action_at: string | null;
  comments: string | null;
  rejection_reason: string | null;
  created_at: string;
  invoice_number: string | null;
  vendor_name: string | null;
  amount_total: number | null;
  invoice_status: string;
}

const statusColors: Record<string, string> = {
  PENDING: 'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-green-50 text-green-700',
  REJECTED: 'bg-red-50 text-red-700',
  CANCELLED: 'bg-gray-100 text-gray-500',
};

export default function ApprovalsPage() {
  const [approvals, setApprovals] = useState<ApprovalItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [actionModal, setActionModal] = useState<{ id: string; action: string } | null>(null);
  const [actionForm, setActionForm] = useState({ comments: '', rejection_reason: '' });
  const [processing, setProcessing] = useState(false);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: '50' };
      if (statusFilter) params.status = statusFilter;
      const { data } = await api.get('/api/v1/approvals', { params });
      setApprovals(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      console.error('Failed to fetch approvals', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchApprovals(); }, [statusFilter]);

  const handleAction = async () => {
    if (!actionModal) return;
    setProcessing(true);
    try {
      await api.post(`/api/v1/approvals/${actionModal.id}/action`, {
        action: actionModal.action,
        comments: actionForm.comments || null,
        rejection_reason: actionModal.action === 'REJECTED' ? actionForm.rejection_reason || null : null,
      });
      setActionModal(null);
      setActionForm({ comments: '', rejection_reason: '' });
      fetchApprovals();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'APPROVER']}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Approvals</h2>
              <p className="text-sm text-gray-500">{total} items</p>
            </div>
            <div className="flex gap-2">
              {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
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
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : approvals.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No approval items found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice #</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Vendor</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Amount</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Step</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Round</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a) => (
                    <tr key={a.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-blue-600">
                        {a.invoice_number || a.invoice_id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{a.vendor_name || '—'}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">
                        ${(a.amount_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          Step {a.step}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          a.approver_role === 'COMPANY_ADMIN'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-orange-50 text-orange-700'
                        }`}>
                          {a.approver_role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-xs text-gray-500">#{a.submission_round}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[a.status] || ''}`}>
                          {a.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {a.status === 'PENDING' && (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => setActionModal({ id: a.id, action: 'APPROVED' })}
                              className="bg-green-600 text-white px-3 py-1 rounded text-xs hover:bg-green-700 transition-colors"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setActionModal({ id: a.id, action: 'REJECTED' })}
                              className="bg-red-600 text-white px-3 py-1 rounded text-xs hover:bg-red-700 transition-colors"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {a.status === 'REJECTED' && a.rejection_reason && (
                          <span className="text-xs text-red-500" title={a.rejection_reason}>
                            {a.rejection_reason.slice(0, 30)}...
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Action Modal */}
          {actionModal && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {actionModal.action === 'APPROVED' ? 'Approve Invoice' : 'Reject Invoice'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Comments</label>
                    <textarea
                      value={actionForm.comments}
                      onChange={(e) => setActionForm({ ...actionForm, comments: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Optional comments..."
                    />
                  </div>
                  {actionModal.action === 'REJECTED' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Rejection Reason *</label>
                      <textarea
                        value={actionForm.rejection_reason}
                        onChange={(e) => setActionForm({ ...actionForm, rejection_reason: e.target.value })}
                        rows={3}
                        required
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Please provide a reason for rejection..."
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => { setActionModal(null); setActionForm({ comments: '', rejection_reason: '' }); }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm text-gray-600 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={processing || (actionModal.action === 'REJECTED' && !actionForm.rejection_reason)}
                    className={`px-4 py-2 rounded-md text-sm text-white transition-colors disabled:opacity-50 ${
                      actionModal.action === 'APPROVED'
                        ? 'bg-green-600 hover:bg-green-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    {processing ? 'Processing...' : actionModal.action === 'APPROVED' ? 'Approve' : 'Reject'}
                  </button>
                </div>
              </div>
            </div>
          )}
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
