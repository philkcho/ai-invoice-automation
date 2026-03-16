'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

interface InvoiceType {
  id: string;
  company_id: string | null;
  type_code: string;
  type_name: string;
  description: string | null;
  requires_po: boolean;
  requires_approver: boolean;
  is_active: boolean;
  sort_order: number;
}

export default function InvoiceTypesPage() {
  const [types, setTypes] = useState<InvoiceType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [form, setForm] = useState({
    type_code: '',
    type_name: '',
    description: '',
    requires_po: false,
    requires_approver: false,
    sort_order: '0',
  });
  const [error, setError] = useState('');

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/invoice-types', { params: { limit: 100 } });
      setTypes(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      console.error('Failed to fetch invoice types', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTypes(); }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      setForm({ ...form, [name]: (e.target as HTMLInputElement).checked });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await api.post('/api/v1/invoice-types', {
        type_code: form.type_code,
        type_name: form.type_name,
        description: form.description || null,
        requires_po: form.requires_po,
        requires_approver: form.requires_approver,
        sort_order: parseInt(form.sort_order) || 0,
      });
      setShowForm(false);
      setForm({ type_code: '', type_name: '', description: '', requires_po: false, requires_approver: false, sort_order: '0' });
      fetchTypes();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const { data } = await api.post('/api/v1/invoice-types/seed-defaults');
      alert(data.message);
      fetchTypes();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setSeeding(false);
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
              <h2 className="page-title">Invoice Types</h2>
              <p className="page-subtitle">{total} types</p>
            </div>
            <div className="flex gap-2">
              {total === 0 && (
                <button onClick={handleSeedDefaults} disabled={seeding}
                  className="btn-success disabled:opacity-50">
                  {seeding ? 'Seeding...' : 'Seed 6 Defaults'}
                </button>
              )}
              <button onClick={() => setShowForm(!showForm)}
                className="btn-primary">
                {showForm ? 'Cancel' : '+ New Type'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="card p-6 mb-4">
              {error && <div className="alert-error mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">Code *</label>
                  <input name="type_code" required value={form.type_code} onChange={handleChange}
                    placeholder="e.g. PO"
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Name *</label>
                  <input name="type_name" required value={form.type_name} onChange={handleChange}
                    placeholder="e.g. Purchase Order"
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Sort Order</label>
                  <input name="sort_order" type="number" value={form.sort_order} onChange={handleChange}
                    className="input w-full" />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-1 text-sm text-gray-600">
                    <input name="requires_po" type="checkbox" checked={form.requires_po}
                      onChange={handleChange} className="accent-primary-500 rounded" /> PO Required
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-600">
                    <input name="requires_approver" type="checkbox" checked={form.requires_approver}
                      onChange={handleChange} className="accent-primary-500 rounded" /> Approver Required
                  </label>
                </div>
                <div className="col-span-3">
                  <label className="label">Description</label>
                  <input name="description" value={form.description} onChange={handleChange}
                    className="input w-full" />
                </div>
                <div className="flex items-end">
                  <button type="submit"
                    className="btn-primary">
                    Create
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : types.length === 0 ? (
              <div className="empty-state">No invoice types found. Click &quot;Seed 6 Defaults&quot; to create standard types.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">Code</th>
                    <th className="table-th text-left">Name</th>
                    <th className="table-th text-left">Description</th>
                    <th className="table-th text-center">PO Req</th>
                    <th className="table-th text-center">Approver Req</th>
                    <th className="table-th text-left">Scope</th>
                    <th className="table-th text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.id} className="table-row">
                      <td className="table-td font-mono text-xs font-medium">{t.type_code}</td>
                      <td className="table-td font-medium text-gray-800">{t.type_name}</td>
                      <td className="table-td text-gray-600 text-xs">{t.description || '—'}</td>
                      <td className="table-td text-center">{t.requires_po ? '✓' : '—'}</td>
                      <td className="table-td text-center">{t.requires_approver ? '✓' : '—'}</td>
                      <td className="table-td">
                        <span className={t.company_id ? 'badge-blue' : 'badge-purple'}>
                          {t.company_id ? 'Company' : 'System'}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className={t.is_active ? 'badge-green' : 'badge-red'}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
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
