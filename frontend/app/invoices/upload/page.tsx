'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Vendor, VendorListResponse } from '@/types';
import RequireRole from '@/components/common/RequireRole';

interface LineItem {
  line_number: number;
  description: string;
  quantity: string;
  unit_price: string;
}

export default function InvoiceUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<{ id: string; type_code: string; type_name: string }[]>([]);
  const [uploadedFilePath, setUploadedFilePath] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [extracted, setExtracted] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const [form, setForm] = useState({
    vendor_id: '',
    invoice_type_id: '',
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    po_number: '',
    currency_original: 'USD',
    notes: '',
  });

  const [lines, setLines] = useState<LineItem[]>([
    { line_number: 1, description: '', quantity: '1', unit_price: '0' },
  ]);

  useEffect(() => {
    api.get<VendorListResponse>('/api/v1/vendors', { params: { limit: 100, status: 'ACTIVE' } })
      .then(({ data }) => setVendors(data.items)).catch(() => {});
    api.get('/api/v1/invoice-types', { params: { limit: 100 } })
      .then(({ data }) => setInvoiceTypes(data.items)).catch(() => {});
  }, []);

  const handleFileSelect = async (file: File) => {
    const allowed = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Unsupported file type: ${ext}. Allowed: PDF, JPG, PNG`);
      return;
    }

    setExtracting(true);
    setError('');
    setUploadedFileName(file.name);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/api/v1/invoices/extract', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        timeout: 120000,
      });

      setUploadedFilePath(data.file_path);
      const extracted = data.extracted;

      // Auto-fill form from extracted data
      const matchedVendor = vendors.find(
        v => v.company_name.toLowerCase() === (extracted.vendor_name || '').toLowerCase()
      );

      setForm(prev => ({
        ...prev,
        vendor_id: matchedVendor?.id || prev.vendor_id,
        invoice_number: extracted.invoice_number || '',
        invoice_date: extracted.invoice_date || '',
        due_date: extracted.due_date || '',
        po_number: extracted.po_number || '',
        currency_original: extracted.currency || 'USD',
      }));

      // Auto-fill line items
      if (extracted.line_items && extracted.line_items.length > 0) {
        setLines(extracted.line_items.map((li: { description?: string; quantity?: number; unit_price?: number; amount?: number }, i: number) => ({
          line_number: i + 1,
          description: li.description || '',
          quantity: String(li.quantity || 1),
          unit_price: String(li.unit_price || li.amount || 0),
        })));
      }

      setExtracted(true);

      // Duplicate check
      if (extracted.invoice_number) {
        try {
          const { data: dup } = await api.get('/api/v1/invoices/check-duplicate', {
            params: { invoice_number: extracted.invoice_number },
          });
          if (dup.duplicate) {
            setError(`Warning: Invoice "${extracted.invoice_number}" already exists (Status: ${dup.existing_status}). Creating will result in a duplicate.`);
          }
        } catch { /* ignore */ }
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setExtracting(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleLineChange = (index: number, field: string, value: string) => {
    const updated = [...lines];
    updated[index] = { ...updated[index], [field]: value };
    setLines(updated);
  };

  const addLine = () => {
    setLines([...lines, { line_number: lines.length + 1, description: '', quantity: '1', unit_price: '0' }]);
  };

  const removeLine = (index: number) => {
    if (lines.length <= 1) return;
    setLines(lines.filter((_, i) => i !== index).map((l, i) => ({ ...l, line_number: i + 1 })));
  };

  const lineTotal = (l: LineItem) => (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
  const total = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

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

      const invoiceRes = await api.post('/api/v1/invoices', {
        company_id: companyId,
        vendor_id: form.vendor_id,
        invoice_type_id: form.invoice_type_id,
        invoice_number: form.invoice_number || null,
        invoice_date: form.invoice_date || null,
        due_date: form.due_date || null,
        po_number: form.po_number || null,
        currency_original: form.currency_original,
        source_channel: 'UPLOAD',
        notes: form.notes || null,
        lines: lines.map(l => ({
          line_number: l.line_number,
          description: l.description || null,
          quantity: parseFloat(l.quantity),
          unit_price: parseFloat(l.unit_price),
          tax_amount: 0,
        })),
      });

      if (uploadedFilePath) {
        await api.patch(`/api/v1/invoices/${invoiceRes.data.id}`, {
          notes: form.notes ? `${form.notes}\n[File: ${uploadedFileName}]` : `[File: ${uploadedFileName}]`,
        });
      }

      router.push('/invoices');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT']}>
          <div className="max-w-4xl">
            <h2 className="page-title mb-6">New Invoice (Upload)</h2>
            {error && <div className={error.startsWith('Warning') ? 'alert-warning mb-4' : 'alert-error mb-4'}>{error}</div>}

            {!extracted && (
              <div
                className={`card p-12 mb-6 border-2 border-dashed text-center cursor-pointer transition-colors ${
                  dragOver ? 'border-primary-500 bg-primary-50' : 'border-gray-300 hover:border-primary-400'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileSelect(file);
                  }}
                />
                {extracting ? (
                  <div>
                    <div className="animate-spin w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                    <p className="text-gray-700 font-medium">AI is extracting invoice data...</p>
                    <p className="text-sm text-gray-500 mt-1">{uploadedFileName}</p>
                  </div>
                ) : (
                  <div>
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                    </svg>
                    <p className="text-gray-700 font-medium">Drop invoice file here or click to browse</p>
                    <p className="text-sm text-gray-500 mt-1">Supports PDF, JPG, PNG (max 20MB)</p>
                  </div>
                )}
              </div>
            )}

            {extracted && (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="card p-4 mb-2 bg-green-50 border border-green-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                    </svg>
                    <span className="text-sm text-green-800 font-medium">AI extracted data from: {uploadedFileName}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setExtracted(false); setUploadedFilePath(''); setUploadedFileName(''); }}
                    className="text-sm text-green-700 hover:text-green-900 font-medium"
                  >Upload Different File</button>
                </div>

                <div className="card p-6">
                  <h3 className="text-sm font-semibold text-gray-700 mb-4">Invoice Header <span className="text-xs font-normal text-gray-400">(review & correct AI-extracted data)</span></h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="label">Vendor *</label>
                      <select name="vendor_id" required value={form.vendor_id} onChange={handleChange} className="input w-full">
                        <option value="">Select vendor...</option>
                        {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Invoice Type *</label>
                      <select name="invoice_type_id" required value={form.invoice_type_id} onChange={handleChange} className="input w-full">
                        <option value="">Select type...</option>
                        {invoiceTypes.map(t => <option key={t.id} value={t.id}>{t.type_name} ({t.type_code})</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="label">Invoice # *</label>
                      <input name="invoice_number" required value={form.invoice_number} onChange={handleChange} className="input w-full" />
                    </div>
                    <div>
                      <label className="label">Invoice Date</label>
                      <input name="invoice_date" type="date" value={form.invoice_date} onChange={handleChange} className="input w-full" />
                    </div>
                    <div>
                      <label className="label">Due Date</label>
                      <input name="due_date" type="date" value={form.due_date} onChange={handleChange} className="input w-full" />
                    </div>
                    <div>
                      <label className="label">Linkage No</label>
                      <input name="po_number" value={form.po_number} onChange={handleChange} className="input w-full" />
                    </div>
                  </div>
                </div>

                <div className="card p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                    <button type="button" onClick={addLine} className="text-sm text-primary-600 hover:text-primary-700">+ Add Line</button>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-primary-100/40">
                        <th className="text-left py-2 w-8">#</th>
                        <th className="text-left py-2">Description</th>
                        <th className="text-right py-2 w-20">Qty</th>
                        <th className="text-right py-2 w-28">Unit Price</th>
                        <th className="text-right py-2 w-28">Amount</th>
                        <th className="w-8"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line, i) => (
                        <tr key={i} className="border-b border-primary-100/40">
                          <td className="py-2 text-gray-500">{line.line_number}</td>
                          <td className="py-2 pr-2">
                            <input value={line.description} onChange={(e) => handleLineChange(i, 'description', e.target.value)} className="input w-full py-1" />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" step="0.01" min="0.01" value={line.quantity} onChange={(e) => handleLineChange(i, 'quantity', e.target.value)} className="input w-full py-1 text-right" />
                          </td>
                          <td className="py-2 pr-2">
                            <input type="number" step="0.01" min="0" value={line.unit_price} onChange={(e) => handleLineChange(i, 'unit_price', e.target.value)} className="input w-full py-1 text-right" />
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
                      <tr className="border-t-2 border-primary-100/40">
                        <td colSpan={4} className="py-2 text-right font-semibold text-gray-700">Total:</td>
                        <td className="py-2 text-right font-mono font-bold text-lg">{fmt(total)}</td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                <div className="flex gap-3">
                  <button type="submit" disabled={loading} className="btn-primary disabled:opacity-50">
                    {loading ? 'Creating...' : 'Create Invoice'}
                  </button>
                  <button type="button" onClick={() => router.push('/invoices')} className="btn-secondary">Cancel</button>
                </div>
              </form>
            )}
          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
