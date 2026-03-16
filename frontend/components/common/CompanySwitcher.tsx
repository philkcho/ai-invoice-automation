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

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  useEffect(() => {
    if (!isSuperAdmin) return;

    api.get<CompanyListResponse>('/api/v1/companies', {
      params: { limit: 100, status: 'ACTIVE' },
    }).then(({ data }) => {
      setCompanies(data.items);
    }).catch(() => {});
  }, [isSuperAdmin]);

  if (!isSuperAdmin || companies.length === 0) return null;

  const selectedCompany = companies.find((c) => c.id === selectedId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 text-sm border border-primary-100 bg-primary-50/50 rounded-xl hover:bg-primary-50 transition-all duration-200"
      >
        <svg className="w-4 h-4 text-primary-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
        </svg>
        <span className="font-medium text-gray-700">
          {selectedCompany ? selectedCompany.company_name : 'All Companies'}
        </span>
        <svg className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-2 w-72 bg-white rounded-xl border border-primary-100 shadow-modal z-50 overflow-hidden animate-slide-up">
            <div className="p-2">
              <button
                onClick={() => { setSelectedId(''); setOpen(false); }}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  !selectedId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-surface-100'
                }`}
              >
                All Companies
              </button>
              {companies.map((company) => (
                <button
                  key={company.id}
                  onClick={() => { setSelectedId(company.id); setOpen(false); }}
                  className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${
                    selectedId === company.id ? 'bg-primary-50 text-primary-700 font-medium' : 'text-gray-600 hover:bg-surface-100'
                  }`}
                >
                  <div className="font-medium">{company.company_name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{company.company_code}</div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
