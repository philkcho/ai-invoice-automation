'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useAuthStore } from '@/stores/auth';
import api from '@/lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

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
interface SpendByType { type_name: string; count: number; amount: number; }
interface TopVendor { vendor_name: string; invoice_count: number; total_spend: number; }
interface RecentItem { id: string; invoice_number: string | null; vendor_name: string | null; amount_total: number; status: string; updated_at: string | null; }

const PIE_COLORS = ['#4F46E5', '#7C3AED', '#2563EB', '#0891B2', '#059669', '#D97706', '#DC2626', '#6366F1'];

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'bg-gray-100 text-gray-600',
  PENDING: 'bg-blue-50 text-blue-700',
  IN_APPROVAL: 'bg-yellow-50 text-yellow-700',
  APPROVED: 'bg-green-50 text-green-700',
  PAID: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
};

function fmt(n: number) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n);
}

function fmtMonth(item: TrendItem) {
  return `${item.year}-${String(item.month).padStart(2, '0')}`;
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [spendByType, setSpendByType] = useState<SpendByType[]>([]);
  const [topVendors, setTopVendors] = useState<TopVendor[]>([]);
  const [recent, setRecent] = useState<RecentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [sumRes, trendRes, typeRes, vendorRes, recentRes] = await Promise.all([
          api.get('/api/v1/dashboard/summary'),
          api.get('/api/v1/dashboard/invoice-trend'),
          api.get('/api/v1/dashboard/spend-by-type'),
          api.get('/api/v1/dashboard/top-vendors'),
          api.get('/api/v1/dashboard/recent-activity'),
        ]);
        setSummary(sumRes.data);
        setTrend(trendRes.data);
        setSpendByType(typeRes.data);
        setTopVendors(vendorRes.data);
        setRecent(recentRes.data);
      } catch {
        // Dashboard load failure is non-critical
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const handleExport = async (type: string) => {
    try {
      const resp = await api.get(`/api/v1/reports/${type}/export?fmt=csv`, { responseType: 'blob' });
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // silent
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
              <p className="text-sm text-gray-500 mt-1">Welcome back, {user?.full_name}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => handleExport('invoices')} className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Export Invoices
              </button>
              <button onClick={() => handleExport('vendor-spend')} className="px-3 py-1.5 text-xs bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
                Export Vendor Spend
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center text-gray-500 py-16">Loading dashboard...</div>
          ) : !summary ? (
            <div className="text-center text-gray-500 py-16">Unable to load dashboard data.</div>
          ) : (
            <>
              {/* KPI Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
                <KpiCard label="Invoices (Month)" value={summary.invoices_this_month} />
                <KpiCard label="Invoices (YTD)" value={summary.invoices_ytd} />
                <KpiCard label="Spend (Month)" value={fmt(summary.spend_this_month)} />
                <KpiCard label="Spend (YTD)" value={fmt(summary.spend_ytd)} />
                <KpiCard label="Active Vendors" value={summary.active_vendors} />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <KpiCard label="Pending Approvals" value={summary.pending_approvals} color={summary.pending_approvals > 0 ? 'yellow' : undefined} />
                <KpiCard label="Validation Fails" value={summary.validation_fails} color={summary.validation_fails > 0 ? 'red' : undefined} />
                <KpiCard label="Warnings" value={summary.validation_warnings} color={summary.validation_warnings > 0 ? 'orange' : undefined} />
                <KpiCard label="Overdue Payments" value={summary.overdue_payments} color={summary.overdue_payments > 0 ? 'red' : undefined} />
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Invoice Trend */}
                <div className="bg-white rounded-lg shadow-sm border p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Invoice Trend (Monthly)</h3>
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

                {/* Spend by Type */}
                <div className="bg-white rounded-lg shadow-sm border p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Spend by Invoice Type</h3>
                  {spendByType.length > 0 ? (
                    <ResponsiveContainer width="100%" height={260}>
                      <PieChart>
                        <Pie
                          data={spendByType}
                          dataKey="amount"
                          nameKey="type_name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ type_name, percent }) => `${type_name} ${(percent * 100).toFixed(0)}%`}
                          labelLine={false}
                          fontSize={11}
                        >
                          {spendByType.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => fmt(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data</div>
                  )}
                </div>
              </div>

              {/* Bottom: Top Vendors + Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Top Vendors */}
                <div className="bg-white rounded-lg shadow-sm border p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Top 10 Vendors by Spend</h3>
                  {topVendors.length > 0 ? (
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-500 border-b">
                          <th className="text-left py-2">Vendor</th>
                          <th className="text-right py-2">Invoices</th>
                          <th className="text-right py-2">Total Spend</th>
                        </tr>
                      </thead>
                      <tbody>
                        {topVendors.map((v, i) => (
                          <tr key={i} className="border-b border-gray-50">
                            <td className="py-2 text-gray-800">{v.vendor_name}</td>
                            <td className="py-2 text-right text-gray-600">{v.invoice_count}</td>
                            <td className="py-2 text-right font-medium text-gray-800">{fmt(v.total_spend)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="py-8 text-center text-gray-400 text-sm">No vendor data</div>
                  )}
                </div>

                {/* Recent Activity */}
                <div className="bg-white rounded-lg shadow-sm border p-5">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Activity</h3>
                  {recent.length > 0 ? (
                    <div className="space-y-3">
                      {recent.map((item) => (
                        <div key={item.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                          <div>
                            <p className="text-sm font-medium text-gray-800">
                              {item.invoice_number || 'Draft'}
                            </p>
                            <p className="text-xs text-gray-500">{item.vendor_name || 'Unknown Vendor'}</p>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-medium text-gray-800">{fmt(item.amount_total)}</p>
                            <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
                              {item.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center text-gray-400 text-sm">No recent activity</div>
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

function KpiCard({ label, value, color }: { label: string; value: string | number; color?: string }) {
  const borderColor = color === 'red' ? 'border-l-red-500' : color === 'yellow' ? 'border-l-yellow-500' : color === 'orange' ? 'border-l-orange-500' : 'border-l-transparent';
  return (
    <div className={`bg-white rounded-lg shadow-sm border p-4 border-l-4 ${borderColor}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
