'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useHelpStore } from '@/stores/help';
import { getHelpTopic } from '@/lib/help-content';
import { useTranslation } from '@/lib/i18n';

export default function HelpPanel() {
  const { isOpen, close } = useHelpStore();
  const pathname = usePathname();
  const { locale } = useTranslation();
  const isKo = locale === 'ko';

  const topic = getHelpTopic(pathname);

  if (!isOpen || !topic) return null;

  const title = isKo ? topic.titleKo : topic.titleEn;
  const desc = isKo ? topic.descKo : topic.descEn;
  const tip = isKo ? topic.tipKo : topic.tipEn;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/20"
        onClick={close}
      />

      {/* Panel */}
      <div className="fixed top-0 right-0 z-50 h-full w-80 bg-white shadow-2xl flex flex-col animate-slide-in-right">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gradient-to-r from-primary-600 to-primary-700">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
            </svg>
            <span className="text-white font-semibold text-sm">
              {isKo ? '페이지 도움말' : 'Page Help'}
            </span>
          </div>
          <button
            onClick={close}
            className="text-white/70 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-5">
          <h2 className="text-lg font-bold text-gray-900 mb-2">{title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed mb-5">{desc}</p>

          {/* Features */}
          <div className="space-y-3 mb-5">
            {topic.features.map((f, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-5 h-5 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">
                  {isKo ? f.ko : f.en}
                </p>
              </div>
            ))}
          </div>

          {/* Tip */}
          {tip && (
            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 mb-5">
              <div className="flex items-start gap-2">
                <span className="text-amber-500 text-sm">💡</span>
                <p className="text-xs text-amber-700 leading-relaxed">{tip}</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100">
          <Link
            href="/help"
            onClick={close}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
            </svg>
            {isKo ? '전체 문서 보기' : 'View Full Documentation'}
          </Link>
        </div>
      </div>
    </>
  );
}
