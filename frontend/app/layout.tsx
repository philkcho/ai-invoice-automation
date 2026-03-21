import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/layout/AuthProvider';
import ChatWidget from '@/components/chat/ChatWidget';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ToastContainer from '@/components/common/ToastContainer';
import QueryProvider from '@/components/common/QueryProvider';

export const metadata: Metadata = {
  title: 'AI Invoice Automation System',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body className="font-sans">
        <ErrorBoundary>
          <QueryProvider>
            <AuthProvider>
              {children}
              <ChatWidget />
            </AuthProvider>
            <ToastContainer />
          </QueryProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
