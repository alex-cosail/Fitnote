import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { WorkoutLog } from '../../types';
import { resolveExercises } from '../catalog/resolve';
import { DEFAULT_PROFILE, hasSameDirectionInRow } from '../generator';
import { addPatterns, mondayNote, reviewWeek, topUpDue } from './compensation';

const log = (date: string, ids: string[], outcome?: WorkoutLog['outcome']): WorkoutLog => ({
  id: `l-${date}`, date: `${date}T10:00:00`, workoutTitle: 'x', readiness: 'green', outcome,
  roundsCompleted: 3, roundsPlanned: 3, durationSeconds: 2400,
  sets: ids.map((exerciseId, i) => ({ round: 1, exerciseId, exerciseName: exerciseId, metric: 'reps', target: 10, actual: 10, rir: '1', completedAt: `${date}T10:${i}` })),
});
const upper = ['floor-push-ups', 'strict-pull-ups', 'australian-pull-ups', 'pike-push-ups'];

describe('week review', () => {
  it('a week of upper body only misses legs, hinge and core', () => {
    const r = reviewWeek([log('2026-11-23', upper), log('2026-11-25', upper)], CATALOG, '2026-11-27', 3);
    expect(r.workouts).toBe(2);
    expect(r.missing).toEqual(expect.arrayContaining(['squat', 'hinge', 'lunge', 'core']));
  });
  it('the weekend top-up shows Fri–Sun only, with a workout done and something missing', () => {
    const logs = [log('2026-11-23', upper)];
    expect(topUpDue(reviewWeek(logs, CATALOG, '2026-11-28', 3), '2026-11-28')).toBe(true);
    expect(topUpDue(reviewWeek(logs, CATALOG, '2026-11-25', 3), '2026-11-25')).toBe(false);
    expect(topUpDue(reviewWeek([], CATALOG, '2026-11-28', 3), '2026-11-28')).toBe(false);
  });
});

describe('Monday note', () => {
  it('last week lacked legs and core → take them into the first workout', () => {
    const n = mondayNote([log('2026-11-23', upper), log('2026-11-26', upper)], CATALOG, '2026-11-30', 3)!;
    expect(n.missing.length).toBe(2);
    expect(n.goShort).toBe(false);
  });
  it('a hard week suggests starting short', () => {
    const full = ['air-squats', 'floor-push-ups', 'strict-pull-ups', 'romanian-deadlift', 'side-plank', 'australian-pull-ups', 'reverse-lunges', 'pike-push-ups'];
    const n = mondayNote([log('2026-11-23', full, 'hard'), log('2026-11-25', full, 'hard'), log('2026-11-27', full, 'ok')], CATALOG, '2026-11-30', 3)!;
    expect(n.goShort).toBe(true);
  });
  it('gone once the first workout of the new week is logged; nothing after an empty week', () => {
    expect(mondayNote([log('2026-11-23', upper), log('2026-11-30', upper)], CATALOG, '2026-12-01', 3)).toBeUndefined();
    expect(mondayNote([], CATALOG, '2026-11-30', 3)).toBeUndefined();
  });
});

describe('taking missing movements into a workout', () => {
  const exercises = resolveExercises(CATALOG, catalogTextsFor('ru'), {}, [], 'medium');
  const ctx = { catalog: CATALOG, exercises, history: { lastDone: {}, swappedAway: {} }, date: '2026-11-30' };
  const plan = {
    id: 'p', title: 'A', subtitle: '', formatLabel: '', rounds: 3, restBetweenExercises: 45, restBetweenRounds: 90,
    items: upper.map((exerciseId) => ({ exerciseId, target: 8 })),
  };
  it('adds one exercise per pattern (≤ 2), keeps the original, fixes the order', () => {
    const r = addPatterns(plan, ['squat', 'core', 'hinge'], 'S', DEFAULT_PROFILE, ctx);
    expect(r.items.length).toBe(6);
    const byId = new Map(CATALOG.map((c) => [c.id, c]));
    const pats = r.items.map((it) => byId.get(it.exerciseId!)!.pattern);
    expect(pats).toEqual(expect.arrayContaining(['squat', 'core']));
    expect(hasSameDirectionInRow(pats)).toBe(false);
    expect(r.original!.items).toHaveLength(4);
  });
  it('a pattern the plan already has is not added again', () => {
    const withSquat = { ...plan, items: [...plan.items, { exerciseId: 'air-squats', target: 20 }] };
    const r = addPatterns(withSquat, ['squat'], 'S', DEFAULT_PROFILE, ctx);
    expect(r).toBe(withSquat);
  });
});
