import { CatalogText } from '../domain/catalog/types';
import type { Locale } from '../i18n';
import { CATALOG_TEXT_EN } from './catalogText.en';
import { CATALOG_TEXT_RU } from './catalogText.ru';
import { CATALOG_TEXT_TR } from './catalogText.tr';

// Catalog texts by language. Exercises from the first catalog (v2) are in
// Russian only and fall back to it.
const CATALOG_TEXTS: Partial<Record<Locale, Record<string, CatalogText>>> = {
  ru: CATALOG_TEXT_RU,
  en: CATALOG_TEXT_EN,
  tr: CATALOG_TEXT_TR,
};

const FALLBACK_CHAIN: Record<Locale, Locale[]> = {
  ru: ['ru', 'en'],
  en: ['en', 'ru'],
  tr: ['tr', 'en', 'ru'],
};

/** Texts for every catalog id in `locale`, with per-exercise fallback. */
export function catalogTextsFor(locale: Locale): Record<string, CatalogText> {
  const ids = new Set(Object.values(CATALOG_TEXTS).flatMap((t) => Object.keys(t ?? {})));
  const out: Record<string, CatalogText> = {};
  for (const id of ids) {
    for (const loc of FALLBACK_CHAIN[locale]) {
      const text = CATALOG_TEXTS[loc]?.[id];
      if (text) {
        out[id] = text;
        break;
      }
    }
  }
  return out;
}
