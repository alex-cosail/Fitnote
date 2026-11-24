import { describe, expect, it } from 'vitest';
import { catalogTextsFor } from '../data/catalogTexts';
import { CATALOG_IDS } from '../data/seed';
import { en } from '../i18n/en';
import { detectLocale, makeT } from '../i18n';
import { ru } from '../i18n/ru';
import { tr } from '../i18n/tr';
import { DEFAULT_ROUTE, parseHash, routeToHash } from './hashRoute';

describe('hash routes', () => {
  it('empty or unknown hash opens the Workout tab', () => {
    expect(parseHash('')).toEqual(DEFAULT_ROUTE);
    expect(parseHash('#')).toEqual(DEFAULT_ROUTE);
    expect(parseHash('#/nope')).toEqual(DEFAULT_ROUTE);
  });

  it('tabs round-trip; the log tab is #/log', () => {
    for (const tab of ['workout', 'checkup', 'catalog', 'sync'] as const) {
      const hash = routeToHash({ name: 'tab', tab });
      expect(parseHash(hash)).toEqual({ name: 'tab', tab });
    }
    expect(routeToHash({ name: 'tab', tab: 'sync' })).toBe('#/log');
  });

  it('reserved routes for later steps', () => {
    expect(parseHash('#/onboarding')).toEqual({ name: 'onboarding' });
    expect(parseHash('#/studio')).toEqual({ name: 'studio' });
    expect(parseHash('#/s/AbC-12_x')).toEqual({ name: 'share', payload: 'AbC-12_x' });
    expect(parseHash('#/s/')).toEqual(DEFAULT_ROUTE);
    expect(routeToHash({ name: 'share', payload: 'xyz' })).toBe('#/s/xyz');
  });
});

describe('i18n', () => {
  it('all dictionaries have the same keys', () => {
    const keys = Object.keys(ru).sort();
    expect(Object.keys(en).sort()).toEqual(keys);
    expect(Object.keys(tr).sort()).toEqual(keys);
    for (const dict of [ru, en, tr]) {
      for (const v of Object.values(dict)) expect(v.trim()).not.toBe('');
    }
  });

  it('translates and fills placeholders', () => {
    expect(makeT('ru')('nav.aria')).toBe('Основная навигация');
    expect(makeT('en')('nav.aria')).toBe('Main navigation');
    expect(makeT('tr')('common.roundsCount', { count: 15 })).toBe('15 tur');
    expect(makeT('ru')('common.roundsCount')).toBe('{count} кр.');
  });

  it('detects the language from the browser, English otherwise', () => {
    expect(detectLocale('ru-RU')).toBe('ru');
    expect(detectLocale('tr')).toBe('tr');
    expect(detectLocale('en-GB')).toBe('en');
    expect(detectLocale('de-DE')).toBe('en');
    expect(detectLocale(undefined)).toBe('en');
  });

  it('catalog texts fall back to Russian for every exercise', () => {
    for (const locale of ['ru', 'en', 'tr'] as const) {
      const texts = catalogTextsFor(locale);
      for (const id of CATALOG_IDS) expect(texts[id]?.name).toBeTruthy();
    }
  });
});
