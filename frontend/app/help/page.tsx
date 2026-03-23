'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/layout/Header';
import Sidebar from '@/components/layout/Sidebar';
import { useTranslation } from '@/lib/i18n';
import { getAllTopics } from '@/lib/help-content';

const CATEGORIES = [
  {
    id: 'getting-started',
    iconPath: 'M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a50.636 50.636 0 0 0-2.658-.813A59.906 59.906 0 0 1 12 3.493a59.903 59.903 0 0 1 10.399 5.84c-.896.248-1.783.52-2.658.814m-15.482 0A50.717 50.717 0 0 1 12 13.489a50.702 50.702 0 0 1 7.74-3.342M6.75 15a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm0 0v-3.675A55.378 55.378 0 0 1 12 8.443m-7.007 11.55A5.981 5.981 0 0 0 6.75 15.75v-1.5',
    en: { title: 'Getting Started', desc: 'Sign up, create your first invoice, and configure basic settings.' },
    ko: { title: '시작하기', desc: '가입, 첫 인보이스 생성, 기본 설정 안내.' },
    paths: ['/', '/invoices/upload'],
  },
  {
    id: 'invoices',
    iconPath: 'M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z',
    en: { title: 'Invoice Processing', desc: 'Upload, OCR extraction, manual entry, and email collection.' },
    ko: { title: '인보이스 처리', desc: '업로드, OCR 추출, 수동 입력, 이메일 수집.' },
    paths: ['/invoices', '/invoices/upload', '/invoices/[id]'],
  },
  {
    id: 'workflow',
    iconPath: 'M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z',
    en: { title: 'Approval & Payments', desc: 'Approval workflows, payment scheduling, and tracking.' },
    ko: { title: '승인 & 결제', desc: '승인 워크플로우, 결제 예약, 추적.' },
    paths: ['/approvals', '/payments'],
  },
  {
    id: 'settings',
    iconPath: 'M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z',
    en: { title: 'Settings & Configuration', desc: 'Invoice types, validation rules, email integration, and digest.' },
    ko: { title: '설정 & 구성', desc: '인보이스 타입, 검증 규칙, 이메일 연동, 다이제스트.' },
    paths: ['/settings/approval-settings', '/settings/email-digest', '/settings/email'],
  },
  {
    id: 'vendors',
    iconPath: 'M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21',
    en: { title: 'Vendor Management', desc: 'Manage vendor master data, contacts, and compliance.' },
    ko: { title: '거래처 관리', desc: '거래처 마스터 데이터, 연락처, 컴플라이언스 관리.' },
    paths: ['/vendors'],
  },
];

export default function HelpCenterPage() {
  const { locale } = useTranslation();
  const isKo = locale === 'ko';
  const allTopics = getAllTopics();

  const [search, setSearch] = useState('');
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const filteredCategories = search
    ? CATEGORIES.filter((cat) => {
        const text = isKo
          ? `${cat.ko.title} ${cat.ko.desc}`
          : `${cat.en.title} ${cat.en.desc}`;
        const topicTexts = cat.paths.map((p) => {
          const t = allTopics.find((at) => at.path === p);
          if (!t) return '';
          return isKo
            ? `${t.topic.titleKo} ${t.topic.descKo} ${t.topic.features.map((f) => f.ko).join(' ')}`
            : `${t.topic.titleEn} ${t.topic.descEn} ${t.topic.features.map((f) => f.en).join(' ')}`;
        }).join(' ');
        return `${text} ${topicTexts}`.toLowerCase().includes(search.toLowerCase());
      })
    : CATEGORIES;

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="flex flex-1">
        <Sidebar />
        <main className="flex-1 bg-surface-50 p-8">
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          {isKo ? '도움말 센터' : 'Help Center'}
        </h1>
        <p className="text-gray-500 mb-6">
          {isKo ? 'AI Invoice Automation 사용에 대한 가이드와 문서입니다.' : 'Guides and documentation for AI Invoice Automation.'}
        </p>

        {/* Search */}
        <div className="relative max-w-lg">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={isKo ? '도움말 검색...' : 'Search help...'}
            className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500 outline-none"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {filteredCategories.map((cat) => {
          const isOpen = openCategory === cat.id;
          const catTitle = isKo ? cat.ko.title : cat.en.title;
          const catDesc = isKo ? cat.ko.desc : cat.en.desc;
          const topics = cat.paths
            .map((p) => allTopics.find((at) => at.path === p))
            .filter(Boolean);

          return (
            <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Category header */}
              <button
                onClick={() => setOpenCategory(isOpen ? null : cat.id)}
                className="w-full flex items-center gap-4 px-6 py-5 text-left hover:bg-gray-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={cat.iconPath} />
                  </svg>
                </div>
                <div className="flex-1">
                  <h2 className="font-semibold text-gray-900">{catTitle}</h2>
                  <p className="text-sm text-gray-500">{catDesc}</p>
                </div>
                <svg
                  className={`w-5 h-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              {/* Expanded content */}
              {isOpen && (
                <div className="px-6 pb-5 border-t border-gray-100">
                  {topics.map((item) => {
                    if (!item) return null;
                    const { topic } = item;
                    const title = isKo ? topic.titleKo : topic.titleEn;
                    const desc = isKo ? topic.descKo : topic.descEn;

                    return (
                      <div key={item.path} className="py-4 border-b border-gray-50 last:border-0">
                        <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
                        <p className="text-sm text-gray-500 mb-3">{desc}</p>
                        <ul className="space-y-1.5">
                          {topic.features.map((f, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-600">
                              <svg className="w-4 h-4 text-primary-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                              </svg>
                              {isKo ? f.ko : f.en}
                            </li>
                          ))}
                        </ul>
                        {(topic.tipEn || topic.tipKo) && (
                          <div className="mt-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                            <p className="text-xs text-amber-700">
                              💡 {isKo ? topic.tipKo : topic.tipEn}
                            </p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Contact CTA */}
      <div className="mt-10 text-center bg-gray-50 rounded-xl p-8 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          {isKo ? '원하는 답을 찾지 못하셨나요?' : 'Can\'t find what you\'re looking for?'}
        </h3>
        <p className="text-sm text-gray-500 mb-4">
          {isKo ? '저희 팀에 문의하시면 도와드리겠습니다.' : 'Contact our team and we\'ll help you out.'}
        </p>
        <Link
          href="/contact"
          className="inline-flex items-center px-5 py-2.5 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 transition-colors"
        >
          {isKo ? '문의하기' : 'Contact Us'}
        </Link>
      </div>
    </div>
        </main>
      </div>
    </div>
  );
}
