'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

// ─── Icons ───────────────────────────────────────────────────────────────────

function SparklesIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 0 0-2.455 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
    </svg>
  );
}

function DocumentIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

// ─── Landing Page ────────────────────────────────────────────────────────────

export default function LandingPage() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-base text-white dot-grid min-h-screen overflow-x-hidden font-sans">
      {/* ── Nav ─────────────────────────────────────────────────────── */}
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
          scrolled
            ? 'backdrop-blur-xl bg-base/80 border-b border-white/5'
            : 'bg-transparent'
        }`}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/landing" className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-coral/10 border border-coral/20 flex items-center justify-center">
              <DocumentIcon className="w-5 h-5 text-coral" />
            </div>
            <span className="text-lg font-bold tracking-tight">{t('common.aiInvoice')}</span>
          </Link>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/faq" className="text-sm text-gray-400 hover:text-coral transition-colors">FAQ</Link>
            <Link href="/guide" className="text-sm text-gray-400 hover:text-coral transition-colors">Guide</Link>
            <Link href="/pricing" className="text-sm text-gray-400 hover:text-coral transition-colors">{t('common.pricing')}</Link>
            <Link href="/contact" className="text-sm text-gray-400 hover:text-coral transition-colors">Contact</Link>
            <LanguageSwitcher className="text-gray-400 border-white/10 hover:bg-white/5 hover:text-coral" />
            <Link href="/login" className="text-sm text-gray-400 hover:text-coral transition-colors">{t('common.signIn')}</Link>
            <Link href="/signup" className="btn-coral bg-coral hover:bg-coral-dark text-white text-sm font-semibold px-6 py-2.5 rounded-xl relative z-10">{t('common.signUp')}</Link>
          </div>
          <button
            className="md:hidden text-gray-400 hover:text-coral"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            )}
          </button>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden bg-base/95 backdrop-blur-xl px-6 pb-4 space-y-3 border-t border-white/5">
            <Link href="/faq" className="block text-sm text-gray-400 hover:text-coral py-2" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
            <Link href="/guide" className="block text-sm text-gray-400 hover:text-coral py-2" onClick={() => setMobileMenuOpen(false)}>Guide</Link>
            <Link href="/pricing" className="block text-sm text-gray-400 hover:text-coral py-2" onClick={() => setMobileMenuOpen(false)}>{t('common.pricing')}</Link>
            <Link href="/contact" className="block text-sm text-gray-400 hover:text-coral py-2" onClick={() => setMobileMenuOpen(false)}>Contact</Link>
            <div className="py-2"><LanguageSwitcher className="text-gray-400 border-white/10 hover:bg-white/5 hover:text-coral" /></div>
            <Link href="/login" className="block text-sm text-gray-400 hover:text-coral py-2" onClick={() => setMobileMenuOpen(false)}>{t('common.signIn')}</Link>
            <Link href="/signup" className="block btn-coral bg-coral text-white text-sm font-semibold px-6 py-2.5 rounded-xl text-center relative z-10" onClick={() => setMobileMenuOpen(false)}>{t('common.signUp')}</Link>
          </div>
        )}
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────── */}
      <section className="relative pt-32 pb-20 md:pt-44 md:pb-32 overflow-hidden">
        <div className="coral-glow -top-40 -right-40" />
        <div className="coral-glow bottom-20 -left-40" style={{ animationDelay: '-3s' }} />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center">
            <div className="animate-fade-in-up">
              <span className="inline-flex items-center gap-2 text-xs font-semibold text-coral bg-coral/10 border border-coral/20 rounded-full px-4 py-1.5 mb-8">
                <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse-dot" />
                {t('landing.poweredByAi')}
              </span>
            </div>
            <h1 className="animate-fade-in-up-d1 text-4xl md:text-7xl font-black leading-tight tracking-tight">
              {t('landing.heroTitle').split(' ').slice(0, 3).join(' ')}<br />
              <span className="coral-gradient-text">{t('landing.heroTitle').split(' ').slice(3).join(' ') || 'actually works'}</span>
            </h1>
            <p className="animate-fade-in-up-d2 mt-6 text-lg md:text-xl text-gray-400 max-w-2xl mx-auto leading-relaxed">
              {t('landing.heroSubtitle')}
            </p>
            <div className="animate-fade-in-up-d3 mt-10 flex flex-wrap justify-center gap-4">
              <Link href="/signup" className="btn-coral bg-coral text-white font-bold px-8 py-3.5 rounded-xl text-sm relative z-10">
                {t('common.startFreeTrial')}
              </Link>
              <Link href="/demo" className="border border-white/10 hover:border-coral/30 text-white font-medium px-8 py-3.5 rounded-xl text-sm transition-all backdrop-blur-sm">
                <SparklesIcon className="w-4 h-4 inline mr-2 -mt-0.5" />
                Try Demo
              </Link>
            </div>
          </div>

          {/* Floating stat cards */}
          <div className="animate-fade-in-up-d4 mt-16 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { value: '99.2%', label: t('landing.stats.ocrAccuracy'), color: 'text-coral' },
              { value: '$2.3M', label: t('landing.stats.fasterProcessing'), color: 'text-green-400' },
              { value: '10x', label: t('landing.stats.costReduction'), color: 'text-blue-400' },
              { value: '500+', label: t('landing.stats.automatedMonitoring'), color: 'text-purple-400' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                className="stat-card bg-surface-dark/70 border border-white/5 rounded-2xl p-4 text-center"
                style={{ animation: `bounceSoft 3s ease-in-out ${i * 0.5}s infinite` }}
              >
                <div className={`text-2xl md:text-3xl font-extrabold ${stat.color} mb-1`}>{stat.value}</div>
                <div className="text-xs text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────── */}
      <section id="features" className="relative py-24 md:py-32">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              {t('landing.features.sectionTitle').split(' ').slice(0, -1).join(' ')}{' '}
              <span className="coral-gradient-text">{t('landing.features.sectionTitle').split(' ').slice(-1)}</span>
            </h2>
            <p className="mt-4 text-gray-400 text-lg max-w-xl mx-auto">{t('landing.features.sectionSubtitle')}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
            {[
              { mono: 'ocr-engine', title: t('landing.features.aiAutomation'), desc: t('landing.features.aiAutomationDesc'), icon: (
                <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              ) },
              { mono: 'approval-flow', title: t('landing.features.approval'), desc: t('landing.features.approvalDesc'), icon: (
                <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" /></svg>
              ) },
              { mono: 'payment-tracker', title: t('landing.features.analytics'), desc: t('landing.features.analyticsDesc'), icon: (
                <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              ) },
              { mono: 'email-sync', title: t('landing.features.integration'), desc: t('landing.features.integrationDesc'), icon: (
                <svg className="w-5 h-5 text-coral" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
              ) },
            ].map((f) => (
              <div key={f.mono} className="window-card bg-surface-dark/60 border border-white/5 rounded-2xl overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                  <div className="w-3 h-3 rounded-full bg-coral/80" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400/40" />
                  <div className="w-3 h-3 rounded-full bg-green-400/40" />
                  <span className="ml-2 text-xs text-gray-600 font-mono">{f.mono}</span>
                </div>
                <div className="p-6">
                  <div className="w-10 h-10 rounded-xl bg-coral/10 flex items-center justify-center mb-4">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold mb-2">{f.title}</h3>
                  <p className="text-gray-400 text-sm leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="coral-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0.2 }} />
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight">
              {t('landing.howItWorks.title')}
            </h2>
          </div>
          <div className="grid md:grid-cols-4 gap-8 relative">
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-coral/20 via-coral/40 to-coral/20" />
            {[
              { step: 1, title: t('landing.howItWorks.step1'), desc: t('landing.howItWorks.step1Desc'), icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 13.5h3.86a2.25 2.25 0 0 1 2.012 1.244l.256.512a2.25 2.25 0 0 0 2.013 1.244h3.218a2.25 2.25 0 0 0 2.013-1.244l.256-.512a2.25 2.25 0 0 1 2.013-1.244h3.859m-19.5.338V18a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18v-4.162c0-.224-.034-.447-.1-.661L19.24 5.338a2.25 2.25 0 0 0-2.15-1.588H6.911a2.25 2.25 0 0 0-2.15 1.588L2.35 13.177a2.25 2.25 0 0 0-.1.661Z" /></svg>
              ) },
              { step: 2, title: t('landing.howItWorks.step2'), desc: t('landing.howItWorks.step2Desc'), icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5M4.5 15.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 0 0 2.25-2.25V6.75a2.25 2.25 0 0 0-2.25-2.25H6.75A2.25 2.25 0 0 0 4.5 6.75v10.5a2.25 2.25 0 0 0 2.25 2.25Zm.75-12h9v9h-9v-9Z" /></svg>
              ) },
              { step: 3, title: t('landing.howItWorks.step3'), desc: t('landing.howItWorks.step3Desc'), icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" /></svg>
              ) },
              { step: 4, title: t('landing.howItWorks.step4'), desc: t('landing.howItWorks.step4Desc'), icon: (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}><path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" /></svg>
              ) },
            ].map((item) => (
              <div key={item.step} className="relative text-center">
                <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-coral/10 border border-coral/20 mb-5">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral to-coral-dark flex items-center justify-center shadow-lg shadow-coral/25">
                    {item.icon}
                  </div>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                <p className="text-sm text-gray-400 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────── */}
      <section className="relative py-24 md:py-32 overflow-hidden">
        <div className="coral-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0.3 }} />
        <div className="max-w-4xl mx-auto px-6 relative z-10 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-6">
            Ready to <span className="coral-gradient-text">get started</span>?
          </h2>
          <p className="text-lg text-gray-400 mb-10 max-w-xl mx-auto">
            {t('landing.heroSubtitle')}
          </p>
          <Link href="/signup" className="btn-coral bg-coral text-white font-bold px-10 py-4 rounded-xl text-base relative z-10">
            {t('common.startFreeTrial')}
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────── */}
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
                <li><Link href="/guide" className="hover:text-coral transition-colors">Guide</Link></li>
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
                <li><span className="hover:text-coral transition-colors cursor-default">Privacy</span></li>
                <li><span className="hover:text-coral transition-colors cursor-default">Terms</span></li>
                <li><span className="hover:text-coral transition-colors cursor-default">Security</span></li>
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
