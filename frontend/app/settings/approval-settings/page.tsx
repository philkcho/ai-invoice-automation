'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { useAuthStore } from '@/stores/auth';

interface InvoiceType {
  id: string;
  type_code: string;
  type_name: string;
}

interface ApprovalSetting {
  id: string;
  company_id: string;
  invoice_type_id: string | null;
  amount_threshold_min: number;
  amount_threshold_max: number | null;
  step: number;
  step_approver_role: string;
  is_active: boolean;
  created_at: string;
}

export default function ApprovalSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const [settings, setSettings] = useState<ApprovalSetting[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<InvoiceType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    invoice_type_id: '',
    amount_threshold_min: '0',
    amount_threshold_max: '',
    step: '1',
    step_approver_role: 'APPROVER',
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

  useEffect(() => {
    fetchSettings();
    fetchInvoiceTypes();
  }, []);

  const resetForm = () => {
    setForm({
      invoice_type_id: '',
      amount_threshold_min: '0',
      amount_threshold_max: '',
      step: '1',
      step_approver_role: 'APPROVER',
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
        step_approver_role: form.step_approver_role,
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
    setForm({
      invoice_type_id: s.invoice_type_id || '',
      amount_threshold_min: String(s.amount_threshold_min),
      amount_threshold_max: s.amount_threshold_max !== null ? String(s.amount_threshold_max) : '',
      step: String(s.step),
      step_approver_role: s.step_approver_role,
      is_active: s.is_active,
    });
    setEditingId(s.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 승인 설정을 삭제하시겠습니까?')) return;
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

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Approval Settings</h2>
              <p className="text-sm text-gray-500">{total} rules configured</p>
            </div>
            <button
              onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors"
            >
              {showForm ? 'Cancel' : '+ New Rule'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                {editingId ? 'Edit Approval Rule' : 'New Approval Rule'}
              </h3>
              {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Invoice Type</label>
                  <select
                    value={form.invoice_type_id}
                    onChange={(e) => setForm({ ...form, invoice_type_id: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">All Types</option>
                    {invoiceTypes.map((t) => (
                      <option key={t.id} value={t.id}>{t.type_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Min Amount ($)</label>
                  <input
                    type="number" min="0" step="0.01" required
                    value={form.amount_threshold_min}
                    onChange={(e) => setForm({ ...form, amount_threshold_min: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Max Amount ($) <span className="text-gray-400">(blank=unlimited)</span></label>
                  <input
                    type="number" min="0" step="0.01"
                    value={form.amount_threshold_max}
                    onChange={(e) => setForm({ ...form, amount_threshold_max: e.target.value })}
                    placeholder="Unlimited"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Step *</label>
                  <input
                    type="number" min="1" required
                    value={form.step}
                    onChange={(e) => setForm({ ...form, step: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Approver Role *</label>
                  <select
                    value={form.step_approver_role}
                    onChange={(e) => setForm({ ...form, step_approver_role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="APPROVER">Approver</option>
                    <option value="COMPANY_ADMIN">Company Admin</option>
                  </select>
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox" checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="rounded"
                    />
                    Active
                  </label>
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors"
                  >
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : settings.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No approval rules configured. Default: single COMPANY_ADMIN approval for all invoices.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Invoice Type</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Min Amount</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Max Amount</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Step</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((s) => (
                    <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">{getTypeName(s.invoice_type_id)}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">${s.amount_threshold_min.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right font-mono text-xs">{formatAmount(s.amount_threshold_max)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="bg-blue-50 text-blue-700 text-xs px-2 py-0.5 rounded-full">
                          Step {s.step}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          s.step_approver_role === 'COMPANY_ADMIN'
                            ? 'bg-purple-50 text-purple-700'
                            : 'bg-orange-50 text-orange-700'
                        }`}>
                          {s.step_approver_role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          s.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {s.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button onClick={() => handleEdit(s)}
                          className="text-blue-600 hover:text-blue-800 text-xs mr-2">Edit</button>
                        <button onClick={() => handleDelete(s.id)}
                          className="text-red-600 hover:text-red-800 text-xs">Delete</button>
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
