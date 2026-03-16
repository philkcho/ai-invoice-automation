'use client';

import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/auth';

export default function Home() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Dashboard</h2>
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <p className="text-gray-600">
              Welcome, <span className="font-medium">{user?.full_name}</span>
            </p>
            <p className="text-sm text-gray-400 mt-1">
              Role: {user?.role} | Phase 2 Setup Complete
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
