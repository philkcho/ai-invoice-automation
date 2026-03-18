'use client';

import { useState, useEffect, useRef } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import type { Vendor, VendorListResponse } from '@/types';
import RequireRole from '@/components/common/RequireRole';

interface FileResult {
  fileName: string;
  status: 'pending' | 'extracting' | 'duplicate' | 'created' | 'error';
  invoiceNumber?: string;
  error?: string;
}

const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png'];

export default function InvoiceFilePage() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [results, setResults] = useState<FileResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [invoiceTypes, setInvoiceTypes] = useState<{ id: string; type_code: string; type_name: string }[]>([]);
  const [selectedVendorId, setSelectedVendorId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    api.get<VendorListResponse>('/api/v1/vendors', { params: { limit: 100, status: 'ACTIVE' } })
      .then(({ data }) => setVendors(data.items)).catch(() => {});
    api.get('/api/v1/invoice-types', { params: { limit: 100 } })
      .then(({ data }) => setInvoiceTypes(data.items)).catch(() => {});
  }, []);

  const handleFilesSelected = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return;
    const validFiles = Array.from(selectedFiles).filter(f => {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      return ALLOWED_EXTENSIONS.includes(ext);
    });
    setFiles(validFiles);
    setResults(validFiles.map(f => ({ fileName: f.name, status: 'pending' })));
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFilesSelected(e.dataTransfer.files);
  };

  const handleProcess = async () => {
    if (!selectedVendorId || !selectedTypeId) {
      setError('Please select Vendor and Invoice Type before processing.');
      return;
    }

    setProcessing(true);
    setError('');

    // Get company_id
    let companyId: string;
    try {
      const meRes = await api.get<{ company_id: string | null }>('/api/v1/users/me');
      companyId = meRes.data.company_id || '';
      if (!companyId) {
        const compRes = await api.get<{ items: { id: string }[] }>('/api/v1/companies', { params: { limit: 1 } });
        if (compRes.data.items.length === 0) { setError('No company found.'); setProcessing(false); return; }
        companyId = compRes.data.items[0].id;
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
      setProcessing(false);
      return;
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Update status to extracting
      setResults(prev => prev.map((r, idx) => idx === i ? { ...r, status: 'extracting' } : r));

      try {
        // Extract data with AI
        const formData = new FormData();
        formData.append('file', file);
        const { data } = await api.post('/api/v1/invoices/extract', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000,
        });
        const ext = data.extracted;
        const invoiceNumber = ext.invoice_number || null;

        // Duplicate check
        if (invoiceNumber) {
          const { data: dup } = await api.get('/api/v1/invoices/check-duplicate', {
            params: { invoice_number: invoiceNumber, vendor_id: selectedVendorId },
          });
          if (dup.duplicate) {
            setResults(prev => prev.map((r, idx) =>
              idx === i ? { ...r, status: 'duplicate', invoiceNumber, error: `Already exists (${dup.existing_status})` } : r
            ));
            continue;
          }
        }

        // Build line items
        const lineItems = (ext.line_items || []).map((li: { description?: string; quantity?: number; unit_price?: number; amount?: number }, idx: number) => ({
          line_number: idx + 1,
          description: li.description || null,
          quantity: li.quantity || 1,
          unit_price: li.unit_price || li.amount || 0,
          tax_amount: 0,
        }));

        // Create invoice
        await api.post('/api/v1/invoices', {
          company_id: companyId,
          vendor_id: selectedVendorId,
          invoice_type_id: selectedTypeId,
          invoice_number: invoiceNumber,
          invoice_date: ext.invoice_date || null,
          due_date: ext.due_date || null,
          po_number: ext.po_number || null,
          currency_original: ext.currency || 'USD',
          source_channel: 'UPLOAD',
          notes: `[Batch: ${file.name}]`,
          lines: lineItems.length > 0 ? lineItems : [{
            line_number: 1,
            description: 'Extracted total',
            quantity: 1,
            unit_price: ext.total_amount || ext.subtotal || 0,
            tax_amount: ext.tax_amount || 0,
          }],
        });

        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'created', invoiceNumber: invoiceNumber || '(no number)' } : r
        ));
      } catch (err: unknown) {
        setResults(prev => prev.map((r, idx) =>
          idx === i ? { ...r, status: 'error', error: getErrorMessage(err) } : r
        ));
      }
    }

    setProcessing(false);
  };

  const createdCount = results.filter(r => r.status === 'created').length;
  const dupCount = results.filter(r => r.status === 'duplicate').length;
  const errCount = results.filter(r => r.status === 'error').length;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT']}>
          <div className="max-w-4xl">
            <h2 className="page-title mb-6">New Invoice (File Batch)</h2>
            <p className="text-sm text-gray-500 mb-6">Select multiple invoice files from your PC. AI will extract data and create invoices automatically with duplicate checking.</p>

            {error && <div className="alert-error mb-4">{error}</div>}

            {/* Default settings for batch */}
            <div className="card p-6 mb-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Batch Settings</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Default Vendor *</label>
                  <select value={selectedVendorId} onChange={(e) => setSelectedVendorId(e.target.value)} className="input w-full">
                    <option value="">Select vendor...</option>
                    {vendors.map(v => <option key={v.id} value={v.id}>{v.company_name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Default Invoice Type *</label>
                  <select value={selectedTypeId} onChange={(e) => setSelectedTypeId(e.target.value)} className="input w-full">
                    <option value="">Select type...</option>
                    {invoiceTypes.map(t => <option key={t.id} value={t.id}>{t.type_name} ({t.type_code})</option>)}
                  </select>
                </div>
              </div>
            </div>

            {/* File selection area */}
            <div
              className={`card p-10 mb-6 border-2 border-dashed text-center cursor-pointer transition-colors ${
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
                multiple
                className="hidden"
                onChange={(e) => handleFilesSelected(e.target.files)}
              />
              <svg className="w-10 h-10 text-gray-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 0 1 4.5 9.75h15A2.25 2.25 0 0 1 21.75 12v.75m-8.69-6.44-2.12-2.12a1.5 1.5 0 0 0-1.061-.44H4.5A2.25 2.25 0 0 0 2.25 6v12a2.25 2.25 0 0 0 2.25 2.25h15A2.25 2.25 0 0 0 21.75 18V9a2.25 2.25 0 0 0-2.25-2.25h-5.379a1.5 1.5 0 0 1-1.06-.44Z" />
              </svg>
              <p className="text-gray-700 font-medium">Drop files here or click to select multiple files</p>
              <p className="text-sm text-gray-500 mt-1">Supports PDF, JPG, PNG (max 20MB each)</p>
            </div>

            {/* File list and results */}
            {files.length > 0 && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-sm text-gray-600">{files.length} files selected</span>
                  <div className="flex gap-3">
                    <button
                      onClick={() => { setFiles([]); setResults([]); }}
                      disabled={processing}
                      className="btn-secondary text-sm disabled:opacity-50"
                    >Clear</button>
                    <button
                      onClick={handleProcess}
                      disabled={processing}
                      className="btn-primary text-sm disabled:opacity-50"
                    >{processing ? 'Processing...' : 'Process All Files'}</button>
                  </div>
                </div>

                {/* Summary */}
                {(createdCount > 0 || dupCount > 0 || errCount > 0) && (
                  <div className="card p-4 mb-4 bg-blue-50 border border-blue-200">
                    <div className="flex items-center gap-4 text-sm">
                      <span className="font-medium text-blue-800">Results:</span>
                      {createdCount > 0 && <span className="text-green-700">{createdCount} created</span>}
                      {dupCount > 0 && <span className="text-yellow-700">{dupCount} duplicates skipped</span>}
                      {errCount > 0 && <span className="text-red-700">{errCount} errors</span>}
                    </div>
                  </div>
                )}

                <div className="card overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="table-header">
                      <tr>
                        <th className="table-th text-left w-8">#</th>
                        <th className="table-th text-left">File Name</th>
                        <th className="table-th text-left">Invoice #</th>
                        <th className="table-th text-center">Status</th>
                        <th className="table-th text-left">Details</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((r, i) => (
                        <tr key={i} className="table-row">
                          <td className="table-td text-gray-500">{i + 1}</td>
                          <td className="table-td font-medium text-xs">{r.fileName}</td>
                          <td className="table-td text-xs font-mono">{r.invoiceNumber || '-'}</td>
                          <td className="table-td text-center">
                            {r.status === 'pending' && <span className="badge-gray">Pending</span>}
                            {r.status === 'extracting' && (
                              <span className="badge-blue flex items-center justify-center gap-1">
                                <span className="animate-spin w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full inline-block"></span>
                                Extracting
                              </span>
                            )}
                            {r.status === 'created' && <span className="badge-green">Created</span>}
                            {r.status === 'duplicate' && <span className="badge-orange">Duplicate</span>}
                            {r.status === 'error' && <span className="badge-red">Error</span>}
                          </td>
                          <td className="table-td text-xs text-gray-500">{r.error || ''}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
          </RequireRole>
        </main>
      </div>
    </div>
  );
}
