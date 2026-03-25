'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';

function EmailOAuthCallbackContent() {
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [message, setMessage] = useState('Processing OAuth callback...');

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');

    if (!code || !state) {
      setStatus('error');
      setMessage('Missing OAuth parameters. Please try connecting again.');
      return;
    }

    // state 형식: "config_id:nonce"
    const configId = state.split(':')[0];
    if (!configId) {
      setStatus('error');
      setMessage('Invalid OAuth state. Please try connecting again.');
      return;
    }

    const exchangeCode = async () => {
      try {
        await api.post(`/api/v1/email-configurations/${configId}/oauth/callback`, {
          code,
          state,
        });
        setStatus('success');
        setMessage('Email account connected successfully! You can close this window.');

        // 부모 창에 성공 알림
        if (window.opener) {
          window.opener.postMessage({ type: 'OAUTH_SUCCESS', configId }, window.location.origin);
        }
      } catch (err) {
        setStatus('error');
        setMessage(getErrorMessage(err));
      }
    };

    exchangeCode();
  }, [searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="bg-white rounded-lg shadow-sm border p-8 max-w-md text-center">
        {status === 'processing' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-gray-600">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            </div>
            <p className="text-green-700 font-medium">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              Close Window
            </button>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="w-12 h-12 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-700 font-medium">{message}</p>
            <button
              onClick={() => window.close()}
              className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm"
            >
              Close Window
            </button>
          </>
        )}
      </div>
    </div>
  );
}

export default function EmailOAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    }>
      <EmailOAuthCallbackContent />
    </Suspense>
  );
}
