'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useUsers, useUpdateUser, useDeleteUser } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'badge-purple',
  COMPANY_ADMIN: 'badge-blue',
  ACCOUNTANT: 'badge-green',
  APPROVER: 'badge-yellow',
  VIEWER: 'badge-gray',
};

export default function UsersPage() {
  const currentUser = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  const { data, isLoading } = useUsers({
    limit: 50,
    search: search || undefined,
    role: roleFilter || undefined,
    is_active: activeFilter === '' ? undefined : activeFilter === 'true',
  });

  const updateMutation = useUpdateUser();
  const deleteMutation = useDeleteUser();

  const users = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    try {
      await updateMutation.mutateAsync({ id: userId, is_active: !currentActive });
      addToast('success', `User ${currentActive ? 'deactivated' : 'activated'} successfully`);
    } catch (err: unknown) {
      addToast('error', getErrorMessage(err));
    }
  };

  const handleDelete = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete ${name}?`)) return;
    try {
      await deleteMutation.mutateAsync(userId);
      addToast('success', 'User deleted successfully');
    } catch (err: unknown) {
      addToast('error', getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="page-header flex items-center justify-between">
            <div>
              <h2 className="page-title">Users</h2>
              <p className="page-subtitle">{total} users total</p>
            </div>
            <Link
              href="/users/new"
              className="btn-primary"
            >
              + New User
            </Link>
          </div>

          <div className="card filter-bar">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input flex-1"
              />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="input">
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="COMPANY_ADMIN">Company Admin</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="APPROVER">Approver</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}
                className="input">
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <button type="submit" className="btn-secondary">
                Search
              </button>
            </form>
          </div>

          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : users.length === 0 ? (
              <div className="empty-state">No users found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">Name</th>
                    <th className="table-th text-left">Email</th>
                    <th className="table-th text-left">Role</th>
                    <th className="table-th text-left">Status</th>
                    <th className="table-th text-left">Last Login</th>
                    <th className="table-th text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="table-row">
                      <td className="table-td font-medium text-gray-800">{u.full_name}</td>
                      <td className="table-td text-gray-600">{u.email}</td>
                      <td className="table-td">
                        <span className={ROLE_COLORS[u.role] || ''}>
                          {u.role}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className={u.is_active ? 'badge-green' : 'badge-red'}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="table-td text-gray-500 text-xs">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleActive(u.id, u.is_active)}
                            className={`text-xs ${u.is_active ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                          >
                            {u.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                          {currentUser?.role === 'SUPER_ADMIN' && currentUser.id !== u.id && (
                            <button
                              onClick={() => handleDelete(u.id, u.full_name)}
                              className="text-xs text-red-600 hover:text-red-800"
                            >
                              Delete
                            </button>
                          )}
                        </div>
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
