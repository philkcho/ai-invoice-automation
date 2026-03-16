'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useVendor, useUpdateVendor } from '@/hooks/useApi';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

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
          <main className="flex-1 bg-surface-50 p-8">
            <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
            <div className="loading-state">Loading...</div>
            </RequireRole>
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
          <main className="flex-1 bg-surface-50 p-8">
            <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
            <div className="empty-state">Vendor not found</div>
            </RequireRole>
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
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="max-w-3xl">
            <div className="page-header">
              <div>
                <h2 className="page-title">{vendor.company_name}</h2>
                <p className="page-subtitle">
                  {vendor.vendor_code} &middot;{' '}
                  <span className={vendor.status === 'ACTIVE' ? 'text-green-600' : 'text-red-600'}>
                    {vendor.status}
                  </span>
                </p>
              </div>
              <div className="flex gap-2">
                {!editing && (
                  <button onClick={() => setEditing(true)}
                    className="btn-primary">
                    Edit
                  </button>
                )}
                <button onClick={() => router.push('/vendors')}
                  className="btn-secondary">
                  Back
                </button>
              </div>
            </div>

            {error && <div className="alert-error">{error}</div>}

            <form onSubmit={handleSubmit}>
              <div className="space-y-6">
                {/* Basic Info */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Basic Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="label">Company Name</label>
                      <input name="company_name" value={form.company_name} onChange={handleChange}
                        disabled={!editing}
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                    <div>
                      <label className="label">DBA</label>
                      <input name="dba" value={form.dba} onChange={handleChange} disabled={!editing}
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                    <div>
                      <label className="label">EIN</label>
                      <input name="ein" value={form.ein} onChange={handleChange} disabled={!editing}
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                    <div>
                      <label className="label">Category</label>
                      <select name="vendor_category" value={form.vendor_category} onChange={handleChange} disabled={!editing}
                        className={editing ? 'input w-full' : 'input-disabled w-full'}>
                        <option value="">None</option>
                        <option value="SERVICE">Service</option>
                        <option value="PRODUCT">Product</option>
                        <option value="BOTH">Both</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">Payment Terms</label>
                      <input name="payment_terms" value={form.payment_terms} onChange={handleChange} disabled={!editing}
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                    {editing && (
                      <div>
                        <label className="label">Status</label>
                        <select name="status" value={form.status} onChange={handleChange}
                          className="input w-full">
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>

                {/* Contact */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Contact</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Name</label>
                      <input name="contact_name" value={form.contact_name} onChange={handleChange} disabled={!editing}
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input name="contact_email" value={form.contact_email} onChange={handleChange} disabled={!editing}
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input name="contact_phone" value={form.contact_phone} onChange={handleChange} disabled={!editing}
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Billing Address</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <input name="billing_address" value={form.billing_address} onChange={handleChange} disabled={!editing}
                        placeholder="Address"
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                    <div>
                      <input name="billing_city" value={form.billing_city} onChange={handleChange} disabled={!editing}
                        placeholder="City"
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input name="billing_state" value={form.billing_state} onChange={handleChange} disabled={!editing}
                        placeholder="State"
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                      <input name="billing_zip" value={form.billing_zip} onChange={handleChange} disabled={!editing}
                        placeholder="ZIP"
                        className={editing ? 'input w-full' : 'input-disabled w-full'} />
                    </div>
                  </div>
                </div>

                {/* Notes */}
                <div className="card p-6">
                  <label className="label">Notes</label>
                  <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} disabled={!editing}
                    className={editing ? 'input w-full' : 'input-disabled w-full'} />
                </div>

                {editing && (
                  <div className="flex gap-3">
                    <button type="submit" disabled={updateMutation.isPending}
                      className="btn-primary disabled:opacity-50">
                      {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                    </button>
                    <button type="button" onClick={() => setEditing(false)}
                      className="btn-secondary">
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </form>
          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
