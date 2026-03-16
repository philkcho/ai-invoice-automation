'use client';

import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import type { UserRole } from '@/types';

interface RequireRoleProps {
  roles: UserRole[];
  children: React.ReactNode;
}

export default function RequireRole({ roles, children }: RequireRoleProps) {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();

  if (!user) return null;

  if (!roles.includes(user.role)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-5 bg-amber-50 rounded-2xl flex items-center justify-center">
          <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
        </div>
        <h1 className="text-xl font-semibold text-gray-800 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-6">
          You do not have permission to access this page.
        </p>
        <button onClick={() => router.push('/')} className="btn-primary">
          Go to Dashboard
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
