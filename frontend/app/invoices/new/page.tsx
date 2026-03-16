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
  tax_amount: string;
}

export default function NewInvoicePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<{ id: string; type_code: string; type_name: string }[]>([]);

  const [form, setForm] = useState({
    vendor_id: '',
    invoice_type_id: '',
    invoice_number: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    po_number: '',
    currency_original: 'USD',
    notes: '',
  });

  const [lines, setLines] = useState<LineItem[]>([
    { line_number: 1, description: '', quantity: '1', unit_price: '0', tax_amount: '0' },
  ]);

  useEffect(() => {
    api.get<VendorListResponse>('/api/v1/vendors', { params: { limit: 100, status: 'ACTIVE' } })
      .then(({ data }) => setVendors(data.items)).catch(() => {});
    api.get('/api/v1/invoice-types', { params: { limit: 100 } })
      .then(({ data }) => setInvoiceTypes(data.items)).catch(() => {});
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const addLine = () => {
    setLines([...lines, { line_number: lines.length + 1, description: '', quantity: '1', unit_price: '0', tax_amount: '0' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_number: i + 1 })));
  };

  const lineTotal = (l: LineItem) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
  const subtotal = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const taxTotal = lines.reduce((sum, l) => sum + (parseFloat(l.tax_amount) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const meRes = await api.get<{ company_id: string | null }>('/api/v1/users/me');
      let companyId = meRes.data.company_id;
      if (!companyId) {
        const compRes = await api.get<{ items: { id: string }[] }>('/api/v1/companies', { params: { limit: 1 } });
        if (compRes.data.items.length === 0) { setError('No company found.'); setLoading(false); return; }
        companyId = compRes.data.items[0].id;
      }

      await api.post('/api/v1/invoices', {
        company_id: companyId,
        vendor_id: form.vendor_id,
        invoice_type_id: form.invoice_type_id,
        invoice_number: form.invoice_number || null,
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        po_number: form.po_number || null,
        currency_original: form.currency_original,
        source_channel: 'MANUAL',
        notes: form.notes || null,
        lines: lines.map(l => ({
          line_number: l.line_number,
          description: l.description || null,
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
          tax_amount: parseFloat(l.tax_amount) || 0,
        })),
      });
      router.push('/invoices');
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
            <h2 className="text-xl font-semibold text-gray-800 mb-6">New Invoice (Manual Entry)</h2>
            {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Invoice Header</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Vendor *</label>
                    <select name="vendor_id" required value={form.vendor_id} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      <option value="">Select vendor...</option>
                      {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Invoice Type *</label>
                    <select name="invoice_type_id" required value={form.invoice_type_id} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm">
                      <option value="">Select type...</option>
                      {invoiceTypes.map(t => <option key={t.id} value={t.id}>{t.type_name} ({t.type_code})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Invoice #</label>
                    <input name="invoice_number" value={form.invoice_number} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Invoice Date</label>
                    <input name="invoice_date" type="date" value={form.invoice_date} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">Due Date</label>
                    <input name="due_date" type="date" value={form.due_date} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-1">PO #</label>
                    <input name="po_number" value={form.po_number} onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                  <button type="button" onClick={addLine} className="text-sm text-blue-600 hover:text-blue-700">+ Add Line</button>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 w-8">#</th>
                      <th className="text-left py-2">Description</th>
                      <th className="text-right py-2 w-20">Qty</th>
                      <th className="text-right py-2 w-28">Unit Price</th>
                      <th className="text-right py-2 w-24">Tax</th>
                      <th className="text-right py-2 w-28">Amount</th>
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
                        <td className="py-2 pr-2">
                          <input type="number" step="0.01" min="0" value={line.tax_amount}
                            onChange={(e) => handleLineChange(i, 'tax_amount', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm text-right" />
                        </td>
                        <td className="py-2 text-right font-mono">{fmt(lineTotal(line))}</td>
                        <td className="py-2 text-center">
                          {lines.length > 1 && (
                            <button type="button" onClick={() => removeLine(i)} className="text-red-400 hover:text-red-600 text-xs">X</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-gray-300">
                      <td colSpan={4} className="py-2 text-right text-gray-600">Subtotal:</td>
                      <td className="py-2 text-right text-gray-600 font-mono">{fmt(subtotal)}</td>
                      <td></td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="py-1 text-right text-gray-600">Tax:</td>
                      <td className="py-1 text-right text-gray-600 font-mono">{fmt(taxTotal)}</td>
                      <td></td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={5} className="py-1 text-right font-semibold text-gray-700">Total:</td>
                      <td className="py-1 text-right font-mono font-bold text-lg">{fmt(subtotal + taxTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex gap-3">
                <button type="submit" disabled={loading}
                  className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm">
                  {loading ? 'Creating...' : 'Create Invoice'}
                </button>
                <button type="button" onClick={() => router.push('/invoices')}
                  className="bg-gray-100 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-200 text-sm">Cancel</button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
