'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

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
    } catch (err) {
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
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Invoice Types</h2>
              <p className="text-sm text-gray-500">{total} types</p>
            </div>
            <div className="flex gap-2">
              {total === 0 && (
                <button onClick={handleSeedDefaults} disabled={seeding}
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm transition-colors">
                  {seeding ? 'Seeding...' : 'Seed 6 Defaults'}
                </button>
              )}
              <button onClick={() => setShowForm(!showForm)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors">
                {showForm ? 'Cancel' : '+ New Type'}
              </button>
            </div>
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
              {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Code *</label>
                  <input name="type_code" required value={form.type_code} onChange={handleChange}
                    placeholder="e.g. PO"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name *</label>
                  <input name="type_name" required value={form.type_name} onChange={handleChange}
                    placeholder="e.g. Purchase Order"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Sort Order</label>
                  <input name="sort_order" type="number" value={form.sort_order} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-1 text-sm text-gray-600">
                    <input name="requires_po" type="checkbox" checked={form.requires_po}
                      onChange={handleChange} className="rounded" /> PO Required
                  </label>
                  <label className="flex items-center gap-1 text-sm text-gray-600">
                    <input name="requires_approver" type="checkbox" checked={form.requires_approver}
                      onChange={handleChange} className="rounded" /> Approver Required
                  </label>
                </div>
                <div className="col-span-3">
                  <label className="block text-sm text-gray-600 mb-1">Description</label>
                  <input name="description" value={form.description} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <button type="submit"
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors">
                    Create
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : types.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No invoice types found. Click "Seed 6 Defaults" to create standard types.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Code</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Description</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">PO Req</th>
                    <th className="text-center px-4 py-3 font-medium text-gray-600">Approver Req</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Scope</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {types.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-medium">{t.type_code}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{t.type_name}</td>
                      <td className="px-4 py-3 text-gray-600 text-xs">{t.description || '—'}</td>
                      <td className="px-4 py-3 text-center">{t.requires_po ? '✓' : '—'}</td>
                      <td className="px-4 py-3 text-center">{t.requires_approver ? '✓' : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.company_id ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                        }`}>
                          {t.company_id ? 'Company' : 'System'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          t.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {t.is_active ? 'Active' : 'Inactive'}
                        </span>
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
