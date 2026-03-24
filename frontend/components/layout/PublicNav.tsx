'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

function SparklesIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

type PageName = 'faq' | 'guide' | 'pricing' | 'contact';

const NAV_LINKS: { href: string; page: PageName; label: string }[] = [
  { href: '/faq', page: 'faq', label: 'FAQ' },
  { href: '/guide', page: 'guide', label: 'Guide' },
  { href: '/pricing', page: 'pricing', label: '__pricing__' },
  { href: '/contact', page: 'contact', label: 'Contact' },
];

export default function PublicNav({ activePage }: { activePage: PageName }) {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const linkClass = (page: PageName) =>
    page === activePage
      ? 'px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg bg-primary-50'
      : 'px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-300 transition-colors';

  const mobileLinkClass = (page: PageName) =>
    page === activePage
      ? 'px-4 py-3 text-sm font-medium text-primary-600 bg-primary-50 rounded-lg'
      : 'px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors';

  const getLabel = (link: (typeof NAV_LINKS)[0]) =>
    link.label === '__pricing__' ? t('common.pricing') : link.label;

  return (
    <nav className="border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/landing" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg">{t('common.aiInvoice')}</span>
          </Link>
          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-4">
            {NAV_LINKS.map((link) => (
              <Link key={link.page} href={link.href} className={linkClass(link.page)}>
                {getLabel(link)}
              </Link>
            ))}
            <LanguageSwitcher className="text-gray-600 border-gray-300 hover:bg-gray-100" />
            <Link href="/login" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-300 transition-colors">
              {t('common.signIn')}
            </Link>
            <Link href="/signup" className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
              {t('common.startFreeTrial')}
            </Link>
          </div>
          {/* Mobile hamburger */}
          <button
            className="lg:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
      {/* Mobile dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-gray-100 bg-white">
          <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-2">
            {NAV_LINKS.map((link) => (
              <Link key={link.page} href={link.href} className={mobileLinkClass(link.page)} onClick={() => setMobileMenuOpen(false)}>
                {getLabel(link)}
              </Link>
            ))}
            <div className="px-4 py-2">
              <LanguageSwitcher className="text-gray-600 border-gray-300 hover:bg-gray-100" />
            </div>
            <hr className="border-gray-100 my-1" />
            <Link href="/login" className="px-4 py-3 text-sm font-medium text-gray-700 rounded-lg hover:bg-gray-50 transition-colors" onClick={() => setMobileMenuOpen(false)}>
              {t('common.signIn')}
            </Link>
            <Link href="/signup" className="px-4 py-3 text-sm font-medium text-center text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors" onClick={() => setMobileMenuOpen(false)}>
              {t('common.startFreeTrial')}
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
