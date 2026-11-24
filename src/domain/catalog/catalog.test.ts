import { describe, expect, it } from 'vitest';
import { CATALOG, SEED_MAXES } from '../../data/catalog';
import { CATALOG_TEXT_RU } from '../../data/catalogText.ru';
import { CATALOG_IDS, INITIAL_EXERCISES } from '../../data/seed';
import { readAnyStore } from '../../storage/schema';
import { Exercise } from '../../types';
import { resolveExercises } from './resolve';
import { MOVEMENT_PATTERNS } from './types';
import { absorbIntoCatalog, recordMax, splitLegacyExercises } from './userMaxes';
import { validateCatalog } from './validate';

// Catalog validation runs with every test / build check: any new exercise
// added by the author (with AI, by template) must pass these.
describe('catalog integrity', () => {
  it('ids are unique and permanent-looking', () => {
    const ids = CATALOG.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
  });

  for (const c of CATALOG) {
    describe(c.id, () => {
      it('has Russian name and cue', () => {
        expect(CATALOG_TEXT_RU[c.id]?.name).toBeTruthy();
        expect(CATALOG_TEXT_RU[c.id]?.cue).toBeTruthy();
      });

      it('has valid tags', () => {
        expect(MOVEMENT_PATTERNS).toContain(c.pattern);
        expect(c.rank).toBeGreaterThanOrEqual(1);
        expect(c.rank).toBeLessThanOrEqual(5);
        expect(c.family).toBeTruthy();
        expect(c.environments.length).toBeGreaterThan(0);
        expect(c.equipment.length).toBeGreaterThan(0);
        expect(c.posture.length).toBeGreaterThan(0);
        expect(c.targetMuscles.length).toBeGreaterThan(0);
      });

      it('default maxima grow with level', () => {
        const { low, medium, high } = c.defaultMax;
        expect(low).toBeGreaterThan(0);
        expect(low).toBeLessThanOrEqual(medium);
        expect(medium).toBeLessThanOrEqual(high);
      });

      it('ladder neighbours exist, are in the same family and step the right way', () => {
        const byId = (id: string) => CATALOG.find((x) => x.id === id);
        if (c.ladder?.minus1) {
          const n = byId(c.ladder.minus1);
          expect(n, `${c.ladder.minus1} missing`).toBeTruthy();
          expect(n!.family).toBe(c.family);
          expect(n!.rank).toBeLessThanOrEqual(c.rank);
        }
        if (c.ladder?.plus1) {
          const n = byId(c.ladder.plus1);
          expect(n, `${c.ladder.plus1} missing`).toBeTruthy();
          expect(n!.family).toBe(c.family);
          expect(n!.rank).toBeGreaterThanOrEqual(c.rank);
        }
      });
    });
  }

  it('passes the shared catalog validator with no errors or warnings', () => {
    expect(validateCatalog(CATALOG, CATALOG_TEXT_RU)).toEqual([]);
  });

  it('validator reports problems in plain Russian', () => {
    const bad = { ...CATALOG[0], id: 'Bad Id', rank: 7 as never, ladder: { minus1: 'nope' } };
    const issues = validateCatalog([bad], {}, CATALOG);
    const text = issues.map((i) => i.message).join('\n');
    expect(text).toContain('id: только латиница');
    expect(text).toContain('нет названия');
    expect(text).toContain('rank — число от 1');
    expect(text).toContain('"nope" нет ни в каталоге');
    const dup = validateCatalog([CATALOG[0]], CATALOG_TEXT_RU, CATALOG);
    expect(dup.map((i) => i.message)).toContain('такой id уже есть в каталоге — придумайте другой');
  });

  it('texts exist only for catalog ids', () => {
    for (const id of Object.keys(CATALOG_TEXT_RU)) expect(CATALOG_IDS.has(id)).toBe(true);
  });
});

describe('resolveExercises', () => {
  const custom: Exercise = {
    ...INITIAL_EXERCISES[0],
    id: 'custom-1',
    name: 'My move',
    isCustom: true,
  };

  it('reproduces the v2 exercise list with the shipped maxima', () => {
    const pullups = INITIAL_EXERCISES.find((e) => e.id === 'strict-pull-ups')!;
    expect(pullups).toMatchObject({
      name: 'Strict Pull-Ups',
      metric: 'reps',
      checkup_max: 9,
      lastCheckupDate: '2026-11-01',
      svgKey: 'pullups',
    });
    expect(INITIAL_EXERCISES.find((e) => e.id === 'side-plank')).toMatchObject({
      isPaired: true,
      checkup_max: 120,
    });
    expect(INITIAL_EXERCISES).toHaveLength(CATALOG.length);
  });

  it('uses the default max for the level when the user has none', () => {
    const list = resolveExercises(CATALOG, CATALOG_TEXT_RU, {}, [], 'low');
    const pullups = list.find((e) => e.id === 'strict-pull-ups')!;
    expect(pullups.checkup_max).toBe(1);
    expect(pullups.lastCheckupDate).toBeUndefined();
  });

  it('puts custom exercises first', () => {
    const list = resolveExercises(CATALOG, CATALOG_TEXT_RU, SEED_MAXES, [custom]);
    expect(list[0].id).toBe('custom-1');
    expect(list).toHaveLength(CATALOG.length + 1);
  });

  it('records a check-up max where it belongs', () => {
    const user = { maxes: SEED_MAXES, customExercises: [custom] };
    const a = recordMax(user, CATALOG_IDS, 'strict-pull-ups', 11, '2026-11-24');
    expect(a.maxes['strict-pull-ups']).toEqual({ value: 11, date: '2026-11-24' });
    expect(a.customExercises).toBe(user.customExercises);
    const b = recordMax(user, CATALOG_IDS, 'custom-1', 7, '2026-11-24');
    expect(b.customExercises[0]).toMatchObject({ checkup_max: 7, lastCheckupDate: '2026-11-24' });
    expect(b.maxes).toBe(user.maxes);
  });
});

describe('custom exercise later added to the catalog', () => {
  const ids = new Set([...CATALOG_IDS, 'air-squats']);
  const airSquats: Exercise = {
    ...INITIAL_EXERCISES[0],
    id: 'air-squats',
    name: 'Air Squats',
    checkup_max: 40,
    lastCheckupDate: '2026-11-20',
    isCustom: true,
  };
  const other: Exercise = { ...airSquats, id: 'hanging-knee-raises', name: 'Hanging Knee Raises' };

  it('moves its max into maxes and drops the custom copy', () => {
    const res = absorbIntoCatalog({ maxes: SEED_MAXES, customExercises: [airSquats, other] }, ids);
    expect(res.maxes['air-squats']).toEqual({ value: 40, date: '2026-11-20' });
    expect(res.customExercises.map((e) => e.id)).toEqual(['hanging-knee-raises']);
  });

  it('keeps a max the user already has in maxes', () => {
    const res = absorbIntoCatalog(
      { maxes: { 'air-squats': { value: 50 } }, customExercises: [airSquats] },
      ids
    );
    expect(res.maxes['air-squats'].value).toBe(50);
    expect(res.customExercises).toEqual([]);
  });

  it('is a no-op when nothing collides', () => {
    const user = { maxes: SEED_MAXES, customExercises: [other] };
    expect(absorbIntoCatalog(user, CATALOG_IDS)).toBe(user);
  });
});

describe('migration v2 → v3 (catalog split)', () => {
  // An old store: full catalog copies with the user's maxima + one custom move.
  const oldExercises: Exercise[] = [
    ...INITIAL_EXERCISES.map((e) =>
      e.id === 'strict-pull-ups' ? { ...e, checkup_max: 13, lastCheckupDate: '2026-11-20' } : e
    ),
    { ...INITIAL_EXERCISES[0], id: 'custom-123', name: 'Hanging knee raise' },
  ];

  it('turns catalog copies into maxima and keeps custom exercises', () => {
    const data = readAnyStore({
      schemaVersion: 2,
      data: { exercises: oldExercises, workoutLogs: [{ id: 'w1' }] },
    }) as Record<string, unknown>;
    expect(data.exercises).toBeUndefined();
    const maxes = data.maxes as Record<string, { value: number; date?: string }>;
    expect(maxes['strict-pull-ups']).toEqual({ value: 13, date: '2026-11-20' });
    expect(maxes['side-plank'].value).toBe(120);
    expect(data.customExercises).toEqual([
      expect.objectContaining({ id: 'custom-123', name: 'Hanging knee raise', isCustom: true }),
    ]);
    expect(data.workoutLogs).toEqual([{ id: 'w1' }]);
  });

  it('also migrates a bare v1 store (v1 → v2 → v3)', () => {
    const data = readAnyStore({ exercises: oldExercises }) as Record<string, unknown>;
    expect((data.maxes as Record<string, { value: number }>)['strict-pull-ups'].value).toBe(13);
  });

  it('a store without exercises gets no maxima (defaults apply later)', () => {
    const data = readAnyStore({ schemaVersion: 2, data: { workoutLogs: [] } }) as Record<string, unknown>;
    expect(data.maxes).toBeUndefined();
  });

  it('split skips broken entries', () => {
    const res = splitLegacyExercises([null as never, { id: 5 } as never], CATALOG_IDS);
    expect(res).toEqual({ maxes: {}, customExercises: [] });
  });
});
