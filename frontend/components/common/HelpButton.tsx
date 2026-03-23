'use client';

import { usePathname } from 'next/navigation';
import { useHelpStore } from '@/stores/help';
import { getHelpTopic } from '@/lib/help-content';

const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/verify-email', '/landing', '/pricing', '/faq', '/guide', '/contact', '/demo'];

export default function HelpButton() {
  const pathname = usePathname();
  const { toggle } = useHelpStore();

  // Hide on public pages
  if (PUBLIC_PATHS.includes(pathname)) return null;

  const topic = getHelpTopic(pathname);
  if (!topic) return null;

  return (
    <button
      onClick={toggle}
      className="fixed bottom-6 right-24 z-40 w-12 h-12 rounded-full bg-primary-600 text-white shadow-lg shadow-primary-600/30 hover:bg-primary-700 hover:shadow-primary-600/50 transition-all flex items-center justify-center"
      title="Help"
    >
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 5.25h.008v.008H12v-.008Z" />
      </svg>
    </button>
  );
}
