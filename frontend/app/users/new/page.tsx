'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useCreateUser, useCompanies } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

const ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT', 'APPROVER', 'VIEWER'];

export default function NewUserPage() {
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const createMutation = useCreateUser();
  const [error, setError] = useState('');

  const { data: companiesData } = useCompanies({ limit: 100, status: 'ACTIVE' });
  const companies = companiesData?.items ?? [];

  const [form, setForm] = useState({
    email: '',
    full_name: '',
    password: '',
    role: 'VIEWER',
    company_id: '',
    notification_email: true,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    });
  };

  const availableRoles = currentUser?.role === 'SUPER_ADMIN'
    ? ROLES
    : ROLES.filter(r => r !== 'SUPER_ADMIN');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      await createMutation.mutateAsync({
        email: form.email,
        full_name: form.full_name,
        password: form.password,
        role: form.role,
        company_id: form.role === 'SUPER_ADMIN' ? null : (form.company_id || null),
        notification_email: form.notification_email,
      });
      addToast('success', 'User created successfully');
      router.push('/users');
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
          <div className="max-w-2xl">
            <h2 className="page-title mb-6">New User</h2>

            {error && (
              <div className="alert-error">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">User Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Full Name *</label>
                    <input name="full_name" required value={form.full_name} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Email *</label>
                    <input name="email" type="email" required value={form.email} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Password *</label>
                    <input name="password" type="password" required value={form.password} onChange={handleChange}
                      minLength={8}
                      className="input w-full" />
                    <p className="text-xs text-gray-400 mt-1">
                      Min 8 chars, must include uppercase, lowercase, digit, and special character
                    </p>
                  </div>
                  <div>
                    <label className="label">Role *</label>
                    <select name="role" value={form.role} onChange={handleChange}
                      className="input w-full">
                      {availableRoles.map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  {form.role !== 'SUPER_ADMIN' && (
                    <div>
                      <label className="label">Company *</label>
                      <select name="company_id" value={form.company_id} onChange={handleChange}
                        required={form.role !== 'SUPER_ADMIN'}
                        className="input w-full">
                        <option value="">Select company...</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="col-span-2">
                    <label className="flex items-center gap-2 text-sm text-gray-600">
                      <input name="notification_email" type="checkbox" checked={form.notification_email}
                        onChange={handleChange} className="rounded" />
                      Receive email notifications
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={createMutation.isPending}
                  className="btn-primary disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" onClick={() => router.push('/users')}
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
