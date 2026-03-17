'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

interface PurchaseOrder {
  id: string;
  po_number: string;
  po_date: string;
  description: string | null;
  amount_total: number;
  amount_invoiced: number;
  amount_remaining: number;
  status: string;
  vendor?: { company_name: string; vendor_code: string } | null;
}

interface Vendor {
  id: string;
  company_name: string;
  vendor_code: string;
}

interface LineItem {
  line_number: number;
  description: string;
  quantity: string;
  unit_price: string;
  category: string;
}

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'badge-green',
  PARTIALLY_INVOICED: 'badge-blue',
  FULLY_INVOICED: 'badge-purple',
  CLOSED: 'badge-gray',
  CANCELLED: 'badge-red',
};

export default function POLinkagePage() {
  const router = useRouter();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 신규 PO 폼
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendor_id: '',
    po_number: '',
    po_date: new Date().toISOString().split('T')[0],
    description: '',
  });
  const [lines, setLines] = useState<LineItem[]>([
    { line_number: 1, description: '', quantity: '1', unit_price: '0', category: '' },
  ]);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/purchase-orders', { params: { limit: 100 } });
      setOrders(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
    api.get('/api/v1/vendors', { params: { limit: 100, status: 'ACTIVE' } })
      .then(({ data }) => setVendors(data.items))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLineChange = (index: number, field: keyof LineItem, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const addLine = () => {
    setLines([...lines, {
      line_number: lines.length + 1, description: '', quantity: '1', unit_price: '0', category: '',
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_number: i + 1 })));
  };

  const lineTotal = (l: LineItem) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const meRes = await api.get<{ company_id: string | null }>('/api/v1/users/me');
      let companyId = meRes.data.company_id;
      if (!companyId) {
        const compRes = await api.get<{ items: { id: string }[] }>('/api/v1/companies', { params: { limit: 1 } });
        if (compRes.data.items.length === 0) { setError('No company found.'); return; }
        companyId = compRes.data.items[0].id;
      }

      await api.post('/api/v1/purchase-orders', {
        company_id: companyId,
        vendor_id: form.vendor_id,
        po_number: form.po_number,
        po_date: form.po_date,
        description: form.description || null,
        lines: lines.map(l => ({
          line_number: l.line_number,
          description: l.description || null,
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
          category: l.category || null,
        })),
      });
      setShowForm(false);
      setForm({ vendor_id: '', po_number: '', po_date: new Date().toISOString().split('T')[0], description: '' });
      setLines([{ line_number: 1, description: '', quantity: '1', unit_price: '0', category: '' }]);
      fetchOrders();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT']}>
          <div className="page-header flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/settings/type-linkage" className="text-sm text-primary-600 hover:text-primary-700">
                  Type Linkage
                </Link>
                <span className="text-gray-400 text-sm">/</span>
                <span className="text-sm text-gray-600">PO 데이터 연계</span>
              </div>
              <h2 className="page-title">Purchase Order 데이터</h2>
              <p className="page-subtitle">PO 타입 인보이스와 매칭할 PO 데이터를 관리합니다 ({total}건)</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? '취소' : '+ 새 PO 등록'}
            </button>
          </div>

          {error && <div className="alert-error mb-4">{error}</div>}

          {showForm && (
            <div className="card p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">새 Purchase Order</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-4 gap-4">
                  <div>
                    <label className="label">PO 번호 *</label>
                    <input name="po_number" required value={form.po_number} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">PO 날짜 *</label>
                    <input name="po_date" type="date" required value={form.po_date} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">거래처 *</label>
                    <select name="vendor_id" required value={form.vendor_id} onChange={handleChange}
                      className="input w-full">
                      <option value="">선택...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.company_name} ({v.vendor_code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">설명</label>
                    <input name="description" value={form.description} onChange={handleChange}
                      className="input w-full" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600">품목</h4>
                    <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:text-blue-700">
                      + 품목 추가
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2 w-8">#</th>
                        <th className="text-left py-2">설명</th>
                        <th className="text-right py-2 w-24">수량</th>
                        <th className="text-right py-2 w-32">단가</th>
                        <th className="text-right py-2 w-32">금액</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 text-gray-500">{line.line_number}</td>
                          <td className="py-2 pr-2">
                            <input value={line.description} onChange={(e) => handleLineChange(i, 'description', e.target.value)}
                              className="input w-full" />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" step="0.01" min="0.01" value={line.quantity}
                              onChange={(e) => handleLineChange(i, 'quantity', e.target.value)}
                              className="input w-full text-right" />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" step="0.01" min="0" value={line.unit_price}
                              onChange={(e) => handleLineChange(i, 'unit_price', e.target.value)}
                              className="input w-full text-right" />
                          </td>
                          <td className="py-2 text-right font-mono">{fmt(lineTotal(line))}</td>
                          <td className="py-2 text-center">
                            {lines.length > 1 && (
                              <button type="button" onClick={() => removeLine(i)}
                                className="text-red-400 hover:text-red-600 text-xs">X</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-gray-300">
                        <td colSpan={4} className="py-2 text-right font-semibold text-gray-700">합계:</td>
                        <td className="py-2 text-right font-mono font-semibold">{fmt(grandTotal)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                  {saving ? '저장 중...' : 'PO 등록'}
                </button>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : orders.length === 0 ? (
              <div className="empty-state">등록된 PO가 없습니다. &quot;+ 새 PO 등록&quot; 버튼을 클릭하여 추가하세요.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">PO #</th>
                    <th className="table-th text-left">날짜</th>
                    <th className="table-th text-left">설명</th>
                    <th className="table-th text-right">총액</th>
                    <th className="table-th text-right">청구됨</th>
                    <th className="table-th text-right">잔액</th>
                    <th className="table-th text-center">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((po) => (
                    <tr key={po.id} className="table-row">
                      <td className="table-td font-mono text-xs font-medium">{po.po_number}</td>
                      <td className="table-td text-gray-600">{po.po_date}</td>
                      <td className="table-td text-gray-600 text-xs">{po.description || '—'}</td>
                      <td className="table-td text-right font-mono">{fmt(po.amount_total)}</td>
                      <td className="table-td text-right font-mono">{fmt(po.amount_invoiced)}</td>
                      <td className="table-td text-right font-mono">{fmt(po.amount_remaining)}</td>
                      <td className="table-td text-center">
                        <span className={STATUS_COLORS[po.status] || 'badge-gray'}>
                          {po.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
