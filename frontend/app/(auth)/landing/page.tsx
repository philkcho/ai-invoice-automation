'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

// ─── Icons (inline SVG) ───────────────────────────────────────────────────────

function BrainIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 0 1-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 0 1 4.5 0m0 0v5.714a2.25 2.25 0 0 0 .659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M12 3v5.714" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 18.75h15" />
    </svg>
  );
}

function SparklesIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
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

function ArrowPathIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12c0-1.232-.046-2.453-.138-3.662a4.006 4.006 0 0 0-3.7-3.7 48.678 48.678 0 0 0-7.324 0 4.006 4.006 0 0 0-3.7 3.7c-.017.22-.032.441-.046.662M19.5 12l3-3m-3 3-3-3m-12 3c0 1.232.046 2.453.138 3.662a4.006 4.006 0 0 0 3.7 3.7 48.656 48.656 0 0 0 7.324 0 4.006 4.006 0 0 0 3.7-3.7c.017-.22.032-.441.046-.662M4.5 12l3 3m-3-3-3 3" />
    </svg>
  );
}

function LinkIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 0 1 1.242 7.244l-4.5 4.5a4.5 4.5 0 0 1-6.364-6.364l1.757-1.757m13.35-.622 1.757-1.757a4.5 4.5 0 0 0-6.364-6.364l-4.5 4.5a4.5 4.5 0 0 0 1.242 7.244" />
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

function CheckCircleIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
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

function CheckIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [demoState, setDemoState] = useState<'idle' | 'loading' | 'result'>('idle');
  const [demoIndex, setDemoIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen font-sans text-gray-900 overflow-x-hidden">
      {/* ── Section 1: Navigation Bar ──────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'bg-[#1c1917]/80 backdrop-blur-xl shadow-lg'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="text-white font-bold text-lg">{t('common.aiInvoice')}</span>
            </div>
            {/* Desktop nav buttons */}
            <div className="hidden lg:flex items-center gap-3">
              <Link
                href="/faq"
                className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                FAQ
              </Link>
              <Link
                href="/guide"
                className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                Guide
              </Link>
              <Link
                href="/pricing"
                className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                {t('common.pricing')}
              </Link>
              <Link
                href="/contact"
                className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                Contact
              </Link>
              <LanguageSwitcher className="text-white border-white/20 hover:bg-white/10" />
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                {t('common.signIn')}
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-400 transition-colors"
              >
                {t('common.signUp')}
              </Link>
            </div>
            {/* Mobile hamburger button */}
            <button
              className="lg:hidden p-2 text-white hover:bg-white/10 rounded-lg transition-colors"
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
        {/* Mobile menu dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-[#1c1917]/95 backdrop-blur-xl border-t border-white/10">
            <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
              <Link href="/faq" className="px-4 py-3 text-sm font-medium text-white rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                FAQ
              </Link>
              <Link href="/guide" className="px-4 py-3 text-sm font-medium text-white rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Guide
              </Link>
              <Link href="/pricing" className="px-4 py-3 text-sm font-medium text-white rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                {t('common.pricing')}
              </Link>
              <Link href="/contact" className="px-4 py-3 text-sm font-medium text-white rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                Contact
              </Link>
              <div className="px-4 py-2">
                <LanguageSwitcher className="text-white border-white/20 hover:bg-white/10" />
              </div>
              <hr className="border-white/10 my-1" />
              <Link href="/login" className="px-4 py-3 text-sm font-medium text-white rounded-lg hover:bg-white/10 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                {t('common.signIn')}
              </Link>
              <Link href="/signup" className="px-4 py-3 text-sm font-medium text-center text-white bg-primary-500 rounded-lg hover:bg-primary-400 transition-colors" onClick={() => setMobileMenuOpen(false)}>
                {t('common.signUp')}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ── Section 2: Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-[#1c1917] to-[#292524] overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(244,63,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(244,63,94,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500/20 rounded-full blur-[120px] animate-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-[150px] animate-glow-delayed" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-rose-500/10 rounded-full blur-[100px] animate-glow" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium">
              <SparklesIcon className="w-4 h-4" />
              {t('landing.poweredByAi')}
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
              {t('landing.heroTitle')}
            </h1>

            <p className="text-lg text-gray-300 max-w-lg leading-relaxed">
              {t('landing.heroSubtitle')}
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-400 hover:to-primary-500 transition-all"
              >
                {t('common.startFreeTrial')}
              </Link>
              <Link
                href="/demo"
                className="inline-flex items-center px-6 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/5 transition-colors"
              >
                <SparklesIcon className="w-5 h-5 mr-2" />
                Try Demo
              </Link>
            </div>
          </div>

          {/* Right — Dashboard mockup */}
          <div className="hidden lg:block relative">
            <div className="animate-float">
              {/* Main card */}
              <div className="relative bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-2xl p-6 shadow-2xl">
                {/* Header bar */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <div className="h-4 w-32 bg-white/10 rounded" />
                </div>

                {/* Stat cards row */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  {[
                    { label: t('landing.processed'), value: '1,284', color: 'from-primary-400 to-primary-600' },
                    { label: t('landing.pending'), value: '23', color: 'from-amber-400 to-orange-500' },
                    { label: t('landing.accuracy'), value: '99.2%', color: 'from-emerald-400 to-green-500' },
                  ].map((stat) => (
                    <div
                      key={stat.label}
                      className="bg-white/[0.06] rounded-xl p-3 border border-white/[0.08]"
                    >
                      <div className={`text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r ${stat.color}`}>
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Chart placeholder */}
                <div className="bg-white/[0.04] rounded-xl p-4 border border-white/[0.06]">
                  <div className="flex items-end gap-1.5 h-24 justify-between px-2">
                    {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                      <div
                        key={i}
                        className="flex-1 bg-gradient-to-t from-primary-500 to-primary-400 rounded-sm opacity-80"
                        style={{ height: `${h}%` }}
                      />
                    ))}
                  </div>
                </div>

                {/* Invoice list preview */}
                <div className="mt-4 space-y-2">
                  {[
                    { id: 'INV-2024-0891', vendor: 'Acme Corp', status: 'Approved', statusColor: 'bg-green-400' },
                    { id: 'INV-2024-0892', vendor: 'TechSupply Inc', status: 'Pending', statusColor: 'bg-amber-400' },
                    { id: 'INV-2024-0893', vendor: 'Global Logistics', status: 'Processing', statusColor: 'bg-primary-400' },
                  ].map((inv) => (
                    <div
                      key={inv.id}
                      className="flex items-center justify-between bg-white/[0.04] rounded-lg px-3 py-2 border border-white/[0.06]"
                    >
                      <div className="flex items-center gap-3">
                        <div className="text-xs font-mono text-gray-400">{inv.id}</div>
                        <div className="text-sm text-gray-300">{inv.vendor}</div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full ${inv.statusColor}`} />
                        <span className="text-xs text-gray-400">{inv.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating badge */}
              <div className="absolute -top-4 -right-4 animate-float-delayed bg-white/[0.1] backdrop-blur-lg border border-white/[0.15] rounded-xl px-4 py-2.5 shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center">
                    <CheckIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">{t('landing.aiVerified')}</div>
                    <div className="text-sm font-semibold text-white">$12,450.00</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 3: Social Proof Stats ──────────────────────────────────── */}
      <section className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: '99.2%', label: t('landing.stats.ocrAccuracy') },
              { value: '80%', label: t('landing.stats.fasterProcessing') },
              { value: '50%', label: t('landing.stats.costReduction') },
              { value: '24/7', label: t('landing.stats.automatedMonitoring') },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="text-3xl sm:text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-600 to-primary-500">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-500 mt-1 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 3.5: Why Teams Switch (도입 효과) ────────────────────── */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — Impact list */}
            <div>
              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
                {t('landing.impact.title')}
              </h2>
              <p className="text-lg text-gray-500 mb-10">
                {t('landing.impact.subtitle')}
              </p>

              <div className="space-y-6">
                {[1, 2, 3, 4, 5].map((n) => (
                  <div key={n} className="flex items-start gap-4">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center text-white font-bold text-sm shadow-lg shadow-primary-500/25">
                      {n}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-1">
                        {t(`landing.impact.item${n}Title`)}
                      </h3>
                      <p className="text-sm text-gray-500 leading-relaxed">
                        {t(`landing.impact.item${n}Desc`)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right — Pipeline mockup */}
            <div className="hidden lg:block">
              <div className="relative bg-gray-50 rounded-2xl p-6 shadow-card border border-gray-100">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-xs font-semibold text-gray-500">{t('landing.impact.mockupTitle')}</span>
                </div>

                {/* Pipeline bars */}
                <div className="space-y-3">
                  {[
                    { stage: 'RECEIVED', count: 42, pct: 100, color: 'from-gray-400 to-gray-500' },
                    { stage: 'PENDING', count: 28, pct: 67, color: 'from-blue-400 to-blue-500' },
                    { stage: 'IN APPROVAL', count: 15, pct: 36, color: 'from-rose-400 to-rose-500' },
                    { stage: 'APPROVED', count: 124, pct: 95, color: 'from-emerald-400 to-emerald-500' },
                    { stage: 'PAID', count: 1284, pct: 100, color: 'from-primary-400 to-primary-500' },
                  ].map((item) => (
                    <div key={item.stage}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-600">{item.stage}</span>
                        <span className="text-xs font-bold text-gray-900">{item.count}</span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`h-full bg-gradient-to-r ${item.color} rounded-full`}
                          style={{ width: `${item.pct}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3 mt-6">
                  {[
                    { label: 'Avg. Processing', value: '< 30s' },
                    { label: 'Accuracy', value: '99.2%' },
                    { label: 'Time Saved', value: '80%' },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white rounded-lg p-3 border border-gray-100 text-center">
                      <div className="text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-primary-500 to-primary-600">
                        {stat.value}
                      </div>
                      <div className="text-[10px] text-gray-500 mt-0.5">{stat.label}</div>
                    </div>
                  ))}
                </div>

                {/* Floating badge */}
                <div className="absolute -top-3 -right-3 bg-white rounded-xl px-4 py-2 shadow-lg border border-gray-100">
                  <div className="flex items-center gap-2 text-sm">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    <span className="text-gray-600 font-medium">{t('landing.impact.mockupBadge')}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 4: 4 Core Features ─────────────────────────────────────── */}
      <section className="bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {t('landing.features.sectionTitle')}
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              {t('landing.features.sectionSubtitle')}
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: <CpuChipIcon className="w-6 h-6 text-white" />,
                title: t('landing.features.aiAutomation'),
                desc: t('landing.features.aiAutomationDesc'),
              },
              {
                icon: <ChartBarIcon className="w-6 h-6 text-white" />,
                title: t('landing.features.analytics'),
                desc: t('landing.features.analyticsDesc'),
              },
              {
                icon: <ArrowPathIcon className="w-6 h-6 text-white" />,
                title: t('landing.features.approval'),
                desc: t('landing.features.approvalDesc'),
              },
              {
                icon: <LinkIcon className="w-6 h-6 text-white" />,
                title: t('landing.features.integration'),
                desc: t('landing.features.integrationDesc'),
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="group bg-white rounded-2xl p-8 shadow-card hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1"
              >
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center mb-5 shadow-lg shadow-primary-500/20">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">
                  {feature.title}
                </h3>
                <p className="text-gray-500 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 5: How It Works ────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#1c1917] to-[#292524] overflow-hidden">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(244,63,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(244,63,94,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              {t('landing.howItWorks.title')}
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary-500/40 via-primary-500/60 to-primary-500/40" />

            {[
              {
                step: 1,
                icon: <InboxIcon className="w-6 h-6 text-white" />,
                title: t('landing.howItWorks.step1'),
                desc: t('landing.howItWorks.step1Desc'),
              },
              {
                step: 2,
                icon: <CpuChipIcon className="w-6 h-6 text-white" />,
                title: t('landing.howItWorks.step2'),
                desc: t('landing.howItWorks.step2Desc'),
              },
              {
                step: 3,
                icon: <CheckCircleIcon className="w-6 h-6 text-white" />,
                title: t('landing.howItWorks.step3'),
                desc: t('landing.howItWorks.step3Desc'),
              },
              {
                step: 4,
                icon: <BanknotesIcon className="w-6 h-6 text-white" />,
                title: t('landing.howItWorks.step4'),
                desc: t('landing.howItWorks.step4Desc'),
              },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary-500/20 to-primary-600/20 border border-primary-500/30 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center shadow-lg shadow-primary-500/25">
                    {item.icon}
                  </div>
                </div>
                <div className="absolute -top-2 -right-2 md:static md:mb-2">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-500 text-white text-xs font-bold md:hidden">
                    {item.step}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Section 6: AI Chat Preview ─────────────────────────────────────── */}
      <section className="bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left — Text */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-50 border border-primary-100 text-primary-600 text-sm font-medium">
                <SparklesIcon className="w-4 h-4" />
                {t('landing.aiChat.badge')}
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                {t('landing.aiChat.title')}
              </h2>

              <p className="text-lg text-gray-500 leading-relaxed">
                {t('landing.aiChat.subtitle')}
              </p>

              <ul className="space-y-4">
                {[
                  t('landing.aiChat.feature1'),
                  t('landing.aiChat.feature2'),
                  t('landing.aiChat.feature3'),
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <div className="mt-0.5 w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center flex-shrink-0">
                      <CheckIcon className="w-3 h-3 text-primary-600" />
                    </div>
                    <span className="text-gray-600">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Right — Chat mockup */}
            <div className="relative">
              <div className="bg-gray-50 rounded-2xl p-6 shadow-card border border-gray-100">
                {/* Chat header */}
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-200">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 text-sm">{t('landing.aiChat.assistant')}</div>
                    <div className="text-xs text-green-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      {t('landing.aiChat.online')}
                    </div>
                  </div>
                </div>

                {/* User message */}
                <div className="flex justify-end mb-4">
                  <div className="bg-primary-500 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[80%] text-sm">
                    {t('landing.aiChat.userMsg')}
                  </div>
                </div>

                {/* AI message */}
                <div className="flex justify-start mb-4">
                  <div className="bg-white rounded-2xl rounded-bl-md px-5 py-4 max-w-[90%] text-sm shadow-sm border border-gray-100">
                    <p className="text-gray-700 mb-3">
                      {t('landing.aiChat.botMsg')}
                    </p>
                    {/* Mini chart */}
                    <div className="space-y-2.5 mb-3">
                      {[
                        { name: 'Acme Corp', amount: '$48,250', pct: 92 },
                        { name: 'TechSupply', amount: '$35,800', pct: 68 },
                        { name: 'Global Logistics', amount: '$28,400', pct: 54 },
                        { name: 'Office Pro', amount: '$19,600', pct: 37 },
                        { name: 'CloudServ Inc', amount: '$15,200', pct: 29 },
                      ].map((v) => (
                        <div key={v.name} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">{v.name}</span>
                            <span className="font-medium text-gray-900">{v.amount}</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full"
                              style={{ width: `${v.pct}%` }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500">
                      Total spend: $147,250 &middot; 12% increase from last quarter
                    </p>
                  </div>
                </div>

                {/* Input */}
                <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-200 px-4 py-3">
                  <span className="text-sm text-gray-400 flex-1">{t('landing.aiChat.inputPlaceholder')}</span>
                  <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Floating notification */}
              <div className="absolute -top-3 -left-3 animate-float-delayed bg-white rounded-xl px-4 py-2.5 shadow-lg border border-gray-100">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-2 h-2 rounded-full bg-amber-400" />
                  <span className="text-gray-600 font-medium">{t('landing.aiChat.anomalies')}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: Interactive Demo ─────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#1c1917] to-[#292524] overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(244,63,94,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(244,63,94,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            {/* Left — Upload area */}
            <div className="space-y-6">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium">
                <SparklesIcon className="w-4 h-4" />
                {t('landing.demo.badge')}
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-white">
                {t('landing.demo.title')}
              </h2>
              <p className="text-lg text-gray-300">
                {t('landing.demo.subtitle')}
              </p>

              {/* Drop zone */}
              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                  setDemoState('loading');
                  setDemoIndex(Math.floor(Math.random() * 3));
                  setTimeout(() => setDemoState('result'), 1500);
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-all ${
                  dragOver
                    ? 'border-primary-400 bg-primary-500/10'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-gray-300 font-medium">{t('landing.demo.dropzone')}</p>
                <p className="text-sm text-gray-500 mt-1">{t('landing.demo.dropzoneOr')}</p>
              </div>

              {/* Sample buttons */}
              <div className="flex flex-wrap gap-2 sm:gap-3">
                {[0, 1, 2].map((i) => (
                  <button
                    key={i}
                    onClick={() => {
                      setDemoIndex(i);
                      setDemoState('loading');
                      setTimeout(() => setDemoState('result'), 1500);
                    }}
                    className="px-3 sm:px-4 py-2.5 rounded-lg bg-white/[0.07] border border-white/[0.12] text-sm text-gray-300 hover:bg-white/[0.12] hover:text-white transition-colors"
                  >
                    {t(`landing.demo.sample${i + 1}`)}
                  </button>
                ))}
              </div>
            </div>

            {/* Right — Result card */}
            <div className="bg-white/[0.07] backdrop-blur-xl border border-white/[0.12] rounded-2xl p-6 shadow-2xl min-h-[480px] flex flex-col">
              {demoState === 'idle' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-16 h-16 rounded-2xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center mb-4">
                    <SparklesIcon className="w-8 h-8 text-gray-500" />
                  </div>
                  <h3 className="text-lg font-semibold text-gray-300">{t('landing.demo.idleTitle')}</h3>
                  <p className="text-sm text-gray-500 mt-1">{t('landing.demo.idleDesc')}</p>
                </div>
              )}

              {demoState === 'loading' && (
                <div className="flex-1 flex flex-col items-center justify-center text-center">
                  <div className="w-12 h-12 border-4 border-primary-500/30 border-t-primary-500 rounded-full animate-spin mb-4" />
                  <p className="text-gray-300 font-medium">{t('landing.demo.loading')}</p>
                </div>
              )}

              {demoState === 'result' && (() => {
                const samples = [
                  {
                    vendor: 'Acme Consulting Group',
                    invoiceNumber: 'INV-2026-0847',
                    date: '2026-03-15',
                    dueDate: '2026-04-14',
                    poNumber: 'PO-2026-0312',
                    conf: { vendor: 97, invoiceNumber: 99, date: 98, dueDate: 95 },
                    lineItems: [
                      { desc: 'Strategic Consulting — Q1', qty: 1, price: 15000.00, conf: 96 },
                      { desc: 'Market Research Report', qty: 2, price: 3500.00, conf: 94 },
                      { desc: 'Workshop Facilitation', qty: 3, price: 2000.00, conf: 72 },
                    ],
                    subtotal: 28000.00, tax: 1875.00, total: 29875.00, avgConf: 93,
                  },
                  {
                    vendor: 'TechSupply International',
                    invoiceNumber: 'TS-88421',
                    date: '2026-03-10',
                    dueDate: '2026-04-09',
                    poNumber: 'PO-2026-0298',
                    conf: { vendor: 95, invoiceNumber: 99, date: 97, dueDate: 96 },
                    lineItems: [
                      { desc: 'Laptop — Dell XPS 15', qty: 5, price: 1899.00, conf: 98 },
                      { desc: 'Monitor — LG 27" 4K', qty: 5, price: 449.00, conf: 97 },
                      { desc: 'Keyboard & Mouse Set', qty: 10, price: 89.00, conf: 85 },
                    ],
                    subtotal: 11740.00, tax: 1021.30, total: 12761.30, avgConf: 95,
                  },
                  {
                    vendor: 'CloudServ Inc',
                    invoiceNumber: 'CS-2026-3391',
                    date: '2026-03-01',
                    dueDate: '2026-03-31',
                    poNumber: null,
                    conf: { vendor: 92, invoiceNumber: 98, date: 99, dueDate: 94 },
                    lineItems: [
                      { desc: 'AWS Hosting — March', qty: 1, price: 4200.00, conf: 99 },
                      { desc: 'SSL Certificate Renewal', qty: 3, price: 150.00, conf: 68 },
                      { desc: '24/7 Support Plan', qty: 1, price: 800.00, conf: 91 },
                    ],
                    subtotal: 5450.00, tax: 437.50, total: 5887.50, avgConf: 90,
                  },
                ];
                const inv = samples[demoIndex];
                return (
                  <div className="flex-1 flex flex-col">
                    {/* Overall confidence */}
                    <div className="flex items-center gap-3 mb-4 bg-white/[0.06] rounded-lg px-3 py-2 border border-white/[0.08]">
                      <span className="text-[10px] text-gray-400">AI Confidence</span>
                      <div className="flex-1 h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${inv.avgConf}%` }} />
                      </div>
                      <span className="text-xs font-bold text-emerald-400">{inv.avgConf}%</span>
                    </div>

                    {/* Header fields */}
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { label: t('landing.demo.vendor'), value: inv.vendor, c: inv.conf.vendor },
                        { label: t('landing.demo.invoiceNo'), value: inv.invoiceNumber, c: inv.conf.invoiceNumber },
                        { label: t('landing.demo.date'), value: inv.date, c: inv.conf.date },
                        { label: t('landing.demo.dueDate'), value: inv.dueDate, c: inv.conf.dueDate },
                      ].map((f) => (
                        <div key={f.label} className="bg-white/[0.06] rounded-lg px-3 py-2 border border-white/[0.08]">
                          <div className="flex items-center justify-between">
                            <div className="text-[10px] text-gray-500 uppercase tracking-wider">{f.label}</div>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                              f.c >= 90 ? 'bg-emerald-500/20 text-emerald-400' : f.c >= 70 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                            }`}>{f.c}%</span>
                          </div>
                          <div className="text-sm font-medium text-white mt-0.5">{f.value}</div>
                        </div>
                      ))}
                    </div>

                    {inv.poNumber && (
                      <div className="bg-white/[0.06] rounded-lg px-3 py-2 border border-white/[0.08] mb-4">
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider">{t('landing.demo.poNumber')}</div>
                        <div className="text-sm font-medium text-emerald-400 mt-0.5">{inv.poNumber}</div>
                      </div>
                    )}

                    {/* Line items */}
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">{t('landing.demo.lineItems')}</div>
                    <div className="bg-white/[0.04] rounded-lg border border-white/[0.06] overflow-hidden mb-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-white/[0.08]">
                            <th className="text-left px-3 py-2 text-[10px] text-gray-500 font-medium">{t('landing.demo.description')}</th>
                            <th className="text-right px-3 py-2 text-[10px] text-gray-500 font-medium">{t('landing.demo.qty')}</th>
                            <th className="text-right px-3 py-2 text-[10px] text-gray-500 font-medium">{t('landing.demo.unitPrice')}</th>
                            <th className="text-right px-3 py-2 text-[10px] text-gray-500 font-medium">{t('landing.demo.amount')}</th>
                            <th className="text-center px-3 py-2 text-[10px] text-gray-500 font-medium">AI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.lineItems.map((li, idx) => (
                            <tr key={idx} className="border-b border-white/[0.04]">
                              <td className="px-3 py-2 text-gray-300 text-xs">{li.desc}</td>
                              <td className="px-3 py-2 text-gray-300 text-xs text-right">{li.qty}</td>
                              <td className="px-3 py-2 text-gray-300 text-xs text-right">${li.price.toLocaleString()}</td>
                              <td className="px-3 py-2 text-white text-xs text-right font-medium">${(li.qty * li.price).toLocaleString()}</td>
                              <td className="px-3 py-2 text-center">
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  li.conf >= 90 ? 'bg-emerald-500/20 text-emerald-400' : li.conf >= 70 ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'
                                }`}>{li.conf}%</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Totals */}
                    <div className="mt-auto space-y-1.5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('landing.demo.subtotal')}</span>
                        <span className="text-gray-300">${inv.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('landing.demo.tax')}</span>
                        <span className="text-gray-300">${inv.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-white/[0.1] pt-2">
                        <span className="text-white">{t('landing.demo.total')}</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-500">${inv.total.toLocaleString()}</span>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/[0.08]">
                      <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {t('landing.demo.extractedIn')}
                      </div>
                      <button
                        onClick={() => setDemoState('idle')}
                        className="text-xs text-primary-300 hover:text-primary-200 transition-colors"
                      >
                        {t('landing.demo.tryAnother')}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Bottom CTA */}
          {demoState === 'result' && (
            <div className="mt-10 text-center">
              <p className="text-gray-300 mb-4">{t('landing.demo.ctaText')}</p>
              <Link
                href="/signup"
                className="inline-flex items-center px-7 py-3.5 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-400 hover:to-primary-500 transition-all"
              >
                {t('common.startFreeTrial')}
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* ── Section 8: FAQ ──────────────────────────────────────────────────── */}
      <section className="bg-surface-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              {t('landing.faq.title')}
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              {t('landing.faq.subtitle')}
            </p>
          </div>

          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
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
                  <svg
                    className={`w-5 h-5 text-gray-400 flex-shrink-0 transition-transform duration-200 ${
                      openFaq === n ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  </svg>
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
      </section>

      {/* ── Section 8: Final CTA + Footer ──────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#1c1917] to-[#292524] overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[200px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            {t('landing.cta.title')}
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            {t('landing.cta.subtitle')}
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold text-lg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-400 hover:to-primary-500 transition-all"
          >
            {t('common.getStarted')}
          </Link>
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
