import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { resolveExercises } from '../catalog/resolve';
import { WorkoutPlan } from '../../types';
import { applySwaps, changeOptions, sessionSwaps, swapTarget } from './change';

const exercises = resolveExercises(CATALOG, catalogTextsFor('ru'), { 'australian-pull-ups': { value: 25, date: '2026-11-01' } }, [], 'medium');
const ex = (id: string) => exercises.find((e) => e.id === id)!;

describe('«Изменить» during a workout', () => {
  it('australian pull-ups: easier is the 45° variant, harder is feet-elevated', () => {
    const o = changeOptions('australian-pull-ups', CATALOG, exercises);
    expect(o.easier?.id).toBe('incline-australian-pull-ups');
    expect(o.harder?.id).toBe('feet-elevated-australian-pull-ups');
    expect(o.samePattern.every((e) => CATALOG.find((c) => c.id === e.id)!.pattern === 'pull_h')).toBe(true);
    expect(o.samePattern.map((e) => e.id)).not.toContain('incline-australian-pull-ups');
  });

  it('pike push-ups can become the band overhead press (same pattern, bands here)', () => {
    const o = changeOptions('pike-push-ups', CATALOG, exercises, { equipment: ['pullup_bars', 'bands'] });
    const all = [o.easier, o.harder, ...o.samePattern].map((e) => e?.id);
    expect(all).toContain('band-overhead-press');
  });

  it('without bands the band press is not offered', () => {
    const o = changeOptions('pike-push-ups', CATALOG, exercises, { equipment: [] });
    expect([o.easier, o.harder, ...o.samePattern].map((e) => e?.id)).not.toContain('band-overhead-press');
  });

  it('the target keeps the share of the max', () => {
    const from = { ...ex('australian-pull-ups'), checkup_max: 25 };
    const to = { ...ex('incline-australian-pull-ups'), checkup_max: 30 };
    expect(swapTarget(12, from, to)).toBe(14);
    expect(swapTarget(12, from, { ...to, checkup_max: 0 })).toBe(12);
  });

  it('«Заменить в тренировке» pins the new exercise in the plan', () => {
    const plan: WorkoutPlan = {
      id: 'p',
      title: 'P',
      subtitle: '',
      formatLabel: '',
      rounds: 3,
      restBetweenExercises: 30,
      restBetweenRounds: 60,
      items: [
        { exerciseId: 'pike-push-ups', target: 10 },
        { pattern: 'pull_h', rank: 3, target: 0, spec: { kind: 'pctMax', pct: 0.5 } },
      ],
    };
    const resolvedPull = 'australian-pull-ups';
    const next = applySwaps(plan, [{ from: 'pike-push-ups', to: 'band-overhead-press' }, { from: resolvedPull, to: 'incline-australian-pull-ups' }], {
      catalog: CATALOG,
      exercises,
    });
    expect(next.items[0]).toMatchObject({ exerciseId: 'band-overhead-press', pattern: 'push_v' });
    expect(next.items[1]).toMatchObject({ exerciseId: 'incline-australian-pull-ups', rank: 2, spec: { kind: 'pctMax', pct: 0.5 } });
  });

  it('session swaps: one per slot, back to the original is no swap', () => {
    expect(
      sessionSwaps([
        { exerciseId: 'b', swappedFromId: 'a' },
        { exerciseId: 'c' },
        { exerciseId: 'd', swappedFromId: 'd' },
      ])
    ).toEqual([{ from: 'a', to: 'b' }]);
  });
});
