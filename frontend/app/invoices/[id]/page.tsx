'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Invoice } from '@/types';

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  const fetchInvoice = async () => {
    try {
      const { data } = await api.get<Invoice>(`/api/v1/invoices/${id}`);
      setInvoice(data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchInvoice(); }, [id]);

  const handleValidate = async () => {
    setValidating(true);
    try {
      const { data } = await api.post(`/api/v1/invoices/${id}/validate`);
      setValidationResult(data);
      fetchInvoice();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await api.post(`/api/v1/invoices/${id}/submit`);
      fetchInvoice();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post(`/api/v1/invoices/${id}/upload`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      fetchInvoice();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-500">Loading...</div>;
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Invoice not found'}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <div className="max-w-4xl">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Invoice: {invoice.invoice_number || 'Draft'}</h2>
                <div className="flex gap-2 mt-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">{invoice.status}</span>
                  {invoice.validation_status && (
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      invoice.validation_status === 'PASS' ? 'bg-green-50 text-green-700' :
                      invoice.validation_status === 'FAIL' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
                    }`}>{invoice.validation_status}</span>
                  )}
                  {invoice.ocr_status && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">OCR: {invoice.ocr_status}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {['PENDING', 'REVIEW_NEEDED'].includes(invoice.status) && (
                  <>
                    <button onClick={handleValidate} disabled={validating}
                      className="bg-yellow-500 text-white px-4 py-2 rounded-md hover:bg-yellow-600 disabled:opacity-50 text-sm">
                      {validating ? 'Validating...' : 'Run Validation'}
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 text-sm">
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>}

            {/* Invoice Info */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
              <div className="grid grid-cols-4 gap-4 text-sm">
                <div><span className="text-gray-500">Date:</span> <span className="font-medium">{invoice.invoice_date || '—'}</span></div>
                <div><span className="text-gray-500">Due:</span> <span className="font-medium">{invoice.due_date || '—'}</span></div>
                <div><span className="text-gray-500">PO #:</span> <span className="font-medium">{invoice.po_number || '—'}</span></div>
                <div><span className="text-gray-500">Source:</span> <span className="font-medium">{invoice.source_channel}</span></div>
                <div><span className="text-gray-500">Subtotal:</span> <span className="font-mono">{fmt(invoice.amount_subtotal)}</span></div>
                <div><span className="text-gray-500">Tax:</span> <span className="font-mono">{fmt(invoice.amount_tax)}</span></div>
                <div className="col-span-2"><span className="text-gray-500">Total:</span> <span className="font-mono font-bold text-lg">{fmt(invoice.amount_total)}</span></div>
              </div>
            </div>

            {/* File Upload */}
            {!invoice.file_path && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload Invoice File</h3>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload}
                  className="text-sm text-gray-600" />
              </div>
            )}
            {invoice.file_path && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-4">
                <span className="text-sm text-gray-500">File:</span>
                <span className="text-sm font-mono ml-2">{invoice.file_path}</span>
              </div>
            )}

            {/* Line Items */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-4">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h3 className="text-sm font-semibold text-gray-700">Line Items ({invoice.line_items.length})</h3>
              </div>
              {invoice.line_items.length === 0 ? (
                <div className="p-4 text-center text-gray-500 text-sm">No line items</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">#</th>
                      <th className="text-left px-4 py-2 font-medium text-gray-600">Description</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Qty</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Unit Price</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Tax</th>
                      <th className="text-right px-4 py-2 font-medium text-gray-600">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((li) => (
                      <tr key={li.id} className="border-b border-gray-100">
                        <td className="px-4 py-2 text-gray-500">{li.line_number}</td>
                        <td className="px-4 py-2">{li.description || '—'}</td>
                        <td className="px-4 py-2 text-right font-mono">{li.quantity}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(li.unit_price)}</td>
                        <td className="px-4 py-2 text-right font-mono">{fmt(li.tax_amount)}</td>
                        <td className="px-4 py-2 text-right font-mono font-medium">{fmt(li.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Validation Result */}
            {validationResult && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Validation Result: <span className={
                    (validationResult as { overall: string }).overall === 'PASS' ? 'text-green-600' :
                    (validationResult as { overall: string }).overall === 'FAIL' ? 'text-red-600' : 'text-yellow-600'
                  }>{(validationResult as { overall: string }).overall}</span>
                </h3>
                {((validationResult as { results: Array<{ layer: string; rule_name: string; condition_name: string; result: string; reason: string }> }).results || []).map((r, i) => (
                  <div key={i} className={`text-sm p-2 rounded mb-1 ${
                    r.result === 'FAIL' ? 'bg-red-50 text-red-700' :
                    r.result === 'WARNING' ? 'bg-yellow-50 text-yellow-700' : 'bg-green-50 text-green-700'
                  }`}>
                    <span className="font-mono text-xs mr-2">[{r.layer}]</span>
                    <span className="font-medium">{r.rule_name}</span>: {r.reason}
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => router.push('/invoices')}
              className="bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 text-sm">Back to List</button>
          </div>
        </main>
      </div>
    </div>
  );
}
