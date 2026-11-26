import { describe, expect, it } from 'vitest';
import { WorkoutLog } from '../../types';
import {
  Cycle, addDays, cycleAt, defaultDays, implicitCycle, localDate, mondayOf, moveDay, planOn, plannedFor, startCycle,
  strengthInARow, updateCyclePlans, weekDates, weekView, weekdayOf,
} from './schedule';

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
