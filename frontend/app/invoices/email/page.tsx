'use client';

import { useEffect, useState } from 'react';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

interface EmailConfig {
  id: string;
  email_address: string;
  email_provider: string;
  is_active: boolean;
  last_polled_at: string | null;
  poll_error_count: number;
  last_error_message: string | null;
  filter_keywords: string | null;
  filter_senders: string | null;
}

interface PollResult {
  emails_fetched: number;
  invoices_created: number;
  errors: string[];
}

export default function InvoiceEmailPage() {
  const [configs, setConfigs] = useState<EmailConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [pollingId, setPollingId] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, PollResult>>({});
  const [pollingAll, setPollingAll] = useState(false);
  const [error, setError] = useState('');

  const fetchConfigs = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/api/v1/email-configurations', { params: { limit: 100 } });
      setConfigs(data.items);
    } catch (err: unknown) {
      console.error('Failed to fetch email configs', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  const handlePollSingle = async (configId: string) => {
    setPollingId(configId);
    setError('');
    try {
      const { data } = await api.post(`/api/v1/email-configurations/${configId}/test-poll`, {}, { timeout: 120000 });
      setResults(prev => ({ ...prev, [configId]: data }));
      fetchConfigs();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setPollingId(null);
    }
  };

  const handlePollAll = async () => {
    setPollingAll(true);
    setError('');
    setResults({});

    const activeConfigs = configs.filter(c => c.is_active);
    for (const config of activeConfigs) {
      try {
        setPollingId(config.id);
        const { data } = await api.post(`/api/v1/email-configurations/${config.id}/test-poll`, {}, { timeout: 120000 });
        setResults(prev => ({ ...prev, [config.id]: data }));
      } catch (err: unknown) {
        setResults(prev => ({
          ...prev,
          [config.id]: { emails_fetched: 0, invoices_created: 0, errors: [getErrorMessage(err)] },
        }));
      }
    }
    setPollingId(null);
    setPollingAll(false);
    fetchConfigs();
  };

  const totalFetched = Object.values(results).reduce((s, r) => s + r.emails_fetched, 0);
  const totalCreated = Object.values(results).reduce((s, r) => s + r.invoices_created, 0);

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN', 'ACCOUNTANT']}>
          <div className="page-header flex items-center justify-between mb-6">
            <div>
              <h2 className="page-title">Invoice (Email)</h2>
              <p className="page-subtitle">Fetch invoices from configured email accounts immediately</p>
            </div>
            <button
              onClick={handlePollAll}
              disabled={pollingAll || configs.filter(c => c.is_active).length === 0}
              className="btn-primary disabled:opacity-50"
            >
              {pollingAll ? 'Polling...' : 'Poll All Accounts Now'}
            </button>
          </div>

          {error && <div className="alert-error mb-4">{error}</div>}

          {Object.keys(results).length > 0 && (
            <div className="card p-4 mb-4 bg-blue-50 border border-blue-200">
              <div className="flex items-center gap-4 text-sm">
                <span className="font-medium text-blue-800">Poll Results:</span>
                <span className="text-blue-700">{totalFetched} emails fetched</span>
                <span className="text-blue-700">{totalCreated} invoices created</span>
              </div>
            </div>
          )}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading email configurations...</div>
            ) : configs.length === 0 ? (
              <div className="empty-state">
                No email accounts configured. Go to Settings &gt; Email Integration to add accounts.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">Email Account</th>
                    <th className="table-th text-left">Provider</th>
                    <th className="table-th text-left">Filters</th>
                    <th className="table-th text-center">Status</th>
                    <th className="table-th text-left">Last Polled</th>
                    <th className="table-th text-center">Result</th>
                    <th className="table-th text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {configs.map((c) => (
                    <tr key={c.id} className="table-row">
                      <td className="table-td font-medium">{c.email_address}</td>
                      <td className="table-td">
                        <span className={c.email_provider === 'GMAIL' ? 'badge-red' : 'badge-blue'}>
                          {c.email_provider}
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="text-xs text-gray-500">
                          {c.filter_keywords && <div>Keywords: {c.filter_keywords}</div>}
                          {c.filter_senders && <div>Senders: {c.filter_senders}</div>}
                          {!c.filter_keywords && !c.filter_senders && <span className="text-gray-400">No filters</span>}
                        </div>
                      </td>
                      <td className="table-td text-center">
                        <span className={c.is_active ? 'badge-green' : 'badge-red'}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                        {c.poll_error_count > 0 && (
                          <div className="text-xs text-red-500 mt-1" title={c.last_error_message || ''}>
                            {c.poll_error_count} errors
                          </div>
                        )}
                      </td>
                      <td className="table-td text-xs text-gray-500">
                        {c.last_polled_at
                          ? new Date(c.last_polled_at).toLocaleString()
                          : 'Never'}
                      </td>
                      <td className="table-td text-center text-xs">
                        {results[c.id] ? (
                          <div>
                            <span className="text-green-600">{results[c.id].invoices_created} created</span>
                            {results[c.id].errors.length > 0 && (
                              <div className="text-red-500">{results[c.id].errors.length} errors</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="table-td text-center">
                        <button
                          onClick={() => handlePollSingle(c.id)}
                          disabled={!c.is_active || pollingId === c.id}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium disabled:opacity-50"
                        >
                          {pollingId === c.id ? 'Polling...' : 'Poll Now'}
                        </button>
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
