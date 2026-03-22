'use client';

import { createContext, useContext } from 'react';
import en from './en.json';
import ko from './ko.json';

export type Locale = 'en' | 'ko';

const translations: Record<Locale, typeof en> = { en, ko };

type TranslationContext = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
};

export const I18nContext = createContext<TranslationContext>({
  locale: 'en',
  setLocale: () => {},
  t: (key: string) => key,
});

export function useTranslation() {
  return useContext(I18nContext);
}

export function getTranslation(locale: Locale) {
  const dict = translations[locale];

  return function t(key: string, params?: Record<string, string | number>): string {
    const keys = key.split('.');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let value: any = dict;
    for (const k of keys) {
      value = value?.[k];
    }
    if (typeof value !== 'string') return key;
    if (!params) return value;

    return value.replace(/\{(\w+)\}/g, (_, name) =>
      params[name] !== undefined ? String(params[name]) : `{${name}}`
    );
  };
}

export { en, ko };
