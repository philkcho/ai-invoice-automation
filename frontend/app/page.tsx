'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

/* ---------- Types ---------- */

interface Summary {
  invoices_total: number;
  invoices_this_month: number;
  invoices_ytd: number;
  spend_this_month: number;
  spend_ytd: number;
  pending_approvals: number;
  validation_fails: number;
  validation_warnings: number;
  overdue_payments: number;
  active_vendors: number;
  status_counts: Record<string, number>;
}

interface TrendItem { year: number; month: number; count: number; amount: number; }

interface ActionItem {
  type: 'overdue_payment' | 'pending_approval' | 'validation_failed' | 'ocr_review';
  priority: string;
  invoice_id: string;
  invoice_number: string | null;
  vendor_name: string | null;
  amount: number;
  due_date?: string;
  days_overdue?: number;
  step?: number;
}

/* ---------- Constants ---------- */

const PIPELINE_STEPS = ['RECEIVED', 'PENDING', 'IN_APPROVAL', 'APPROVED', 'PAID'] as const;

const PIPELINE_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  PENDING: 'Processing',
  IN_APPROVAL: 'In Approval',
  APPROVED: 'Approved',
  PAID: 'Paid',
};

const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  overdue_payment:   { icon: '🔴', label: 'Overdue Payment',       color: 'text-red-700',    bgColor: 'bg-red-50 border-red-200' },
  pending_approval:  { icon: '🟡', label: 'Pending Approval',      color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  validation_failed: { icon: '🟠', label: 'Validation Failed',     color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  ocr_review:        { icon: '🔵', label: 'OCR Review Pending',    color: 'text-blue-700',   bgColor: 'bg-blue-50 border-blue-200' },
};

/* ---------- Helpers ---------- */

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtMonth(item: TrendItem) {
  return `${item.year}-${String(item.month).padStart(2, '0')}`;
}

function calcMomChange(trend: TrendItem[]): number | null {
  if (trend.length < 2) return null;
  const prev = trend[trend.length - 2].amount;
  const curr = trend[trend.length - 1].amount;
  if (prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

/* ---------- Main Page ---------- */

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      const results = await Promise.allSettled([
        api.get('/api/v1/dashboard/summary'),
        api.get('/api/v1/dashboard/invoice-trend'),
        api.get('/api/v1/dashboard/action-items'),
      ]);
      if (results[0].status === 'fulfilled') setSummary(results[0].value.data);
      if (results[1].status === 'fulfilled') setTrend(results[1].value.data);
      if (results[2].status === 'fulfilled') setActionItems(results[2].value.data);
      setLoading(false);
    };
    fetchAll();
  }, []);

  const momChange = calcMomChange(trend);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
            <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.full_name}</p>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-16">Loading dashboard...</div>
          ) : !summary ? (
            <div className="text-center text-gray-500 py-16">Unable to load dashboard data.</div>
          ) : (
            <>
              {/* Section 1: KPI Cards (4개) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard
                  label="Invoices This Month"
                  value={summary.invoices_this_month}
                />
                <KpiCard
                  label="Spend This Month"
                  value={fmt(summary.spend_this_month)}
                />
                <KpiCard
                  label="Pending Approvals"
                  value={summary.pending_approvals}
                  accent={summary.pending_approvals > 0 ? 'yellow' : undefined}
                  onClick={() => router.push('/approvals')}
                />
                <KpiCard
                  label="Overdue Payments"
                  value={summary.overdue_payments}
                  accent={summary.overdue_payments > 0 ? 'red' : undefined}
                  onClick={() => router.push('/payments')}
                />
              </div>

              {/* Section 2: Invoice Pipeline */}
              <div className="bg-white rounded-lg shadow-sm border p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Invoice Processing Pipeline</h3>
                <PipelineBar statusCounts={summary.status_counts} />
              </div>

              {/* Section 3 & 4: Trend + Action Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* 월별 지출 트렌드 */}
                <div className="bg-white rounded-lg shadow-sm border p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Monthly Spend Trend</h3>
                    {momChange !== null && (
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        momChange >= 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'
                      }`}>
                        MoM {momChange >= 0 ? '+' : ''}{momChange.toFixed(1)}%
                      </span>
                    )}
                  </div>
                  {trend.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <BarChart data={trend.map(t => ({ ...t, label: fmtMonth(t) }))}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="label" fontSize={11} />
                        <YAxis fontSize={11} />
                        <Tooltip formatter={(v: number) => fmt(v)} />
                        <Bar dataKey="amount" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </div>

                {/* 즉시 조치 필요 */}
                <div className="bg-white rounded-lg shadow-sm border p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Action Required</h3>
                  {actionItems.length > 0 ? (
                    <div className="space-y-2 max-h-[280px] overflow-y-auto">
                      {actionItems.map((item, idx) => {
                        const cfg = ACTION_CONFIG[item.type];
                        return (
                          <button
                            key={`${item.invoice_id}-${idx}`}
                            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-lg border ${cfg.bgColor} hover:opacity-80 transition`}
                            onClick={() => router.push(`/invoices/${item.invoice_id}`)}
                          >
                            <span className="text-base flex-shrink-0">{cfg.icon}</span>
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm font-medium ${cfg.color} truncate`}>
                                {item.invoice_number || 'Draft'} — {item.vendor_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-gray-500">
                                {cfg.label}
                                {item.days_overdue ? ` · ${item.days_overdue} days overdue` : ''}
                              </p>
                            </div>
                            <span className={`text-sm font-semibold ${cfg.color} flex-shrink-0`}>
                              {fmt(item.amount)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">
                      No action items required
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- KPI Card ---------- */

function KpiCard({
  label,
  value,
  sub,
  accent,
  onClick,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: 'red' | 'yellow';
  onClick?: () => void;
}) {
  const border = accent === 'red' ? 'border-l-red-500' : accent === 'yellow' ? 'border-l-yellow-500' : 'border-l-transparent';
  const Wrapper = onClick ? 'button' : 'div';
  return (
    <Wrapper
      className={`bg-white rounded-lg shadow-sm border border-l-4 ${border} p-4 text-left ${onClick ? 'hover:bg-gray-50 cursor-pointer transition' : ''}`}
      onClick={onClick}
    >
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">
        {value}
        {sub && <span className="text-sm font-normal text-gray-400 ml-1">{sub}</span>}
      </p>
    </Wrapper>
  );
}

/* ---------- Pipeline Bar ---------- */

function PipelineBar({ statusCounts }: { statusCounts: Record<string, number> }) {
  const counts = PIPELINE_STEPS.map(s => statusCounts[s] || 0);
  const maxCount = Math.max(...counts, 1);

  return (
    <div className="flex items-end gap-1">
      {PIPELINE_STEPS.map((step) => {
        const count = statusCounts[step] || 0;
        const isBottleneck = count === maxCount && count > 0;
        return (
          <div key={step} className="flex-1 flex flex-col items-center">
            {/* Count */}
            <span className={`text-lg font-bold mb-2 ${isBottleneck ? 'text-indigo-600' : 'text-gray-800'}`}>
              {count}
            </span>
            {/* Bar */}
            <div className={`w-full rounded-t-md ${isBottleneck ? 'bg-indigo-500' : 'bg-indigo-300'}`}
              style={{ height: `${Math.max((count / maxCount) * 80, 8)}px`, transition: 'height 0.3s' }}
            />
            {/* Label */}
            <div className="w-full bg-gray-100 rounded-b-md py-2 text-center">
              <p className="text-[11px] font-medium text-gray-600">{PIPELINE_LABELS[step]}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
