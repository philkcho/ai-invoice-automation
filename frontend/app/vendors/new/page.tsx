'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { DuplicateWarning, VendorCreateResponse } from '@/types';
import RequireRole from '@/components/common/RequireRole';

export default function NewVendorPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState<DuplicateWarning[]>([]);

  const [form, setForm] = useState({
    vendor_code: '',
    company_name: '',
    dba: '',
    ein: '',
    vendor_category: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    billing_address: '',
    billing_city: '',
    billing_state: '',
    billing_zip: '',
    payment_terms: '',
    bank_name: '',
    ach_routing: '',
    ach_account: '',
    notes: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setWarnings([]);
    setLoading(true);

    try {
      const payload: Record<string, string | null> = {};
      // 빈 문자열을 null로 변환
      for (const [key, value] of Object.entries(form)) {
        payload[key] = value === '' ? null : value;
      }

      const { data } = await api.post<VendorCreateResponse>('/api/v1/vendors', payload);

      if (data.warnings.length > 0) {
        setWarnings(data.warnings);
      }

      router.push('/vendors');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="max-w-3xl">
            <h2 className="page-title mb-6">New Vendor</h2>

            {error && (
              <div className="alert-error">{error}</div>
            )}

            {warnings.length > 0 && (
              <div className="alert-warning">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">Duplicate Warnings</h3>
                {warnings.map((w, i) => (
                  <div key={i} className="text-sm text-yellow-700 mb-1">
                    <span className="font-mono text-xs bg-yellow-100 px-1 rounded mr-1">{w.type}</span>
                    {w.message}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* 기본 정보 */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="label">Vendor Code *</label>
                    <input name="vendor_code" required value={form.vendor_code} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Company Name *</label>
                    <input name="company_name" required value={form.company_name} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">DBA</label>
                    <input name="dba" value={form.dba} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">EIN</label>
                    <input name="ein" value={form.ein} onChange={handleChange} placeholder="12-3456789"
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <select name="vendor_category" value={form.vendor_category} onChange={handleChange}
                      className="input w-full">
                      <option value="">Select...</option>
                      <option value="SERVICE">Service</option>
                      <option value="PRODUCT">Product</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Payment Terms</label>
                    <input name="payment_terms" value={form.payment_terms} onChange={handleChange} placeholder="Net30"
                      className="input w-full" />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Name</label>
                    <input name="contact_name" value={form.contact_name} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Phone</label>
                    <input name="contact_phone" value={form.contact_phone} onChange={handleChange}
                      className="input w-full" />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Billing Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Address</label>
                    <input name="billing_address" value={form.billing_address} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">City</label>
                    <input name="billing_city" value={form.billing_city} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">State</label>
                      <input name="billing_state" value={form.billing_state} onChange={handleChange}
                        className="input w-full" />
                    </div>
                    <div>
                      <label className="label">ZIP</label>
                      <input name="billing_zip" value={form.billing_zip} onChange={handleChange}
                        className="input w-full" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Banking / ACH */}
              <div className="card p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Banking (ACH)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Bank Name</label>
                    <input name="bank_name" value={form.bank_name} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Routing Number</label>
                    <input name="ach_routing" value={form.ach_routing} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Account Number</label>
                    <input name="ach_account" value={form.ach_account} onChange={handleChange}
                      className="input w-full" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="card p-6">
                <label className="label">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                  className="input w-full" />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="btn-primary disabled:opacity-50">
                  {loading ? 'Creating...' : 'Create Vendor'}
                </button>
                <button type="button" onClick={() => router.push('/vendors')}
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
