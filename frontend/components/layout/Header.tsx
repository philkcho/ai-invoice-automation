'use client';

import { useAuthStore } from '@/stores/auth';
import CompanySwitcher from '@/components/common/CompanySwitcher';

export default function Header() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-gray-800">Invoice System</h1>
        <CompanySwitcher />
      </div>

      <div className="flex items-center gap-4">
        <div className="text-sm text-right">
          <div className="font-medium text-gray-700">{user?.full_name}</div>
          <div className="text-xs text-gray-400">{user?.role}</div>
        </div>
        <button
          onClick={logout}
          className="text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
