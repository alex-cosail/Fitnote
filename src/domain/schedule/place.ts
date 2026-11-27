import { FitnoteData, WorkoutPlan } from '../../types';
import {
  Cycle, StartMode, Weekday, addDays, cycleAt, implicitCycle, mondayOf, planOn, startCycle, weekDates,
} from './schedule';

/** «Когда начать?»: a new cycle (three ways) or new plans in the current one. */
export type CycleChoice = StartMode | 'update';

type WeekData = Pick<FitnoteData, 'workouts' | 'cycles' | 'dayOverrides' | 'profile' | 'selectedWorkoutId'>;
// Since v3.12 nothing is dropped here: every workout stays in the archive.

/** Real cycles, or the implicit one for users from before v3.5. */
export function cyclesOf(data: WeekData, today: string): Cycle[] {
  if (data.cycles && data.cycles.length) return data.cycles;
  const c = implicitCycle(data.workouts, data.profile?.perWeek ?? 3, today);
  return c ? [c] : [];
}

/**
 * Puts a new set of plans on the calendar (customer's cases, 26.11):
 * today / nextWeek / afterCurrent start a new cycle; update keeps the current
 * cycle's dates and days-of-week source and swaps its plans (new accents).
 * Generated plans no cycle needs any more are dropped; coach and own plans
 * always stay.
 */
export function placeWeek<T extends WeekData>(
  data: T,
  plans: WorkoutPlan[],
  choice: CycleChoice,
  days: Weekday[],
  title: string,
  today: string
): T {
  const base = cyclesOf(data, today);
  let overrides = data.dayOverrides ?? {};
  let cycles: Cycle[];
  const active = cycleAt(base, today);
  const planIds = plans.map((p) => p.id);
  if (choice === 'update' && active) {
    cycles = base.map((c) => (c.id === active.id ? { ...c, planIds, days: [...days].sort((a, b) => a - b) as Weekday[] } : c));
  } else {
    const mode: StartMode = choice === 'update' ? 'today' : choice;
    ({ cycles, overrides } = startCycle(base, overrides, { title, planIds, days }, mode, today));
  }
  const newIds = new Set(planIds);
  const workouts = [...plans, ...data.workouts.filter((w) => !newIds.has(w.id))];
  return { ...data, cycles, dayOverrides: overrides, workouts, selectedWorkoutId: planIds[0] ?? data.selectedWorkoutId };
}

/**
 * One workout (generator «Разовая», «Создать свою»): onto today if it is
 * free, otherwise the next free day of this week (or today anyway).
 */
export function placeSingle<T extends WeekData>(data: T, plan: WorkoutPlan, today: string): T {
  const cycles = cyclesOf(data, today);
  const overrides = data.dayOverrides ?? {};
  const free = weekDates(today).filter((d) => d >= today && !planOn(cycles, overrides, d));
  const day = free[0] ?? today;
  return {
    ...data,
    cycles: data.cycles?.length ? data.cycles : cycles,
    dayOverrides: { ...overrides, [day]: plan.id },
    workouts: [plan, ...data.workouts.filter((w) => w.id !== plan.id)],
    selectedWorkoutId: plan.id,
  };
}

/** Unique ids for a newly placed set (the same day may generate twice). */
export function freshIds(plans: WorkoutPlan[], stamp: string): WorkoutPlan[] {
  return plans.map((p) => ({ ...p, id: `${p.id}-${stamp}` }));
}

export { addDays };
