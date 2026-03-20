'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useCreateCompany } from '@/hooks/useApi';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'KRW', 'CNY', 'CAD', 'AUD', 'CHF', 'SGD'];

export default function NewCompanyPage() {
  const router = useRouter();
  const addToast = useToastStore((s) => s.addToast);
  const createMutation = useCreateCompany();
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    company_code: '',
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
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createMutation.mutateAsync({
        company_code: form.company_code,
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
      });
      addToast('success', 'Company created successfully');
      router.push('/companies');
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
          <RequireRole roles={['SUPER_ADMIN']}>
          <div className="max-w-3xl">
            <h2 className="page-title mb-6">New Company</h2>

            {error && (
              <div className="alert-error">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 정보 */}
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Company Code *</label>
                    <input name="company_code" required value={form.company_code} onChange={handleChange}
                      maxLength={20} placeholder="e.g. ACME"
                      className="input w-full" />
                    <p className="text-xs text-gray-400 mt-1">Unique identifier, max 20 chars</p>
                  </div>
                  <div>
                    <label className="label">Company Name *</label>
                    <input name="company_name" required value={form.company_name} onChange={handleChange}
                      maxLength={255} placeholder="e.g. Acme Corporation"
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">EIN (Tax ID)</label>
                    <input name="ein" value={form.ein} onChange={handleChange}
                      maxLength={20} placeholder="e.g. 12-3456789"
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Default Currency</label>
                    <select name="default_currency" value={form.default_currency} onChange={handleChange}
                      className="input w-full">
                      {CURRENCIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Established Date</label>
                    <input name="established_date" type="date" value={form.established_date} onChange={handleChange}
                      className="input w-full" />
                    <p className="text-xs text-gray-400 mt-1">회사 등록일</p>
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
                      placeholder="e.g. 100 Main Street, Suite 500"
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input name="city" value={form.city} onChange={handleChange}
                      placeholder="e.g. New York"
                      className="input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">State</label>
                      <input name="state" value={form.state} onChange={handleChange}
                        placeholder="e.g. NY" maxLength={20}
                        className="input w-full" />
                    </div>
                    <div>
                      <label className="label">ZIP</label>
                      <input name="zip" value={form.zip} onChange={handleChange}
                        placeholder="e.g. 10001" maxLength={20}
                        className="input w-full" />
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
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Contact Email</label>
                    <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Contact Phone</label>
                    <input name="contact_phone" value={form.contact_phone} onChange={handleChange}
                      className="input w-full" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={createMutation.isPending}
                  className="btn-primary disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create Company'}
                </button>
                <button type="button" onClick={() => router.push('/companies')}
                  className="btn-secondary">
                  Cancel
                </button>
              </div>
            </form>
          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
