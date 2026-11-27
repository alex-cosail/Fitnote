import { describe, expect, it } from 'vitest';
import { WorkoutLog } from '../../types';
import {
  Cycle, addDays, cycleAt, defaultDays, implicitCycle, localDate, mondayOf, moveDay, planOn, plannedFor, startCycle,
  strengthInARow, updateCyclePlans, weekDates, weekView, weekdayOf, cycleRecurrence,
} from './schedule';
import type { Weekday } from './schedule';
import { freshIds, placeSingle, placeWeek } from './place';

// 2026-11-23 is a Monday.
const MON = '2026-11-23';
const cycle: Cycle = { id: 'c1', title: 'Сила', planIds: ['A', 'B', 'C'], days: [0, 2, 4], startDate: MON };
const log = (date: string, workoutId?: string): WorkoutLog => ({
  id: `l-${date}`, date: `${date}T10:00:00`, workoutTitle: 'x', workoutId, readiness: 'green',
  roundsCompleted: 3, roundsPlanned: 3, durationSeconds: 2400, sets: [],
});

describe('dates', () => {
  it('weekdays from Monday, weeks Mon–Sun', () => {
    expect(weekdayOf(MON)).toBe(0);
    expect(weekdayOf('2026-11-29')).toBe(6);
    expect(mondayOf('2026-11-27')).toBe(MON);
    expect(weekDates('2026-11-26')).toEqual(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27', '2026-11-28', '2026-11-29']);
    expect(addDays('2026-11-30', 2)).toBe('2026-12-02');
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
  it('default days by workouts a week', () => {
    expect(defaultDays(2)).toEqual([1, 4]);
    expect(defaultDays(3)).toEqual([0, 2, 4]);
    expect(defaultDays(4)).toEqual([0, 1, 3, 4]);
  });
});

describe('the cycle lays plans out on its days', () => {
  it('round-robin over the training days, rest on the others', () => {
    expect(['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-27', '2026-11-30'].map((d) => plannedFor([cycle], d))).toEqual(['A', null, 'B', 'C', 'A']);
  });
  it('nothing before the start or after the end', () => {
    expect(plannedFor([cycle], '2026-11-22')).toBeNull();
    expect(plannedFor([{ ...cycle, endDate: '2026-11-27' }], '2026-11-30')).toBeNull();
  });
});

describe('moving workouts on the strip', () => {
  it('onto a busy day: swap (strength Wed ↔ Fri)', () => {
    const o = moveDay([cycle], {}, '2026-11-25', '2026-11-27');
    expect(planOn([cycle], o, '2026-11-25')).toBe('C');
    expect(planOn([cycle], o, '2026-11-27')).toBe('B');
  });
  it('onto a free day: move, the old day rests (Wed → Tue)', () => {
    const o = moveDay([cycle], {}, '2026-11-25', '2026-11-24');
    expect(planOn([cycle], o, '2026-11-24')).toBe('B');
    expect(planOn([cycle], o, '2026-11-25')).toBeNull();
  });
  it('moving back cleans the overrides up', () => {
    const o1 = moveDay([cycle], {}, '2026-11-25', '2026-11-24');
    expect(moveDay([cycle], o1, '2026-11-24', '2026-11-25')).toEqual({});
  });
  it('soft warning: two strength days in a row', () => {
    const o = moveDay([cycle], {}, '2026-11-25', '2026-11-24'); // B on Tue next to A on Mon
    expect(strengthInARow([cycle], o, '2026-11-24', () => true)).toBe(true);
    expect(strengthInARow([cycle], {}, '2026-11-25', () => true)).toBe(false);
  });
});

describe('the week view', () => {
  it('done from the journal, missed in the past, today, planned, rest', () => {
    const v = weekView([cycle], {}, [log('2026-11-23', 'A')], '2026-11-25', '2026-11-25');
    expect(v.map((d) => d.status)).toEqual(['done', 'rest', 'today', 'rest', 'planned', 'rest', 'rest']);
    const v2 = weekView([cycle], {}, [], '2026-11-26', '2026-11-26');
    expect(v2[0].status).toBe('missed');
  });
  it('an extra workout on a rest day shows as done', () => {
    const v = weekView([cycle], {}, [log('2026-11-24')], MON, '2026-11-26');
    expect(v[1].status).toBe('done');
  });
});

describe('starting a new cycle (the three cases)', () => {
  const input = { title: 'Новый', planIds: ['X', 'Y'], days: [1, 4] as const };
  it('today (a limitation or a challenge): the current one ends yesterday', () => {
    const r = startCycle([cycle], { '2026-11-28': 'A' }, { ...input, days: [1, 4] }, 'today', '2026-11-26');
    expect(r.cycle.startDate).toBe('2026-11-26');
    expect(r.cycles.find((c) => c.id === 'c1')!.endDate).toBe('2026-11-25');
    expect(r.overrides).toEqual({});
    expect(cycleAt(r.cycles, '2026-11-24')!.id).toBe('c1');
    expect(plannedFor(r.cycles, '2026-11-27')).toBe('X');
  });
  it('next week (bored): starts next Monday, this week stays', () => {
    const r = startCycle([cycle], {}, { ...input, days: [1, 4] }, 'nextWeek', '2026-11-26');
    expect(r.cycle.startDate).toBe('2026-11-30');
    expect(plannedFor(r.cycles, '2026-11-27')).toBe('C');
    expect(plannedFor(r.cycles, '2026-12-01')).toBe('X');
  });
  it('after the current cycle: the day after it ends', () => {
    const r = startCycle([{ ...cycle, endDate: '2026-12-20' }], {}, { ...input, days: [1, 4] }, 'afterCurrent', '2026-11-26');
    expect(r.cycle.startDate).toBe('2026-12-21');
    expect(r.cycle.endDate).toBe(addDays('2026-12-21', 27));
  });
  it('new accents in the current cycle: same days, new plans', () => {
    const c = updateCyclePlans([cycle], 'c1', ['A2', 'B2', 'C2']);
    expect(plannedFor(c, '2026-11-25')).toBe('B2');
  });
});

describe('implicit cycle for users before v3.5', () => {
  it('generated plans first, on default days from this Monday', () => {
    const c = implicitCycle([{ id: 'workout-a' }, { id: 'gen-1-S-A' }, { id: 'gen-1-S-B' }], 3, '2026-11-26')!;
    expect(c.planIds).toEqual(['gen-1-S-A', 'gen-1-S-B']);
    expect(c.days).toEqual([1, 4]);
    expect(c.startDate).toBe(MON);
  });
  it('coach plans when nothing was generated', () => {
    expect(implicitCycle([{ id: 'workout-a' }, { id: 'workout-b' }, { id: 'workout-c-agt' }], 3, MON)!.planIds).toEqual(['workout-a', 'workout-b', 'workout-c-agt']);
  });
});

describe('placing a new week (generator, wizard)', () => {
  const plan = (id: string) => ({ id, title: id, subtitle: '', formatLabel: '', rounds: 3, restBetweenExercises: 45, restBetweenRounds: 90, items: [] });
  const data = {
    workouts: [plan('workout-a'), plan('gen-old-S-A'), plan('gen-old-S-B')],
    cycles: [{ id: 'c1', title: 'old', planIds: ['gen-old-S-A', 'gen-old-S-B'], days: [0, 3] as Weekday[], startDate: MON }],
    dayOverrides: {},
    selectedWorkoutId: 'workout-a',
  };
  const fresh = [plan('gen-new-S-A'), plan('gen-new-S-B')];

  it('today: new plans from today, old generated ones gone if no cycle needs them later', () => {
    const r = placeWeek(data, fresh, 'today', [1, 4], 'new', '2026-11-26');
    expect(plannedFor(r.cycles!, '2026-11-27')).toBe('gen-new-S-A');
    expect(r.selectedWorkoutId).toBe('gen-new-S-A');
    // the old cycle still covers Mon–Wed of this week, so its plans stay for the strip
    expect(r.workouts.map((w) => w.id)).toEqual(['gen-new-S-A', 'gen-new-S-B', 'workout-a', 'gen-old-S-A', 'gen-old-S-B']);
  });
  it('next week: this week keeps the old plans', () => {
    const r = placeWeek(data, fresh, 'nextWeek', [1, 4], 'new', '2026-11-26');
    expect(plannedFor(r.cycles!, '2026-11-26')).toBe('gen-old-S-B');
    expect(plannedFor(r.cycles!, '2026-12-01')).toBe('gen-new-S-A');
    expect(r.workouts.some((w) => w.id === 'gen-old-S-A')).toBe(true);
  });
  it('update: same cycle, new plans and days, no new cycle', () => {
    const r = placeWeek(data, fresh, 'update', [0, 3], 'new', '2026-11-26');
    expect(r.cycles).toHaveLength(1);
    expect(plannedFor(r.cycles!, '2026-11-26')).toBe('gen-new-S-B');
    // v3.12: the old plans stay in the archive instead of being dropped.
    expect(r.workouts.some((w) => w.id === 'gen-old-S-A')).toBe(true);
  });
  it('a single workout goes onto today if free, else the next free day', () => {
    const r = placeSingle(data, plan('own-1'), '2026-11-25');
    expect(planOn(r.cycles!, r.dayOverrides!, '2026-11-25')).toBe('own-1');
    const r2 = placeSingle(data, plan('own-2'), '2026-11-26'); // Thu is busy (B)
    expect(planOn(r2.cycles!, r2.dayOverrides!, '2026-11-27')).toBe('own-2');
  });
  it('fresh ids keep the kind readable', () => {
    expect(freshIds([plan('gen-1-0-S-A')], 'x9')[0].id).toBe('gen-1-0-S-A-x9');
  });
});

describe('the cycle in the phone calendar', () => {
  it('one weekly event on the cycle days until its end, from the next training day', () => {
    const r = cycleRecurrence({ ...cycle, days: [1, 4], endDate: '2026-12-20' }, '2026-11-26', '18:30')!;
    expect(r.rrule).toBe('FREQ=WEEKLY;BYDAY=TU,FR;UNTIL=20261220T235959Z');
    expect(localDate(r.start)).toBe('2026-11-27');
    expect(r.start.getHours()).toBe(18);
    expect(r.start.getMinutes()).toBe(30);
  });
  it('a cycle that starts later begins on its first training day', () => {
    const r = cycleRecurrence({ ...cycle, startDate: '2026-11-30', days: [2] }, '2026-11-26', '07:00')!;
    expect(localDate(r.start)).toBe('2026-12-02');
    expect(r.rrule).toBe('FREQ=WEEKLY;BYDAY=WE');
  });
});
