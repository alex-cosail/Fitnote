import React, { createContext, useContext } from 'react';
import { en } from './en';
import { Dict, ru, TranslationKey } from './ru';
import { tr } from './tr';

export type Locale = 'ru' | 'en' | 'tr';
export const LOCALES: Locale[] = ['ru', 'en', 'tr'];

const DICTS: Record<Locale, Dict> = { ru, en, tr };

export type TFunction = (key: TranslationKey, params?: Record<string, string | number>) => string;

/** Translator for a locale; `{name}` placeholders are filled from params. */
export function makeT(locale: Locale): TFunction {
  const dict = DICTS[locale] ?? DICTS.en;
  return (key, params) => {
    const template = dict[key] ?? DICTS.en[key] ?? DICTS.ru[key] ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (m, name: string) =>
      name in params ? String(params[name]) : m
    );
  };
}

/** Locale from the browser language ("ru-RU" → ru, "tr" → tr), English otherwise. */
export function detectLocale(language: string | undefined): Locale {
  const base = (language ?? '').toLowerCase().split('-')[0];
  return (LOCALES as string[]).includes(base) ? (base as Locale) : 'en';
}

interface I18nValue {
  locale: Locale;
  t: TFunction;
}

const I18nContext = createContext<I18nValue>({ locale: 'ru', t: makeT('ru') });

export const I18nProvider: React.FC<{ locale: Locale; children: React.ReactNode }> = ({
  locale,
  children,
}) => (
  <I18nContext.Provider value={{ locale, t: makeT(locale) }}>{children}</I18nContext.Provider>
);

export function useT(): I18nValue {
  return useContext(I18nContext);
}
