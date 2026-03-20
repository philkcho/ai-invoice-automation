'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  if (!isAuthenticated && !isPublicPath) {
    router.push('/login');
    return null;
  }

  if (isAuthenticated && isPublicPath) {
    router.push('/');
    return null;
  }

  return <>{children}</>;
}
