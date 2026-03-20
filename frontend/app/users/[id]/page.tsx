'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useUsers, useUpdateUser, useCompanies } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';
import type { User } from '@/types';

const ROLES = ['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT', 'APPROVER', 'VIEWER'];

export default function UserEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const updateMutation = useUpdateUser();
  const [error, setError] = useState('');

  // 사용자 목록에서 해당 사용자 찾기
  const { data: usersData, isLoading } = useUsers({ limit: 100 });
  const user = usersData?.items?.find((u: User) => u.id === id);

  const { data: companiesData } = useCompanies({ limit: 100, status: 'ACTIVE' });
  const companies = companiesData?.items ?? [];

  const [form, setForm] = useState({
    full_name: '',
    role: '',
    company_id: '',
    is_active: true,
    notification_email: true,
  });

  useEffect(() => {
    if (user) {
      setForm({
        full_name: user.full_name,
        role: user.role,
        company_id: user.company_id || '',
        is_active: user.is_active,
        notification_email: user.notification_email,
      });
    }
  }, [user]);

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
      const payload: { id: string } & Record<string, unknown> = {
        id,
        full_name: form.full_name,
        role: form.role,
        is_active: form.is_active,
        notification_email: form.notification_email,
      };
      // SUPER_ADMIN만 회사 변경 가능
      if (currentUser?.role === 'SUPER_ADMIN') {
        payload.company_id = form.role === 'SUPER_ADMIN' ? null : (form.company_id || null);
      }
      await updateMutation.mutateAsync(payload);
      addToast('success', 'User updated successfully');
      router.push('/users');
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

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 bg-surface-50 p-8">
            <div className="empty-state">User not found</div>
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
          <div className="max-w-2xl">
            <h2 className="page-title mb-6">Edit User</h2>

            {error && (
              <div className="alert-error">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">User Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="label">Email</label>
                    <input value={user.email} disabled
                      className="input w-full bg-gray-50" />
                    <p className="text-xs text-gray-400 mt-1">Email cannot be changed</p>
                  </div>
                  <div className="col-span-2">
                    <label className="label">Full Name *</label>
                    <input name="full_name" required value={form.full_name} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Role *</label>
                    <select name="role" value={form.role} onChange={handleChange}
                      className="input w-full">
                      {availableRoles.map(r => (
                        <option key={r} value={r}>{r.replace(/_/g, ' ')}</option>
                      ))}
                    </select>
                  </div>
                  {form.role !== 'SUPER_ADMIN' && currentUser?.role === 'SUPER_ADMIN' && (
                    <div>
                      <label className="label">Company</label>
                      <select name="company_id" value={form.company_id} onChange={handleChange}
                        className="input w-full">
                        <option value="">Select company...</option>
                        {companies.map(c => (
                          <option key={c.id} value={c.id}>{c.company_name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {form.role !== 'SUPER_ADMIN' && currentUser?.role !== 'SUPER_ADMIN' && (
                    <div>
                      <label className="label">Company</label>
                      <input value={companies.find(c => c.id === form.company_id)?.company_name || '-'} disabled
                        className="input w-full bg-gray-50" />
                    </div>
                  )}
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Settings</h3>
                <div className="space-y-3">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input name="is_active" type="checkbox" checked={form.is_active}
                      onChange={handleChange} className="rounded" />
                    Active
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input name="notification_email" type="checkbox" checked={form.notification_email}
                      onChange={handleChange} className="rounded" />
                    Receive email notifications
                  </label>
                </div>
              </div>

              <div className="card">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">System Info</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-gray-500">
                  <div>
                    <span className="font-medium">Created: </span>
                    {new Date(user.created_at).toLocaleString()}
                  </div>
                  <div>
                    <span className="font-medium">Last Login: </span>
                    {user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
                  </div>
                </div>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={updateMutation.isPending}
                  className="btn-primary disabled:opacity-50">
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
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
