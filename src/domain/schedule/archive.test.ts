import { describe, expect, it } from 'vitest';
import type { FitnoteData, WorkoutPlan } from '../../types';
import { archiveOf, fourWeeks, placeSeriesAt, placeSingleOn, plansOnDate, removeFromArchive, setSessionDay, weekPlans } from './archive';
import { plannedFor } from './schedule';

const plan = (id: string, title = id): WorkoutPlan => ({
  id, title, subtitle: '', formatLabel: 'Сила', rounds: 3, restBetweenExercises: 30, restBetweenRounds: 60, items: [],
});

// The author's case (28.11): a week of 5 generated workouts not in the calendar, plus coach plans.
const week5 = ['S-A', 'F-A', 'S-B', 'M-A', 'F-B'].map((k) => plan(`gen-1-0-${k}-mi3x9q2`, k));
const base: Pick<FitnoteData, 'workouts' | 'cycles' | 'dayOverrides' | 'archive' | 'dayExtras' | 'profile'> = { workouts: [...week5, plan('workout-a', 'Workout A'), plan('own-core', 'Акцент кор 20 мин')], cycles: [], dayOverrides: {} };

describe('archive', () => {
  it('nothing is lost: one generation becomes a series, the rest are singles', () => {
    const a = archiveOf(base);
    const series = a.filter((x) => x.kind === 'series');
    expect(series).toHaveLength(1);
    expect(series[0].planIds).toHaveLength(5);
    expect(series[0].days).toEqual([0, 1, 2, 3, 4]);
    expect(a.filter((x) => x.kind === 'single').map((x) => x.title)).toEqual(['Workout A', 'Акцент кор 20 мин']);
    expect(a.flatMap((x) => x.planIds).sort()).toEqual(base.workouts.map((w) => w.id).sort());
  });

  it('a cycle in the calendar is a series with its weeks', () => {
    const cycle = { id: 'c1', title: 'Месяц: здоровая спина', planIds: ['workout-a', 'own-core'], days: [1, 4] as const, startDate: '2026-11-23', endDate: '2026-12-20' };
    const a = archiveOf({ ...base, cycles: [{ ...cycle, days: [...cycle.days] }] });
    expect(a.find((x) => x.title === 'Месяц: здоровая спина')).toMatchObject({ kind: 'series', weeks: 4, days: [1, 4] });
  });

  it('a series goes into the calendar from a Monday, sessions on the chosen days', () => {
    const series = archiveOf(base).find((x) => x.kind === 'series')!;
    const days = setSessionDay(series.days!, 4, 5); // the 5th session to Saturday
    const r = placeSeriesAt(base, series, '2026-12-03', days, 1); // a Thursday → its Monday
    expect(r.cycles![0]).toMatchObject({ startDate: '2026-11-30', endDate: '2026-12-06', days: [0, 1, 2, 3, 5] });
    expect(plannedFor(r.cycles!, '2026-12-05')).toBe(series.planIds[4]);
    expect(plannedFor(r.cycles!, '2026-12-07')).toBeNull(); // one week only
    expect(r.archive!.find((x) => x.id === series.id)!.days).toEqual(days);
  });

  it('two sessions cannot share a day: they swap', () => {
    expect(setSessionDay([0, 2, 4], 0, 2)).toEqual([2, 0, 4]);
  });

  it('a single goes on any day, a second one the same day is allowed', () => {
    const singles = archiveOf(base).filter((x) => x.kind === 'single');
    let r = placeSingleOn(base, singles[0], '2026-12-02');
    r = placeSingleOn(r, singles[1], '2026-12-02');
    expect(plansOnDate(r, '2026-12-02')).toEqual(['workout-a', 'own-core']);
    expect(weekPlans(r, '2026-12-04').map((p) => p.date)).toEqual(['2026-12-02', '2026-12-02']);
    expect(fourWeeks(r, '2026-11-30')[0][2].planIds).toHaveLength(2);
  });

  it('removing keeps what the calendar still needs', () => {
    const single = archiveOf(base).find((x) => x.title === 'Workout A')!;
    const placed = placeSingleOn(base, single, '2026-12-10');
    expect(removeFromArchive(placed, single, '2026-12-01')).toBe('in-use');
    const r = removeFromArchive(base, single, '2026-12-01');
    expect(r === 'in-use' ? [] : r.workouts.map((w) => w.id)).not.toContain('workout-a');
  });

  it('the running cycle keeps the current week and ends the day before the new series', () => {
    const running = { id: 'implicit', title: '', planIds: ['workout-a', 'own-core'], days: [0, 2] as (0 | 2)[], startDate: '2026-11-23' };
    const series = archiveOf(base).find((x) => x.kind === 'series')!;
    const r = placeSeriesAt({ ...base, cycles: [running] }, series, '2026-11-30', series.days!, 1);
    expect(plannedFor(r.cycles!, '2026-11-23')).toBe('workout-a');
    expect(r.cycles!.find((c) => c.id === 'implicit')!.endDate).toBe('2026-11-29');
  });
});
