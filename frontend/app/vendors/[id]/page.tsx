'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useVendor, useUpdateVendor } from '@/hooks/useApi';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';

export default function VendorDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;
  const addToast = useToastStore((s) => s.addToast);
  const { data: vendor, isLoading } = useVendor(id);
  const updateMutation = useUpdateVendor();

  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
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
    notes: '',
    status: 'ACTIVE',
  });

  useEffect(() => {
    if (vendor) {
      setForm({
        company_name: vendor.company_name || '',
        dba: vendor.dba || '',
        ein: vendor.ein || '',
        vendor_category: vendor.vendor_category || '',
        contact_name: vendor.contact_name || '',
        contact_email: vendor.contact_email || '',
        contact_phone: vendor.contact_phone || '',
        billing_address: vendor.billing_address || '',
        billing_city: vendor.billing_city || '',
        billing_state: vendor.billing_state || '',
        billing_zip: vendor.billing_zip || '',
        payment_terms: vendor.payment_terms || '',
        notes: vendor.notes || '',
        status: vendor.status,
      });
    }
  }, [vendor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const payload: Record<string, unknown> = { id };
      for (const [key, value] of Object.entries(form)) {
        payload[key] = value === '' ? null : value;
      }
      await updateMutation.mutateAsync(payload as { id: string } & Record<string, unknown>);
      setEditing(false);
      addToast('success', 'Vendor updated successfully');
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
          <main className="flex-1 bg-gray-50 p-6">
            <div className="text-center text-gray-500 py-8">Loading...</div>
          </main>
        </div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 bg-gray-50 p-6">
            <div className="text-center text-gray-500 py-8">Vendor not found</div>
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
        <main className="flex-1 bg-gray-50 p-6">
          <div className="max-w-3xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">{vendor.company_name}</h2>
                <p className="text-sm text-gray-500">
                  {vendor.vendor_code} &middot;{' '}
                  <span className={vendor.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}>
                    {vendor.status}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                {!editing && (
                  <button onClick={() => setEditing(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors">
                    Edit
                  </button>
                )}
                <button onClick={() => router.push('/vendors')}
                  className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm transition-colors">
                  Back
                </button>
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Company Name</label>
                      <input name="company_name" value={form.company_name} onChange={handleChange}
                        disabled={!editing}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300 focus:ring-2 focus:ring-blue-500' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">DBA</label>
                      <input name="dba" value={form.dba} onChange={handleChange} disabled={!editing}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">EIN</label>
                      <input name="ein" value={form.ein} onChange={handleChange} disabled={!editing}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Category</label>
                      <select name="vendor_category" value={form.vendor_category} onChange={handleChange} disabled={!editing}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`}>
                        <option value="">None</option>
                        <option value="SERVICE">Service</option>
                        <option value="PRODUCT">Product</option>
                        <option value="BOTH">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Payment Terms</label>
                      <input name="payment_terms" value={form.payment_terms} onChange={handleChange} disabled={!editing}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                    {editing && (
                      <div>
                        <label className="block text-sm text-gray-600 mb-1">Status</label>
                        <select name="status" value={form.status} onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Name</label>
                      <input name="contact_name" value={form.contact_name} onChange={handleChange} disabled={!editing}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Email</label>
                      <input name="contact_email" value={form.contact_email} onChange={handleChange} disabled={!editing}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Phone</label>
                      <input name="contact_phone" value={form.contact_phone} onChange={handleChange} disabled={!editing}
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Billing Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <input name="billing_address" value={form.billing_address} onChange={handleChange} disabled={!editing}
                        placeholder="Address"
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                    <div>
                      <input name="billing_city" value={form.billing_city} onChange={handleChange} disabled={!editing}
                        placeholder="City"
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input name="billing_state" value={form.billing_state} onChange={handleChange} disabled={!editing}
                        placeholder="State"
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                      <input name="billing_zip" value={form.billing_zip} onChange={handleChange} disabled={!editing}
                        placeholder="ZIP"
                        className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                  <label className="block text-sm text-gray-600 mb-1">Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} disabled={!editing}
                    className={`w-full px-3 py-2 border rounded-md text-sm ${editing ? 'border-gray-300' : 'border-gray-200 bg-gray-50'}`} />
                </div>

                {editing && (
                  <div className="flex gap-3">
                    <button type="submit" disabled={updateMutation.isPending}
                      className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)}
                      className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 text-sm transition-colors">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
