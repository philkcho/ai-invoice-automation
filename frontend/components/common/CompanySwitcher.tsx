'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import type { Company, CompanyListResponse } from '@/types';

export default function CompanySwitcher() {
  const user = useAuthStore((s) => s.user);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [open, setOpen] = useState(false);

  // Super Admin만 회사 전환 가능
  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isSuperAdmin) return;

    api.get<CompanyListResponse>('/api/v1/companies', {
      params: { limit: 100, status: 'ACTIVE' },
    }).then(({ data }) => {
      setCompanies(data.items);
    });
  }, [isSuperAdmin]);

  if (!isSuperAdmin || companies.length === 0) return null;

  const selectedCompany = companies.find((c) => c.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
      >
        <span className="text-gray-500">Company:</span>
        <span className="font-medium">
          {selectedCompany ? selectedCompany.company_name : 'All Companies'}
        </span>
        <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-md shadow-lg z-50">
          <button
            onClick={() => { setSelectedId(''); setOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
              !selectedId ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
            }`}
          >
            All Companies
          </button>
          {companies.map((company) => (
            <button
              key={company.id}
              onClick={() => { setSelectedId(company.id); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 border-t border-gray-100 ${
                selectedId === company.id ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
              }`}
            >
              <div className="font-medium">{company.company_name}</div>
              <div className="text-xs text-gray-400">{company.company_code}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
