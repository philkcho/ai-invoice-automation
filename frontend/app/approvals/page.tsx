'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
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
  PENDING: 'badge-yellow',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  CANCELLED: 'badge-gray',
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
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'APPROVER']}>
          <div className="page-header flex items-center justify-between">
            <div>
              <h2 className="page-title">Approvals</h2>
              <p className="page-subtitle">{total} items</p>
            </div>
            <div className="flex gap-2">
              {['PENDING', 'APPROVED', 'REJECTED', ''].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={statusFilter === s ? 'btn-primary' : 'btn-secondary'}
                >
                  {s || 'All'}
                </button>
              ))}
            </div>
          </div>

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : approvals.length === 0 ? (
              <div className="empty-state">No approval items found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">Invoice #</th>
                    <th className="table-th text-left">Vendor</th>
                    <th className="table-th text-right">Amount</th>
                    <th className="table-th text-center">Step</th>
                    <th className="table-th text-left">Role</th>
                    <th className="table-th text-center">Round</th>
                    <th className="table-th text-center">Status</th>
                    <th className="table-th text-left">Date</th>
                    <th className="table-th text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {approvals.map((a) => (
                    <tr key={a.id} className="table-row">
                      <td className="table-td font-medium">
                        <Link href={`/invoices/${a.invoice_id}`} className="text-blue-600 hover:underline">
                          {a.invoice_number || a.invoice_id.slice(0, 8)}
                        </Link>
                      </td>
                      <td className="table-td text-gray-600">{a.vendor_name || '—'}</td>
                      <td className="table-td text-right font-mono text-xs">
                        ${(a.amount_total ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="table-td text-center">
                        <span className="badge-blue">
                          Step {a.step}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className={
                          a.approver_role === 'COMPANY_ADMIN'
                            ? 'badge-purple'
                            : 'badge-orange'
                        }>
                          {a.approver_role}
                        </span>
                      </td>
                      <td className="table-td text-center text-xs text-gray-500">#{a.submission_round}</td>
                      <td className="table-td text-center">
                        <span className={statusColors[a.status] || ''}>
                          {a.status}
                        </span>
                      </td>
                      <td className="table-td text-xs text-gray-500">
                        {new Date(a.created_at).toLocaleDateString()}
                      </td>
                      <td className="table-td text-center">
                        {a.status === 'PENDING' && (
                          <div className="flex gap-1 justify-center">
                            <button
                              onClick={() => setActionModal({ id: a.id, action: 'APPROVED' })}
                              className="btn-success text-xs !px-3 !py-1"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => setActionModal({ id: a.id, action: 'REJECTED' })}
                              className="btn-danger text-xs !px-3 !py-1"
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
            <div className="modal-overlay">
              <div className="modal-content max-w-md">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">
                  {actionModal.action === 'APPROVED' ? 'Approve Invoice' : 'Reject Invoice'}
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="label">Comments</label>
                    <textarea
                      value={actionForm.comments}
                      onChange={(e) => setActionForm({ ...actionForm, comments: e.target.value })}
                      rows={2}
                      className="input w-full"
                      placeholder="Optional comments..."
                    />
                  </div>
                  {actionModal.action === 'REJECTED' && (
                    <div>
                      <label className="label">Rejection Reason *</label>
                      <textarea
                        value={actionForm.rejection_reason}
                        onChange={(e) => setActionForm({ ...actionForm, rejection_reason: e.target.value })}
                        rows={3}
                        required
                        className="input w-full"
                        placeholder="Please provide a reason for rejection..."
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-2 mt-6">
                  <button
                    onClick={() => { setActionModal(null); setActionForm({ comments: '', rejection_reason: '' }); }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAction}
                    disabled={processing || (actionModal.action === 'REJECTED' && !actionForm.rejection_reason)}
                    className={`${
                      actionModal.action === 'APPROVED' ? 'btn-success' : 'btn-danger'
                    } disabled:opacity-50`}
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
