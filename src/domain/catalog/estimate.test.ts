import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { weekText } from '../plan/shareText';
import { baseCheckupIds, estimateMaxes } from './estimate';

describe('check-up: base tests', () => {
  it('playground: 8 classic tests, one per pattern', () => {
    const ids = baseCheckupIds(CATALOG, { environment: 'outdoor', equipment: ['pullup_bars', 'bands'] });
    expect(ids).toEqual([
      'floor-push-ups', 'australian-pull-ups', 'pike-push-ups', 'strict-pull-ups',
      'air-squats', 'romanian-deadlift', 'reverse-lunges', 'side-plank',
    ]);
  });
  it('home without a bar: no vertical pull test, band row for the pull', () => {
    const ids = baseCheckupIds(CATALOG, { environment: 'home', equipment: ['bands'] });
    expect(ids).not.toContain('strict-pull-ups');
    expect(ids).toContain('band-row');
    expect(ids.length).toBe(7);
  });
  it('dirty floor: no floor-contact test (side plank → straight-arm plank)', () => {
    const ids = baseCheckupIds(CATALOG, { environment: 'outdoor', equipment: ['pullup_bars'], cleanFloor: false });
    expect(ids).not.toContain('side-plank');
    expect(ids).toContain('high-plank');
  });
});

describe('estimated maxima', () => {
  it('measured stays; a family relative is scaled by the default ratio; else the default', () => {
    const est = estimateMaxes(CATALOG, { 'floor-push-ups': { value: 40 } }, 'medium');
    expect(est['floor-push-ups']).toEqual({ value: 40, source: 'measured' });
    const fp = CATALOG.find((c) => c.id === 'floor-push-ups')!;
    const fe = CATALOG.find((c) => c.id === 'feet-elevated-push-ups')!;
    expect(est['feet-elevated-push-ups']).toEqual({
      value: Math.round((40 * fe.defaultMax.medium) / fp.defaultMax.medium),
      source: 'estimated',
    });
    const sq = CATALOG.find((c) => c.id === 'air-squats')!;
    expect(est['air-squats']).toEqual({ value: sq.defaultMax.medium, source: 'default' });
  });
  it('seconds are rounded to 5 and never mix with reps', () => {
    const est = estimateMaxes(CATALOG, { 'side-plank': { value: 120 } }, 'medium');
    expect(est['copenhagen-plank-short'].value % 5).toBe(0);
    expect(est['copenhagen-plank-short'].source).toBe('estimated');
    expect(est['suitcase-march'].source).toBe('default'); // reps, same family as the side plank
  });
});

describe('week as text for the coach', () => {
  it('lists workouts with rounds, minutes and targets', () => {
    const text = weekText(
      [{ id: 'a', title: 'Сила A', subtitle: 'Фокус: присед', formatLabel: '', rounds: 3, restBetweenExercises: 45, restBetweenRounds: 90, items: [{ exerciseId: 'x', target: 12 }] }],
      [{ id: 'x', name: 'Air Squats', metric: 'reps', checkup_max: 20, target_muscles: [], antagonist_muscles: [], cue: '', svgKey: 'generic_strength' }],
      () => 45,
      { header: 'Моя неделя', meta: (r, m) => `${r} кр. · ~${m} мин`, perSide: 'на сторону' }
    );
    expect(text).toBe('Моя неделя\n\n1. Сила A — 3 кр. · ~45 мин\n   Фокус: присед\n   • Air Squats — 12\n');
  });
});
