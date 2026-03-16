'use client';

import { useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useTaxRates, useCreateTaxRate } from '@/hooks/useApi';
import { getErrorMessage } from '@/lib/error';
import { useToastStore } from '@/stores/toast';
import RequireRole from '@/components/common/RequireRole';

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
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="page-header flex items-center justify-between mb-6">
            <div>
              <h2 className="page-title">Tax Rates</h2>
              <p className="page-subtitle">{total} tax rates</p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="btn-primary"
            >
              {showForm ? 'Cancel' : '+ New Tax Rate'}
            </button>
          </div>

          {showForm && (
            <div className="card p-6 mb-4">
              {error && <div className="alert-error mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="grid grid-cols-4 gap-4">
                <div>
                  <label className="label">Name *</label>
                  <input name="tax_name" required value={form.tax_name} onChange={handleChange}
                    placeholder="e.g. CA Sales Tax"
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Type *</label>
                  <select name="tax_type" value={form.tax_type} onChange={handleChange}
                    className="input w-full">
                    {TAX_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">State</label>
                  <input name="state_code" value={form.state_code} onChange={handleChange}
                    placeholder="CA" maxLength={5}
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Rate (%) *</label>
                  <input name="rate_pct" type="number" step="0.0001" required value={form.rate_pct} onChange={handleChange}
                    placeholder="8.2500"
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Effective Date *</label>
                  <input name="effective_date" type="date" required value={form.effective_date} onChange={handleChange}
                    className="input w-full" />
                </div>
                <div>
                  <label className="label">Expiry Date</label>
                  <input name="expiry_date" type="date" value={form.expiry_date} onChange={handleChange}
                    className="input w-full" />
                </div>
                <div className="col-span-2 flex items-end">
                  <button type="submit" disabled={createMutation.isPending}
                    className="btn-primary disabled:opacity-50">
                    {createMutation.isPending ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="card p-4 mb-4">
            <div className="filter-bar">
              <input
                type="text"
                placeholder="Filter by state code (e.g. CA)..."
                value={stateFilter}
                onChange={(e) => setStateFilter(e.target.value.toUpperCase())}
                maxLength={5}
                className="input w-48"
              />
            </div>
          </div>

          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : taxRates.length === 0 ? (
              <div className="empty-state">No tax rates found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">Name</th>
                    <th className="table-th text-left">Type</th>
                    <th className="table-th text-left">State</th>
                    <th className="table-th text-right">Rate (%)</th>
                    <th className="table-th text-left">Effective</th>
                    <th className="table-th text-left">Expiry</th>
                    <th className="table-th text-left">Scope</th>
                    <th className="table-th text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {taxRates.map((t) => (
                    <tr key={t.id} className="table-row">
                      <td className="table-td font-medium text-gray-800">{t.tax_name}</td>
                      <td className="table-td">
                        <span className="badge-gray">{t.tax_type}</span>
                      </td>
                      <td className="table-td text-gray-600">{t.state_code || '\u2014'}</td>
                      <td className="table-td text-right font-mono">{Number(t.rate_pct).toFixed(4)}</td>
                      <td className="table-td text-gray-600">{t.effective_date}</td>
                      <td className="table-td text-gray-600">{t.expiry_date || '\u2014'}</td>
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
