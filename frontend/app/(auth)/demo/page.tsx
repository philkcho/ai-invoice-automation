'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';

function SparklesIcon({ className = 'w-5 h-5' }: { className?: string }) {
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

const SAMPLES = [
  {
    vendor: 'Acme Consulting Group',
    vendorAddress: '350 Fifth Avenue, New York, NY 10118',
    invoiceNumber: 'INV-2026-0847',
    date: '2026-03-15',
    dueDate: '2026-04-14',
    poNumber: 'PO-2026-0312',
    paymentTerms: 'Net 30',
    currency: 'USD',
    confidence: { vendor: 97, invoiceNumber: 99, date: 98, dueDate: 95, poNumber: 88 },
    lineItems: [
      { desc: 'Strategic Consulting — Q1', qty: 1, price: 15000.00, conf: 96 },
      { desc: 'Market Research Report', qty: 2, price: 3500.00, conf: 94 },
      { desc: 'Workshop Facilitation (half-day)', qty: 3, price: 2000.00, conf: 72 },
    ],
    subtotal: 28000.00,
    tax: 1875.00,
    total: 29875.00,
    avgConfidence: 93,
  },
  {
    vendor: 'TechSupply International',
    vendorAddress: '2001 Gateway Place, San Jose, CA 95110',
    invoiceNumber: 'TS-88421',
    date: '2026-03-10',
    dueDate: '2026-04-09',
    poNumber: 'PO-2026-0298',
    paymentTerms: 'Net 30',
    currency: 'USD',
    confidence: { vendor: 95, invoiceNumber: 99, date: 97, dueDate: 96, poNumber: 91 },
    lineItems: [
      { desc: 'Laptop — Dell XPS 15 (i7, 32GB)', qty: 5, price: 1899.00, conf: 98 },
      { desc: 'Monitor — LG 27" 4K IPS', qty: 5, price: 449.00, conf: 97 },
      { desc: 'Wireless Keyboard & Mouse Set', qty: 10, price: 89.00, conf: 85 },
    ],
    subtotal: 11740.00,
    tax: 1021.30,
    total: 12761.30,
    avgConfidence: 95,
  },
  {
    vendor: 'CloudServ Inc',
    vendorAddress: '100 Pine Street, Suite 1200, San Francisco, CA 94111',
    invoiceNumber: 'CS-2026-3391',
    date: '2026-03-01',
    dueDate: '2026-03-31',
    poNumber: null,
    paymentTerms: 'Due on Receipt',
    currency: 'USD',
    confidence: { vendor: 92, invoiceNumber: 98, date: 99, dueDate: 94, poNumber: 0 },
    lineItems: [
      { desc: 'AWS Hosting — March 2026', qty: 1, price: 4200.00, conf: 99 },
      { desc: 'SSL Certificate Renewal (3 domains)', qty: 3, price: 150.00, conf: 68 },
      { desc: '24/7 Premium Support Plan', qty: 1, price: 800.00, conf: 91 },
    ],
    subtotal: 5450.00,
    tax: 437.50,
    total: 5887.50,
    avgConfidence: 90,
  },
];

export default function DemoPage() {
  const { t } = useTranslation();
  const [state, setState] = useState<'idle' | 'loading' | 'result'>('idle');
  const [index, setIndex] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runDemo = (i: number) => {
    setIndex(i);
    setState('loading');
    setTimeout(() => setState('result'), 1500);
  };

  const inv = SAMPLES[index];

  return (
    <div className="min-h-screen font-sans text-white bg-base dot-grid overflow-x-hidden">
      {/* ── Nav ────────────────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-base/80 border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/landing" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-coral to-coral-dark flex items-center justify-center">
                <SparklesIcon className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">{t('common.aiInvoice')}</span>
            </Link>
            <div className="hidden md:flex items-center gap-6">
              <Link href="/faq" className="text-sm text-gray-400 hover:text-coral transition-colors">FAQ</Link>
              <Link href="/guide" className="text-sm text-gray-400 hover:text-coral transition-colors">Guide</Link>
              <Link href="/pricing" className="text-sm text-gray-400 hover:text-coral transition-colors">{t('common.pricing')}</Link>
              <LanguageSwitcher className="text-gray-400 border-white/10 hover:bg-white/5 hover:text-coral" />
              <Link href="/login" className="text-sm text-gray-400 hover:text-coral transition-colors">{t('common.signIn')}</Link>
              <Link href="/signup" className="btn-coral bg-coral hover:bg-coral-dark text-white text-sm font-semibold px-6 py-2.5 rounded-xl relative z-10">
                {t('common.startFreeTrial')}
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-12 overflow-hidden">
        <div className="coral-glow -top-40 -right-40" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-coral/10 border border-coral/20 text-coral-light text-sm font-semibold mb-6">
            <span className="w-1.5 h-1.5 rounded-full bg-coral animate-pulse-dot" />
            {t('landing.demo.badge')}
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
            Try the <span className="coral-gradient-text">AI OCR</span>
          </h1>
          <p className="text-lg text-gray-300 max-w-2xl mx-auto">
            {t('landing.demo.subtitle')}
          </p>
        </div>
      </section>

      {/* ── Demo Area ─────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Sample buttons */}
          <div className="flex flex-wrap justify-center gap-3 mb-8">
            {[0, 1, 2].map((i) => (
              <button
                key={i}
                onClick={() => runDemo(i)}
                className={`window-card px-5 py-3 rounded-xl text-sm font-medium border transition-all ${
                  state === 'result' && index === i
                    ? 'bg-coral/15 border-coral/30 text-coral-light'
                    : 'bg-surface-dark/60 border-white/5 text-gray-400 hover:border-coral/30 hover:text-coral-light'
                }`}
              >
                <SparklesIcon className="w-4 h-4 inline mr-2 -mt-0.5" />
                {t(`landing.demo.sample${i + 1}`)}
              </button>
            ))}
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left — Upload / dropzone */}
            <div>
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={(e) => { e.preventDefault(); setDragOver(false); runDemo(Math.floor(Math.random() * 3)); }}
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer ${
                  dragOver ? 'border-coral/50 bg-coral/10' : 'border-white/10 bg-surface-dark/40 hover:border-coral/30'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.length) { runDemo(Math.floor(Math.random() * 3)); e.target.value = ''; } }}
                />
                <svg className="w-12 h-12 text-gray-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                </svg>
                <p className="text-white font-semibold text-lg mb-1">{t('landing.demo.dropzone')}</p>
                <p className="text-sm text-gray-400">{t('landing.demo.dropzoneOr')}</p>
                <p className="text-xs text-gray-500 mt-3">PDF, JPG, PNG (max 20MB)</p>
              </div>

              {/* Info box */}
              <div className="mt-6 window-card bg-surface-dark/60 rounded-2xl border border-white/5 overflow-hidden">
                <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                  <div className="w-2.5 h-2.5 rounded-full bg-coral/80" />
                  <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40" />
                  <div className="w-2.5 h-2.5 rounded-full bg-green-400/40" />
                  <span className="ml-2 text-xs text-gray-600 font-mono">how-it-works</span>
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-white mb-3">How the demo works</h3>
                  <ul className="space-y-2 text-sm text-gray-400">
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-coral/15 text-coral flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">1</span>
                      Drop any file or click a sample invoice above
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-coral/15 text-coral flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">2</span>
                      AI extracts all fields in under 2 seconds
                    </li>
                    <li className="flex items-start gap-2">
                      <span className="w-5 h-5 rounded-full bg-coral/15 text-coral flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">3</span>
                      Review the structured data — ready for approval
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Right — Result */}
            <div className="window-card bg-surface-dark/60 rounded-2xl border border-white/5 overflow-hidden min-h-[500px] flex flex-col">
              <div className="flex items-center gap-2 px-5 py-3 border-b border-white/5">
                <div className="w-2.5 h-2.5 rounded-full bg-coral/80" />
                <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/40" />
                <div className="w-2.5 h-2.5 rounded-full bg-green-400/40" />
                <span className="ml-2 text-xs text-gray-600 font-mono">extraction-result</span>
              </div>
              <div className="p-6 flex-1 flex flex-col">
                {state === 'idle' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 rounded-2xl bg-surface-dark-light border border-white/5 flex items-center justify-center mb-5">
                      <SparklesIcon className="w-10 h-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-white">{t('landing.demo.idleTitle')}</h3>
                    <p className="text-gray-400 mt-2">{t('landing.demo.idleDesc')}</p>
                  </div>
                )}

                {state === 'loading' && (
                  <div className="flex-1 flex flex-col items-center justify-center text-center">
                    <div className="w-14 h-14 border-4 border-coral/30 border-t-coral rounded-full animate-spin mb-5" />
                    <p className="text-white font-semibold text-lg">{t('landing.demo.loading')}</p>
                    <div className="mt-4 w-64 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-coral to-coral-light rounded-full animate-pulse" style={{ width: '70%' }} />
                    </div>
                  </div>
                )}

                {state === 'result' && (
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center justify-between mb-5">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                        <span className="text-xs font-medium text-emerald-400">{t('landing.demo.extractedIn')}</span>
                      </div>
                      <button onClick={() => setState('idle')} className="text-xs text-coral hover:text-coral-light font-medium">
                        {t('landing.demo.tryAnother')}
                      </button>
                    </div>

                    <div className="flex items-center gap-3 mb-5 bg-surface-dark-light rounded-lg px-4 py-2.5 border border-white/5">
                      <div className="text-xs text-gray-400 font-medium">Overall AI Confidence</div>
                      <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            inv.avgConfidence >= 90 ? 'bg-emerald-500' : inv.avgConfidence >= 70 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${inv.avgConfidence}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${
                        inv.avgConfidence >= 90 ? 'text-emerald-400' : inv.avgConfidence >= 70 ? 'text-amber-400' : 'text-red-400'
                      }`}>{inv.avgConfidence}%</span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <Field label={t('landing.demo.vendor')} value={inv.vendor} confidence={inv.confidence.vendor} highlight />
                      <Field label={t('landing.demo.invoiceNo')} value={inv.invoiceNumber} confidence={inv.confidence.invoiceNumber} />
                      <Field label={t('landing.demo.date')} value={inv.date} confidence={inv.confidence.date} />
                      <Field label={t('landing.demo.dueDate')} value={inv.dueDate} confidence={inv.confidence.dueDate} />
                    </div>

                    {inv.poNumber && (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="text-[10px] text-emerald-400 uppercase tracking-wider font-medium">{t('landing.demo.poNumber')}</div>
                          <ConfBadge value={inv.confidence.poNumber} />
                        </div>
                        <div className="text-sm font-semibold text-emerald-300">{inv.poNumber}</div>
                      </div>
                    )}

                    <div className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">{t('landing.demo.lineItems')}</div>
                    <div className="border border-white/5 rounded-lg overflow-hidden mb-4">
                      <table className="w-full text-sm">
                        <thead className="bg-surface-dark-light">
                          <tr>
                            <th className="text-left px-3 py-2 text-xs text-gray-400 font-medium">{t('landing.demo.description')}</th>
                            <th className="text-right px-3 py-2 text-xs text-gray-400 font-medium">{t('landing.demo.qty')}</th>
                            <th className="text-right px-3 py-2 text-xs text-gray-400 font-medium">{t('landing.demo.unitPrice')}</th>
                            <th className="text-right px-3 py-2 text-xs text-gray-400 font-medium">{t('landing.demo.amount')}</th>
                            <th className="text-center px-3 py-2 text-xs text-gray-400 font-medium">AI</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inv.lineItems.map((li, idx) => (
                            <tr key={idx} className="border-t border-white/5">
                              <td className="px-3 py-2.5 text-gray-300 text-xs">{li.desc}</td>
                              <td className="px-3 py-2.5 text-gray-400 text-xs text-right">{li.qty}</td>
                              <td className="px-3 py-2.5 text-gray-400 text-xs text-right">${li.price.toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-white text-xs text-right font-medium">${(li.qty * li.price).toLocaleString()}</td>
                              <td className="px-3 py-2.5 text-center"><ConfBadge value={li.conf} /></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-auto bg-surface-dark-light rounded-lg p-4 space-y-2 border border-white/5">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('landing.demo.subtotal')}</span>
                        <span className="text-gray-300">${inv.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{t('landing.demo.tax')}</span>
                        <span className="text-gray-300">${inv.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-base font-bold border-t border-white/10 pt-2">
                        <span className="text-white">{t('landing.demo.total')}</span>
                        <span className="text-coral">${inv.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {state === 'result' && (
            <div className="mt-12 text-center">
              <p className="text-gray-400 mb-4">{t('landing.demo.ctaText')}</p>
              <Link href="/signup" className="btn-coral inline-flex items-center px-8 py-4 rounded-xl bg-coral text-white font-bold text-lg relative z-10">
                {t('common.startFreeTrial')}
              </Link>
            </div>
          )}
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

function ConfBadge({ value }: { value: number }) {
  const color =
    value >= 90 ? 'bg-emerald-500/15 text-emerald-400' :
    value >= 70 ? 'bg-amber-500/15 text-amber-400' :
    'bg-red-500/15 text-red-400';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${color}`}>
      {value}%
    </span>
  );
}

function Field({ label, value, confidence, highlight }: { label: string; value: string; confidence?: number; highlight?: boolean }) {
  return (
    <div className={`rounded-lg px-3 py-2 border ${highlight ? 'bg-coral/10 border-coral/20' : 'bg-surface-dark-light border-white/5'}`}>
      <div className="flex items-center justify-between">
        <div className="text-[10px] text-gray-400 uppercase tracking-wider font-medium">{label}</div>
        {confidence !== undefined && confidence > 0 && <ConfBadge value={confidence} />}
      </div>
      <div className={`text-sm font-semibold mt-0.5 ${highlight ? 'text-coral-light' : 'text-white'}`}>{value}</div>
    </div>
  );
}
