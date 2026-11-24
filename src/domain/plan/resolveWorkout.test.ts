import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { INITIAL_EXERCISES, INITIAL_WORKOUTS } from '../../data/seed';
import { Exercise, WorkoutPlan } from '../../types';
import { isAvailable } from '../catalog/filter';
import { ladderNeighbour, pickForPattern } from '../catalog/ladder';
import { calcAgt30 } from './targets';
import { resolveWorkout, targetFromSpec } from './resolveWorkout';

const cat = (id: string) => CATALOG.find((c) => c.id === id)!;
const ex = (id: string) => INITIAL_EXERCISES.find((e) => e.id === id)!;
const ctx = { catalog: CATALOG, exercises: INITIAL_EXERCISES };

describe('conditions filter', () => {
  it('no conditions = everything available', () => {
    expect(CATALOG.every((c) => isAvailable(c))).toBe(true);
  });

  it('home excludes bar-only exercises', () => {
    expect(isAvailable(cat('strict-pull-ups'), { environment: 'home' })).toBe(false);
    expect(isAvailable(cat('floor-push-ups'), { environment: 'home' })).toBe(true);
  });

  it('equipment: bodyweight is always there, bands only if you have them', () => {
    expect(isAvailable(cat('floor-push-ups'), { equipment: [] })).toBe(true);
    expect(isAvailable(cat('band-row'), { equipment: [] })).toBe(false);
    expect(isAvailable(cat('band-row'), { equipment: ['bands'] })).toBe(true);
  });

  it('NO TOUCH removes exercises with the body on the ground', () => {
    expect(isAvailable(cat('side-plank'), { cleanFloor: false })).toBe(false);
    expect(isAvailable(cat('dead-hang'), { cleanFloor: false })).toBe(true);
  });

  it('teens: no ++ and nothing marked as not for teens', () => {
    expect(isAvailable({ ...cat('parallel-bar-dips'), rank: 5 }, { ageGroup: 'teen' })).toBe(false);
    expect(isAvailable({ ...cat('pike-push-ups'), teenAllowed: false }, { ageGroup: 'teen' })).toBe(false);
    expect(isAvailable(cat('floor-push-ups'), { ageGroup: 'teen' })).toBe(true);
  });
});

describe('ladder', () => {
  it('uses the explicit link first', () => {
    expect(ladderNeighbour(CATALOG, 'bulgarian-split-squat', -1)?.id).toBe('reverse-lunges');
    expect(ladderNeighbour(CATALOG, 'floor-push-ups', 1)?.id).toBe('parallel-bar-dips');
  });

  it('falls back to the family when the link is not available', () => {
    // At home there are no bars: australian pull-ups are still possible on
    // suspension straps; without them the family offers band rows (easier).
    expect(ladderNeighbour(CATALOG, 'australian-pull-ups', -1, { equipment: ['bands'] })?.id).toBe('band-row');
  });

  it('returns undefined when nothing fits', () => {
    expect(ladderNeighbour(CATALOG, 'strict-pull-ups', -1)).toBeUndefined();
    expect(ladderNeighbour(CATALOG, 'unknown', 1)).toBeUndefined();
  });

  it('picks the nearest rank for a pattern, easier on a tie', () => {
    expect(pickForPattern(CATALOG, 'push_h', 3)?.id).toBe('floor-push-ups');
    expect(pickForPattern(CATALOG, 'push_h', 5)?.id).toBe('parallel-bar-dips');
    expect(pickForPattern(CATALOG, 'pull_v', 3, { environment: 'home' })).toBeUndefined();
  });
});

describe('targets from a spec', () => {
  it('fixed, % of max, RIR', () => {
    expect(targetFromSpec({ kind: 'fixed', value: 12 }, ex('floor-push-ups'))).toBe(12);
    expect(targetFromSpec({ kind: 'pctMax', pct: 0.5 }, ex('floor-push-ups'))).toBe(18); // 35 × 0.5
    expect(targetFromSpec({ kind: 'pctMax', pct: 0.3 }, ex('side-plank'))).toBe(35); // 120 × 0.3 → 35
    expect(targetFromSpec({ kind: 'rir', rir: 2 }, ex('strict-pull-ups'))).toBe(6); // 9 × 0.7
  });
});

describe('resolveWorkout', () => {
  it('old plans resolve exactly as before (pinned, fixed targets)', () => {
    for (const plan of INITIAL_WORKOUTS) {
      const res = resolveWorkout(plan, ctx);
      expect(res).toHaveLength(plan.items.length);
      res.forEach((r, i) => {
        const item = plan.items[i];
        expect(r.exerciseId).toBe(item.exerciseId);
        expect(r.substitutedFrom).toBeUndefined();
        expect(r.target).toBe(plan.useAgt30 ? calcAgt30(ex(item.exerciseId!)) : item.target);
      });
    }
  });

  it('a slot by pattern picks an exercise and computes the target from the max', () => {
    const plan: Pick<WorkoutPlan, 'items'> = {
      items: [{ pattern: 'push_h', rank: 3, target: 0, spec: { kind: 'pctMax', pct: 0.5 } }],
    };
    expect(resolveWorkout(plan, ctx)).toEqual([
      { slotIndex: 0, exerciseId: 'floor-push-ups', target: 18, substitutedFrom: undefined },
    ]);
  });

  it('an unavailable pinned exercise is replaced within its pattern, target scaled by maxima', () => {
    // Dips (max 23) at home → floor push-ups (max 35): 15 × 35 / 23 ≈ 23.
    const plan = { items: [{ exerciseId: 'parallel-bar-dips', target: 15 }] };
    const [r] = resolveWorkout(plan, { ...ctx, conditions: { environment: 'home' } });
    expect(r).toMatchObject({ exerciseId: 'floor-push-ups', target: 23, substitutedFrom: 'parallel-bar-dips' });
  });

  it('NO TOUCH swaps a floor exercise of the same pattern', () => {
    const plan = { items: [{ exerciseId: 'side-plank', target: 45 }] };
    const [r] = resolveWorkout(plan, { ...ctx, conditions: { cleanFloor: false } });
    expect(r.exerciseId).not.toBe('side-plank');
    expect(cat(r.exerciseId).pattern).toBe('core');
    expect(cat(r.exerciseId).posture).not.toContain('floor_contact');
  });

  it('keeps the slot flagged when nothing fits', () => {
    const plan = { items: [{ exerciseId: 'strict-pull-ups', target: 6 }] };
    expect(resolveWorkout(plan, { ...ctx, conditions: { environment: 'home' } })).toEqual([
      { slotIndex: 0, exerciseId: 'strict-pull-ups', target: 6, unavailable: true },
    ]);
  });

  it('custom exercises are always available', () => {
    const custom: Exercise = { ...ex('dead-hang'), id: 'custom-1', isCustom: true };
    const plan = { items: [{ exerciseId: 'custom-1', target: 10 }] };
    const [r] = resolveWorkout(plan, {
      catalog: CATALOG,
      exercises: [custom, ...INITIAL_EXERCISES],
      conditions: { environment: 'home', cleanFloor: false },
    });
    expect(r).toMatchObject({ exerciseId: 'custom-1', target: 10 });
  });

  it('drops slots that reference an unknown exercise and have no pattern', () => {
    const plan = { items: [{ exerciseId: 'ghost', target: 5 }, { exerciseId: 'dead-hang', target: 30 }] };
    const res = resolveWorkout(plan, ctx);
    expect(res.map((r) => [r.slotIndex, r.exerciseId])).toEqual([[1, 'dead-hang']]);
  });
});
