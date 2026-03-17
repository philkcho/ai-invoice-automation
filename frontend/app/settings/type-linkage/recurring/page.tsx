'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

interface RecurringAmount {
  id: string;
  company_id: string;
  vendor_id: string | null;
  description: string;
  monthly_amount: number;
  currency: string;
  effective_from: string;
  effective_to: string | null;
  is_active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Vendor {
  id: string;
  company_name: string;
  vendor_code: string;
}

export default function RecurringLinkagePage() {
  const [items, setItems] = useState<RecurringAmount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 신규 폼
  const [showForm, setShowForm] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    vendor_id: '',
    description: '',
    monthly_amount: '',
    currency: 'USD',
    effective_from: new Date().toISOString().split('T')[0],
    effective_to: '',
    notes: '',
  });

  const fetchItems = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/recurring-amounts', { params: { limit: 100 } });
      setItems(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
    api.get('/api/v1/vendors', { params: { limit: 100, status: 'ACTIVE' } })
      .then(({ data }) => setVendors(data.items))
      .catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({
      vendor_id: '', description: '', monthly_amount: '', currency: 'USD',
      effective_from: new Date().toISOString().split('T')[0], effective_to: '', notes: '',
    });
    setEditingId(null);
  };

  const handleEdit = (item: RecurringAmount) => {
    setForm({
      vendor_id: item.vendor_id || '',
      description: item.description,
      monthly_amount: String(item.monthly_amount),
      currency: item.currency,
      effective_from: item.effective_from,
      effective_to: item.effective_to || '',
      notes: item.notes || '',
    });
    setEditingId(item.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        vendor_id: form.vendor_id || null,
        description: form.description,
        monthly_amount: parseFloat(form.monthly_amount),
        currency: form.currency,
        effective_from: form.effective_from,
        effective_to: form.effective_to || null,
        notes: form.notes || null,
      };

      if (editingId) {
        await api.patch(`/api/v1/recurring-amounts/${editingId}`, payload);
      } else {
        await api.post('/api/v1/recurring-amounts', payload);
      }

      setShowForm(false);
      resetForm();
      fetchItems();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: RecurringAmount) => {
    try {
      await api.patch(`/api/v1/recurring-amounts/${item.id}`, { is_active: !item.is_active });
      fetchItems();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleDelete = async (item: RecurringAmount) => {
    if (!confirm(`"${item.description}" 항목을 삭제하시겠습니까?`)) return;
    try {
      await api.delete(`/api/v1/recurring-amounts/${item.id}`);
      fetchItems();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const fmt = (n: number, currency: string = 'USD') =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(n);

  const getVendorName = (vendorId: string | null) => {
    if (!vendorId) return '—';
    const v = vendors.find(v => v.id === vendorId);
    return v ? `${v.company_name}` : vendorId.slice(0, 8);
  };

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
                <span className="text-sm text-gray-600">고정금액 연계</span>
              </div>
              <h2 className="page-title">월 고정금액 관리</h2>
              <p className="page-subtitle">Recurring 타입 인보이스와 매칭할 월 고정금액을 관리합니다 ({total}건)</p>
            </div>
            <button onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }} className="btn-primary">
              {showForm ? '취소' : '+ 새 고정금액 등록'}
            </button>
          </div>

          {error && <div className="alert-error mb-4">{error}</div>}

          {showForm && (
            <div className="card p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {editingId ? '고정금액 수정' : '새 고정금액 등록'}
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="label">설명 *</label>
                    <input name="description" required value={form.description} onChange={handleChange}
                      placeholder="예: 사무실 임대료, 인터넷 요금"
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">거래처</label>
                    <select name="vendor_id" value={form.vendor_id} onChange={handleChange}
                      className="input w-full">
                      <option value="">전체 (미지정)</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.company_name} ({v.vendor_code})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">월 고정금액 *</label>
                    <input name="monthly_amount" type="number" step="0.01" min="0.01" required
                      value={form.monthly_amount} onChange={handleChange}
                      placeholder="0.00"
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">통화</label>
                    <select name="currency" value={form.currency} onChange={handleChange}
                      className="input w-full">
                      <option value="USD">USD</option>
                      <option value="KRW">KRW</option>
                      <option value="EUR">EUR</option>
                      <option value="JPY">JPY</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">적용 시작일 *</label>
                    <input name="effective_from" type="date" required value={form.effective_from} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">적용 종료일</label>
                    <input name="effective_to" type="date" value={form.effective_to} onChange={handleChange}
                      className="input w-full" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">비고</label>
                    <input name="notes" value={form.notes} onChange={handleChange}
                      className="input w-full" />
                  </div>
                </div>

                <div className="flex gap-2">
                  <button type="submit" disabled={saving} className="btn-primary disabled:opacity-50">
                    {saving ? '저장 중...' : editingId ? '수정' : '등록'}
                  </button>
                  {editingId && (
                    <button type="button" onClick={() => { resetForm(); setShowForm(false); }}
                      className="btn-secondary">취소</button>
                  )}
                </div>
              </form>
            </div>
          )}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : items.length === 0 ? (
              <div className="empty-state">등록된 고정금액이 없습니다. &quot;+ 새 고정금액 등록&quot; 버튼을 클릭하여 추가하세요.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">설명</th>
                    <th className="table-th text-left">거래처</th>
                    <th className="table-th text-right">월 고정금액</th>
                    <th className="table-th text-left">적용기간</th>
                    <th className="table-th text-center">상태</th>
                    <th className="table-th text-center">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="table-row">
                      <td className="table-td font-medium text-gray-800">
                        {item.description}
                        {item.notes && <div className="text-xs text-gray-400 mt-0.5">{item.notes}</div>}
                      </td>
                      <td className="table-td text-gray-600 text-xs">{getVendorName(item.vendor_id)}</td>
                      <td className="table-td text-right font-mono font-medium">
                        {fmt(item.monthly_amount, item.currency)}
                      </td>
                      <td className="table-td text-gray-600 text-xs">
                        {item.effective_from} ~ {item.effective_to || '무기한'}
                      </td>
                      <td className="table-td text-center">
                        <button onClick={() => handleToggleActive(item)}
                          className={item.is_active ? 'badge-green cursor-pointer' : 'badge-red cursor-pointer'}>
                          {item.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="table-td text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(item)}
                            className="text-xs text-blue-600 hover:text-blue-700">수정</button>
                          <button onClick={() => handleDelete(item)}
                            className="text-xs text-red-500 hover:text-red-600">삭제</button>
                        </div>
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
