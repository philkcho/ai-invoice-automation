'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Invoice } from '@/types';
import RequireRole from '@/components/common/RequireRole';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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

const EDITABLE_STATUSES = ['PENDING', 'REVIEW_NEEDED', 'RECEIVED', 'OCR_REVIEW', 'REJECTED'];

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [validating, setValidating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editSalesTax, setEditSalesTax] = useState('0');
  const [validationResult, setValidationResult] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState('');

  // Edit form state
  const [editForm, setEditForm] = useState({
    invoice_number: '',
    invoice_date: '',
    due_date: '',
    po_number: '',
    notes: '',
  });
  const [editLines, setEditLines] = useState<{ line_number: number; description: string; quantity: string; unit_price: string }[]>([]);

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

  const startEditing = () => {
    if (!invoice) return;
    setEditForm({
      invoice_number: invoice.invoice_number || '',
      invoice_date: invoice.invoice_date || '',
      due_date: invoice.due_date || '',
      po_number: invoice.po_number || '',
      notes: invoice.notes || '',
    });
    setEditLines(invoice.line_items.map(li => ({
      line_number: li.line_number,
      description: li.description || '',
      quantity: String(li.quantity),
      unit_price: String(li.unit_price),
    })));
    setEditSalesTax(String(invoice.amount_tax || 0));
    setEditing(true);
    setError('');
  };

  const cancelEditing = () => {
    setEditing(false);
    setError('');
  };

  const handleSave = async () => {
    if (!invoice) return;
    setSaving(true);
    setError('');
    try {
      await api.patch(`/api/v1/invoices/${id}`, {
        invoice_number: editForm.invoice_number,
        invoice_date: editForm.invoice_date || null,
        due_date: editForm.due_date || null,
        po_number: editForm.po_number || null,
        notes: editForm.notes || null,
        lines: editLines.map((l, i) => ({
          line_number: l.line_number,
          description: l.description || null,
          quantity: parseFloat(l.quantity) || 1,
          unit_price: parseFloat(l.unit_price) || 0,
          tax_amount: i === 0 ? editTaxAmount : 0,
        })),
      });

      setEditing(false);
      await fetchInvoice();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

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

  const handleDelete = async () => {
    if (!confirm('Delete this invoice?')) return;
    try {
      await api.delete(`/api/v1/invoices/${id}`);
      router.push('/invoices');
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

  const editLineTotal = (l: { quantity: string; unit_price: string }) =>
    (parseFloat(l.quantity) || 0) * (parseFloat(l.unit_price) || 0);
  const editSubtotal = editLines.reduce((sum, l) => sum + editLineTotal(l), 0);
  const editTaxAmount = parseFloat(editSalesTax) || 0;
  const editTotal = editSubtotal + editTaxAmount;

  if (loading) return <div className="loading-state min-h-screen flex items-center justify-center">Loading...</div>;
  if (!invoice) return <div className="min-h-screen flex items-center justify-center text-red-500">{error || 'Invoice not found'}</div>;

  const canEdit = EDITABLE_STATUSES.includes(invoice.status);

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
                <button onClick={() => router.push('/invoices')}
                  className="btn-secondary">Back to List</button>
                {canEdit && !editing && (
                  <>
                    <button onClick={startEditing} className="btn-secondary">Edit</button>
                    <button onClick={handleDelete} className="btn-secondary text-red-500 hover:text-red-700">Delete</button>
                  </>
                )}
                {editing && (
                  <>
                    <button onClick={cancelEditing} className="btn-secondary">Cancel</button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary disabled:opacity-50">
                      {saving ? 'Saving...' : 'Save'}
                    </button>
                  </>
                )}
                {canEdit && !editing && (
                  <>
                    <button onClick={handleValidate} disabled={validating}
                      className="btn-secondary disabled:opacity-50">
                      {validating ? 'Validating...' : 'Run Validation'}
                    </button>
                    <button onClick={handleSubmit} disabled={submitting}
                      className="btn-primary disabled:opacity-50">
                      {submitting ? 'Submitting...' : 'Submit'}
                    </button>
                  </>
                )}
              </div>
            </div>

            {error && <div className="alert-error">{error}</div>}

            {/* Invoice Info - View Mode */}
            {!editing && (
              <div className="card p-6 mb-4">
                <div className="grid grid-cols-4 gap-4 text-sm">
                  <div><span className="text-gray-500">Date:</span> <span className="font-medium">{invoice.invoice_date || '—'}</span></div>
                  <div><span className="text-gray-500">Due:</span> <span className="font-medium">{invoice.due_date || '—'}</span></div>
                  <div><span className="text-gray-500">Linkage No:</span> <span className="font-medium">{invoice.po_number || '—'}</span></div>
                  <div><span className="text-gray-500">Source:</span> <span className="font-medium">{invoice.source_channel}</span></div>
                  <div><span className="text-gray-500">Subtotal:</span> <span className="font-mono">{fmt(invoice.amount_subtotal)}</span></div>
                  <div><span className="text-gray-500">Tax:</span> <span className="font-mono">{fmt(invoice.amount_tax)}</span></div>
                  <div className="col-span-2"><span className="text-gray-500">Total:</span> <span className="font-mono font-bold text-lg">{fmt(invoice.amount_total)}</span></div>
                </div>
              </div>
            )}

            {/* Invoice Info - Edit Mode */}
            {editing && (
              <div className="card p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Invoice Header</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="label">Invoice # *</label>
                    <input value={editForm.invoice_number}
                      onChange={(e) => setEditForm({ ...editForm, invoice_number: e.target.value })}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Invoice Date</label>
                    <input type="date" value={editForm.invoice_date}
                      onChange={(e) => setEditForm({ ...editForm, invoice_date: e.target.value })}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Due Date</label>
                    <input type="date" value={editForm.due_date}
                      onChange={(e) => setEditForm({ ...editForm, due_date: e.target.value })}
                      className="input w-full" />
                  </div>
                  <div>
                    <label className="label">Linkage No</label>
                    <input value={editForm.po_number}
                      onChange={(e) => setEditForm({ ...editForm, po_number: e.target.value })}
                      className="input w-full" />
                  </div>
                  <div className="col-span-2">
                    <label className="label">Notes</label>
                    <input value={editForm.notes}
                      onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                      className="input w-full" />
                  </div>
                </div>
              </div>
            )}

            {/* Line Items - View Mode */}
            {!editing && (
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
            )}

            {/* Line Items - Edit Mode */}
            {editing && (
              <div className="card p-6 mb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
                  <button type="button" onClick={() => setEditLines([...editLines, {
                    line_number: editLines.length + 1, description: '', quantity: '1', unit_price: '0'
                  }])} className="text-sm text-primary-600 hover:text-primary-700">+ Add Line</button>
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
                    {editLines.map((line, i) => (
                      <tr key={i} className="border-b border-primary-100/40">
                        <td className="py-2 text-gray-500">{line.line_number}</td>
                        <td className="py-2 pr-2">
                          <input value={line.description} onChange={(e) => {
                            const u = [...editLines]; u[i] = { ...u[i], description: e.target.value }; setEditLines(u);
                          }} className="input w-full py-1" />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" step="0.01" min="0.01" value={line.quantity} onChange={(e) => {
                            const u = [...editLines]; u[i] = { ...u[i], quantity: e.target.value }; setEditLines(u);
                          }} className="input w-full py-1 text-right" />
                        </td>
                        <td className="py-2 pr-2">
                          <input type="number" step="0.01" min="0" value={line.unit_price} onChange={(e) => {
                            const u = [...editLines]; u[i] = { ...u[i], unit_price: e.target.value }; setEditLines(u);
                          }} className="input w-full py-1 text-right" />
                        </td>
                        <td className="py-2 text-right font-mono">{fmt(editLineTotal(line))}</td>
                        <td className="py-2 text-center">
                          {editLines.length > 1 && (
                            <button type="button" onClick={() => {
                              setEditLines(editLines.filter((_, idx) => idx !== i).map((l, idx) => ({ ...l, line_number: idx + 1 })));
                            }} className="text-red-400 hover:text-red-600 text-xs">X</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-primary-100/40">
                      <td colSpan={4} className="py-2 text-right text-gray-600">Subtotal:</td>
                      <td className="py-2 text-right font-mono">{fmt(editSubtotal)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="py-1 text-right text-gray-600">Sales Tax:</td>
                      <td className="py-1">
                        <input type="number" step="0.01" min="0" value={editSalesTax}
                          onChange={(e) => setEditSalesTax(e.target.value)}
                          className="input w-full py-1 text-right" />
                      </td>
                      <td className="py-1 text-right font-mono">{fmt(editTaxAmount)}</td>
                      <td></td>
                    </tr>
                    <tr>
                      <td colSpan={4} className="py-1 text-right font-semibold text-gray-700">Total:</td>
                      <td className="py-1 text-right font-mono font-bold text-lg">{fmt(editTotal)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* File */}
            {!invoice.file_path && (
              <div className="card p-6 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Attachment</h3>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={handleUpload}
                  className="text-sm text-gray-600" />
              </div>
            )}
            {invoice.file_path && (
              <div className="card p-4 mb-4 flex items-center gap-3">
                <svg className="w-5 h-5 text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13" />
                </svg>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const res = await api.get(`/api/v1/invoices/media/${invoice.file_path}`, { responseType: 'blob' });
                      const url = URL.createObjectURL(res.data);
                      window.open(url, '_blank');
                    } catch { window.open(`${API_BASE_URL}/api/v1/invoices/media/${invoice.file_path}`, '_blank'); }
                  }}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium underline cursor-pointer"
                >
                  {invoice.file_path.split('/').pop()}
                </button>
                <span className="text-xs text-gray-400 font-mono">{invoice.file_path}</span>
              </div>
            )}

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

          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
