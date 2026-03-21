'use client';

import { useEffect, useState, useCallback } from 'react';
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
  overdue_amount: number;
  unpaid_count: number;
  unpaid_amount: number;
  paid_this_month_count: number;
  paid_this_month_amount: number;
  active_vendors: number;
  status_counts: Record<string, number>;
  status_amounts: Record<string, number>;
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

interface KpiDetailItem {
  id: string;
  invoice_number: string | null;
  vendor_name: string | null;
  amount_total: number;
  invoice_type: string | null;
  status: string;
  due_date: string | null;
  days_overdue: number | null;
}

type KpiCategory = 'this_month' | 'unpaid' | 'overdue' | 'paid_this_month';

/* ---------- Constants ---------- */

const PIPELINE_STEPS = ['RECEIVED', 'PENDING', 'IN_APPROVAL', 'APPROVED', 'PAID'] as const;

const PIPELINE_LABELS: Record<string, string> = {
  RECEIVED: 'Received',
  PENDING: 'Pending',
  IN_APPROVAL: 'In Approval',
  APPROVED: 'Approved',
  PAID: 'Paid',
};

/** Merge related statuses for pipeline display */
function getPipelineCount(statusCounts: Record<string, number>, step: string): number {
  const base = statusCounts[step] || 0;
  if (step === 'RECEIVED') return base + (statusCounts['OCR_REVIEW'] || 0);
  if (step === 'PENDING') return base + (statusCounts['REJECTED'] || 0) + (statusCounts['REVIEW_NEEDED'] || 0);
  if (step === 'APPROVED') return base + (statusCounts['SCHEDULED'] || 0);
  if (step === 'IN_APPROVAL') return base + (statusCounts['SUBMITTED'] || 0);
  return base;
}

function getPipelineAmount(statusAmounts: Record<string, number>, step: string): number {
  const base = statusAmounts[step] || 0;
  if (step === 'RECEIVED') return base + (statusAmounts['OCR_REVIEW'] || 0);
  if (step === 'PENDING') return base + (statusAmounts['REJECTED'] || 0) + (statusAmounts['REVIEW_NEEDED'] || 0);
  if (step === 'APPROVED') return base + (statusAmounts['SCHEDULED'] || 0);
  if (step === 'IN_APPROVAL') return base + (statusAmounts['SUBMITTED'] || 0);
  return base;
}

/** Map pipeline step to actual invoice statuses for detail query */
function getStatusesForStep(step: string): string[] {
  if (step === 'RECEIVED') return ['RECEIVED', 'OCR_REVIEW'];
  if (step === 'PENDING') return ['PENDING', 'REJECTED', 'REVIEW_NEEDED'];
  if (step === 'APPROVED') return ['APPROVED', 'SCHEDULED'];
  if (step === 'IN_APPROVAL') return ['IN_APPROVAL', 'SUBMITTED'];
  return [step];
}

const ACTION_CONFIG: Record<string, { icon: string; label: string; color: string; bgColor: string }> = {
  overdue_payment:   { icon: '\u{1F534}', label: 'Overdue Payment',    color: 'text-red-700',    bgColor: 'bg-red-50 border-red-200' },
  pending_approval:  { icon: '\u{1F7E1}', label: 'Pending Approval',   color: 'text-yellow-700', bgColor: 'bg-yellow-50 border-yellow-200' },
  validation_failed: { icon: '\u{1F7E0}', label: 'Validation Failed',  color: 'text-orange-700', bgColor: 'bg-orange-50 border-orange-200' },
  ocr_review:        { icon: '\u{1F535}', label: 'OCR Review Pending', color: 'text-blue-700',   bgColor: 'bg-blue-50 border-blue-200' },
};

const KPI_MODAL_TITLES: Record<KpiCategory, string> = {
  this_month: 'Invoices This Month',
  unpaid: 'Unpaid Invoices',
  overdue: 'Overdue Invoices',
  paid_this_month: 'Paid This Month',
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

  // KPI detail modal
  const [modalCategory, setModalCategory] = useState<KpiCategory | null>(null);
  const [modalData, setModalData] = useState<KpiDetailItem[]>([]);
  const [modalLoading, setModalLoading] = useState(false);

  // Pipeline detail modal
  const [pipelineStep, setPipelineStep] = useState<string | null>(null);
  const [pipelineData, setPipelineData] = useState<KpiDetailItem[]>([]);
  const [pipelineLoading, setPipelineLoading] = useState(false);

  // Lookup maps for vendor/type names
  const [vendorMap, setVendorMap] = useState<Record<string, string>>({});
  const [typeMap, setTypeMap] = useState<Record<string, string>>({});

  useEffect(() => {
    // Load vendor/type maps for pipeline popup
    api.get('/api/v1/vendors', { params: { limit: 200, status: 'ACTIVE' } })
      .then(({ data }) => {
        const m: Record<string, string> = {};
        for (const v of data.items) m[v.id] = v.company_name;
        setVendorMap(m);
      }).catch(() => {});
    api.get('/api/v1/invoice-types', { params: { limit: 100 } })
      .then(({ data }) => {
        const m: Record<string, string> = {};
        for (const t of data.items) m[t.id] = t.type_name;
        setTypeMap(m);
      }).catch(() => {});
  }, []);

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

  const openKpiDetail = useCallback(async (category: KpiCategory) => {
    setModalCategory(category);
    setModalLoading(true);
    try {
      const res = await api.get(`/api/v1/dashboard/kpi-detail?category=${category}`);
      setModalData(res.data);
    } catch {
      setModalData([]);
    }
    setModalLoading(false);
  }, []);

  const openPipelineDetail = useCallback(async (step: string) => {
    setPipelineStep(step);
    setPipelineLoading(true);
    try {
      const statuses = getStatusesForStep(step);
      const results = await Promise.all(
        statuses.map(s => api.get('/api/v1/invoices', { params: { status: s, limit: 50 } }))
      );
      const items: KpiDetailItem[] = [];
      for (const res of results) {
        for (const inv of res.data.items) {
          items.push({
            id: inv.id,
            invoice_number: inv.invoice_number,
            vendor_name: inv.vendor_name || vendorMap[inv.vendor_id] || null,
            amount_total: inv.amount_total,
            invoice_type: inv.invoice_type_name || typeMap[inv.invoice_type_id] || null,
            status: inv.status,
            due_date: inv.due_date,
            days_overdue: inv.due_date ? Math.max(0, Math.floor((Date.now() - new Date(inv.due_date).getTime()) / 86400000)) : null,
          });
        }
      }
      setPipelineData(items);
    } catch {
      setPipelineData([]);
    }
    setPipelineLoading(false);
  }, [vendorMap, typeMap]);

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
              {/* Section 1: KPI Cards (4 cards) */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <KpiCard
                  label="Invoices This Month"
                  count={summary.invoices_this_month}
                  amount={summary.spend_this_month}
                  accent="indigo"
                  onClick={() => openKpiDetail('this_month')}
                />
                <KpiCard
                  label="Unpaid"
                  count={summary.unpaid_count}
                  amount={summary.unpaid_amount}
                  accent={summary.unpaid_count > 0 ? 'yellow' : 'indigo'}
                  onClick={() => openKpiDetail('unpaid')}
                />
                <KpiCard
                  label="Overdue"
                  count={summary.overdue_payments}
                  amount={summary.overdue_amount}
                  accent={summary.overdue_payments > 0 ? 'red' : 'indigo'}
                  onClick={() => openKpiDetail('overdue')}
                />
                <KpiCard
                  label="Paid This Month"
                  count={summary.paid_this_month_count}
                  amount={summary.paid_this_month_amount}
                  accent="green"
                  onClick={() => openKpiDetail('paid_this_month')}
                />
              </div>

              {/* Section 2: Invoice Pipeline */}
              <div className="bg-white rounded-lg shadow-sm border p-5 mb-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Invoice Processing Pipeline</h3>
                <PipelineBar
                  statusCounts={summary.status_counts}
                  statusAmounts={summary.status_amounts || {}}
                  onStepClick={openPipelineDetail}
                />
              </div>

              {/* Section 3 & 4: Trend + Action Items */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Monthly Spend Trend */}
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

                {/* Action Required */}
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

          {/* Pipeline Detail Modal */}
          {pipelineStep && (
            <KpiDetailModal
              title={`${PIPELINE_LABELS[pipelineStep] || pipelineStep} Invoices`}
              data={pipelineData}
              loading={pipelineLoading}
              onClose={() => setPipelineStep(null)}
              onRowClick={(id) => { setPipelineStep(null); router.push(`/invoices/${id}`); }}
            />
          )}

          {/* KPI Detail Modal */}
          {modalCategory && (
            <KpiDetailModal
              title={KPI_MODAL_TITLES[modalCategory]}
              data={modalData}
              loading={modalLoading}
              onClose={() => setModalCategory(null)}
              onRowClick={(id) => { setModalCategory(null); router.push(`/invoices/${id}`); }}
            />
          )}
        </main>
      </div>
    </div>
  );
}

/* ---------- KPI Card (count + amount) ---------- */

function KpiCard({
  label,
  count,
  amount,
  accent = 'indigo',
  onClick,
}: {
  label: string;
  count: number;
  amount: number;
  accent?: 'indigo' | 'yellow' | 'red' | 'green';
  onClick?: () => void;
}) {
  const borderColors = {
    indigo: 'border-l-indigo-500',
    yellow: 'border-l-yellow-500',
    red: 'border-l-red-500',
    green: 'border-l-green-500',
  };
  return (
    <button
      className={`bg-white rounded-lg shadow-sm border border-l-4 ${borderColors[accent]} p-4 text-left hover:bg-gray-50 cursor-pointer transition`}
      onClick={onClick}
    >
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <div className="flex items-baseline gap-3">
        <p className="text-2xl font-bold text-gray-900">{count}</p>
        <p className="text-xs text-gray-400">invoices</p>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{fmt(amount)}</p>
    </button>
  );
}

/* ---------- KPI Detail Modal ---------- */

function KpiDetailModal({
  title,
  data,
  loading,
  onClose,
  onRowClick,
}: {
  title: string;
  data: KpiDetailItem[];
  loading: boolean;
  onClose: () => void;
  onRowClick: (id: string) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="text-center text-gray-400 py-12">Loading...</div>
          ) : data.length === 0 ? (
            <div className="text-center text-gray-400 py-12">No invoices found</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 border-b">
                  <th className="pb-2 font-medium">Invoice #</th>
                  <th className="pb-2 font-medium">Vendor</th>
                  <th className="pb-2 font-medium">Type</th>
                  <th className="pb-2 font-medium text-right">Amount</th>
                  <th className="pb-2 font-medium">Status</th>
                  <th className="pb-2 font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b last:border-0 hover:bg-gray-50 cursor-pointer transition"
                    onClick={() => onRowClick(item.id)}
                  >
                    <td className="py-2.5 font-medium text-indigo-600">{item.invoice_number || '—'}</td>
                    <td className="py-2.5 text-gray-700">{item.vendor_name || '—'}</td>
                    <td className="py-2.5 text-gray-500">{item.invoice_type || '—'}</td>
                    <td className="py-2.5 text-right font-medium text-gray-900">{fmt(item.amount_total)}</td>
                    <td className="py-2.5">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="py-2.5 text-gray-500">
                      {item.due_date || '—'}
                      {item.days_overdue && item.days_overdue > 0 && (
                        <span className="ml-1 text-xs text-red-500">({item.days_overdue}d)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t text-xs text-gray-400">
          {!loading && `${data.length} invoice${data.length !== 1 ? 's' : ''}`}
        </div>
      </div>
    </div>
  );
}

/* ---------- Status Badge ---------- */

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    RECEIVED: 'bg-blue-50 text-blue-700',
    OCR_REVIEW: 'bg-blue-50 text-blue-700',
    PENDING: 'bg-gray-100 text-gray-700',
    SUBMITTED: 'bg-indigo-50 text-indigo-700',
    IN_APPROVAL: 'bg-yellow-50 text-yellow-700',
    APPROVED: 'bg-green-50 text-green-700',
    SCHEDULED: 'bg-emerald-50 text-emerald-700',
    PAID: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-50 text-red-700',
    OVERDUE: 'bg-red-100 text-red-800',
    VOID: 'bg-gray-100 text-gray-500',
  };
  const style = colors[status] || 'bg-gray-100 text-gray-600';
  const label = status.replace(/_/g, ' ');
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${style}`}>
      {label}
    </span>
  );
}

/* ---------- Pipeline Bar ---------- */

function PipelineBar({
  statusCounts,
  statusAmounts,
  onStepClick,
}: {
  statusCounts: Record<string, number>;
  statusAmounts: Record<string, number>;
  onStepClick: (step: string) => void;
}) {
  const amounts = PIPELINE_STEPS.map(s => getPipelineAmount(statusAmounts, s));
  const maxAmount = Math.max(...amounts, 1);

  return (
    <div className="flex items-end gap-1">
      {PIPELINE_STEPS.map((step) => {
        const count = getPipelineCount(statusCounts, step);
        const amount = getPipelineAmount(statusAmounts, step);
        const isTop = amount === maxAmount && amount > 0;
        return (
          <button
            key={step}
            className="flex-1 flex flex-col items-center cursor-pointer hover:opacity-80 transition"
            onClick={() => count > 0 && onStepClick(step)}
          >
            {/* Count + Amount */}
            <span className={`text-lg font-bold ${isTop ? 'text-indigo-600' : 'text-gray-800'}`}>
              {count}
            </span>
            <span className={`text-lg font-bold mb-1 ${isTop ? 'text-indigo-600' : 'text-gray-800'}`}>
              {fmt(amount)}
            </span>
            {/* Bar — based on amount */}
            <div className={`w-full rounded-t-md ${isTop ? 'bg-indigo-500' : 'bg-indigo-300'}`}
              style={{ height: `${Math.max((amount / maxAmount) * 80, 8)}px`, transition: 'height 0.3s' }}
            />
            {/* Label */}
            <div className="w-full bg-gray-100 rounded-b-md py-2 text-center">
              <p className="text-[11px] font-medium text-gray-600">{PIPELINE_LABELS[step]}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
