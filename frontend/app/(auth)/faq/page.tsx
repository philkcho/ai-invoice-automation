'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import PublicNav from '@/components/layout/PublicNav';

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
    <div className="min-h-screen font-sans text-white bg-base dot-grid overflow-x-hidden">
      <PublicNav activePage="faq" />

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative pt-16 overflow-hidden">
        {/* Coral glow blob */}
        <div className="coral-glow -top-40 -right-40" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            {t('landing.faq.title').split(' ').length > 2 ? (
              <>
                {t('landing.faq.title').split(' ').slice(0, -1).join(' ')}{' '}
                <span className="coral-gradient-text">
                  {t('landing.faq.title').split(' ').slice(-1)[0]}
                </span>
              </>
            ) : (
              <>
                {t('landing.faq.title').split(' ')[0]}{' '}
                <span className="coral-gradient-text">
                  {t('landing.faq.title').split(' ').slice(1).join(' ')}
                </span>
              </>
            )}
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
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <div className="w-1.5 h-6 rounded-full bg-gradient-to-b from-coral to-coral-dark" />
              {t(`landing.faq.cat_${category.key}`)}
            </h2>

            <div className="space-y-3">
              {category.items.map((n) => (
                <div
                  key={n}
                  className="window-card bg-surface-dark/60 rounded-2xl border border-white/5 overflow-hidden"
                >
                  <button
                    onClick={() => setOpenFaq(openFaq === n ? null : n)}
                    className="w-full flex items-center justify-between px-6 py-5 text-left hover:bg-surface-dark-light transition-colors"
                  >
                    <span className="flex items-center gap-3 font-semibold text-white pr-4">
                      {/* macOS dots */}
                      <span className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="w-2.5 h-2.5 rounded-full bg-coral/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                        <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                      </span>
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
                    <div className="px-6 pb-5 text-gray-400 leading-relaxed">
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
      <section className="relative bg-surface-dark overflow-hidden">
        {/* Coral glow blob */}
        <div className="coral-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

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
              className="btn-coral inline-flex items-center px-8 py-4 rounded-xl bg-coral text-white font-semibold text-lg shadow-lg shadow-coral/25 hover:bg-coral-dark hover:shadow-coral/40 transition-all"
            >
              {t('common.getStarted')}
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center px-8 py-4 rounded-xl border border-white/10 text-white font-semibold text-lg hover:bg-white/5 transition-colors"
            >
              {t('common.pricing')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
      <footer className="border-t border-white/5 bg-base">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-10">
            {/* Brand */}
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-coral-dark flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-white text-lg">AI Invoice</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">
                Invoice automation that actually works.
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Product</h4>
              <ul className="space-y-2.5">
                <li><Link href="/guide" className="text-sm text-gray-500 hover:text-coral transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="text-sm text-gray-500 hover:text-coral transition-colors">Pricing</Link></li>
                <li><span className="text-sm text-gray-600">Integrations</span></li>
                <li><span className="text-sm text-gray-600">Changelog</span></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Company</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-gray-600">About</span></li>
                <li><span className="text-sm text-gray-600">Blog</span></li>
                <li><span className="text-sm text-gray-600">Careers</span></li>
                <li><Link href="/contact" className="text-sm text-gray-500 hover:text-coral transition-colors">Contact</Link></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-sm font-semibold text-white mb-4">Legal</h4>
              <ul className="space-y-2.5">
                <li><span className="text-sm text-gray-600">Privacy</span></li>
                <li><span className="text-sm text-gray-600">Terms</span></li>
                <li><span className="text-sm text-gray-600">Security</span></li>
              </ul>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-t border-white/5 mt-12 pt-8 text-center">
            <p className="text-sm text-gray-500">
              {t('common.copyright')}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
