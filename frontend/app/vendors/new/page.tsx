'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { DuplicateWarning, VendorCreateResponse } from '@/types';

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
        <main className="flex-1 bg-gray-50 p-6">
          <div className="max-w-3xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">New Vendor</h2>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>
            )}

            {warnings.length > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-4">
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
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Basic Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vendor Code *</label>
                    <input name="vendor_code" required value={form.vendor_code} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Company Name *</label>
                    <input name="company_name" required value={form.company_name} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">DBA</label>
                    <input name="dba" value={form.dba} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">EIN</label>
                    <input name="ein" value={form.ein} onChange={handleChange} placeholder="12-3456789"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Category</label>
                    <select name="vendor_category" value={form.vendor_category} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      <option value="">Select...</option>
                      <option value="SERVICE">Service</option>
                      <option value="PRODUCT">Product</option>
                      <option value="BOTH">Both</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                    <input name="payment_terms" value={form.payment_terms} onChange={handleChange} placeholder="Net30"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Name</label>
                    <input name="contact_name" value={form.contact_name} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Email</label>
                    <input name="contact_email" type="email" value={form.contact_email} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Phone</label>
                    <input name="contact_phone" value={form.contact_phone} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Billing Address</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Address</label>
                    <input name="billing_address" value={form.billing_address} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">City</label>
                    <input name="billing_city" value={form.billing_city} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">State</label>
                      <input name="billing_state" value={form.billing_state} onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">ZIP</label>
                      <input name="billing_zip" value={form.billing_zip} onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Banking / ACH */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Banking (ACH)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Bank Name</label>
                    <input name="bank_name" value={form.bank_name} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Routing Number</label>
                    <input name="ach_routing" value={form.ach_routing} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Account Number</label>
                    <input name="ach_account" value={form.ach_account} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <label className="block text-sm text-gray-600 mb-1">Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
                  {loading ? 'Creating...' : 'Create Vendor'}
                </button>
                <button type="button" onClick={() => router.push('/vendors')}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
