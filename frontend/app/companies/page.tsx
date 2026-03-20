'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useCompanies, useUpdateCompany, useDeleteCompany } from '@/hooks/useApi';
import { useToastStore } from '@/stores/toast';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

export default function CompaniesPage() {
  const addToast = useToastStore((s) => s.addToast);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useCompanies({
    limit: 50,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const updateMutation = useUpdateCompany();
  const deleteMutation = useDeleteCompany();

  const companies = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleToggleStatus = async (companyId: string, currentStatus: string) => {
    const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    try {
      await updateMutation.mutateAsync({ id: companyId, status: newStatus });
      addToast('success', `Company ${newStatus === 'ACTIVE' ? 'activated' : 'deactivated'} successfully`);
    } catch (err: unknown) {
      addToast('error', getErrorMessage(err));
    }
  };

  const handleDelete = async (companyId: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?\nCompany with existing users cannot be deleted.`)) return;
    try {
      await deleteMutation.mutateAsync(companyId);
      addToast('success', 'Company deleted successfully');
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
          <RequireRole roles={['SUPER_ADMIN']}>
          <div className="page-header flex items-center justify-between">
            <div>
              <h2 className="page-title">Companies</h2>
              <p className="page-subtitle">{total} companies total</p>
            </div>
            <Link href="/companies/new" className="btn-primary">
              + New Company
            </Link>
          </div>

          <div className="card filter-bar">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                placeholder="Search by company name..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input flex-1"
              />
              <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                className="input">
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <button type="submit" className="btn-secondary">
                Search
              </button>
            </form>
          </div>

          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : companies.length === 0 ? (
              <div className="empty-state">No companies found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">Code</th>
                    <th className="table-th text-left">Company Name</th>
                    <th className="table-th text-left">EIN</th>
                    <th className="table-th text-left">Contact</th>
                    <th className="table-th text-left">Currency</th>
                    <th className="table-th text-left">Status</th>
                    <th className="table-th text-left">Created</th>
                    <th className="table-th text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="table-td font-mono text-xs text-gray-500">{c.company_code}</td>
                      <td className="table-td">
                        <Link href={`/companies/${c.id}`} className="font-medium text-primary-700 hover:text-primary-900">
                          {c.company_name}
                        </Link>
                        {c.address && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {[c.city, c.state].filter(Boolean).join(', ')}
                          </div>
                        )}
                      </td>
                      <td className="table-td text-gray-600 text-xs">{c.ein || '-'}</td>
                      <td className="table-td">
                        {c.contact_name && (
                          <div className="text-gray-700 text-xs">{c.contact_name}</div>
                        )}
                        {c.contact_email && (
                          <div className="text-gray-400 text-xs">{c.contact_email}</div>
                        )}
                      </td>
                      <td className="table-td">
                        <span className="badge-blue">{c.default_currency}</span>
                      </td>
                      <td className="table-td">
                        <span className={c.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}>
                          {c.status}
                        </span>
                      </td>
                      <td className="table-td text-gray-500 text-xs">
                        {new Date(c.created_at).toLocaleDateString()}
                      </td>
                      <td className="table-td">
                        <div className="flex gap-2">
                          <Link href={`/companies/${c.id}`}
                            className="text-xs text-blue-600 hover:text-blue-800">
                            Edit
                          </Link>
                          <button
                            onClick={() => handleToggleStatus(c.id, c.status)}
                            className={`text-xs ${c.status === 'ACTIVE' ? 'text-orange-600 hover:text-orange-800' : 'text-green-600 hover:text-green-800'}`}
                          >
                            {c.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button
                            onClick={() => handleDelete(c.id, c.company_name)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
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
