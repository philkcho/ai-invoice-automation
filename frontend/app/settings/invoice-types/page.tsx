'use client';

import { useEffect, useState, useCallback } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

interface InvoiceType {
  id: string;
  company_id: string | null;
  type_code: string;
  type_name: string;
  description: string | null;
  requires_po: boolean;
  requires_approver: boolean;
  is_active: boolean;
  sort_order: number;
}

interface CompanyTypeSetting {
  id: string;
  company_id: string;
  invoice_type_id: string;
  link_enabled: boolean;
  type_code: string | null;
  type_name: string | null;
}

interface Vendor {
  id: string;
  company_name: string;
  vendor_code: string;
}

interface LinkageDetail {
  id?: string;
  linkage_no: string;
  vendor_id: string;
  amount: string;
  amount_invoiced?: number;
  amount_remaining?: number;
  isNew?: boolean;
}

export default function InvoiceTypesPage() {
  const [types, setTypes] = useState<InvoiceType[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 폼 상태
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type_code: '',
    type_name: '',
    description: '',
    link_enabled: false,
    requires_approver: false,
  });

  // 연계 상세 내역
  const [details, setDetails] = useState<LinkageDetail[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);

  // 연계 설정 상태
  const [linkSettings, setLinkSettings] = useState<CompanyTypeSetting[]>([]);

  const fetchTypes = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/invoice-types', { params: { limit: 100 } });
      setTypes(data.items);
      setTotal(data.total);
    } catch (err: unknown) {
      console.error('Failed to fetch invoice types', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchLinkSettings = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/company-type-settings');
      if (data.total === 0) {
        const initRes = await api.post('/api/v1/company-type-settings/initialize');
        setLinkSettings(initRes.data.items);
      } else {
        setLinkSettings(data.items);
      }
    } catch {
      // 무시
    }
  }, []);

  const fetchVendors = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/vendors', { params: { limit: 100, status: 'ACTIVE' } });
      setVendors(data.items);
    } catch {
      // 무시
    }
  }, []);

  useEffect(() => {
    fetchTypes();
    fetchLinkSettings();
    fetchVendors();
  }, [fetchLinkSettings, fetchVendors]);

  useEffect(() => {
    const handleReset = () => resetForm();
    window.addEventListener('sidebar-nav-reset', handleReset);
    return () => window.removeEventListener('sidebar-nav-reset', handleReset);
  });

  const getLinkSetting = (invoiceTypeId: string): CompanyTypeSetting | undefined => {
    return linkSettings.find((ls) => ls.invoice_type_id === invoiceTypeId);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const resetForm = () => {
    setForm({ type_code: '', type_name: '', description: '', link_enabled: false, requires_approver: false });
    setEditingId(null);
    setShowForm(false);
    setDetails([]);
    setError('');
  };

  const openNewForm = () => {
    setEditingId(null);
    setForm({ type_code: '', type_name: '', description: '', link_enabled: false, requires_approver: false });
    setDetails([]);
    setShowForm(true);
    setError('');
  };

  const openEditForm = async (t: InvoiceType) => {
    const ls = getLinkSetting(t.id);
    const linkEnabled = ls?.link_enabled ?? false;
    setEditingId(t.id);
    setForm({
      type_code: t.type_code,
      type_name: t.type_name,
      description: t.description || '',
      link_enabled: linkEnabled,
      requires_approver: t.requires_approver,
    });
    setShowForm(true);
    setError('');

    // 기존 상세 내역 로드
    if (linkEnabled) {
      try {
        const { data } = await api.get(`/api/v1/linkage-details/${t.id}`);
        setDetails(data.items.map((item: { id: string; linkage_no: string; vendor_id: string | null; amount: number; amount_invoiced: number; amount_remaining: number }) => ({
          id: item.id,
          linkage_no: item.linkage_no,
          vendor_id: item.vendor_id || '',
          amount: String(item.amount),
          amount_invoiced: item.amount_invoiced,
          amount_remaining: item.amount_remaining,
        })));
      } catch {
        setDetails([]);
      }
    } else {
      setDetails([]);
    }
  };

  // 상세 내역 관리
  const addDetail = () => {
    setDetails([...details, { linkage_no: '', vendor_id: '', amount: '', isNew: true }]);
  };

  const updateDetail = (index: number, field: keyof LinkageDetail, value: string) => {
    const updated = [...details];
    updated[index] = { ...updated[index], [field]: value };
    setDetails(updated);
  };

  const removeDetail = (index: number) => {
    setDetails(details.filter((_, i) => i !== index));
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);
  const totalAmount = details.reduce((sum, d) => sum + (parseFloat(d.amount) || 0), 0);

  const isDuplicateLinkageNo = (index: number): boolean => {
    const no = details[index].linkage_no.trim();
    if (!no) return false;
    return details.some((d, i) => i !== index && d.linkage_no.trim() === no);
  };
  const hasDuplicateLinkageNo = details.some((_, i) => isDuplicateLinkageNo(i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      let targetId: string | undefined = editingId ?? undefined;
      if (editingId) {
        await api.patch(`/api/v1/invoice-types/${editingId}`, {
          type_name: form.type_name,
          description: form.description || null,
          requires_approver: form.requires_approver,
        });
        const ls = getLinkSetting(editingId);
        if (ls && ls.link_enabled !== form.link_enabled) {
          await api.put(`/api/v1/company-type-settings/${ls.id}`, {
            link_enabled: form.link_enabled,
          });
        }
      } else {
        const { data: newType } = await api.post('/api/v1/invoice-types', {
          type_code: form.type_code,
          type_name: form.type_name,
          description: form.description || null,
          requires_approver: form.requires_approver,
        });
        targetId = newType.id;

        // 신규 타입: company_type_settings에 누락분 추가 후 link_enabled 설정
        await api.post('/api/v1/company-type-settings/initialize');
        const freshSettings = (await api.get('/api/v1/company-type-settings')).data.items;
        const newSetting = freshSettings.find((s: CompanyTypeSetting) => s.invoice_type_id === targetId);
        if (newSetting && form.link_enabled) {
          await api.put(`/api/v1/company-type-settings/${newSetting.id}`, {
            link_enabled: true,
          });
        }
      }

      // 상세 내역 저장
      if (form.link_enabled && details.length > 0 && targetId) {
        await api.post('/api/v1/linkage-details', {
          invoice_type_id: targetId,
          details: details.map(d => ({
            linkage_no: d.linkage_no,
            vendor_id: d.vendor_id || null,
            amount: parseFloat(d.amount) || 0,
          })),
        });
      } else if (!form.link_enabled && targetId) {
        // 연계 해제 시 기존 상세 내역 삭제
        try {
          await api.delete(`/api/v1/linkage-details/${targetId}`);
        } catch {
          // 없으면 무시
        }
      }

      resetForm();
      await fetchTypes();
      await fetchLinkSettings();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t: InvoiceType) => {
    if (!confirm(`Delete "${t.type_code} - ${t.type_name}"?`)) return;
    try {
      // 연계 상세 삭제
      try { await api.delete(`/api/v1/linkage-details/${t.id}`); } catch { /* 없으면 무시 */ }
      // 회사 설정 삭제는 cascade 또는 무시
      await api.delete(`/api/v1/invoice-types/${t.id}`);
      await fetchTypes();
      await fetchLinkSettings();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    }
  };

  const handleSeedDefaults = async () => {
    setSeeding(true);
    try {
      const { data } = await api.post('/api/v1/invoice-types/seed-defaults');
      alert(data.message);
      fetchTypes();
      fetchLinkSettings();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setSeeding(false);
    }
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
              <h2 className="page-title">Invoice Types</h2>
              <p className="page-subtitle">{total} types</p>
            </div>
            <div className="flex gap-2">
              {total === 0 && !showForm && (
                <button onClick={handleSeedDefaults} disabled={seeding}
                  className="btn-success disabled:opacity-50">
                  {seeding ? 'Seeding...' : 'Seed 6 Defaults'}
                </button>
              )}
              <button onClick={() => showForm ? resetForm() : openNewForm()}
                className="btn-primary">
                {showForm ? 'Cancel' : '+ New Type'}
              </button>
            </div>
          </div>

          {showForm ? (
            /* ── 입력/수정 폼 ── */
            <div className="card p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">
                {editingId ? 'Edit Type' : 'New Type'}
              </h3>
              {error && <div className="alert-error mb-4">{error}</div>}
              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1줄: Code, Name, Description */}
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Code *</label>
                    <input name="type_code" required value={form.type_code} onChange={handleChange}
                      placeholder="e.g. PO"
                      disabled={!!editingId}
                      className="input w-full disabled:bg-gray-100 disabled:text-gray-500" />
                  </div>
                  <div>
                    <label className="label">Name *</label>
                    <input name="type_name" required value={form.type_name} onChange={handleChange}
                      placeholder="e.g. Purchase Order"
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Description</label>
                    <input name="description" value={form.description} onChange={handleChange}
                      className="input w-full" />
                  </div>
                </div>

                {/* 2줄: Data Linkage + Approver Required */}
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Data Linkage</span>
                    <label className="flex items-center gap-1 cursor-pointer ml-2">
                      <input type="radio" name="link_radio"
                        checked={form.link_enabled === true}
                        onChange={() => setForm({ ...form, link_enabled: true })}
                        className="accent-primary-500" />
                      <span className={`text-sm ${form.link_enabled ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>Linked</span>
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer">
                      <input type="radio" name="link_radio"
                        checked={form.link_enabled === false}
                        onChange={() => { setForm({ ...form, link_enabled: false }); setDetails([]); }}
                        className="accent-primary-500" />
                      <span className={`text-sm ${!form.link_enabled ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>Not Linked</span>
                    </label>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox"
                      checked={form.requires_approver}
                      onChange={(e) => setForm({ ...form, requires_approver: e.target.checked })}
                      className="accent-primary-500 rounded" />
                    <span className="text-sm font-medium text-gray-700">Approver Required</span>
                  </label>
                </div>

                {/* 3줄: Linked 선택 시 상세 내역 테이블 */}
                {form.link_enabled && (
                  <div className="border border-gray-200 rounded-xl p-4 bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold text-gray-700">Linkage Details</h4>
                      <button type="button" onClick={addDetail}
                        className="text-sm text-blue-600 hover:text-blue-700">+ Add Row</button>
                    </div>
                    {details.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 text-sm">
                        No linkage details. Click &quot;+ Add Row&quot; to add.
                      </div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-200">
                            <th className="text-left py-2 w-8">#</th>
                            <th className="text-left py-2">Linkage No</th>
                            <th className="text-left py-2">Vendor</th>
                            <th className="text-right py-2 w-40">Amount</th>
                            <th className="text-right py-2 w-32">Invoiced</th>
                            <th className="text-right py-2 w-32">Remaining</th>
                            <th className="w-8"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {details.map((d, i) => (
                            <tr key={i} className="border-b border-gray-100">
                              <td className="py-2 text-gray-500">{i + 1}</td>
                              <td className="py-2 pr-2">
                                <input value={d.linkage_no}
                                  onChange={(e) => updateDetail(i, 'linkage_no', e.target.value)}
                                  placeholder="e.g. PO-2026-001"
                                  className={`input w-full ${isDuplicateLinkageNo(i) ? 'border-red-500 bg-red-50' : ''}`} />
                                {isDuplicateLinkageNo(i) && (
                                  <span className="text-xs text-red-500">Duplicate</span>
                                )}
                              </td>
                              <td className="py-2 pr-2">
                                <select value={d.vendor_id}
                                  onChange={(e) => updateDetail(i, 'vendor_id', e.target.value)}
                                  className="input w-full">
                                  <option value="">Select vendor...</option>
                                  {vendors.map(v => (
                                    <option key={v.id} value={v.id}>{v.company_name} ({v.vendor_code})</option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 pr-2">
                                <input type="number" step="0.01" min="0" value={d.amount}
                                  onChange={(e) => updateDetail(i, 'amount', e.target.value)}
                                  placeholder="0.00"
                                  className="input w-full text-right" />
                              </td>
                              <td className="py-2 text-right font-mono text-gray-500">
                                {fmt(d.amount_invoiced ?? 0)}
                              </td>
                              <td className="py-2 text-right font-mono text-gray-500">
                                {fmt(d.amount_remaining ?? 0)}
                              </td>
                              <td className="py-2 text-center">
                                <button type="button" onClick={() => removeDetail(i)}
                                  className="text-red-400 hover:text-red-600 text-xs">X</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t-2 border-gray-300">
                            <td colSpan={3} className="py-2 text-right font-semibold text-gray-700">Total:</td>
                            <td className="py-2 text-right font-mono font-semibold">{fmt(totalAmount)}</td>
                            <td colSpan={2}></td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    )}
                  </div>
                )}

                {/* Save 버튼 */}
                <div className="flex justify-end">
                  <button type="submit" disabled={saving || hasDuplicateLinkageNo} className="btn-primary disabled:opacity-50">
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* ── 테이블 목록 ── */
            <div className="card overflow-hidden">
              {loading ? (
                <div className="loading-state">Loading...</div>
              ) : types.length === 0 ? (
                <div className="empty-state">No invoice types found. Click &quot;Seed 6 Defaults&quot; to create standard types.</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>
                      <th className="table-th text-center w-16"></th>
                      <th className="table-th text-left">Code</th>
                      <th className="table-th text-left">Name</th>
                      <th className="table-th text-left">Description</th>
                      <th className="table-th text-center">Data Linkage</th>
                      <th className="table-th text-center">Approver Req</th>
                      <th className="table-th text-center w-16"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {types.map((t) => {
                      const ls = getLinkSetting(t.id);
                      const linkEnabled = ls?.link_enabled ?? false;

                      return (
                        <tr key={t.id} className="table-row">
                          <td className="table-td text-center">
                            <button onClick={() => openEditForm(t)}
                              className="text-xs text-primary-600 hover:text-primary-700 font-medium">Edit</button>
                          </td>
                          <td className="table-td font-mono text-xs font-medium">{t.type_code}</td>
                          <td className="table-td font-medium text-gray-800">{t.type_name}</td>
                          <td className="table-td text-gray-600 text-xs">{t.description || '—'}</td>
                          <td className="table-td text-center">
                            {linkEnabled ? (
                              <span className="badge-green">Linked</span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="table-td text-center">{t.requires_approver ? '✓' : '—'}</td>
                          <td className="table-td text-center">
                            <button onClick={() => handleDelete(t)}
                              className="text-xs text-red-400 hover:text-red-600">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
