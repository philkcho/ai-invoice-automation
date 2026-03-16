'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useTaxRates, useCreateTaxRate } from '@/hooks/useApi';
import { getErrorMessage } from '@/lib/error';
import { useToastStore } from '@/stores/toast';

const TAX_TYPES = ['FEDERAL', 'STATE_SALES', 'STATE_USE', 'EXEMPT'];

export default function TaxRatesPage() {
  const [showForm, setShowForm] = useState(false);
  const [stateFilter, setStateFilter] = useState('');
  const [form, setForm] = useState({
    tax_name: '',
    tax_type: 'STATE_SALES',
    state_code: '',
    rate_pct: '',
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    notes: '',
  });
  const [error, setError] = useState('');
  const addToast = useToastStore((s) => s.addToast);

  const { data, isLoading } = useTaxRates({
    limit: 100,
    state_code: stateFilter || undefined,
  });

  const createMutation = useCreateTaxRate();

  const taxRates = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createMutation.mutateAsync({
        tax_name: form.tax_name,
        tax_type: form.tax_type,
        state_code: form.state_code || null,
        rate_pct: parseFloat(form.rate_pct),
        effective_date: form.effective_date,
        expiry_date: form.expiry_date || null,
        notes: form.notes || null,
      });
      setShowForm(false);
      setForm({ tax_name: '', tax_type: 'STATE_SALES', state_code: '', rate_pct: '', effective_date: new Date().toISOString().split('T')[0], expiry_date: '', notes: '' });
      addToast('success', 'Tax rate created successfully');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
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
              <h2 className="text-xl font-semibold text-gray-800">Tax Rates</h2>
              <p className="text-sm text-gray-500">{total} tax rates</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors"
            >
              {showForm ? 'Cancel' : '+ New Tax Rate'}
            </button>
          </div>

          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
              {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Name *</label>
                  <input name="tax_name" required value={form.tax_name} onChange={handleChange}
                    placeholder="e.g. CA Sales Tax"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Type *</label>
                  <select name="tax_type" value={form.tax_type} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                    {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">State</label>
                  <input name="state_code" value={form.state_code} onChange={handleChange}
                    placeholder="CA" maxLength={5}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Rate (%) *</label>
                  <input name="rate_pct" type="number" step="0.0001" required value={form.rate_pct} onChange={handleChange}
                    placeholder="8.2500"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Effective Date *</label>
                  <input name="effective_date" type="date" required value={form.effective_date} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 mb-1">Expiry Date</label>
                  <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="col-span-2 flex items-end">
                  <button type="submit" disabled={createMutation.isPending}
                    className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Filter by state code (e.g. CA)..."
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
                maxLength={5}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : taxRates.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No tax rates found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">State</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Rate (%)</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Effective</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Expiry</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Scope</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRates.map((t) => (
                    <tr key={t.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{t.tax_name}</td>
                      <td className="px-4 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{t.tax_type}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{t.state_code || '\u2014'}</td>
                      <td className="px-4 py-3 text-right font-mono">{Number(t.rate_pct).toFixed(4)}</td>
                      <td className="px-4 py-3 text-gray-600">{t.effective_date}</td>
                      <td className="px-4 py-3 text-gray-600">{t.expiry_date || '\u2014'}</td>
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
