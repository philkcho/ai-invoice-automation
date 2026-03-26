'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import PublicNav from '@/components/layout/PublicNav';
import type { SubscriptionPlan } from '@/types';

function DocumentIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

const FALLBACK_PLANS: SubscriptionPlan[] = [
  {
    id: 'free_trial', name: 'free_trial', display_name: 'Free Trial',
    monthly_price: 0, max_invoices_per_month: 20, max_users: 3, max_ocr_per_month: 10,
    features: JSON.stringify({ email_integration: false, api_access: false, multi_approval: false, sso: false, audit_log: false }),
    is_active: true, sort_order: 0,
  },
  {
    id: 'starter', name: 'starter', display_name: 'Starter',
    monthly_price: 49, max_invoices_per_month: 100, max_users: 5, max_ocr_per_month: 50,
    features: JSON.stringify({ email_integration: true, api_access: false, multi_approval: false, sso: false, audit_log: false }),
    is_active: true, sort_order: 1,
  },
  {
    id: 'professional', name: 'professional', display_name: 'Professional',
    monthly_price: 149, max_invoices_per_month: 500, max_users: 15, max_ocr_per_month: 200,
    features: JSON.stringify({ email_integration: true, api_access: true, multi_approval: true, sso: false, audit_log: true }),
    is_active: true, sort_order: 2,
  },
  {
    id: 'enterprise', name: 'enterprise', display_name: 'Enterprise',
    monthly_price: 0, max_invoices_per_month: 0, max_users: 0, max_ocr_per_month: 0,
    features: JSON.stringify({ email_integration: true, api_access: true, multi_approval: true, sso: true, audit_log: true }),
    is_active: true, sort_order: 3,
  },
];

const PLAN_SUBTITLE_KEYS: Record<string, string> = {
  free_trial: 'pricing.plans.freeTrialSub',
  starter: 'pricing.plans.starterSub',
  professional: 'pricing.plans.professionalSub',
  enterprise: 'pricing.plans.enterpriseSub',
};

type FeatureItem = { key: string; params?: Record<string, string | number> };
const PLAN_FEATURE_KEYS: Record<string, { prefixKey?: string; items: FeatureItem[] }> = {
  free_trial: {
    items: [
      { key: 'pricing.features.invoicesPerMonth', params: { count: 20 } },
      { key: 'pricing.features.users', params: { count: 3 } },
      { key: 'pricing.features.ocrScans', params: { count: 10 } },
      { key: 'pricing.features.validation' },
      { key: 'pricing.features.dashboard' },
    ],
  },
  starter: {
    prefixKey: 'pricing.features.everythingInFree',
    items: [
      { key: 'pricing.features.invoicesPerMonth', params: { count: 100 } },
      { key: 'pricing.features.users', params: { count: 5 } },
      { key: 'pricing.features.ocrScans', params: { count: 50 } },
      { key: 'pricing.features.emailIntegration' },
      { key: 'pricing.features.vendorManagement' },
    ],
  },
  professional: {
    prefixKey: 'pricing.features.everythingInStarter',
    items: [
      { key: 'pricing.features.invoicesPerMonth', params: { count: 500 } },
      { key: 'pricing.features.users', params: { count: 15 } },
      { key: 'pricing.features.ocrScans', params: { count: 200 } },
      { key: 'pricing.features.apiAccess' },
      { key: 'pricing.features.multiApproval' },
      { key: 'pricing.features.auditLog' },
    ],
  },
  enterprise: {
    prefixKey: 'pricing.features.everythingInPro',
    items: [
      { key: 'pricing.features.unlimitedInvoices' },
      { key: 'pricing.features.sso' },
      { key: 'pricing.features.dedicatedManager' },
      { key: 'pricing.features.customIntegrations' },
      { key: 'pricing.features.prioritySupport' },
    ],
  },
};

export default function PricingPage() {
  const { t } = useTranslation();
  const plans = FALLBACK_PLANS;

  const planNameKey: Record<string, string> = {
    free_trial: 'pricing.plans.freeTrial',
    starter: 'pricing.plans.starter',
    professional: 'pricing.plans.professional',
    enterprise: 'pricing.plans.enterprise',
  };

  return (
    <div className="min-h-screen font-sans text-white bg-base dot-grid overflow-x-hidden">
      <PublicNav activePage="pricing" />

      {/* ── Hero ──────────────────────────────────────────────────── */}
      <section className="relative pt-28 pb-16 overflow-hidden">
        <div className="coral-glow top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ opacity: 0.25 }} />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">
            Plans for every <span className="coral-gradient-text">team</span>
          </h2>
          <p className="text-lg text-gray-400">{t('pricing.subtitle')}</p>
        </div>
      </section>

      {/* ── Plans ─────────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const featureInfo = PLAN_FEATURE_KEYS[plan.name] || { items: [] };
              const isFeatured = plan.name === 'professional';

              return (
                <div
                  key={plan.id}
                  className={`price-card flex flex-col rounded-2xl p-8 ${
                    isFeatured
                      ? 'bg-surface-dark/80 border-2 border-coral/20 relative'
                      : 'bg-surface-dark/60 border border-white/5'
                  }`}
                >
                  {isFeatured && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-coral text-white text-xs font-bold px-4 py-1 rounded-full shadow-lg shadow-coral/30">Popular</span>
                    </div>
                  )}

                  <h3 className="text-lg font-bold mb-1">
                    {planNameKey[plan.name] ? t(planNameKey[plan.name]) : plan.display_name}
                  </h3>
                  <p className={`text-sm mb-6 ${isFeatured ? 'text-coral/70' : 'text-gray-500'}`}>
                    {PLAN_SUBTITLE_KEYS[plan.name] ? t(PLAN_SUBTITLE_KEYS[plan.name]) : ''}
                  </p>

                  <div className="mb-8">
                    {plan.name === 'enterprise' ? (
                      <span className="text-4xl font-black">{t('common.custom')}</span>
                    ) : plan.monthly_price === 0 ? (
                      <span className="text-4xl font-black">Free</span>
                    ) : (
                      <>
                        <span className="text-4xl font-black">${plan.monthly_price}</span>
                        <span className="text-gray-500 text-sm">/{t('common.month')}</span>
                      </>
                    )}
                  </div>

                  <ul className="space-y-3 mb-8 text-sm text-gray-400 flex-1">
                    {featureInfo.prefixKey && (
                      <li className="font-semibold text-gray-300 mb-1">{t(featureInfo.prefixKey)}</li>
                    )}
                    {featureInfo.items.map((item) => (
                      <li key={item.key} className="flex items-center gap-2.5">
                        <svg className="w-4 h-4 text-coral flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                        </svg>
                        {t(item.key, item.params)}
                      </li>
                    ))}
                  </ul>

                  {isFeatured ? (
                    <Link href="/signup" className="btn-coral block text-center bg-coral text-white font-bold py-3 rounded-xl text-sm relative z-10">
                      {t('common.startFreeTrial')}
                    </Link>
                  ) : plan.name === 'enterprise' ? (
                    <Link href="/contact" className="block text-center border border-white/10 hover:border-coral/30 text-white font-semibold py-3 rounded-xl text-sm transition-all">
                      {t('common.contactSales')}
                    </Link>
                  ) : (
                    <Link href="/signup" className="block text-center border border-white/10 hover:border-coral/30 text-white font-semibold py-3 rounded-xl text-sm transition-all">
                      {t('common.getStarted')}
                    </Link>
                  )}
                </div>
              );
            })}
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
