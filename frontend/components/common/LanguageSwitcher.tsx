'use client';

import { useTranslation } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export default function LanguageSwitcher({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useTranslation();

  const toggle = () => {
    setLocale(locale === 'en' ? 'ko' : 'en' as Locale);
  };

  return (
    <button
      onClick={toggle}
      className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${className}`}
      title={locale === 'en' ? '한국어로 변경' : 'Switch to English'}
    >
      {locale === 'en' ? '🇰🇷 한국어' : '🇺🇸 English'}
    </button>
  );
}
