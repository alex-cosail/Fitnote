import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { INITIAL_WORKOUTS } from '../../data/seed';
import { isAvailable } from '../catalog/filter';
import { resolveExercises } from '../catalog/resolve';
import { buildWeek, DEFAULT_PROFILE } from '../generator';
import { dayPlan, LONGEVITY } from '../generator/day';
import { resolveWorkout } from '../plan/resolveWorkout';
import { draftProfile, toGeneratorProfile } from '../profile/profile';

const cat = (id: string) => CATALOG.find((c) => c.id === id)!;
const exercises = resolveExercises(CATALOG, catalogTextsFor('ru'), {}, [], 'medium');

describe('«Здоровье и восстановление» (Addendum №5)', () => {
  it('the profile switch reaches the conditions', () => {
    const p = { ...draftProfile(), ageGroup: 'masters' as const, trainingMode: 'longevity' as const, completedAt: 'x' };
    expect(toGeneratorProfile(p).usualConditions?.longevity).toBe(true);
    expect(toGeneratorProfile({ ...p, trainingMode: 'athletic' }).usualConditions?.longevity).toBeUndefined();
  });

  it('only gentle steps, nothing on the ground, no hanging with the feet off', () => {
    const cond = { longevity: true };
    expect(isAvailable(cat('incline-push-ups'), cond)).toBe(true);
    expect(isAvailable(cat('floor-push-ups'), cond)).toBe(false); // step 3
    expect(isAvailable(cat('side-plank'), cond)).toBe(false); // on the ground
    expect(isAvailable(cat('dead-hang'), cond)).toBe(false); // a full hang
    expect(isAvailable(cat('incline-australian-pull-ups'), cond)).toBe(true); // feet on the ground
    expect(isAvailable(cat('band-assisted-pull-ups'), cond)).toBe(false); // still a hang
    expect(isAvailable(cat('plank-shoulder-taps'), cond)).toBe(false); // hands on the ground
  });

  it('the generator respects it: a week of gentle steps only', () => {
    const profile = { ...DEFAULT_PROFILE, usualConditions: { ...DEFAULT_PROFILE.usualConditions, longevity: true } };
    const week = buildWeek(profile, { catalog: CATALOG, exercises, history: { lastDone: {}, swappedAway: {} }, date: '2026-11-28' });
    for (const g of week) for (const it of g.plan.items) if (it.exerciseId) expect(isAvailable(cat(it.exerciseId), { longevity: true }), it.exerciseId).toBe(true);
  });

  it('the day: 2 rounds, 60 / 105 s rest, a pull opens the round', () => {
    const plan = INITIAL_WORKOUTS.find((w) => w.id === 'workout-a')!;
    const profile = { ...DEFAULT_PROFILE, usualConditions: { longevity: true } };
    const { plan: day } = dayPlan(plan, 'green', { catalog: CATALOG, warmupMinutes: 5, cooldownMinutes: 4.5, profile });
    expect(day).toMatchObject({ rounds: LONGEVITY.rounds, restBetweenExercises: 60, restBetweenRounds: 105, useAgt30: false });
    const firstPattern = CATALOG.find((c) => c.id === day.items[0].exerciseId)?.pattern;
    expect(firstPattern).toBe('pull_h');
  });

  it('targets are fixed: 12, or 10 where a joint is kept gentle; no maxima', () => {
    const plan = { items: [{ exerciseId: 'floor-push-ups', target: 20 }, { exerciseId: 'box-squats', target: 20 }] };
    const r = resolveWorkout(plan, { catalog: CATALOG, exercises, conditions: { longevity: true, care: [{ joint: 'knee', level: 4 }] } });
    expect(CATALOG.find((c) => c.id === r[0].exerciseId)!.rank).toBeLessThanOrEqual(2); // push-ups → a gentler step
    expect(r[0].target).toBe(12);
    expect(r[1]).toMatchObject({ exerciseId: 'box-squats', target: 10 });
  });

  it('standing core at step 3 is fine (a band press); no exercise twice in one workout', () => {
    expect(isAvailable(cat('pallof-press'), { longevity: true, equipment: ['bands'] })).toBe(true);
    const plan = { items: [{ exerciseId: 'band-row', target: 10 }, { exerciseId: 'strict-pull-ups', target: 6 }] };
    const r = resolveWorkout(plan, { catalog: CATALOG, exercises, conditions: { longevity: true, equipment: ['pullup_bars', 'bands'] } });
    expect(r[0].exerciseId).toBe('band-row');
    expect(r[1].exerciseId).not.toBe('band-row');
    expect(CATALOG.find((c) => c.id === r[1].exerciseId)!.pattern).toBe('pull_h');
  });
});
