'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import RequireRole from '@/components/common/RequireRole';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import { useToastStore } from '@/stores/toast';
import { useAuthStore } from '@/stores/auth';

interface EmailConfig {
  id: string;
  company_id: string;
  email_provider: string;
  email_address: string;
  filter_keywords: string | null;
  filter_senders: string | null;
  is_active: boolean;
  last_polled_at: string | null;
  poll_error_count: number;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export default function EmailSettingsPage() {
  const user = useAuthStore((s) => s.user);
  const addToast = useToastStore((s) => s.addToast);

  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [polling, setPolling] = useState<string | null>(null);

  const [form, setForm] = useState({
    email_provider: 'GMAIL',
    email_address: '',
    filter_keywords: '',
    filter_senders: '',
    is_active: true,
  });

  const fetchConfigs = async () => {
    setIsLoading(true);
    try {
      const { data } = await api.get('/api/v1/email-configurations');
      setConfigs(data.items);
      setTotal(data.total);
    } catch (err) {
      addToast('error', getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const resetForm = () => {
    setForm({
      email_provider: 'GMAIL',
      email_address: '',
      filter_keywords: '',
      filter_senders: '',
      is_active: true,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await api.put(`/api/v1/email-configurations/${editingId}`, {
          filter_keywords: form.filter_keywords || null,
          filter_senders: form.filter_senders || null,
          is_active: form.is_active,
        });
        addToast('success', 'Email configuration updated');
      } else {
        await api.post('/api/v1/email-configurations', {
          company_id: user?.company_id,
          email_provider: form.email_provider,
          email_address: form.email_address,
          filter_keywords: form.filter_keywords || null,
          filter_senders: form.filter_senders || null,
          is_active: form.is_active,
        });
        addToast('success', 'Email configuration created');
      }
      resetForm();
      fetchConfigs();
    } catch (err) {
      addToast('error', getErrorMessage(err));
    }
  };

  const handleEdit = (config: EmailConfig) => {
    setForm({
      email_provider: config.email_provider,
      email_address: config.email_address,
      filter_keywords: config.filter_keywords || '',
      filter_senders: config.filter_senders || '',
      is_active: config.is_active,
    });
    setEditingId(config.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this email configuration?')) return;
    try {
      await api.delete(`/api/v1/email-configurations/${id}`);
      addToast('success', 'Email configuration deleted');
      fetchConfigs();
    } catch (err) {
      addToast('error', getErrorMessage(err));
    }
  };

  const handleOAuthConnect = async (id: string) => {
    try {
      const { data } = await api.post(`/api/v1/email-configurations/${id}/oauth/connect`);
      window.open(data.auth_url, '_blank', 'width=600,height=700');
    } catch (err) {
      addToast('error', getErrorMessage(err));
    }
  };

  const handleTestPoll = async (id: string) => {
    setPolling(id);
    try {
      const { data } = await api.post(`/api/v1/email-configurations/${id}/test-poll`);
      if (data.errors.length > 0) {
        addToast('error', `Test poll completed with errors: ${data.errors.join(', ')}`);
      } else {
        addToast(
          'success',
          `Test poll: ${data.emails_fetched} emails fetched, ${data.invoices_created} invoices created`
        );
      }
      fetchConfigs();
    } catch (err) {
      addToast('error', getErrorMessage(err));
    } finally {
      setPolling(null);
    }
  };

  const handleToggleActive = async (config: EmailConfig) => {
    try {
      await api.put(`/api/v1/email-configurations/${config.id}`, {
        is_active: !config.is_active,
      });
      addToast('success', `Email ${config.is_active ? 'deactivated' : 'activated'}`);
      fetchConfigs();
    } catch (err) {
      addToast('error', getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-gray-50 p-6">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Email Integration</h2>
              <p className="text-sm text-gray-500 mt-1">{total} email accounts configured</p>
            </div>
            <button
              onClick={() => { resetForm(); setShowForm(true); }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
            >
              + Add Email Account
            </button>
          </div>

          {/* 추가/수정 폼 */}
          {showForm && (
            <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingId ? 'Edit Email Configuration' : 'Add Email Account'}
              </h3>
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Provider</label>
                  <select
                    value={form.email_provider}
                    onChange={(e) => setForm({ ...form, email_provider: e.target.value })}
                    disabled={!!editingId}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="GMAIL">Gmail</option>
                    <option value="OUTLOOK">Outlook / Microsoft 365</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={form.email_address}
                    onChange={(e) => setForm({ ...form, email_address: e.target.value })}
                    disabled={!!editingId}
                    required
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="invoices@company.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter Keywords <span className="text-gray-400">(comma-separated)</span>
                  </label>
                  <input
                    type="text"
                    value={form.filter_keywords}
                    onChange={(e) => setForm({ ...form, filter_keywords: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="invoice, bill, statement"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Filter Senders <span className="text-gray-400">(comma-separated domains)</span>
                  </label>
                  <input
                    type="text"
                    value={form.filter_senders}
                    onChange={(e) => setForm({ ...form, filter_senders: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    placeholder="vendor.com, supplier.co"
                  />
                </div>
                <div className="flex items-center gap-2 col-span-1 md:col-span-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={form.is_active}
                    onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                    className="rounded"
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">Active (enable polling)</label>
                </div>
                <div className="col-span-1 md:col-span-2 flex gap-3">
                  <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                    {editingId ? 'Update' : 'Create'}
                  </button>
                  <button type="button" onClick={resetForm} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* 목록 */}
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            ) : configs.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                No email accounts configured. Click &quot;Add Email Account&quot; to get started.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Provider</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Polled</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Errors</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {configs.map((config) => (
                    <tr key={config.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-medium text-gray-900">{config.email_address}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          config.email_provider === 'GMAIL'
                            ? 'bg-red-50 text-red-700'
                            : 'bg-blue-50 text-blue-700'
                        }`}>
                          {config.email_provider === 'GMAIL' ? 'Gmail' : 'Outlook'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleToggleActive(config)}
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium cursor-pointer ${
                            config.is_active
                              ? 'bg-green-50 text-green-700 hover:bg-green-100'
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                          }`}
                        >
                          {config.is_active ? 'Active' : 'Inactive'}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs">
                        {config.last_polled_at
                          ? new Date(config.last_polled_at).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="px-4 py-3">
                        {config.poll_error_count > 0 ? (
                          <span className="text-red-600 text-xs" title={config.last_error_message || ''}>
                            {config.poll_error_count} errors
                          </span>
                        ) : (
                          <span className="text-green-600 text-xs">OK</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleOAuthConnect(config.id)}
                            className="text-xs text-purple-600 hover:text-purple-800"
                          >
                            Connect
                          </button>
                          <button
                            onClick={() => handleTestPoll(config.id)}
                            disabled={polling === config.id}
                            className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                          >
                            {polling === config.id ? 'Polling...' : 'Test Poll'}
                          </button>
                          <button
                            onClick={() => handleEdit(config)}
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(config.id)}
                            className="text-xs text-red-600 hover:text-red-800"
                          >
                            Delete
                          </button>
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
