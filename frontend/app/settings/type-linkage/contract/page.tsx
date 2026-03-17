'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

interface VendorContract {
  id: string;
  vendor_id: string;
  contract_name: string;
  contract_number: string | null;
  effective_date: string;
  expiry_date: string;
  max_order_amount: number | null;
  contracted_prices: Record<string, number> | null;
  price_tolerance_pct: number | null;
  is_active: boolean;
  notes: string | null;
  vendor?: { company_name: string; vendor_code: string } | null;
}

interface Vendor {
  id: string;
  company_name: string;
  vendor_code: string;
}

export default function ContractLinkagePage() {
  const [contracts, setContracts] = useState<VendorContract[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 신규 계약 폼
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    vendor_id: '',
    contract_name: '',
    contract_number: '',
    effective_date: new Date().toISOString().split('T')[0],
    expiry_date: '',
    max_order_amount: '',
    price_tolerance_pct: '',
    notes: '',
  });
  const [priceEntries, setPriceEntries] = useState<{ item: string; price: string }[]>([
    { item: '', price: '' },
  ]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/vendor-contracts', { params: { limit: 100 } });
      setContracts(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContracts();
    api.get('/api/v1/vendors', { params: { limit: 100, status: 'ACTIVE' } })
      .then(({ data }) => setVendors(data.items))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePriceChange = (index: number, field: 'item' | 'price', value: string) => {
    const updated = [...priceEntries];
    updated[index] = { ...updated[index], [field]: value };
    setPriceEntries(updated);
  };

  const addPriceEntry = () => {
    setPriceEntries([...priceEntries, { item: '', price: '' }]);
  };

  const removePriceEntry = (index: number) => {
    if (priceEntries.length <= 1) return;
    setPriceEntries(priceEntries.filter((_, i) => i !== index));
  };

  const resetForm = () => {
    setForm({
      vendor_id: '', contract_name: '', contract_number: '',
      effective_date: new Date().toISOString().split('T')[0],
      expiry_date: '', max_order_amount: '', price_tolerance_pct: '', notes: '',
    });
    setPriceEntries([{ item: '', price: '' }]);
  };

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

      // 계약 단가 빌드
      const contracted_prices: Record<string, number> = {};
      for (const entry of priceEntries) {
        if (entry.item.trim() && entry.price.trim()) {
          contracted_prices[entry.item.trim()] = parseFloat(entry.price);
        }
      }

      await api.post('/api/v1/vendor-contracts', {
        company_id: companyId,
        vendor_id: form.vendor_id,
        contract_name: form.contract_name,
        contract_number: form.contract_number || null,
        effective_date: form.effective_date,
        expiry_date: form.expiry_date,
        max_order_amount: form.max_order_amount ? parseFloat(form.max_order_amount) : null,
        price_tolerance_pct: form.price_tolerance_pct ? parseFloat(form.price_tolerance_pct) : null,
        contracted_prices: Object.keys(contracted_prices).length > 0 ? contracted_prices : null,
        notes: form.notes || null,
      });
      setShowForm(false);
      resetForm();
      fetchContracts();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const fmt = (n: number | null) =>
    n != null ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n) : '—';

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="page-header flex items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Link href="/settings/type-linkage" className="text-sm text-primary-600 hover:text-primary-700">
                  Type Linkage
                </Link>
                <span className="text-gray-400 text-sm">/</span>
                <span className="text-sm text-gray-600">계약 조건 연계</span>
              </div>
              <h2 className="page-title">계약 조건 관리</h2>
              <p className="page-subtitle">Service 타입 인보이스 검증에 사용할 계약 조건을 관리합니다 ({total}건)</p>
            </div>
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              {showForm ? '취소' : '+ 새 계약 등록'}
            </button>
          </div>

          {error && <div className="alert-error mb-4">{error}</div>}

          {showForm && (
            <div className="card p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">새 계약 등록</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">계약명 *</label>
                    <input name="contract_name" required value={form.contract_name} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">계약 번호</label>
                    <input name="contract_number" value={form.contract_number} onChange={handleChange}
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
                    <label className="label">계약 시작일 *</label>
                    <input name="effective_date" type="date" required value={form.effective_date} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">계약 만료일 *</label>
                    <input name="expiry_date" type="date" required value={form.expiry_date} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">최대 주문 금액</label>
                    <input name="max_order_amount" type="number" step="0.01" min="0"
                      value={form.max_order_amount} onChange={handleChange}
                      className="input w-full" placeholder="한도 없음" />
                  </div>
                  <div>
                    <label className="label">가격 허용 오차 (%)</label>
                    <input name="price_tolerance_pct" type="number" step="0.01" min="0" max="100"
                      value={form.price_tolerance_pct} onChange={handleChange}
                      className="input w-full" placeholder="예: 5" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">비고</label>
                    <input name="notes" value={form.notes} onChange={handleChange}
                      className="input w-full" />
                  </div>
                </div>

                {/* 계약 단가 */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-medium text-gray-600">계약 단가 (항목별)</h4>
                    <button type="button" onClick={addPriceEntry} className="text-sm text-blue-600 hover:text-blue-700">
                      + 항목 추가
                    </button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2">항목명</th>
                        <th className="text-right py-2 w-40">계약 단가</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {priceEntries.map((entry, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 pr-2">
                            <input value={entry.item} onChange={(e) => handlePriceChange(i, 'item', e.target.value)}
                              placeholder="예: 컨설팅 서비스" className="input w-full" />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" step="0.01" min="0" value={entry.price}
                              onChange={(e) => handlePriceChange(i, 'price', e.target.value)}
                              placeholder="0.00" className="input w-full text-right" />
                          </td>
                          <td className="py-2 text-center">
                            {priceEntries.length > 1 && (
                              <button type="button" onClick={() => removePriceEntry(i)}
                                className="text-red-400 hover:text-red-600 text-xs">X</button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                  {saving ? '저장 중...' : '계약 등록'}
                </button>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : contracts.length === 0 ? (
              <div className="empty-state">등록된 계약이 없습니다. &quot;+ 새 계약 등록&quot; 버튼을 클릭하여 추가하세요.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">계약명</th>
                    <th className="table-th text-left">계약번호</th>
                    <th className="table-th text-left">시작일</th>
                    <th className="table-th text-left">만료일</th>
                    <th className="table-th text-right">최대금액</th>
                    <th className="table-th text-right">허용오차</th>
                    <th className="table-th text-center">계약단가</th>
                    <th className="table-th text-center">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {contracts.map((c) => {
                    const priceCount = c.contracted_prices ? Object.keys(c.contracted_prices).length : 0;
                    return (
                      <tr key={c.id} className="table-row">
                        <td className="table-td font-medium text-gray-800">{c.contract_name}</td>
                        <td className="table-td font-mono text-xs">{c.contract_number || '—'}</td>
                        <td className="table-td text-gray-600">{c.effective_date}</td>
                        <td className="table-td text-gray-600">{c.expiry_date}</td>
                        <td className="table-td text-right font-mono">{fmt(c.max_order_amount)}</td>
                        <td className="table-td text-right">{c.price_tolerance_pct != null ? `${c.price_tolerance_pct}%` : '—'}</td>
                        <td className="table-td text-center">
                          {priceCount > 0 ? (
                            <span className="badge-blue">{priceCount}건</span>
                          ) : '—'}
                        </td>
                        <td className="table-td text-center">
                          <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                            {c.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
