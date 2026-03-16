'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useUsers, useUpdateUser, useDeleteUser } from '@/hooks/useApi';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';

const ROLE_COLORS: Record<string, string> = {
  SUPER_ADMIN: 'bg-purple-50 text-purple-700',
  COMPANY_ADMIN: 'bg-blue-50 text-blue-700',
  ACCOUNTANT: 'bg-green-50 text-green-700',
  APPROVER: 'bg-yellow-50 text-yellow-700',
  VIEWER: 'bg-gray-100 text-gray-600',
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
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">Users</h2>
              <p className="text-sm text-gray-500">{total} users total</p>
            </div>
            <Link
              href="/users/new"
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm transition-colors"
            >
              + New User
            </Link>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                placeholder="Search by name or email..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">All Roles</option>
                <option value="SUPER_ADMIN">Super Admin</option>
                <option value="COMPANY_ADMIN">Company Admin</option>
                <option value="ACCOUNTANT">Accountant</option>
                <option value="APPROVER">Approver</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-md text-sm">
                <option value="">All Status</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
              <button type="submit" className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm">
                Search
              </button>
            </form>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : users.length === 0 ? (
              <div className="p-8 text-center text-gray-500">No users found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Last Login</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-800">{u.full_name}</td>
                      <td className="px-4 py-3 text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role] || ''}`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          u.is_active ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString() : 'Never'}
                      </td>
                      <td className="px-4 py-3">
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
        </main>
      </div>
    </div>
  );
}
