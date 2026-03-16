'use client';

import { useAuthStore } from '@/stores/auth';
import CompanySwitcher from '@/components/common/CompanySwitcher';

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-16 bg-white/80 backdrop-blur-md border-b border-primary-100/40 flex items-center justify-between px-6 sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-primary-400 to-primary-600 rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
            </svg>
          </div>
          <h1 className="text-lg font-semibold bg-gradient-to-r from-primary-700 to-primary-500 bg-clip-text text-transparent">
            Invoice System
          </h1>
        </div>
        <CompanySwitcher />
      </div>

      <div className="flex items-center gap-4">
        <div className="text-right mr-1">
          <div className="text-sm font-medium text-gray-700">{user?.full_name}</div>
          <div className="text-xs text-gray-400">{user?.role?.replace('_', ' ')}</div>
        </div>
        <div className="w-9 h-9 bg-gradient-to-br from-primary-200 to-primary-300 rounded-full flex items-center justify-center text-sm font-semibold text-primary-700">
          {user?.full_name?.charAt(0)?.toUpperCase() || 'U'}
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-rose-500 transition-colors duration-200 ml-1"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
          </svg>
          Logout
        </button>
      </div>
    </header>
  );
}
