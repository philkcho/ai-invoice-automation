'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Invoice } from '@/types';
import RequireRole from '@/components/common/RequireRole';

const STATUS_COLORS: Record<string, string> = {
  RECEIVED: 'badge-gray',
  OCR_REVIEW: 'badge-yellow',
  PENDING: 'badge-blue',
  SUBMITTED: 'badge-indigo',
  REVIEW_NEEDED: 'badge-orange',
  IN_APPROVAL: 'badge-purple',
  APPROVED: 'badge-green',
  REJECTED: 'badge-red',
  SCHEDULED: 'badge-cyan',
  PAID: 'badge-green',
  VOID: 'badge-gray',
};

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

  if (loading) return <div className="loading-state min-h-screen flex items-center justify-center">Loading...</div>;
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Invoice not found'}</div>;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT']}>
          <div className="max-w-4xl">
            <div className="page-header">
              <div>
                <h2 className="page-title">Invoice: {invoice.invoice_number || 'Draft'}</h2>
                <div className="flex gap-2 mt-1">
                  <span className={STATUS_COLORS[invoice.status] || 'badge-blue'}>{invoice.status}</span>
                  {invoice.validation_status && (
                    <span className={
                      invoice.validation_status === 'PASS' ? 'badge-green' :
                      invoice.validation_status === 'FAIL' ? 'badge-red' : 'badge-yellow'
                    }>{invoice.validation_status}</span>
                  )}
                  {invoice.ocr_status && (
                    <span className="badge-gray">OCR: {invoice.ocr_status}</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                {['PENDING', 'REVIEW_NEEDED'].includes(invoice.status) && (
                  <>
                    <button onClick={handleValidate} disabled={validating}
                      className="btn bg-amber-100 text-amber-700 border border-amber-200 hover:bg-amber-200 focus:ring-amber-300 disabled:opacity-50">
                      {validating ? 'Validating...' : 'Run Validation'}
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                      className="btn-success disabled:opacity-50">
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {error && <div className="alert-error">{error}</div>}

            {/* Invoice Info */}
            <div className="card p-6 mb-4">
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
              <div className="card p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Upload Invoice File</h3>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload}
                  className="text-sm text-gray-600" />
              </div>
            )}
            {invoice.file_path && (
              <div className="card p-4 mb-4">
                <span className="text-sm text-gray-500">File:</span>
                <span className="text-sm font-mono ml-2">{invoice.file_path}</span>
              </div>
            )}

            {/* Line Items */}
            <div className="card overflow-hidden mb-4">
              <div className="table-header">
                <h3 className="text-sm font-semibold text-gray-700">Line Items ({invoice.line_items.length})</h3>
              </div>
              {invoice.line_items.length === 0 ? (
                <div className="empty-state">No line items</div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="table-header">
                    <tr>
                      <th className="table-th text-left">#</th>
                      <th className="table-th text-left">Description</th>
                      <th className="table-th text-right">Qty</th>
                      <th className="table-th text-right">Unit Price</th>
                      <th className="table-th text-right">Tax</th>
                      <th className="table-th text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.line_items.map((li) => (
                      <tr key={li.id} className="table-row">
                        <td className="table-td text-gray-500">{li.line_number}</td>
                        <td className="table-td">{li.description || '—'}</td>
                        <td className="table-td text-right font-mono">{li.quantity}</td>
                        <td className="table-td text-right font-mono">{fmt(li.unit_price)}</td>
                        <td className="table-td text-right font-mono">{fmt(li.tax_amount)}</td>
                        <td className="table-td text-right font-mono font-medium">{fmt(li.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Validation Result */}
            {validationResult && (
              <div className="card p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">
                  Validation Result: <span className={
                    (validationResult as { overall: string }).overall === 'PASS' ? 'text-green-600' :
                    (validationResult as { overall: string }).overall === 'FAIL' ? 'text-red-600' : 'text-yellow-600'
                  }>{(validationResult as { overall: string }).overall}</span>
                </h3>
                {((validationResult as { results: Array<{ layer: string; rule_name: string; condition_name: string; result: string; reason: string }> }).results || []).map((r, i) => (
                  <div key={i} className={`text-sm p-2 rounded mb-1 ${
                    r.result === 'FAIL' ? 'badge-red' :
                    r.result === 'WARNING' ? 'badge-yellow' : 'badge-green'
                  }`}>
                    <span className="font-mono text-xs mr-2">[{r.layer}]</span>
                    <span className="font-medium">{r.rule_name}</span>: {r.reason}
                  </div>
                ))}
              </div>
            )}

            <button onClick={() => router.push('/invoices')}
              className="btn-secondary">Back to List</button>
          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
