'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

function ChevronDownIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

const FAQ_CATEGORIES = [
  { key: 'product', items: [1, 2] },
  { key: 'billing', items: [3, 4] },
  { key: 'security', items: [5, 6] },
  { key: 'getting_started', items: [7, 8] },
] as const;

export default function FaqPage() {
  const { t } = useTranslation();
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  return (
    <div className="min-h-screen font-sans text-gray-900 bg-white">
      {/* ── Navigation ──────────────────────────────────────────────── */}
      <nav className="border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/landing" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">{t('common.aiInvoice')}</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg bg-primary-50">
                FAQ
              </Link>
              <Link href="/guide" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-300 transition-colors">
                Guide
              </Link>
              <Link href="/pricing" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-300 transition-colors">
                {t('common.pricing')}
              </Link>
              <Link href="/contact" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-300 transition-colors">
                Contact
              </Link>
              <LanguageSwitcher className="text-gray-600 border-gray-300 hover:bg-gray-100" />
              <Link href="/login" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-300 transition-colors">
                {t('common.signIn')}
              </Link>
              <Link href="/signup" className="px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-full hover:bg-gray-800 transition-colors">
                {t('common.startFreeTrial')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#0f0a2e] to-[#1e1b4b] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-500/10 rounded-full blur-[200px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-4">
            {t('landing.faq.title')}
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {t('landing.faq.subtitle')}
          </p>
        </div>
      </section>

      {/* ── FAQ Categories ──────────────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        {FAQ_CATEGORIES.map((category) => (
          <div key={category.key} className="mb-12 last:mb-0">
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-primary-500 to-primary-600" />
              {t(`landing.faq.cat_${category.key}`)}
            </h2>

            <div className="space-y-3">
              {category.items.map((n) => (
                <div
                  key={n}
                  className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === n ? null : n)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 pr-4">
                      {t(`landing.faq.q${n}`)}
                    </span>
                    <ChevronDownIcon
                      className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                        openFaq === n ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <div
                    className={`overflow-hidden transition-all duration-200 ${
                      openFaq === n ? 'max-h-48 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                  >
                    <div className="px-6 pb-5 text-gray-500 leading-relaxed">
                      {t(`landing.faq.a${n}`)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#0f0a2e] to-[#1e1b4b] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[200px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('landing.faq.ctaTitle')}
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            {t('landing.faq.ctaSubtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold text-lg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-400 hover:to-primary-500 transition-all"
            >
              {t('common.getStarted')}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-8 py-4 rounded-xl border border-white/20 text-white font-semibold text-lg hover:bg-white/5 transition-colors"
            >
              {t('common.pricing')}
            </Link>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
            <p className="text-sm text-gray-500">
              {t('common.copyright')}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
