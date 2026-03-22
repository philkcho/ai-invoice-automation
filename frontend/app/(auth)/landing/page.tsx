'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

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
  const [scrolled, setScrolled] = useState(false);

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
            ? 'bg-[#0f0a2e]/80 backdrop-blur-xl shadow-lg'
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
              <span className="text-white font-bold text-lg">AI Invoice</span>
            </div>
            {/* Nav buttons */}
            <div className="flex items-center gap-3">
              <Link
                href="/pricing"
                className="px-5 py-2 text-sm font-medium text-white hover:text-primary-200 transition-colors"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="px-5 py-2 text-sm font-medium text-white border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="px-5 py-2 text-sm font-medium text-white bg-primary-500 rounded-lg hover:bg-primary-400 transition-colors"
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Section 2: Hero ────────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center bg-gradient-to-br from-[#0f0a2e] to-[#1e1b4b] overflow-hidden">
        {/* Grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        {/* Glow orbs */}
        <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-primary-500/20 rounded-full blur-[120px] animate-glow" />
        <div className="absolute bottom-1/3 right-1/4 w-96 h-96 bg-primary-600/15 rounded-full blur-[150px] animate-glow-delayed" />
        <div className="absolute top-1/2 right-1/3 w-64 h-64 bg-indigo-500/10 rounded-full blur-[100px] animate-glow" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — Text */}
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-500/10 border border-primary-500/20 text-primary-300 text-sm font-medium">
              <SparklesIcon className="w-4 h-4" />
              Powered by AI
            </div>

            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold text-white leading-tight">
              The Future of{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 to-primary-300">
                Invoice Processing
              </span>{' '}
              Is Here
            </h1>

            <p className="text-lg text-gray-300 max-w-lg leading-relaxed">
              Transform your accounts payable with AI that reads, validates, and
              routes invoices automatically &mdash; reducing manual work by 80%.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                href="/signup"
                className="inline-flex items-center px-6 py-3 rounded-lg bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-400 hover:to-primary-500 transition-all"
              >
                Start Free Trial
              </Link>
              <button className="inline-flex items-center px-6 py-3 rounded-lg border border-white/20 text-white font-semibold hover:bg-white/5 transition-colors">
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Watch Demo
              </button>
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
                    { label: 'Processed', value: '1,284', color: 'from-primary-400 to-primary-600' },
                    { label: 'Pending', value: '23', color: 'from-amber-400 to-orange-500' },
                    { label: 'Accuracy', value: '99.2%', color: 'from-emerald-400 to-green-500' },
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
                    <div className="text-xs text-gray-400">AI Verified</div>
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
              { value: '99.2%', label: 'OCR Accuracy' },
              { value: '80%', label: 'Faster Processing' },
              { value: '50%', label: 'Cost Reduction' },
              { value: '24/7', label: 'Automated Monitoring' },
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

      {/* ── Section 4: 4 Core Features ─────────────────────────────────────── */}
      <section className="bg-surface-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
              Everything you need to automate invoice processing
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Four powerful capabilities, one intelligent platform.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            {[
              {
                icon: <CpuChipIcon className="w-6 h-6 text-white" />,
                title: 'AI-Powered Automation',
                desc: 'Drop a PDF, snap a photo, or forward an email \u2014 our AI reads every line, extracts every field, and enters the data for you. Zero manual entry. Zero errors.',
              },
              {
                icon: <ChartBarIcon className="w-6 h-6 text-white" />,
                title: 'Intelligent Analytics',
                desc: "Ask questions in plain English. 'What did we spend on logistics last quarter?' Our AI analyzes your invoice data and delivers instant, actionable insights.",
              },
              {
                icon: <ArrowPathIcon className="w-6 h-6 text-white" />,
                title: 'Smart Approval Workflow',
                desc: 'Multi-level approvals that route themselves. Set rules once \u2014 by amount, department, or vendor \u2014 and let the system handle the rest. Real-time status tracking included.',
              },
              {
                icon: <LinkIcon className="w-6 h-6 text-white" />,
                title: 'Seamless Integration',
                desc: 'Connect to your ERP, accounting software, or any system via REST API. Import and export invoice data in any format. Your existing tools, supercharged.',
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
      <section className="relative bg-gradient-to-br from-[#0f0a2e] to-[#1e1b4b] overflow-hidden">
        {/* Subtle grid */}
        <div
          className="absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(139,92,246,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(139,92,246,0.5) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white">
              From inbox to payment in four steps
            </h2>
          </div>

          <div className="grid md:grid-cols-4 gap-8 relative">
            {/* Connecting line (desktop only) */}
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-px bg-gradient-to-r from-primary-500/40 via-primary-500/60 to-primary-500/40" />

            {[
              {
                step: 1,
                icon: <InboxIcon className="w-6 h-6 text-white" />,
                title: 'Receive',
                desc: 'Invoices arrive via email, upload, or API',
              },
              {
                step: 2,
                icon: <CpuChipIcon className="w-6 h-6 text-white" />,
                title: 'AI Process',
                desc: 'AI extracts data, validates against rules & POs',
              },
              {
                step: 3,
                icon: <CheckCircleIcon className="w-6 h-6 text-white" />,
                title: 'Approve',
                desc: 'Smart routing through your approval chain',
              },
              {
                step: 4,
                icon: <BanknotesIcon className="w-6 h-6 text-white" />,
                title: 'Pay & Analyze',
                desc: 'Track payments, get AI-powered spend insights',
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
                AI-Powered
              </div>

              <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
                Your AI Financial Analyst, On Demand
              </h2>

              <p className="text-lg text-gray-500 leading-relaxed">
                No more digging through spreadsheets. Just ask &mdash; our AI
                understands your invoice data and responds with charts, summaries,
                and recommendations.
              </p>

              <ul className="space-y-4">
                {[
                  'Spend analysis by vendor, category, or period',
                  'Anomaly detection and duplicate invoice alerts',
                  'Budget vs. actual comparisons in real time',
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
                    <div className="font-semibold text-gray-900 text-sm">AI Assistant</div>
                    <div className="text-xs text-green-500 flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Online
                    </div>
                  </div>
                </div>

                {/* User message */}
                <div className="flex justify-end mb-4">
                  <div className="bg-primary-500 text-white rounded-2xl rounded-br-md px-4 py-3 max-w-[80%] text-sm">
                    Show me our top 5 vendors by spend this quarter
                  </div>
                </div>

                {/* AI message */}
                <div className="flex justify-start mb-4">
                  <div className="bg-white rounded-2xl rounded-bl-md px-5 py-4 max-w-[90%] text-sm shadow-sm border border-gray-100">
                    <p className="text-gray-700 mb-3">
                      Here are your top 5 vendors by spend (Q1 2026):
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
                  <span className="text-sm text-gray-400 flex-1">Ask about your invoices...</span>
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
                  <span className="text-gray-600 font-medium">3 anomalies detected</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section 7: Final CTA + Footer ──────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-[#0f0a2e] to-[#1e1b4b] overflow-hidden">
        {/* Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary-500/10 rounded-full blur-[200px]" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Invoice Processing?
          </h2>
          <p className="text-lg text-gray-300 mb-10 max-w-2xl mx-auto">
            Join companies automating their AP workflow with AI.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center px-8 py-4 rounded-xl bg-gradient-to-r from-primary-500 to-primary-600 text-white font-semibold text-lg shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 hover:from-primary-400 hover:to-primary-500 transition-all"
          >
            Get Started &mdash; It&apos;s Free
          </Link>
        </div>

        {/* Footer */}
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
            <p className="text-sm text-gray-500">
              &copy; 2026 AI Invoice Automation. All rights reserved.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
