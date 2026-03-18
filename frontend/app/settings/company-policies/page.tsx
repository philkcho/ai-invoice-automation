'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';
import { useAuthStore } from '@/stores/auth';

interface CompanyPolicy {
  id: string;
  company_id: string;
  policy_name: string;
  policy_text: string;
  category: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const CATEGORIES = ['APPROVAL', 'VALIDATION', 'PAYMENT', 'GENERAL'] as const;

const categoryLabels: Record<string, string> = {
  APPROVAL: 'Approval',
  VALIDATION: 'Validation',
  PAYMENT: 'Payment',
  GENERAL: 'General',
};

export default function CompanyPoliciesPage() {
  const user = useAuthStore((s) => s.user);
  const [policies, setPolicies] = useState<CompanyPolicy[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    policy_name: '',
    policy_text: '',
    category: 'GENERAL',
    is_active: true,
  });
  const [error, setError] = useState('');

  const fetchPolicies = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/company-policies', { params: { limit: 100 } });
      setPolicies(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      console.error('Failed to fetch company policies', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();

    const handleNavReset = () => {
      setShowForm(false);
      resetForm();
    };
    window.addEventListener('sidebar-nav-reset', handleNavReset);
    return () => window.removeEventListener('sidebar-nav-reset', handleNavReset);
  }, []);

  const resetForm = () => {
    setForm({
      policy_name: '',
      policy_text: '',
      category: 'GENERAL',
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
        policy_name: form.policy_name,
        policy_text: form.policy_text,
        category: form.category,
        is_active: form.is_active,
      };

      if (!editingId) {
        payload.company_id = user?.company_id;
      }

      if (editingId) {
        await api.patch(`/api/v1/company-policies/${editingId}`, payload);
      } else {
        await api.post('/api/v1/company-policies', payload);
      }
      setShowForm(false);
      resetForm();
      fetchPolicies();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleEdit = (p: CompanyPolicy) => {
    setForm({
      policy_name: p.policy_name,
      policy_text: p.policy_text,
      category: p.category,
      is_active: p.is_active,
    });
    setEditingId(p.id);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('이 정책을 삭제하시겠습니까?')) return;
    try {
      await api.delete(`/api/v1/company-policies/${id}`);
      fetchPolicies();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  const getCategoryBadgeClass = (category: string) => {
    switch (category) {
      case 'APPROVAL': return 'badge-purple';
      case 'VALIDATION': return 'badge-blue';
      case 'PAYMENT': return 'badge-orange';
      default: return 'badge-gray';
    }
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
              <h2 className="page-title">Company Policies</h2>
              <p className="page-subtitle">{total} policies configured</p>
            </div>
            <button
              onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
              className="btn-primary"
            >
              {showForm ? 'Cancel' : '+ New Policy'}
            </button>
          </div>

          {showForm && (
            <div className="card p-6 mb-4">
              <h3 className="text-sm font-medium text-gray-700 mb-4">
                {editingId ? 'Edit Policy' : 'New Policy'}
              </h3>
              {error && <div className="alert-error mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Policy Name *</label>
                    <input
                      type="text" required
                      value={form.policy_name}
                      onChange={(e) => setForm({ ...form, policy_name: e.target.value })}
                      placeholder="e.g. Invoice amount limit"
                      className="input w-full"
                    />
                  </div>
                  <div>
                    <label className="label">Category *</label>
                    <select
                      value={form.category}
                      onChange={(e) => setForm({ ...form, category: e.target.value })}
                      className="input w-full"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>{categoryLabels[c]}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
                      <input
                        type="checkbox" checked={form.is_active}
                        onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                        className="accent-primary-500 rounded"
                      />
                      Active
                    </label>
                  </div>
                </div>
                <div>
                  <label className="label">Policy Text *</label>
                  <textarea
                    required rows={4}
                    value={form.policy_text}
                    onChange={(e) => setForm({ ...form, policy_text: e.target.value })}
                    placeholder="Describe the policy in detail. AI will reference this text when validating invoices."
                    className="input w-full"
                  />
                </div>
                <div className="flex justify-end">
                  <button type="submit" className="btn-primary">
                    {editingId ? 'Update' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : policies.length === 0 ? (
              <div className="empty-state">
                No company policies configured. Add policies for AI to reference during invoice validation.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left w-16"></th>
                    <th className="table-th text-left">Policy Name</th>
                    <th className="table-th text-left">Category</th>
                    <th className="table-th text-center">Status</th>
                    <th className="table-th text-right w-16"></th>
                  </tr>
                </thead>
                <tbody>
                  {policies.map((p) => (
                    <tr key={p.id} className="table-row">
                      <td className="table-td">
                        <button onClick={() => handleEdit(p)}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium">Edit</button>
                      </td>
                      <td className="table-td">
                        <div>
                          <div className="font-medium text-gray-900">{p.policy_name}</div>
                          <div className="text-xs text-gray-500 mt-0.5 line-clamp-2">{p.policy_text}</div>
                        </div>
                      </td>
                      <td className="table-td">
                        <span className={getCategoryBadgeClass(p.category)}>
                          {categoryLabels[p.category] || p.category}
                        </span>
                      </td>
                      <td className="table-td text-center">
                        <span className={p.is_active ? 'badge-green' : 'badge-red'}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td text-right">
                        <button onClick={() => handleDelete(p.id)}
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
