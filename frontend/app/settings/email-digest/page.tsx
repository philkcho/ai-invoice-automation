'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import RequireRole from '@/components/common/RequireRole';

interface Recipient {
  id: string;
  user_id: string | null;
  email: string;
  name: string | null;
  is_active: boolean;
}

interface DigestSetting {
  id: string;
  is_active: boolean;
  frequency: string;
  daily_hour_utc: number;
  weekly_day: number;
  include_summary: boolean;
  include_overdue: boolean;
  include_pending: boolean;
  include_top_vendors: boolean;
  smtp_host: string | null;
  smtp_port: number | null;
  smtp_user: string | null;
  smtp_from_name: string | null;
  recipients: Recipient[];
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);

export default function EmailDigestPage() {
  const { user } = useAuthStore();
  const { addToast } = useToastStore();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [setting, setSetting] = useState<DigestSetting | null>(null);

  // Form state
  const [form, setForm] = useState({
    is_active: false,
    frequency: 'weekly',
    daily_hour_utc: 13,
    weekly_day: 1,
    include_summary: true,
    include_overdue: true,
    include_pending: true,
    include_top_vendors: false,
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    smtp_from_name: '',
  });

  // Recipient modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newRecipient, setNewRecipient] = useState({ email: '', name: '' });
  const [addingRecipient, setAddingRecipient] = useState(false);

  // SMTP test
  const [testingSmtp, setTestingSmtp] = useState(false);
  const [sendingTest, setSendingTest] = useState(false);

  const fetchSetting = useCallback(async () => {
    try {
      const { data } = await api.get('/api/v1/email-digest');
      if (data) {
        setSetting(data);
        setForm({
          is_active: data.is_active,
          frequency: data.frequency,
          daily_hour_utc: data.daily_hour_utc,
          weekly_day: data.weekly_day,
          include_summary: data.include_summary,
          include_overdue: data.include_overdue,
          include_pending: data.include_pending,
          include_top_vendors: data.include_top_vendors,
          smtp_host: data.smtp_host || '',
          smtp_port: data.smtp_port || 587,
          smtp_user: data.smtp_user || '',
          smtp_password: '',
          smtp_from_name: data.smtp_from_name || '',
        });
      }
    } catch {
      // No setting yet — use defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSetting(); }, [fetchSetting]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.smtp_password) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (payload as any).smtp_password;
      }
      if (!payload.smtp_host) {
        payload.smtp_host = null as unknown as string;
        payload.smtp_user = null as unknown as string;
        payload.smtp_from_name = null as unknown as string;
      }
      const { data } = await api.put('/api/v1/email-digest', payload);
      setSetting(data);
      addToast('success', 'Settings saved successfully');
    } catch {
      addToast('error', 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestSmtp = async () => {
    if (!form.smtp_host || !form.smtp_user || !form.smtp_password) {
      addToast('error', 'Please fill in all SMTP fields');
      return;
    }
    setTestingSmtp(true);
    try {
      await api.post('/api/v1/email-digest/test-smtp', {
        smtp_host: form.smtp_host,
        smtp_port: form.smtp_port,
        smtp_user: form.smtp_user,
        smtp_password: form.smtp_password,
      });
      addToast('success', 'SMTP connection successful!');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Connection failed';
      addToast('error', msg);
    } finally {
      setTestingSmtp(false);
    }
  };

  const handleSendTest = async () => {
    setSendingTest(true);
    try {
      const { data } = await api.post('/api/v1/email-digest/test');
      addToast('success', `Test email sent to ${data.sent} recipient(s)`);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to send';
      addToast('error', msg);
    } finally {
      setSendingTest(false);
    }
  };

  const handleAddRecipient = async () => {
    if (!newRecipient.email) return;
    setAddingRecipient(true);
    try {
      await api.post('/api/v1/email-digest/recipients', newRecipient);
      setNewRecipient({ email: '', name: '' });
      setShowAddModal(false);
      await fetchSetting();
      addToast('success', 'Recipient added');
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to add';
      addToast('error', msg);
    } finally {
      setAddingRecipient(false);
    }
  };

  const handleRemoveRecipient = async (id: string) => {
    try {
      await api.delete(`/api/v1/email-digest/recipients/${id}`);
      await fetchSetting();
      addToast('success', 'Recipient removed');
    } catch {
      addToast('error', 'Failed to remove recipient');
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  return (
    <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
      <div className="p-8 max-w-4xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Email Digest</h1>
        <p className="text-gray-500 mb-8">Receive periodic summaries of your invoice processing status via email.</p>

        {/* ── Section 1: Digest Settings ────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">Digest Settings</h2>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={form.is_active}
                onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              <span className="ml-3 text-sm font-medium text-gray-700">{form.is_active ? 'Active' : 'Inactive'}</span>
            </label>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                value={form.frequency}
                onChange={(e) => setForm({ ...form, frequency: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="both">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Send Time (UTC)</label>
              <select
                value={form.daily_hour_utc}
                onChange={(e) => setForm({ ...form, daily_hour_utc: parseInt(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                {HOURS.map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, '0')}:00 UTC</option>
                ))}
              </select>
            </div>
            {(form.frequency === 'weekly' || form.frequency === 'both') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weekly Day</label>
                <select
                  value={form.weekly_day}
                  onChange={(e) => setForm({ ...form, weekly_day: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  {DAYS.map((d, i) => (
                    <option key={i} value={i}>{d}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Include in Digest</label>
            <div className="grid sm:grid-cols-2 gap-2">
              {[
                { key: 'include_summary', label: 'Processing summary (count & spend)' },
                { key: 'include_overdue', label: 'Overdue invoices' },
                { key: 'include_pending', label: 'Pending approvals' },
                { key: 'include_top_vendors', label: 'Top vendors by spend' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* ── Section 2: SMTP Settings ─────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-1">SMTP Settings</h2>
          <p className="text-sm text-gray-500 mb-6">Optional — leave empty to use system default.</p>

          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Host</label>
              <input
                type="text"
                value={form.smtp_host}
                onChange={(e) => setForm({ ...form, smtp_host: e.target.value })}
                placeholder="smtp.gmail.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMTP Port</label>
              <input
                type="number"
                value={form.smtp_port}
                onChange={(e) => setForm({ ...form, smtp_port: parseInt(e.target.value) || 587 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={form.smtp_user}
                onChange={(e) => setForm({ ...form, smtp_user: e.target.value })}
                placeholder="finance@company.com"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={form.smtp_password}
                onChange={(e) => setForm({ ...form, smtp_password: e.target.value })}
                placeholder="••••••••"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">From Name</label>
            <input
              type="text"
              value={form.smtp_from_name}
              onChange={(e) => setForm({ ...form, smtp_from_name: e.target.value })}
              placeholder="AP Team"
              className="w-full sm:w-1/2 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <button
            onClick={handleTestSmtp}
            disabled={testingSmtp || !form.smtp_host}
            className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
          >
            {testingSmtp ? 'Testing...' : 'Test Connection'}
          </button>
        </div>

        {/* ── Section 3: Recipients ────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recipients</h2>
              <p className="text-sm text-gray-500">System users or external email addresses.</p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors"
            >
              + Add Recipient
            </button>
          </div>

          {setting?.recipients && setting.recipients.length > 0 ? (
            <div className="border border-gray-100 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Name</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="text-right px-4 py-2.5"></th>
                  </tr>
                </thead>
                <tbody>
                  {setting.recipients.map((r) => (
                    <tr key={r.id} className="border-t border-gray-50">
                      <td className="px-4 py-3 text-gray-900">{r.name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{r.email}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          r.user_id ? 'bg-primary-50 text-primary-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {r.user_id ? 'System User' : 'External'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleRemoveRecipient(r.id)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500 text-sm">
              No recipients added yet. Add at least one to receive digest emails.
            </div>
          )}
        </div>

        {/* ── Action Buttons ───────────────────────────── */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          <button
            onClick={handleSendTest}
            disabled={sendingTest || !setting?.recipients?.length}
            className="px-6 py-2.5 text-sm font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors disabled:opacity-50"
          >
            {sendingTest ? 'Sending...' : 'Send Test Email'}
          </button>
        </div>

        {/* ── Add Recipient Modal ──────────────────────── */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Recipient</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input
                    type="email"
                    value={newRecipient.email}
                    onChange={(e) => setNewRecipient({ ...newRecipient, email: e.target.value })}
                    placeholder="email@example.com"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={newRecipient.name}
                    onChange={(e) => setNewRecipient({ ...newRecipient, name: e.target.value })}
                    placeholder="John Doe"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => { setShowAddModal(false); setNewRecipient({ email: '', name: '' }); }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddRecipient}
                  disabled={addingRecipient || !newRecipient.email}
                  className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 disabled:opacity-50"
                >
                  {addingRecipient ? 'Adding...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </RequireRole>
  );
}
