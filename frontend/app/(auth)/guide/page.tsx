'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import PublicNav from '@/components/layout/PublicNav';

// ─── Inline Icons ────────────────────────────────────────────────────────────

function DocumentIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

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
    <div className="min-h-screen font-sans text-white bg-base dot-grid overflow-x-hidden">
      <PublicNav activePage="guide" />

      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="coral-glow -top-40 -right-40" />
        <div className="coral-glow bottom-0 -left-40" style={{ animationDelay: '-3s' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-5">
            {t('guide.heroTitle').split(' ').slice(0, -1).join(' ')}{' '}
            <span className="coral-gradient-text">{t('guide.heroTitle').split(' ').slice(-1)}</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto mb-10">
            {t('guide.heroSubtitle')}
          </p>
          <Link
            href="/signup"
            className="btn-coral inline-flex items-center bg-coral text-white font-bold px-8 py-3.5 rounded-xl text-sm relative z-10"
          >
            {t('common.startFreeTrial')}
          </Link>
        </div>
      </section>

      {/* ── Before vs After ──────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {t('guide.beforeAfterTitle')}
            </h2>
            <p className="mt-4 text-lg text-gray-400">{t('guide.beforeAfterSubtitle')}</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <XCircleIcon className="w-5 h-5 text-red-400" />
                <span className="font-bold text-red-400 text-sm uppercase tracking-wide">{t('guide.before')}</span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="window-card flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-5 py-4">
                    <XCircleIcon className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{t(`guide.ba${n}Before`)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-4">
                <CheckCircleIcon className="w-5 h-5 text-emerald-400" />
                <span className="font-bold text-emerald-400 text-sm uppercase tracking-wide">{t('guide.after')}</span>
              </div>
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="window-card flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl px-5 py-4">
                    <CheckCircleIcon className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-300">{t(`guide.ba${n}After`)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5-Step Guide ─────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {t('guide.stepsTitle').split(' ').slice(0, -1).join(' ')}{' '}
              <span className="coral-gradient-text">{t('guide.stepsTitle').split(' ').slice(-1)}</span>
            </h2>
            <p className="mt-4 text-lg text-gray-400">{t('guide.stepsSubtitle')}</p>
          </div>

          <div className="space-y-8">
            {[1, 2, 3, 4, 5].map((n, i) => (
              <div
                key={n}
                className={`flex flex-col md:flex-row items-center gap-8 ${i % 2 === 1 ? 'md:flex-row-reverse' : ''}`}
              >
                <div className="flex-shrink-0 w-full md:w-48 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-coral/10 border border-coral/20 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral to-coral-dark flex items-center justify-center shadow-lg shadow-coral/25">
                      {STEP_ICONS[i]}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-coral uppercase tracking-wider">Step {n}</div>
                </div>

                <div className="flex-1 window-card bg-surface-dark/60 rounded-2xl border border-white/5 overflow-hidden">
                  <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                    <div className="w-2.5 h-2.5 rounded-full bg-coral/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400/40" />
                    <span className="ml-2 text-xs text-gray-600 font-mono">step-{n}</span>
                  </div>
                  <div className="p-6">
                    <h3 className="text-xl font-bold text-white mb-3">{t(`guide.step${n}Title`)}</h3>
                    <p className="text-gray-400 leading-relaxed mb-4">{t(`guide.step${n}Desc`)}</p>
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-coral/10 border border-coral/20">
                      <SparklesIcon className="w-4 h-4 text-coral" />
                      <span className="text-sm font-medium text-coral-light italic">{t(`guide.step${n}Quote`)}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Preview ────────────────────────────── */}
      <section className="relative py-24 overflow-hidden">
        <div className="coral-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0.15 }} />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">{t('guide.dashboardTitle')}</h2>
            <p className="mt-4 text-lg text-gray-300">{t('guide.dashboardSubtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {(['dashKpi', 'dashPipeline', 'dashTrends', 'dashActions'] as const).map((key, i) => {
              const icons = [
                <ChartBarIcon key="d1" className="w-5 h-5 text-coral" />,
                <InboxIcon key="d2" className="w-5 h-5 text-coral" />,
                <BanknotesIcon key="d3" className="w-5 h-5 text-coral" />,
                <ShieldCheckIcon key="d4" className="w-5 h-5 text-coral" />,
              ];
              return (
                <div key={key} className="window-card flex items-start gap-4 bg-surface-dark/60 border border-white/5 rounded-2xl p-5">
                  <div className="w-10 h-10 rounded-lg bg-coral/15 flex items-center justify-center flex-shrink-0">{icons[i]}</div>
                  <p className="text-gray-300 text-sm leading-relaxed">{t(`guide.${key}`)}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Features Grid ────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              {t('guide.featuresTitle')}
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((n, i) => (
              <div key={n} className="window-card bg-surface-dark/60 rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                  <div className="w-2.5 h-2.5 rounded-full bg-coral/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/40" />
                </div>
                <div className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral to-coral-dark flex items-center justify-center mb-4 shadow-lg shadow-coral/20">
                    {FEATURE_ICONS[i]}
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{t(`guide.feat${n}Title`)}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{t(`guide.feat${n}Desc`)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Quick Start ──────────────────────────────────── */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-12">
            {t('guide.quickStartTitle')}
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mb-10">
            {[1, 2, 3].map((n) => (
              <div key={n}>
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-coral to-coral-dark text-white text-xl font-bold mb-4 shadow-lg shadow-coral/25">
                  {n}
                </div>
                <p className="text-gray-300 font-medium">{t(`guide.min${n}`)}</p>
              </div>
            ))}
          </div>
          <p className="text-gray-500 italic">{t('guide.quickStartNote')}</p>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="relative py-20 overflow-hidden">
        <div className="coral-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0.3 }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mb-4">
            {t('guide.ctaTitle')}
          </h2>
          <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">{t('guide.ctaSubtitle')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup" className="btn-coral inline-flex items-center px-8 py-4 rounded-xl bg-coral text-white font-bold text-lg relative z-10">
              {t('common.getStarted')}
            </Link>
            <Link href="/pricing" className="inline-flex items-center px-8 py-4 rounded-xl border border-white/10 text-white font-semibold text-lg hover:bg-white/5 transition-colors">
              {t('common.pricing')}
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t border-white/5 py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-10">
            <div>
              <div className="flex items-center gap-2.5 mb-4">
                <div className="w-8 h-8 rounded-lg bg-coral/10 border border-coral/20 flex items-center justify-center">
                  <DocumentIcon className="w-4 h-4 text-coral" />
                </div>
                <span className="font-bold">{t('common.aiInvoice')}</span>
              </div>
              <p className="text-sm text-gray-500 leading-relaxed">Invoice automation that actually works. Built for modern teams.</p>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Product</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><Link href="/guide" className="hover:text-coral transition-colors">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-coral transition-colors">{t('common.pricing')}</Link></li>
                <li><Link href="/demo" className="hover:text-coral transition-colors">Demo</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Company</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><Link href="/faq" className="hover:text-coral transition-colors">FAQ</Link></li>
                <li><Link href="/contact" className="hover:text-coral transition-colors">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-sm font-semibold mb-4">Legal</h4>
              <ul className="space-y-2.5 text-sm text-gray-500">
                <li><span className="cursor-default">Privacy</span></li>
                <li><span className="cursor-default">Terms</span></li>
                <li><span className="cursor-default">Security</span></li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-white/5 text-center text-sm text-gray-600">
            {t('common.copyright')}
          </div>
        </div>
      </footer>
    </div>
  );
}
