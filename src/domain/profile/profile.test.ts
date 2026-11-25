import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { resolveExercises } from '../catalog/resolve';
import { buildWeek } from '../generator';
import {
  clampZones, conditionsOf, DEFAULT_EQUIPMENT, draftProfile, nextMark, recommendZones, requestFor, toGeneratorProfile,
} from './profile';

describe('start accents from the lifestyle (wizard screen 1 → 2)', () => {
  it('desk work 6+ h: + on horizontal pulls/pushes and the hip hinge', () => {
    expect(recommendZones({ steps: '5to8k', desk: '6plus', run: 'none' })).toEqual({ upper_h: 'plus', hinge: 'plus' });
  });
  it('few steps and no running: + on single-leg balance', () => {
    expect(recommendZones({ steps: 'lt5k', desk: 'lt4', run: 'none' })).toEqual({ lunge: 'plus' });
    expect(recommendZones({ steps: 'lt5k', desk: 'lt4', run: 'some' })).toEqual({});
  });
  it('teens never get ++; tapping cycles Base → + → ++ → Base (teens Base ↔ +)', () => {
    expect(clampZones({ core: 'plusplus', squat: 'plus' }, 'teen')).toEqual({ core: 'plus', squat: 'plus' });
    expect([nextMark(undefined, 'adult'), nextMark('plus', 'adult'), nextMark('plusplus', 'adult')]).toEqual(['plus', 'plusplus', 'base']);
    expect(nextMark('plus', 'teen')).toBe('base');
  });
});

describe('conditions from the equipment', () => {
  it('bars mean the playground, a mat means home, both mean anywhere', () => {
    expect(conditionsOf({ ...DEFAULT_EQUIPMENT, bars: true, mat: false }, 'adult').environment).toBe('outdoor');
    expect(conditionsOf({ ...DEFAULT_EQUIPMENT, bars: false, mat: true }, 'adult').environment).toBe('home');
    expect(conditionsOf({ ...DEFAULT_EQUIPMENT, bars: true, mat: true }, 'adult').environment).toBeUndefined();
  });
  it('dirty floor = NO TOUCH; teens pass their age group on', () => {
    const c = conditionsOf({ ...DEFAULT_EQUIPMENT, dirtyFloor: true, weights: true }, 'teen');
    expect(c.cleanFloor).toBe(false);
    expect(c.equipment).toEqual(expect.arrayContaining(['pullup_bars', 'bands', 'weights']));
    expect(c.ageGroup).toBe('teen');
  });
});

describe('the generator sees the person', () => {
  const exercises = resolveExercises(CATALOG, catalogTextsFor('ru'), {}, [], 'medium');
  const ctx = { catalog: CATALOG, exercises, history: { lastDone: {}, swappedAway: {} }, date: '2026-11-26' };

  it('the generator questions default to the profile: level and workouts a week', () => {
    expect(requestFor({ ...draftProfile(), healthLevel: 'form', perWeek: 2 })).toMatchObject({ level: 'agt', perWeek: 2 });
    expect(requestFor(undefined)).toMatchObject({ level: 'full', perWeek: 3 });
  });

  it('a desk worker gets horizontal pulls first; the default person gets legs + pull', () => {
    const desk = { ...draftProfile(), zones: { upper_h: 'plusplus' as const, hinge: 'plus' as const } };
    const [a] = buildWeek(toGeneratorProfile(desk), ctx);
    expect(['pull_h', 'push_h']).toContain(a.plan.items[0].pattern);
    const [d] = buildWeek(toGeneratorProfile(undefined), ctx);
    expect(d.focus).toEqual(['squat', 'pull_v']);
  });

  it('home with a mat and bands: no bar exercises, floor work allowed', () => {
    const home = { ...draftProfile(), equipment: { ...DEFAULT_EQUIPMENT, bars: false, mat: true } };
    const week = buildWeek(toGeneratorProfile(home), ctx);
    const byId = new Map(CATALOG.map((c) => [c.id, c]));
    for (const g of week) for (const it of g.plan.items) {
      const c = byId.get(it.exerciseId!)!;
      expect(c.environments, c.id).toContain('home');
      expect(c.equipment.length === 1 && c.equipment[0] === 'pullup_bars', c.id).toBe(false);
    }
  });

  it('dirty floor: nothing lying on the ground', () => {
    const p = { ...draftProfile(), equipment: { ...DEFAULT_EQUIPMENT, dirtyFloor: true } };
    const byId = new Map(CATALOG.map((c) => [c.id, c]));
    for (const g of buildWeek(toGeneratorProfile(p), ctx)) for (const it of g.plan.items) {
      expect(byId.get(it.exerciseId!)!.posture, it.exerciseId).not.toContain('floor_contact');
    }
  });
});

describe('substitutes when a pattern is not possible here (§11)', () => {
  const exercises = resolveExercises(CATALOG, catalogTextsFor('ru'), {}, [], 'medium');
  const ctx = { catalog: CATALOG, exercises, history: { lastDone: {}, swappedAway: {} }, date: '2026-11-26' };
  it('home without a bar: every workout still has a pull (band row instead of pull-ups)', () => {
    for (const healthLevel of ['form', 'strength'] as const) {
      const home = { ...draftProfile(), healthLevel, perWeek: 3, equipment: { ...DEFAULT_EQUIPMENT, bars: false, mat: true } };
      for (const g of buildWeek(toGeneratorProfile(home), ctx)) {
        if (g.component === 'M') continue;
        const pats = g.plan.items.map((it) => it.pattern);
        if (g.kind !== 'F') expect(pats.some((p) => p === 'pull_h' || p === 'pull_v'), `${g.kind} ${pats.join(' ')}`).toBe(true);
      }
    }
  });
});
