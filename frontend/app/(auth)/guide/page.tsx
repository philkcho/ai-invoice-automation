'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

// ─── Inline Icons ────────────────────────────────────────────────────────────

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function XCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m9.75 9.75 4.5 4.5m0-4.5-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function CheckCircleIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
    </svg>
  );
}

function InboxIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" />
    </svg>
  );
}

function CpuChipIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
    </svg>
  );
}

function CheckBadgeIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z" />
    </svg>
  );
}

function BanknotesIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
    </svg>
  );
}

function ChartBarIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
    </svg>
  );
}

function ChatBubbleIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
    </svg>
  );
}

function BuildingIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
    </svg>
  );
}

// ─── Step Icons by Index ─────────────────────────────────────────────────────

const STEP_ICONS = [
  <InboxIcon key="s1" className="w-6 h-6 text-white" />,
  <CpuChipIcon key="s2" className="w-6 h-6 text-white" />,
  <ShieldCheckIcon key="s3" className="w-6 h-6 text-white" />,
  <CheckBadgeIcon key="s4" className="w-6 h-6 text-white" />,
  <BanknotesIcon key="s5" className="w-6 h-6 text-white" />,
];

const FEATURE_ICONS = [
  <CpuChipIcon key="f1" className="w-6 h-6 text-white" />,
  <ShieldCheckIcon key="f2" className="w-6 h-6 text-white" />,
  <CheckBadgeIcon key="f3" className="w-6 h-6 text-white" />,
  <BanknotesIcon key="f4" className="w-6 h-6 text-white" />,
  <ChatBubbleIcon key="f5" className="w-6 h-6 text-white" />,
  <BuildingIcon key="f6" className="w-6 h-6 text-white" />,
];

// ─── Guide Page ──────────────────────────────────────────────────────────────

export default function GuidePage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen font-sans text-gray-900">
      {/* ── Navigation ──────────────────────────────────────────── */}
      <nav className="border-b border-gray-100 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/landing" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">{t('common.aiInvoice')}</span>
            </Link>
            <div className="flex items-center gap-4">
              <Link href="/faq" className="px-4 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:text-gray-900 hover:border-gray-300 transition-colors">
                FAQ
              </Link>
              <Link href="/guide" className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg bg-primary-50">
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

      {/* ── Section 1: Hero ─────────────────────────────────────── */}
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

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-4xl sm:text-5xl font-bold text-white mb-5">
            {t('guide.heroTitle')}
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
            {t('guide.heroSubtitle')}
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/signup"
              className="inline-flex items-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-400 hover:to-primary-500 transition-all"
            >
              {t('common.startFreeTrial')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Section 2: Before vs After ──────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {t('guide.beforeAfterTitle')}
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              {t('guide.beforeAfterSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Before column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <XCircleIcon className="w-5 h-5 text-red-500" />
                <span className="font-bold text-red-600 text-sm uppercase tracking-wide">
                  {t('guide.before')}
                </span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl px-5 py-4"
                  >
                    <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{t(`guide.ba${n}Before`)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* After column */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircleIcon className="w-5 h-5 text-green-500" />
                <span className="font-bold text-green-600 text-sm uppercase tracking-wide">
                  {t('guide.after')}
                </span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div
                    key={n}
                    className="flex items-start gap-3 bg-green-50 border border-green-100 rounded-xl px-5 py-4"
                  >
                    <CheckCircleIcon className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700">{t(`guide.ba${n}After`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: 5-Step Guide ─────────────────────────────── */}
      <section className="bg-surface-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {t('guide.stepsTitle')}
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              {t('guide.stepsSubtitle')}
            </p>
          </div>

          <div className="space-y-8">
            {[1, 2, 3, 4, 5].map((n, i) => (
              <div
                key={n}
                className={`flex flex-col md:flex-row items-center gap-8 ${
                  i % 2 === 1 ? 'md:flex-row-reverse' : ''
                }`}
              >
                {/* Step number + icon */}
                <div className="flex-shrink-0 w-full md:w-48 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 border border-primary-500/30 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                      {STEP_ICONS[i]}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-primary-500 uppercase tracking-wider">
                    Step {n}
                  </div>
                </div>

                {/* Content card */}
                <div className="flex-1 bg-white rounded-2xl p-8 shadow-card border border-gray-100">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">
                    {t(`guide.step${n}Title`)}
                  </h3>
                  <p className="text-gray-500 leading-relaxed mb-4">
                    {t(`guide.step${n}Desc`)}
                  </p>
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-50 border border-primary-100">
                    <SparklesIcon className="w-4 h-4 text-primary-500" />
                    <span className="text-sm font-medium text-primary-700 italic">
                      {t(`guide.step${n}Quote`)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 4: Dashboard Preview ────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#0f0a2e] to-[#1e1b4b] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('guide.dashboardTitle')}
            </h2>
            <p className="mt-4 text-lg text-gray-300">
              {t('guide.dashboardSubtitle')}
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {(['dashKpi', 'dashPipeline', 'dashTrends', 'dashActions'] as const).map((key, i) => {
              const icons = [
                <ChartBarIcon key="d1" className="w-5 h-5 text-primary-400" />,
                <InboxIcon key="d2" className="w-5 h-5 text-primary-400" />,
                <BanknotesIcon key="d3" className="w-5 h-5 text-primary-400" />,
                <ShieldCheckIcon key="d4" className="w-5 h-5 text-primary-400" />,
              ];
              return (
                <div
                  key={key}
                  className="flex items-start gap-4 bg-white/[0.07] backdrop-blur-lg border border-white/[0.12] rounded-xl p-5"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-500/20 flex items-center justify-center flex-shrink-0">
                    {icons[i]}
                  </div>
                  <p className="text-gray-300 text-sm leading-relaxed">
                    {t(`guide.${key}`)}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Section 5: Features Grid ────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-14">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {t('guide.featuresTitle')}
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n, i) => (
              <div
                key={n}
                className="bg-white rounded-2xl p-6 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 border border-gray-100"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-4 shadow-lg shadow-primary-500/20">
                  {FEATURE_ICONS[i]}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">
                  {t(`guide.feat${n}Title`)}
                </h3>
                <p className="text-gray-500 text-sm leading-relaxed">
                  {t(`guide.feat${n}Desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: Quick Start ──────────────────────────────── */}
      <section className="bg-surface-50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-12">
            {t('guide.quickStartTitle')}
          </h2>

          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((n) => (
              <div key={n} className="relative">
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 text-white text-xl font-bold mb-4 shadow-lg shadow-primary-500/25">
                  {n}
                </div>
                <p className="text-gray-700 font-medium">
                  {t(`guide.min${n}`)}
                </p>
              </div>
            ))}
          </div>

          <p className="text-gray-500 italic">
            {t('guide.quickStartNote')}
          </p>
        </div>
      </section>

      {/* ── Section 7: CTA ──────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#0f0a2e] to-[#1e1b4b] overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[200px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('guide.ctaTitle')}
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
            {t('guide.ctaSubtitle')}
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
