'use client';

import { useToastStore, type ToastType } from '@/stores/toast';

const TOAST_STYLES: Record<ToastType, string> = {
  success: 'bg-green-50 border-green-200 text-green-800',
  error: 'bg-red-50 border-red-200 text-red-800',
  warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  info: 'bg-blue-50 border-blue-200 text-blue-800',
};

const TOAST_ICONS: Record<ToastType, string> = {
  success: 'V',
  error: 'X',
  warning: '!',
  info: 'i',
};

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);
  const removeToast = useToastStore((s) => s.removeToast);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg animate-in slide-in-from-right ${TOAST_STYLES[toast.type]}`}
        >
          <span className="font-bold text-sm shrink-0">{TOAST_ICONS[toast.type]}</span>
          <p className="text-sm flex-1">{toast.message}</p>
          <button
            onClick={() => removeToast(toast.id)}
            className="text-sm opacity-60 hover:opacity-100 shrink-0"
          >
            x
          </button>
        </div>
      ))}
    </div>
  );
}
