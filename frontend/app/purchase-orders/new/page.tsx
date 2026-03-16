'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Vendor, VendorListResponse } from '@/types';

interface LineItem {
  line_number: number;
  description: string;
  quantity: string;
  unit_price: string;
  category: string;
}

export default function NewPurchaseOrderPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);

  const [form, setForm] = useState({
    vendor_id: '',
    po_number: '',
    po_date: new Date().toISOString().split('T')[0],
    description: '',
    notes: '',
  });

  const [lines, setLines] = useState<LineItem[]>([
    { line_number: 1, description: '', quantity: '1', unit_price: '0', category: '' },
  ]);

  useEffect(() => {
    api.get<VendorListResponse>('/api/v1/vendors', { params: { limit: 100, status: 'ACTIVE' } })
      .then(({ data }) => setVendors(data.items));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLineChange = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const addLine = () => {
    setLines([...lines, {
      line_number: lines.length + 1,
      description: '', quantity: '1', unit_price: '0', category: '',
    }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    const updated = lines.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_number: i + 1 }));
    setLines(updated);
  };

  const lineTotal = (l: LineItem) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
  const grandTotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // company_id는 백엔드에서 현재 사용자의 company_id를 사용
      // Super Admin의 경우 첫 번째 회사 사용 (임시)
      const meRes = await api.get<{ company_id: string | null }>('/api/v1/users/me');
      let selectedCompanyId = meRes.data.company_id;

      if (!selectedCompanyId) {
        // Super Admin: 회사 목록에서 첫 번째 사용
        const compRes = await api.get<{ items: { id: string }[] }>('/api/v1/companies', { params: { limit: 1 } });
        if (compRes.data.items.length === 0) {
          setError('No company found. Please create a company first.');
          setLoading(false);
          return;
        }
        selectedCompanyId = compRes.data.items[0].id;
      }

      const payload = {
        company_id: selectedCompanyId,
        vendor_id: form.vendor_id,
        po_number: form.po_number,
        po_date: form.po_date,
        description: form.description || null,
        notes: form.notes || null,
        lines: lines.map(l => ({
          line_number: l.line_number,
          description: l.description || null,
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
          category: l.category || null,
        })),
      };

      await api.post('/api/v1/purchase-orders', payload);
      router.push('/purchase-orders');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="max-w-4xl">
            <h2 className="text-xl font-semibold text-gray-800 mb-6">New Purchase Order</h2>

            {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Header */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">PO Header</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">PO Number *</label>
                    <input name="po_number" required value={form.po_number} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">PO Date *</label>
                    <input name="po_date" type="date" required value={form.po_date} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                    <select name="vendor_id" required value={form.vendor_id} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      <option value="">Select vendor...</option>
                      {vendors.map(v => (
                        <option key={v.id} value={v.id}>{v.company_name} ({v.vendor_code})</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm text-gray-600 mb-1">Description</label>
                    <input name="description" value={form.description} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              {/* Line Items */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                  <button type="button" onClick={addLine}
                    className="text-sm text-blue-600 hover:text-blue-700">+ Add Line</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 w-8">#</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2 w-24">Qty</th>
                      <th className="text-right py-2 w-32">Unit Price</th>
                      <th className="text-right py-2 w-32">Amount</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="py-2 text-gray-500">{line.line_number}</td>
                        <td className="py-2 pr-2">
                          <input value={line.description} onChange={(e) => handleLineChange(i, 'description', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm" />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" step="0.01" min="0.01" value={line.quantity}
                            onChange={(e) => handleLineChange(i, 'quantity', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" step="0.01" min="0" value={line.unit_price}
                            onChange={(e) => handleLineChange(i, 'unit_price', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right" />
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
                      <td colSpan={4} className="py-3 text-right font-semibold text-gray-700">Total:</td>
                      <td className="py-3 text-right font-mono font-semibold">{fmt(grandTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm transition-colors">
                  {loading ? 'Creating...' : 'Create PO'}
                </button>
                <button type="button" onClick={() => router.push('/purchase-orders')}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 text-sm transition-colors">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
