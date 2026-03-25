'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import PublicNav from '@/components/layout/PublicNav';
import api from '@/lib/api';

function DocumentIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function EnvelopeIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
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

export default function ContactPage() {
  const { t } = useTranslation();
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError('');
    try {
      await api.post('/api/v1/contact', form);
      setSent(true);
    } catch {
      setError(t('contact.errorDesc'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="min-h-screen font-sans text-white bg-base dot-grid overflow-x-hidden">
      <PublicNav activePage="contact" />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="coral-glow -top-40 -right-40" />
        <div className="coral-glow bottom-0 -left-40" style={{ animationDelay: '-3s' }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Get in <span className="coral-gradient-text">touch</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {t('contact.heroSubtitle')}
          </p>
        </div>
      </section>

      {/* ── Content ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid lg:grid-cols-3 gap-12">
          {/* Left — Contact Info */}
          <div>
            <div className="window-card bg-surface-dark/60 border border-white/5 rounded-2xl overflow-hidden">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <div className="w-3 h-3 rounded-full bg-coral/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-400/40" />
                <div className="w-3 h-3 rounded-full bg-green-400/40" />
                <span className="ml-2 text-xs text-gray-600 font-mono">contact-info</span>
              </div>
              <div className="p-6">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-coral to-coral-dark flex items-center justify-center mb-5 shadow-lg shadow-coral/20">
                  <EnvelopeIcon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t('contact.emailLabel')}
                </h3>
                <a
                  href={`mailto:${t('contact.emailAddress')}`}
                  className="text-coral font-medium hover:text-coral-light transition-colors"
                >
                  {t('contact.emailAddress')}
                </a>
                <p className="text-sm text-gray-400 mt-2">
                  {t('contact.emailDesc')}
                </p>
              </div>
            </div>
          </div>

          {/* Right — Form */}
          <div className="lg:col-span-2">
            {sent ? (
              <div className="text-center py-16">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 mb-6">
                  <CheckCircleIcon className="w-8 h-8 text-emerald-400" />
                </div>
                <h2 className="text-2xl font-extrabold text-white mb-3">
                  {t('contact.successTitle')}
                </h2>
                <p className="text-gray-400 mb-8">
                  {t('contact.successDesc')}
                </p>
                <button
                  onClick={() => { setSent(false); setForm({ name: '', email: '', subject: '', message: '' }); }}
                  className="px-6 py-3 text-sm font-medium text-coral border border-coral/30 rounded-xl hover:bg-coral/10 transition-colors"
                >
                  {t('contact.sendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <h2 className="text-2xl font-extrabold text-white mb-6">
                  {t('contact.formTitle')}
                </h2>

                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      {t('contact.name')} *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      placeholder={t('contact.namePlaceholder')}
                      className="w-full px-4 py-3 rounded-xl bg-surface-dark/60 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1.5">
                      {t('contact.email')} *
                    </label>
                    <input
                      type="email"
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      placeholder={t('contact.emailPlaceholder')}
                      className="w-full px-4 py-3 rounded-xl bg-surface-dark/60 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {t('contact.subject')} *
                  </label>
                  <input
                    type="text"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    placeholder={t('contact.subjectPlaceholder')}
                    className="w-full px-4 py-3 rounded-xl bg-surface-dark/60 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1.5">
                    {t('contact.message')} *
                  </label>
                  <textarea
                    required
                    rows={6}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder={t('contact.messagePlaceholder')}
                    className="w-full px-4 py-3 rounded-xl bg-surface-dark/60 border border-white/10 text-white placeholder-gray-500 focus:ring-2 focus:ring-coral/50 focus:border-coral/50 outline-none transition-colors resize-none"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-sm rounded-xl px-4 py-3">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sending}
                  className="btn-coral w-full sm:w-auto bg-coral text-white font-bold px-8 py-3.5 rounded-xl relative z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sending ? t('contact.sending') : t('contact.send')}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────────── */}
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
