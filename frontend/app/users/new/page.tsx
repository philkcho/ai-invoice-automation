'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useCreateUser, useCompanies } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';

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
        <main className="flex-1 bg-gray-50 p-6">
          <div className="max-w-2xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">New User</h2>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">User Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Full Name *</label>
                    <input name="full_name" required value={form.full_name} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Email *</label>
                    <input name="email" type="email" required value={form.email} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Password *</label>
                    <input name="password" type="password" required value={form.password} onChange={handleChange}
                      minLength={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <p className="text-xs text-gray-400 mt-1">
                      Min 8 chars, must include uppercase, lowercase, digit, and special character
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Role *</label>
                    <select name="role" value={form.role} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      {availableRoles.map(r => (
                        <option key={r} value={r}>{r.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  {form.role !== 'SUPER_ADMIN' && (
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Company *</label>
                      <select name="company_id" value={form.company_id} onChange={handleChange}
                        required={form.role !== 'SUPER_ADMIN'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
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
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
                  {createMutation.isPending ? 'Creating...' : 'Create User'}
                </button>
                <button type="button" onClick={() => router.push('/users')}
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
