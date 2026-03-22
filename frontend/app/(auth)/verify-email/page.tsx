'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { MessageResponse } from '@/types';

type VerifyState = 'pending' | 'verifying' | 'success' | 'error';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const [state, setState] = useState<VerifyState>(token ? 'verifying' : 'pending');
  const [errorMessage, setErrorMessage] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendDone, setResendDone] = useState(false);

  const verifyToken = useCallback(async (t: string) => {
    setState('verifying');
    try {
      await api.post<MessageResponse>('/api/v1/auth/verify-email', { token: t });
      setState('success');
    } catch (err: unknown) {
      setState('error');
      setErrorMessage(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    if (token) {
      verifyToken(token);
    }
  }, [token, verifyToken]);

  const handleResend = async () => {
    if (!email) return;
    setResendLoading(true);
    try {
      await api.post<MessageResponse>('/api/v1/auth/resend-verification', { email });
      setResendDone(true);
    } catch {
      // 보안상 에러 무시
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-50 relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary-200 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-primary-100 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="card w-full max-w-md p-8 relative z-10 animate-slide-up text-center">
        {/* Verifying state */}
        {state === 'verifying' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full border-4 border-primary-200 border-t-primary-600 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-surface-700 mb-2">Verifying your email...</h1>
            <p className="text-surface-400 text-sm">Please wait a moment.</p>
          </>
        )}

        {/* Success state */}
        {state === 'success' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-surface-700 mb-2">Email Verified!</h1>
            <p className="text-surface-400 text-sm mb-6">
              Your email has been verified successfully. You can now sign in to your account.
            </p>
            <Link href="/login" className="btn-primary inline-block px-8">
              Sign In
            </Link>
          </>
        )}

        {/* Error state */}
        {state === 'error' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-surface-700 mb-2">Verification Failed</h1>
            <p className="text-surface-400 text-sm mb-6">{errorMessage}</p>
            <div className="space-y-3">
              <Link href="/login" className="btn-primary inline-block px-8 w-full">
                Go to Sign In
              </Link>
            </div>
          </>
        )}

        {/* Pending state (arrived from signup, no token yet) */}
        {state === 'pending' && (
          <>
            <div className="flex justify-center mb-6">
              <div className="w-14 h-14 rounded-full bg-primary-100 flex items-center justify-center">
                <svg className="w-8 h-8 text-primary-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
                </svg>
              </div>
            </div>
            <h1 className="text-xl font-bold text-surface-700 mb-2">Check Your Email</h1>
            <p className="text-surface-400 text-sm mb-2">
              We&apos;ve sent a verification link to:
            </p>
            {email && (
              <p className="font-medium text-surface-700 mb-4">{email}</p>
            )}
            <p className="text-surface-400 text-sm mb-6">
              Click the link in the email to verify your account. The link expires in 24 hours.
            </p>

            {email && (
              <button
                onClick={handleResend}
                disabled={resendLoading || resendDone}
                className="text-sm text-primary-600 hover:underline disabled:text-surface-400 disabled:no-underline"
              >
                {resendDone ? 'Verification email sent!' : resendLoading ? 'Sending...' : "Didn't receive the email? Resend"}
              </button>
            )}

            <div className="mt-6">
              <Link href="/login" className="text-sm text-surface-400 hover:underline">
                Back to Sign In
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
