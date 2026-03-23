import type { Metadata } from 'next';
import './globals.css';
import AuthProvider from '@/components/layout/AuthProvider';
import ChatWidget from '@/components/chat/ChatWidget';
import HelpButton from '@/components/common/HelpButton';
import HelpPanel from '@/components/common/HelpPanel';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import ToastContainer from '@/components/common/ToastContainer';
import QueryProvider from '@/components/common/QueryProvider';
import I18nProvider from '@/components/common/I18nProvider';

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
          <I18nProvider>
          <QueryProvider>
            <AuthProvider>
              {children}
              <ChatWidget />
              <HelpButton />
              <HelpPanel />
            </AuthProvider>
            <ToastContainer />
          </QueryProvider>
          </I18nProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
