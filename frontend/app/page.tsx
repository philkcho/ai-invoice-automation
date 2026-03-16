'use client';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/auth';

export default function Home() {
  const user = useAuthStore((s) => s.user);

  const roleBadgeClass: Record<string, string> = {
    SUPER_ADMIN: 'badge-purple',
    COMPANY_ADMIN: 'badge-blue',
    ACCOUNTANT: 'badge-green',
    APPROVER: 'badge-yellow',
    VIEWER: 'badge-gray',
  };

  const badgeClass = user?.role ? (roleBadgeClass[user.role] ?? 'badge-gray') : 'badge-gray';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <div className="page-header">
            <h2 className="page-title">Dashboard</h2>
            <p className="page-subtitle">Overview of your workspace</p>
          </div>

          {/* Welcome card */}
          <div className="card relative overflow-hidden">
            {/* Gradient accent bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary-400 via-primary-500 to-primary-600" />

            <div className="p-6">
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-semibold text-lg shadow-md shadow-primary-200">
                  {user?.full_name?.charAt(0)?.toUpperCase() ?? 'U'}
                </div>

                <div>
                  <p className="text-lg font-semibold text-surface-800">
                    Welcome back, {user?.full_name ?? 'User'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={badgeClass}>
                      {user?.role?.replace('_', ' ') ?? 'Unknown'}
                    </span>
                    <span className="text-sm text-surface-400">
                      AI Invoice Automation System
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
