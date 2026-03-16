import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/layout/AuthProvider';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ToastContainer from '@/components/common/ToastContainer';
import QueryProvider from '@/components/common/QueryProvider';

export const metadata: Metadata = {
  title: 'AI Invoice Automation System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>{children}</AuthProvider>
            <ToastContainer />
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
