'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import api from '@/lib/api';
import { getErrorMessage } from '@/lib/error';
import RequireRole from '@/components/common/RequireRole';

interface CompanyTypeSetting {
  id: string;
  company_id: string;
  invoice_type_id: string;
  link_enabled: boolean;
  type_code: string | null;
  type_name: string | null;
  created_at: string;
  updated_at: string;
}

const LINKAGE_ROUTES: Record<string, string> = {
  PO: '/settings/type-linkage/po',
  SERVICE: '/settings/type-linkage/contract',
  RECURRING: '/settings/type-linkage/recurring',
};

const LINKAGE_LABELS: Record<string, string> = {
  PO: 'PO 데이터 관리',
  SERVICE: '계약 조건 관리',
  RECURRING: '고정금액 관리',
};

export default function TypeLinkagePage() {
  const router = useRouter();
  const [settings, setSettings] = useState<CompanyTypeSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState('');

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get('/api/v1/company-type-settings');
      if (data.total === 0) {
        const initRes = await api.post('/api/v1/company-type-settings/initialize');
        setSettings(initRes.data.items);
      } else {
        setSettings(data.items);
      }
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  const handleToggle = async (setting: CompanyTypeSetting, linkEnabled: boolean) => {
    if (setting.link_enabled === linkEnabled) return;
    setUpdating(setting.id);
    try {
      const { data } = await api.put(`/api/v1/company-type-settings/${setting.id}`, {
        link_enabled: linkEnabled,
      });
      setSettings((prev) =>
        prev.map((s) => (s.id === setting.id ? { ...s, link_enabled: data.link_enabled, updated_at: data.updated_at } : s))
      );
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setUpdating(null);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
          <RequireRole roles={['SUPER_ADMIN', 'COMPANY_ADMIN']}>
          <div className="page-header mb-6">
            <h2 className="page-title">Type Linkage</h2>
            <p className="page-subtitle">인보이스 타입별 기존 데이터 연계 설정</p>
          </div>

          {error && <div className="alert-error mb-4">{error}</div>}

          <div className="card overflow-hidden">
            {loading ? (
              <div className="loading-state">Loading...</div>
            ) : settings.length === 0 ? (
              <div className="empty-state">
                인보이스 타입이 없습니다. 먼저 Invoice Types 메뉴에서 기본 타입을 생성해주세요.
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead className="table-header">
                  <tr>
                    <th className="table-th text-left">타입 코드</th>
                    <th className="table-th text-left">타입명</th>
                    <th className="table-th text-center">데이터 연계</th>
                    <th className="table-th text-center">연계 설정</th>
                  </tr>
                </thead>
                <tbody>
                  {settings.map((s) => {
                    const typeCode = s.type_code || '';
                    const hasLinkagePage = typeCode in LINKAGE_ROUTES;

                    return (
                      <tr key={s.id} className="table-row">
                        <td className="table-td font-mono text-xs font-medium">
                          {s.type_code || '—'}
                        </td>
                        <td className="table-td font-medium text-gray-800">
                          {s.type_name || '—'}
                        </td>
                        <td className="table-td">
                          <div className="flex items-center justify-center gap-6">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`linkage-${s.id}`}
                                checked={s.link_enabled === true}
                                onChange={() => handleToggle(s, true)}
                                disabled={updating === s.id}
                                className="accent-primary-500"
                              />
                              <span className={`text-sm ${s.link_enabled ? 'text-primary-700 font-medium' : 'text-gray-500'}`}>
                                연계
                              </span>
                            </label>
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="radio"
                                name={`linkage-${s.id}`}
                                checked={s.link_enabled === false}
                                onChange={() => handleToggle(s, false)}
                                disabled={updating === s.id}
                                className="accent-primary-500"
                              />
                              <span className={`text-sm ${!s.link_enabled ? 'text-gray-700 font-medium' : 'text-gray-500'}`}>
                                연계안함
                              </span>
                            </label>
                            {updating === s.id && (
                              <span className="text-xs text-gray-400">저장 중...</span>
                            )}
                          </div>
                        </td>
                        <td className="table-td text-center">
                          {s.link_enabled && hasLinkagePage ? (
                            <button
                              onClick={() => router.push(LINKAGE_ROUTES[typeCode])}
                              className="btn-primary text-xs px-3 py-1.5"
                            >
                              {LINKAGE_LABELS[typeCode]}
                            </button>
                          ) : s.link_enabled && !hasLinkagePage ? (
                            <span className="badge-gray text-xs">설정 불필요</span>
                          ) : (
                            <span className="text-gray-300">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
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
