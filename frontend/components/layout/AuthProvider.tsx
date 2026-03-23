'use client';

import { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/landing', '/pricing', '/faq', '/guide', '/contact', '/demo'];

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading, initialize } = useAuthStore();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    initialize();
  }, [initialize]);

  const isPublicPath = PUBLIC_PATHS.includes(pathname);

  // 공개 경로는 인증 초기화 완료를 기다리지 않고 즉시 렌더링
  if (isPublicPath) {
    if (!isLoading && isAuthenticated) {
      router.push('/');
      return null;
    }
    return <>{children}</>;
  }

  // 비공개 경로: 초기화 완료까지 로딩 표시
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    router.push('/landing');
    return null;
  }

  return <>{children}</>;
}
