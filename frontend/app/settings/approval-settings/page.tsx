'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';
import { useAuthStore } from '@/stores/auth';

interface InvoiceType {
  id: string;
  type_code: string;
  type_name: string;
}

interface ApproverUser {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface ApprovalSetting {
  id: string;
  company_id: string;
  invoice_type_id: string | null;
  amount_threshold_min: number;
  amount_threshold_max: number | null;
  step: number;
  step_approver_role: string | null;
  approver_user_id: string | null;
  approver_name: string | null;
  is_active: boolean;
  created_at: string;
}

export default function ApprovalSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<ApprovalSetting[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([]);
  const [approverUsers, setApproverUsers] = useState<ApproverUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    invoice_type_id: '',
    amount_threshold_min: '0',
    amount_threshold_max: '',
    step: '1',
    approver_user_id: '',
    is_active: true,
  });
  const [error, setError] = useState('');

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/approval-settings', { params: { limit: 100 } });
      setSettings(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      console.error('Failed to fetch approval settings', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInvoiceTypes = async () => {
    try {
      const { data } = await api.get('/api/v1/invoice-types', { params: { limit: 100 } });
      setInvoiceTypes(data.items);
    } catch (err: unknown) {
      console.error('Failed to fetch invoice types', err);
    }
  };

  const fetchApproverUsers = async () => {
    try {
      const { data } = await api.get('/api/v1/users', { params: { limit: 100 } });
      // APPROVER, COMPANY_ADMIN만 필터
      const filtered = data.items.filter(
        (u: ApproverUser) => ['APPROVER', 'COMPANY_ADMIN'].includes(u.role)
      );
      setApproverUsers(filtered);
    } catch (err: unknown) {
      console.error('Failed to fetch users', err);
    }
  };

  useEffect(() => {
    fetchSettings();
    fetchInvoiceTypes();
    fetchApproverUsers();
  }, []);

  const resetForm = () => {
    setForm({
      invoice_type_id: '',
      amount_threshold_min: '0',
      amount_threshold_max: '',
      step: '1',
      approver_user_id: '',
      is_active: true,
    });
    setEditingId(null);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: Record<string, unknown> = {
        invoice_type_id: form.invoice_type_id || null,
        amount_threshold_min: parseFloat(form.amount_threshold_min) || 0,
        amount_threshold_max: form.amount_threshold_max ? parseFloat(form.amount_threshold_max) : null,
        step: parseInt(form.step) || 1,
        approver_user_id: form.approver_user_id || null,
        is_active: form.is_active,
      };

      // 신규 생성 시 company_id 필수
      if (!editingId) {
        payload.company_id = user?.company_id;
      }

      if (editingId) {
        await api.patch(`/api/v1/approval-settings/${editingId}`, payload);
      } else {
        await api.post('/api/v1/approval-settings', payload);
      }
      setShowForm(false);
      resetForm();
      fetchSettings();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (s: ApprovalSetting) => {
    // 레거시 역할 기반 설정: approver_user_id 없이 step_approver_role만 있는 경우
    if (!s.approver_user_id && s.step_approver_role) {
      // 해당 역할의 첫 번째 사용자를 자동 선택
      const matchingUser = approverUsers.find((u) => u.role === s.step_approver_role);
      setForm({
        invoice_type_id: s.invoice_type_id || '',
        amount_threshold_min: String(s.amount_threshold_min),
        amount_threshold_max: s.amount_threshold_max !== null ? String(s.amount_threshold_max) : '',
        step: String(s.step),
        approver_user_id: matchingUser?.id || '',
        is_active: s.is_active,
      });
      setError(`This rule uses role-based assignment (${s.step_approver_role}). Please select a specific approver.`);
    } else {
      setForm({
        invoice_type_id: s.invoice_type_id || '',
        amount_threshold_min: String(s.amount_threshold_min),
        amount_threshold_max: s.amount_threshold_max !== null ? String(s.amount_threshold_max) : '',
        step: String(s.step),
        approver_user_id: s.approver_user_id || '',
        is_active: s.is_active,
      });
      setError('');
    }
    setEditingId(s.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this approval rule?')) return;
    try {
      await api.delete(`/api/v1/approval-settings/${id}`);
      fetchSettings();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  const getTypeName = (typeId: string | null) => {
    if (!typeId) return 'All Types';
    const t = invoiceTypes.find((it) => it.id === typeId);
    return t ? t.type_name : typeId;
  };

  const formatAmount = (v: number | null) =>
    v !== null ? `$${v.toLocaleString()}` : 'Unlimited';

  const getApproverDisplay = (s: ApprovalSetting) => {
    if (s.approver_name) return s.approver_name;
    if (s.approver_user_id) {
      const u = approverUsers.find((au) => au.id === s.approver_user_id);
      return u ? u.full_name : s.approver_user_id.slice(0, 8);
    }
    return s.step_approver_role || '—';
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="page-header flex items-center justify-between mb-6">
            <div>
              <h2 className="page-title">Approval Settings</h2>
              <p className="page-subtitle">{total} rules configured</p>
            </div>
            <button
              onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
              className="btn-primary"
            >
              {showForm ? 'Cancel' : '+ New Rule'}
            </button>
          </div>

          {showForm && (
            <div className="card p-6 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                {editingId ? 'Edit Approval Rule' : 'New Approval Rule'}
              </h3>
              {error && <div className="alert-error mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
                <div>
                  <label className="label">Invoice Type</label>
                  <select
                    value={form.invoice_type_id}
                    onChange={(e) => setForm({ ...form, invoice_type_id: e.target.value })}
                    className="input w-full"
                  >
                    <option value="">All Types</option>
                    {invoiceTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.type_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Min Amount ($)</label>
                  <input
                    type="number" min="0" step="0.01" required
                    value={form.amount_threshold_min}
                    onChange={(e) => setForm({ ...form, amount_threshold_min: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Max Amount ($) <span className="text-gray-400">(blank=unlimited)</span></label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.amount_threshold_max}
                    onChange={(e) => setForm({ ...form, amount_threshold_max: e.target.value })}
                    placeholder="Unlimited"
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Step *</label>
                  <input
                    type="number" min="1" required
                    value={form.step}
                    onChange={(e) => setForm({ ...form, step: e.target.value })}
                    className="input w-full"
                  />
                </div>
                <div>
                  <label className="label">Assigned Approver *</label>
                  <select
                    value={form.approver_user_id}
                    onChange={(e) => setForm({ ...form, approver_user_id: e.target.value })}
                    className="input w-full"
                    required
                  >
                    <option value="">Select approver...</option>
                    {approverUsers.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox" checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="accent-primary-500 rounded"
                    />
                    Active
                  </label>
                  <button
                    type="submit"
                    className="btn-primary"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : settings.length === 0 ? (
              <div className="empty-state">
                No approval rules configured. Default: single COMPANY_ADMIN approval for all invoices.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">Invoice Type</th>
                    <th className="table-th text-right">Min Amount</th>
                    <th className="table-th text-right">Max Amount</th>
                    <th className="table-th text-center">Step</th>
                    <th className="table-th text-left">Assigned To</th>
                    <th className="table-th text-center">Status</th>
                    <th className="table-th text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((s) => (
                    <tr key={s.id} className="table-row">
                      <td className="table-td">{getTypeName(s.invoice_type_id)}</td>
                      <td className="table-td text-right font-mono text-xs">${s.amount_threshold_min.toLocaleString()}</td>
                      <td className="table-td text-right font-mono text-xs">{formatAmount(s.amount_threshold_max)}</td>
                      <td className="table-td text-center">
                        <span className="badge-blue">
                          Step {s.step}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className="badge-orange">
                          {getApproverDisplay(s)}
                        </span>
                      </td>
                      <td className="table-td text-center">
                        <span className={s.is_active ? 'badge-green' : 'badge-red'}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td text-center">
                        <button onClick={() => handleEdit(s)}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium mr-2">Edit</button>
                        <button onClick={() => handleDelete(s.id)}
                          className="text-rose-500 hover:text-rose-600 text-xs font-medium">Delete</button>
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
