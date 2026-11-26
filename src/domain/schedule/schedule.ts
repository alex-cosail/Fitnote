import { WorkoutLog, WorkoutPlan } from '../../types';

// The week and the cycle (customer decisions 26.11, docs/BACKLOG.md):
// plans stay as they are (templates); a cycle lays them out on weekdays from
// a start date. The schedule is computed, not stored per day — only moves
// (overrides) are stored. "Done" comes from the journal.

/** 0 = Monday … 6 = Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface Cycle {
  id: string;
  title: string;
  planIds: string[]; // in order; laid out round-robin on the days
  days: Weekday[]; // sorted
  startDate: string; // local ISO date YYYY-MM-DD
  endDate?: string; // inclusive; open-ended if absent
}

/** Moves by the person: date → plan id, or null for "no workout that day". */
export type DayOverrides = Record<string, string | null>;

export type StartMode = 'today' | 'nextWeek' | 'afterCurrent';

export type DayStatus = 'done' | 'missed' | 'today' | 'planned' | 'rest';

export interface DayView {
  date: string;
  weekday: Weekday;
  planId: string | null;
  status: DayStatus;
  logId?: string;
}

/** Default training days by workouts a week (2 → Tue/Fri, 3 → Mon/Wed/Fri…). */
export function defaultDays(perWeek: number): Weekday[] {
  const n = Math.max(1, Math.min(7, Math.round(perWeek)));
  const table: Record<number, Weekday[]> = {
    1: [2],
    2: [1, 4],
    3: [0, 2, 4],
    4: [0, 1, 3, 4],
    5: [0, 1, 2, 3, 4],
    6: [0, 1, 2, 3, 4, 5],
    7: [0, 1, 2, 3, 4, 5, 6],
  };
  return table[n];
}

// ——— dates (local calendar days, no time zones) ———

export function localDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
function parse(date: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function addDays(date: string, n: number): string {
  const d = parse(date);
  d.setDate(d.getDate() + n);
  return localDate(d);
}
export function weekdayOf(date: string): Weekday {
  return ((parse(date).getDay() + 6) % 7) as Weekday;
}
export function mondayOf(date: string): string {
  return addDays(date, -weekdayOf(date));
}
export function weekDates(date: string): string[] {
  const mon = mondayOf(date);
  return [0, 1, 2, 3, 4, 5, 6].map((i) => addDays(mon, i));
}
/** Local date of a journal entry (stored as an ISO timestamp). */
export function logDate(log: Pick<WorkoutLog, 'date'>): string {
  return localDate(new Date(log.date));
}

// ——— cycles ———

/** The cycle that covers this date (the latest started one wins). */
export function cycleAt(cycles: Cycle[], date: string): Cycle | undefined {
  return [...cycles]
    .filter((c) => c.startDate <= date && (!c.endDate || date <= c.endDate))
    .sort((a, b) => (a.startDate < b.startDate ? 1 : -1))[0];
}

/** The plan the cycle puts on this date (before moves). */
export function plannedFor(cycles: Cycle[], date: string): string | null {
  const c = cycleAt(cycles, date);
  if (!c || c.planIds.length === 0 || !c.days.includes(weekdayOf(date))) return null;
  // how many training days of this cycle came before this date
  let count = 0;
  for (let d = c.startDate; d < date; d = addDays(d, 1)) {
    if (c.days.includes(weekdayOf(d))) count++;
  }
  return c.planIds[count % c.planIds.length];
}

/** The plan for a date with the person's moves applied. */
export function planOn(cycles: Cycle[], overrides: DayOverrides, date: string): string | null {
  return date in overrides ? overrides[date] : plannedFor(cycles, date);
}

/** The week around a date: plan, status and the journal entry of each day. */
export function weekView(
  cycles: Cycle[],
  overrides: DayOverrides,
  logs: WorkoutLog[],
  date: string,
  today: string
): DayView[] {
  return weekDates(date).map((d) => {
    const planId = planOn(cycles, overrides, d);
    const dayLogs = logs.filter((l) => logDate(l) === d);
    const log = dayLogs.find((l) => l.workoutId && l.workoutId === planId) ?? dayLogs[0];
    let status: DayStatus;
    if (log) status = 'done';
    else if (!planId) status = 'rest';
    else if (d === today) status = 'today';
    else status = d < today ? 'missed' : 'planned';
    return { date: d, weekday: weekdayOf(d), planId, status, ...(log ? { logId: log.id } : {}) };
  });
}

/**
 * Move a workout to another day: onto a busy day the two swap places, onto a
 * free day it just moves (the old day becomes rest). Overrides that equal
 * the plan are dropped, so the store stays small.
 */
export function moveDay(cycles: Cycle[], overrides: DayOverrides, from: string, to: string): DayOverrides {
  if (from === to) return overrides;
  const a = planOn(cycles, overrides, from);
  const b = planOn(cycles, overrides, to);
  const next: DayOverrides = { ...overrides, [to]: a, [from]: b };
  for (const d of [from, to]) {
    if (next[d] === plannedFor(cycles, d)) delete next[d];
  }
  return next;
}

/** Two strength days in a row around a date (soft warning after a move). */
export function strengthInARow(
  cycles: Cycle[],
  overrides: DayOverrides,
  date: string,
  isStrength: (planId: string) => boolean
): boolean {
  const here = planOn(cycles, overrides, date);
  if (!here || !isStrength(here)) return false;
  return [addDays(date, -1), addDays(date, 1)].some((d) => {
    const p = planOn(cycles, overrides, d);
    return Boolean(p && isStrength(p));
  });
}

export const CYCLE_WEEKS = 4;

/**
 * Starts a new cycle (customer's three cases):
 * today — a limitation or a challenge: the current cycle ends yesterday;
 * nextWeek — bored of the exercises: from the next Monday;
 * afterCurrent — after the current cycle ends (open-ended → next Monday).
 * Moves on or after the new start are dropped.
 */
export function startCycle(
  cycles: Cycle[],
  overrides: DayOverrides,
  input: Omit<Cycle, 'startDate' | 'endDate' | 'id'> & { id?: string; weeks?: number },
  mode: StartMode,
  today: string
): { cycles: Cycle[]; overrides: DayOverrides; cycle: Cycle } {
  const current = cycleAt(cycles, today);
  const nextMonday = addDays(mondayOf(today), 7);
  let start: string;
  if (mode === 'today') start = today;
  else if (mode === 'nextWeek') start = nextMonday;
  else start = current?.endDate ? addDays(current.endDate, 1) : nextMonday;

  const weeks = input.weeks ?? CYCLE_WEEKS;
  const cycle: Cycle = {
    id: input.id ?? `cycle-${start}-${cycles.length + 1}`,
    title: input.title,
    planIds: input.planIds,
    days: [...input.days].sort((a, b) => a - b) as Weekday[],
    startDate: start,
    endDate: addDays(start, weeks * 7 - 1),
  };
  const closed = cycles
    // a cycle that would only start on/after the new one is replaced
    .filter((c) => c.startDate < start)
    .map((c) => (!c.endDate || c.endDate >= start ? { ...c, endDate: addDays(start, -1) } : c));
  const kept: DayOverrides = Object.fromEntries(Object.entries(overrides).filter(([d]) => d < start));
  return { cycles: [...closed, cycle], overrides: kept, cycle };
}

/** New accents in the current cycle: the same days and dates, new plans. */
export function updateCyclePlans(cycles: Cycle[], cycleId: string, planIds: string[]): Cycle[] {
  return cycles.map((c) => (c.id === cycleId ? { ...c, planIds } : c));
}

/**
 * Users with plans but no cycle yet (before v3.5): an open cycle from this
 * Monday made of the generated plans (or the first plans), on default days.
 */
export function implicitCycle(workouts: Pick<WorkoutPlan, 'id'>[], perWeek: number, today: string): Cycle | undefined {
  const generated = workouts.filter((w) => w.id.startsWith('gen-'));
  const pool = generated.length ? generated : workouts;
  if (pool.length === 0) return undefined;
  const n = Math.max(1, Math.min(perWeek, pool.length));
  return {
    id: 'implicit',
    title: '',
    planIds: pool.slice(0, n).map((w) => w.id),
    days: defaultDays(n),
    startDate: mondayOf(today),
  };
}
