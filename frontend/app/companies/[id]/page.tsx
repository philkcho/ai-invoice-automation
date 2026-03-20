'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useCompany, useUpdateCompany } from '@/hooks/useApi';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'CAD', 'AUD', 'CHF', 'SGD'];

export default function CompanyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const { data: company, isLoading } = useCompany(id);
  const updateMutation = useUpdateCompany();
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);

  const [form, setForm] = useState({
    company_name: '',
    ein: '',
    address: '',
    city: '',
    state: '',
    zip: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    established_date: '',
    default_currency: 'USD',
    status: 'ACTIVE' as string,
  });

  useEffect(() => {
    if (company) {
      setForm({
        company_name: company.company_name,
        ein: company.ein || '',
        address: company.address || '',
        city: company.city || '',
        state: company.state || '',
        zip: company.zip || '',
        contact_name: company.contact_name || '',
        contact_email: company.contact_email || '',
        contact_phone: company.contact_phone || '',
        established_date: company.established_date || '',
        default_currency: company.default_currency,
        status: company.status,
      });
    }
  }, [company]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await updateMutation.mutateAsync({
        id,
        company_name: form.company_name,
        ein: form.ein || null,
        address: form.address || null,
        city: form.city || null,
        state: form.state || null,
        zip: form.zip || null,
        contact_name: form.contact_name || null,
        contact_email: form.contact_email || null,
        contact_phone: form.contact_phone || null,
        established_date: form.established_date || null,
        default_currency: form.default_currency,
        status: form.status,
      });
      addToast('success', 'Company updated successfully');
      setEditing(false);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 bg-surface-50 p-8">
            <div className="loading-state">Loading...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!company) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 bg-surface-50 p-8">
            <div className="empty-state">Company not found</div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN']}>
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="page-title">{company.company_name}</h2>
                <p className="page-subtitle">
                  <span className="font-mono">{company.company_code}</span>
                  {' · '}
                  <span className={company.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}>
                    {company.status}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                {!editing && (
                  <button onClick={() => setEditing(true)} className="btn-primary">
                    Edit
                  </button>
                )}
                <button onClick={() => router.push('/companies')} className="btn-secondary">
                  Back
                </button>
              </div>
            </div>

            {error && (
              <div className="alert-error">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 정보 */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Company Code</label>
                    <input value={company.company_code} disabled
                      className="input w-full bg-gray-50" />
                    <p className="text-xs text-gray-400 mt-1">Cannot be changed after creation</p>
                  </div>
                  <div>
                    <label className="label">Company Name *</label>
                    <input name="company_name" required value={form.company_name} onChange={handleChange}
                      disabled={!editing} className="input w-full" />
                  </div>
                  <div>
                    <label className="label">EIN (Tax ID)</label>
                    <input name="ein" value={form.ein} onChange={handleChange}
                      disabled={!editing} maxLength={20}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Default Currency</label>
                    <select name="default_currency" value={form.default_currency} onChange={handleChange}
                      disabled={!editing} className="input w-full">
                      {CURRENCIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Established Date</label>
                    <input name="established_date" type="date" value={form.established_date} onChange={handleChange}
                      disabled={!editing}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Status</label>
                    <select name="status" value={form.status} onChange={handleChange}
                      disabled={!editing} className="input w-full">
                      <option value="ACTIVE">Active</option>
                      <option value="INACTIVE">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 주소 */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Street Address</label>
                    <input name="address" value={form.address} onChange={handleChange}
                      disabled={!editing} className="input w-full" />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input name="city" value={form.city} onChange={handleChange}
                      disabled={!editing} className="input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">State</label>
                      <input name="state" value={form.state} onChange={handleChange}
                        disabled={!editing} className="input w-full" />
                    </div>
                    <div>
                      <label className="label">ZIP</label>
                      <input name="zip" value={form.zip} onChange={handleChange}
                        disabled={!editing} className="input w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* 연락처 */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Contact Name</label>
                    <input name="contact_name" value={form.contact_name} onChange={handleChange}
                      disabled={!editing} className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Contact Email</label>
                    <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange}
                      disabled={!editing} className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Contact Phone</label>
                    <input name="contact_phone" value={form.contact_phone} onChange={handleChange}
                      disabled={!editing} className="input w-full" />
                  </div>
                </div>
              </div>

              {/* 메타 정보 */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">System Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Created: </span>
                    {new Date(company.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Updated: </span>
                    {new Date(company.updated_at).toLocaleString()}
                  </div>
                </div>
              </div>

              {editing && (
                <div className="flex gap-3">
                  <button type="submit" disabled={updateMutation.isPending}
                    className="btn-primary disabled:opacity-50">
                    {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" onClick={() => { setEditing(false); setError(''); }}
                    className="btn-secondary">
                    Cancel
                  </button>
                </div>
              )}
            </form>
          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
