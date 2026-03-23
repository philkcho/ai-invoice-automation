'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import RequireRole from '@/components/common/RequireRole';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { useToastStore } from '@/stores/toast';
import type { BillingSummary, SubscriptionPlan } from '@/types';

function UsageBar({ label, current, max }: { label: string; current: number; max: number }) {
  const isUnlimited = max === 0;
  const pct = isUnlimited ? 0 : Math.min((current / max) * 100, 100);
  const isWarning = !isUnlimited && pct >= 80;
  const isDanger = !isUnlimited && pct >= 95;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-surface-600 font-medium">{label}</span>
        <span className={`font-semibold ${isDanger ? 'text-red-600' : isWarning ? 'text-amber-600' : 'text-surface-700'}`}>
          {current.toLocaleString()} / {isUnlimited ? '∞' : max.toLocaleString()}
        </span>
      </div>
      <div className="h-2.5 bg-surface-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isDanger ? 'bg-red-500' : isWarning ? 'bg-amber-500' : 'bg-primary-500'
          }`}
          style={{ width: isUnlimited ? '0%' : `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col"><Header /><div className="flex flex-1"><Sidebar /><main className="flex-1 bg-surface-50 p-8"><div className="text-center py-20 text-surface-400">Loading...</div></main></div></div>
    }>
      <BillingContent />
    </Suspense>
  );
}

function BillingContent() {
  const searchParams = useSearchParams();
  const addToast = useToastStore((s) => s.addToast);

  const [billing, setBilling] = useState<BillingSummary | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  const fetchBilling = useCallback(async () => {
    try {
      const [billingRes, plansRes] = await Promise.all([
        api.get('/api/v1/billing/summary'),
        api.get('/api/v1/billing/plans'),
      ]);
      setBilling(billingRes.data);
      setPlans(plansRes.data.items);
    } catch (err) {
      addToast('error', getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  // Stripe redirect 결과 처리
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      addToast('success', 'Subscription updated successfully!');
    } else if (searchParams.get('canceled') === 'true') {
      addToast('info', 'Checkout was canceled.');
    }
  }, [searchParams, addToast]);

  const handleUpgrade = async (planName: string) => {
    setCheckoutLoading(planName);
    try {
      const { data } = await api.post('/api/v1/billing/checkout', { plan_name: planName });
      window.location.href = data.checkout_url;
    } catch (err) {
      addToast('error', getErrorMessage(err));
      setCheckoutLoading(null);
    }
  };

  const handleManageBilling = async () => {
    setPortalLoading(true);
    try {
      const { data } = await api.post('/api/v1/billing/portal');
      window.location.href = data.portal_url;
    } catch (err) {
      addToast('error', getErrorMessage(err));
      setPortalLoading(false);
    }
  };

  const sub = billing?.subscription;
  const usage = billing?.usage;
  const currentPlan = sub?.plan;

  const statusBadge = (status: string) => {
    const styles: Record<string, string> = {
      trialing: 'bg-blue-100 text-blue-700',
      active: 'bg-green-100 text-green-700',
      past_due: 'bg-red-100 text-red-700',
      canceled: 'bg-surface-100 text-surface-600',
      expired: 'bg-amber-100 text-amber-700',
    };
    return (
      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${styles[status] || styles.canceled}`}>
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  const formatDate = (d: string | null | undefined) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
            <div className="max-w-4xl mx-auto space-y-6">
              <h1 className="text-2xl font-bold text-surface-800">Billing & Subscription</h1>

              {loading ? (
                <div className="text-center py-20 text-surface-400">Loading...</div>
              ) : (
                <>
                  {/* Current Plan Card */}
                  <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-card">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-lg font-semibold text-surface-800">Current Plan</h2>
                      {sub && statusBadge(sub.status)}
                    </div>

                    {currentPlan ? (
                      <div className="space-y-3">
                        <div className="flex items-baseline gap-3">
                          <span className="text-3xl font-bold text-surface-900">{currentPlan.display_name}</span>
                          {currentPlan.monthly_price > 0 && (
                            <span className="text-surface-400 text-sm">${currentPlan.monthly_price}/month</span>
                          )}
                        </div>

                        {sub?.status === 'trialing' && sub.trial_ends_at && (
                          <p className="text-sm text-amber-600">
                            Trial ends on {formatDate(sub.trial_ends_at)}
                          </p>
                        )}

                        {sub?.current_period_end && sub.status === 'active' && (
                          <p className="text-sm text-surface-400">
                            Current period ends {formatDate(sub.current_period_end)}
                          </p>
                        )}

                        {sub?.stripe_customer_id && (
                          <button
                            onClick={handleManageBilling}
                            disabled={portalLoading}
                            className="text-sm text-primary-600 hover:underline font-medium"
                          >
                            {portalLoading ? 'Opening...' : 'Manage Billing & Invoices →'}
                          </button>
                        )}
                      </div>
                    ) : (
                      <p className="text-surface-400">No active subscription.</p>
                    )}
                  </div>

                  {/* Usage Card */}
                  {usage && (
                    <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-card">
                      <h2 className="text-lg font-semibold text-surface-800 mb-4">
                        Usage — {usage.year_month}
                      </h2>
                      <div className="space-y-4">
                        <UsageBar label="Invoices" current={usage.invoice_count} max={usage.max_invoices} />
                        <UsageBar label="OCR Scans" current={usage.ocr_count} max={usage.max_ocr} />
                        <UsageBar label="Users" current={usage.user_count} max={usage.max_users} />
                      </div>
                    </div>
                  )}

                  {/* Upgrade Plans */}
                  <div className="bg-white rounded-xl border border-surface-200 p-6 shadow-card">
                    <h2 className="text-lg font-semibold text-surface-800 mb-4">
                      {sub?.status === 'active' ? 'Change Plan' : 'Upgrade Plan'}
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                      {plans.map((plan) => {
                        const isCurrent = currentPlan?.name === plan.name;
                        const isEnterprise = plan.name === 'enterprise';
                        return (
                          <div
                            key={plan.id}
                            className={`rounded-xl border p-4 flex flex-col ${
                              isCurrent ? 'border-primary-300 bg-primary-50' : 'border-surface-200'
                            }`}
                          >
                            <h3 className="font-semibold text-surface-800">{plan.display_name}</h3>
                            <div className="text-2xl font-bold text-surface-900 my-1">
                              {plan.name === 'enterprise' ? 'Custom' : plan.monthly_price === 0 ? '$0' : `$${plan.monthly_price}`}
                              {plan.monthly_price > 0 && <span className="text-sm font-normal text-surface-400">/mo</span>}
                            </div>
                            <div className="text-xs text-surface-400 space-y-0.5 mb-3 flex-1">
                              <div>{plan.max_invoices_per_month === 0 ? '∞' : plan.max_invoices_per_month} invoices</div>
                              <div>{plan.max_users === 0 ? '∞' : plan.max_users} users</div>
                              <div>{plan.max_ocr_per_month === 0 ? '∞' : plan.max_ocr_per_month} OCR</div>
                            </div>
                            {isCurrent ? (
                              <span className="text-xs text-primary-600 font-semibold text-center py-2">Current Plan</span>
                            ) : isEnterprise ? (
                              <button className="w-full py-2 text-xs font-semibold border border-surface-300 rounded-lg text-surface-600 hover:bg-surface-50">
                                Contact Sales
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpgrade(plan.name)}
                                disabled={!!checkoutLoading}
                                className="w-full py-2 text-xs font-semibold bg-primary-600 text-white rounded-lg hover:bg-primary-500 disabled:opacity-50"
                              >
                                {checkoutLoading === plan.name ? 'Redirecting...' : 'Upgrade'}
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
