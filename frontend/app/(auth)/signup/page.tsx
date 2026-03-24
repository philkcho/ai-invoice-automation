'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { MessageResponse } from '@/types';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

export default function SignupPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post<MessageResponse>('/api/v1/auth/register', {
        email,
        password,
        full_name: fullName,
        company_name: companyName,
      });
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-rose-50/50 relative overflow-hidden">
      {/* Top-left logo link */}
      <Link href="/landing" className="absolute top-5 left-6 z-20 flex items-center gap-2 hover:opacity-80 transition-opacity">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
          </svg>
        </div>
        <span className="text-rose-700 font-bold text-lg">{t('common.aiInvoice')}</span>
      </Link>

      {/* Language switcher */}
      <div className="absolute top-5 right-6 z-20">
        <LanguageSwitcher className="border-stone-200 text-stone-600 hover:bg-stone-100" />
      </div>

      {/* Background pattern */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-0 w-96 h-96 bg-rose-200 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-rose-100 rounded-full blur-3xl translate-x-1/2 translate-y-1/2" />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-rose-50 rounded-full blur-2xl -translate-x-1/2 -translate-y-1/2" />
      </div>

      {/* Signup card */}
      <div className="card w-full max-w-md p-8 relative z-10 animate-slide-up">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <Link href="/landing" className="cursor-pointer hover:scale-110 transition-transform">
            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#f43f5e] to-[#e11d48] flex items-center justify-center shadow-lg shadow-rose-200">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </Link>
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-center mb-1 bg-gradient-to-r from-[#e11d48] to-rose-800 bg-clip-text text-transparent">
          {t('signup.title')}
        </h1>
        <p className="text-center text-stone-400 mb-8 text-sm">
          {t('signup.subtitle')}
        </p>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="fullName">{t('common.fullName')}</Label>
            <Input id="fullName" type="text" required value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full" placeholder={t('signup.namePlaceholder')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email">{t('common.email')}</Label>
            <Input id="email" type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full" placeholder={t('signup.emailPlaceholder')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">{t('common.password')}</Label>
            <Input id="password" type="password" required minLength={8} value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full" placeholder={t('signup.passwordPlaceholder')} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="companyName">{t('common.companyName')}</Label>
            <Input id="companyName" type="text" required value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className="w-full" placeholder={t('signup.companyPlaceholder')} />
          </div>

          <Button type="submit" disabled={loading} className="w-full mt-2 bg-gradient-to-r from-[#f43f5e] to-[#e11d48] hover:from-[#e11d48] hover:to-[#be123c] text-white h-10">
            {loading ? t('common.creatingAccount') : t('common.signUp')}
          </Button>
        </form>

        {/* Footer link */}
        <p className="text-center text-sm text-stone-400 mt-6">
          {t('signup.hasAccount')}{' '}
          <Link href="/login" className="text-rose-600 hover:underline font-medium">
            {t('signup.signInLink')}
          </Link>
        </p>
      </div>
    </div>
  );
}
