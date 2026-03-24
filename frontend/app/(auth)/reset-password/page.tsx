'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  if (!token) {
    return (
      <div className="text-center space-y-4">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Invalid password reset link. Please try requesting a new one.
          </AlertDescription>
        </Alert>
        <Link href="/forgot-password" className="text-sm text-rose-600 hover:underline inline-block">
          Forgot Password
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await api.post('/api/v1/auth/reset-password', {
        token,
        new_password: password,
      });
      setSuccess(true);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center space-y-4">
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-lg p-4 text-sm">
          Your password has been successfully changed.
        </div>
        <Link href="/login" className="inline-flex items-center justify-center rounded-lg bg-gradient-to-r from-[#f43f5e] to-[#e11d48] hover:from-[#e11d48] hover:to-[#be123c] text-white h-10 px-6 text-sm font-medium transition-all">
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="password">
          New Password
        </Label>
        <Input
          id="password"
          type="password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full"
          placeholder="At least 8 characters"
          minLength={8}
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="confirmPassword">
          Confirm Password
        </Label>
        <Input
          id="confirmPassword"
          type="password"
          required
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full"
          placeholder="Re-enter your password"
        />
      </div>

      <Button
        type="submit"
        disabled={loading}
        className="w-full bg-gradient-to-r from-[#f43f5e] to-[#e11d48] hover:from-[#e11d48] hover:to-[#be123c] text-white h-10"
      >
        {loading ? 'Changing...' : 'Change Password'}
      </Button>

      <div className="text-center">
        <Link href="/login" className="text-sm text-stone-400 hover:text-rose-600 hover:underline">
          Back to Sign In
        </Link>
      </div>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50/50 relative overflow-hidden">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-rose-100 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
      </div>

      <div className="card w-full max-w-md p-8 relative z-10 animate-slide-up">
        {/* Icon */}
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center shadow-lg shadow-rose-200">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-center mb-1 bg-gradient-to-r from-[#e11d48] to-rose-800 bg-clip-text text-transparent">
          Reset Password
        </h1>
        <p className="text-center text-stone-400 mb-8 text-sm">
          Enter your new password
        </p>

        <Suspense fallback={<div className="text-center text-stone-400">Loading...</div>}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
