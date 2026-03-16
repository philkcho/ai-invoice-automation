'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useVendors } from '@/hooks/useApi';
import RequireRole from '@/components/common/RequireRole';

export default function VendorsPage() {
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data, isLoading } = useVendors({
    limit: 50,
    search: search || undefined,
    status: statusFilter || undefined,
  });

  const vendors = data?.items ?? [];
  const total = data?.total ?? 0;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="page-header">
            <div>
              <h2 className="page-title">Vendors</h2>
              <p className="page-subtitle">{total} vendors total</p>
            </div>
            <Link
              href="/vendors/new"
              className="btn-primary"
            >
              + New Vendor
            </Link>
          </div>

          <div className="filter-bar">
            <form onSubmit={handleSearch} className="flex gap-3">
              <input
                type="text"
                placeholder="Search by name, code, or EIN..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="input flex-1"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
              <button
                type="submit"
                className="btn-secondary"
              >
                Search
              </button>
            </form>
          </div>

          <div className="card overflow-hidden">
            {isLoading ? (
              <div className="loading-state">Loading...</div>
            ) : vendors.length === 0 ? (
              <div className="empty-state">No vendors found</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th">Code</th>
                    <th className="table-th">Name</th>
                    <th className="table-th">EIN</th>
                    <th className="table-th">Category</th>
                    <th className="table-th">Contact</th>
                    <th className="table-th">Scope</th>
                    <th className="table-th">Status</th>
                    <th className="table-th"></th>
                  </tr>
                </thead>
                <tbody>
                  {vendors.map((v) => (
                    <tr key={v.id} className="table-row">
                      <td className="table-td font-mono text-xs">{v.vendor_code}</td>
                      <td className="table-td">
                        <div className="font-medium text-gray-800">{v.company_name}</div>
                        {v.dba && <div className="text-xs text-gray-400">DBA: {v.dba}</div>}
                      </td>
                      <td className="table-td text-gray-600">{v.ein || '\u2014'}</td>
                      <td className="table-td text-gray-600">{v.vendor_category || '\u2014'}</td>
                      <td className="table-td">
                        <div className="text-gray-700">{v.contact_name || '\u2014'}</div>
                        <div className="text-xs text-gray-400">{v.contact_email || ''}</div>
                      </td>
                      <td className="table-td">
                        <span className={v.company_id ? 'badge-blue' : 'badge-purple'}>
                          {v.company_id ? 'Company' : 'Shared'}
                        </span>
                      </td>
                      <td className="table-td">
                        <span className={v.status === 'ACTIVE' ? 'badge-green' : 'badge-red'}>
                          {v.status}
                        </span>
                      </td>
                      <td className="table-td">
                        <Link href={`/vendors/${v.id}`} className="text-blue-600 hover:text-blue-800 text-xs">
                          View
                        </Link>
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
