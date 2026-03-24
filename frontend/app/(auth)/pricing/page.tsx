'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import api from '@/lib/api';
import { useTranslation } from '@/lib/i18n';
import PublicNav from '@/components/layout/PublicNav';
import type { SubscriptionPlan } from '@/types';

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

// 플랜별 부제목 키 매핑
const PLAN_SUBTITLE_KEYS: Record<string, string> = {
  free_trial: 'pricing.plans.freeTrialSub',
  starter: 'pricing.plans.starterSub',
  professional: 'pricing.plans.professionalSub',
  enterprise: 'pricing.plans.enterpriseSub',
};

// 플랜별 기능 설명 키 매핑 (누적 형태)
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

// 플랜 아이콘
function PlanIcon({ plan }: { plan: string }) {
  const cls = 'w-10 h-10 text-gray-800';
  if (plan === 'free_trial') {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
      </svg>
    );
  }
  if (plan === 'starter') {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
      </svg>
    );
  }
  if (plan === 'professional') {
    return (
      <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 0 0 6 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0 1 18 16.5h-2.25m-7.5 0h7.5m-7.5 0-1 3m8.5-3 1 3m0 0 .5 1.5m-.5-1.5h-9.5m0 0-.5 1.5M9 11.25v1.5M12 9v3.75m3-6v6" />
      </svg>
    );
  }
  return (
    <svg className={cls} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
    </svg>
  );
}

function CheckMark() {
  return (
    <svg className="w-4 h-4 text-gray-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

export default function PricingPage() {
  const { t } = useTranslation();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/api/v1/billing/plans')
      .then(({ data }) => setPlans(data.items?.length ? data.items : FALLBACK_PLANS))
      .catch(() => setPlans(FALLBACK_PLANS))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden">
      <PublicNav activePage="pricing" />

      {/* Header */}
      <div className="pt-16 pb-14 text-center">
        <h1 className="text-2xl sm:text-4xl font-bold text-gray-900 mb-3">
          {t('pricing.title')}
        </h1>
        <p className="text-base text-gray-500 max-w-lg mx-auto">
          {t('pricing.subtitle')}
        </p>
      </div>

      {/* Plans grid */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-28">
        {loading ? (
          <div className="text-center py-20 text-gray-400">{t('common.loadingPlans')}</div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-0 border border-gray-200 rounded-2xl overflow-hidden">
            {plans.map((plan, idx) => {
              const featureInfo = PLAN_FEATURE_KEYS[plan.name] || { items: [] };
              const isLast = idx === plans.length - 1;
              const planNameKeyMap: Record<string, string> = {
                free_trial: 'pricing.plans.freeTrial',
                starter: 'pricing.plans.starter',
                professional: 'pricing.plans.professional',
                enterprise: 'pricing.plans.enterprise',
              };
              const ctaKeyMap: Record<string, string> = {
                starter: 'pricing.plans.getStarter',
                professional: 'pricing.plans.getProfessional',
              };

              return (
                <div
                  key={plan.id}
                  className={`flex flex-col p-7 bg-white ${
                    !isLast ? 'lg:border-r border-b lg:border-b-0 border-gray-200' : ''
                  }`}
                >
                  {/* Icon */}
                  <div className="mb-5">
                    <PlanIcon plan={plan.name} />
                  </div>

                  {/* Plan name + subtitle */}
                  <h3 className="text-xl font-bold text-gray-900">
                    {planNameKeyMap[plan.name] ? t(planNameKeyMap[plan.name]) : plan.display_name}
                  </h3>
                  <p className="text-sm text-gray-400 mt-0.5 mb-5">
                    {PLAN_SUBTITLE_KEYS[plan.name] ? t(PLAN_SUBTITLE_KEYS[plan.name]) : ''}
                  </p>

                  {/* Price */}
                  <div className="mb-6">
                    {plan.name === 'enterprise' ? (
                      <div className="text-3xl font-bold text-gray-900">{t('common.custom')}</div>
                    ) : (
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold text-gray-900">
                          ${plan.monthly_price}
                        </span>
                        {plan.monthly_price > 0 && (
                          <span className="text-sm text-gray-400">/ {t('common.month')}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CTA Button */}
                  {plan.name === 'free_trial' ? (
                    <Link
                      href="/signup"
                      className="block w-full py-2.5 text-center text-sm font-medium border border-gray-300 text-gray-700 rounded-full hover:bg-gray-50 transition-colors mb-7"
                    >
                      {t('common.startFreeTrial')}
                    </Link>
                  ) : plan.name === 'enterprise' ? (
                    <button className="w-full py-2.5 text-sm font-medium bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors mb-7">
                      {t('common.contactSales')}
                    </button>
                  ) : (
                    <Link
                      href="/signup"
                      className="block w-full py-2.5 text-center text-sm font-medium bg-gray-900 text-white rounded-full hover:bg-gray-800 transition-colors mb-7"
                    >
                      {ctaKeyMap[plan.name] ? t(ctaKeyMap[plan.name]) : `Get ${plan.display_name}`}
                    </Link>
                  )}

                  {/* Features list */}
                  <div className="flex-1">
                    {featureInfo.prefixKey && (
                      <p className="text-sm font-semibold text-gray-700 mb-3">
                        {t(featureInfo.prefixKey)}
                      </p>
                    )}
                    <ul className="space-y-2.5">
                      {featureInfo.items.map((item) => (
                        <li key={item.key} className="flex items-start gap-2.5 text-sm text-gray-600">
                          <CheckMark />
                          <span>{t(item.key, item.params)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
