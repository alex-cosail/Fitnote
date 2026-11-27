import type { FitnoteData, WorkoutPlan } from '../../types';
import {
  Cycle, DayOverrides, Weekday, addDays, cycleAt, defaultDays, mondayOf, planOn, weekdayOf,
} from './schedule';

// The archive of the constructor (field test 28.11, v3.12): every workout
// lives here — singles («Акцент кор 20 мин») and series («Неделя: выход на
// две, 5/нед», «Месяц: здоровая спина, 3/нед»). The calendar only holds
// placements: cycles (series from a Monday) and single workouts on any day,
// two a day allowed (`dayExtras`).

export interface ArchiveItem {
  id: string;
  kind: 'single' | 'series';
  title: string;
  planIds: string[];
  /** Series: how many weeks it runs from the start Monday. */
  weeks: number;
  /** Series: the weekday of each session, in planIds order. */
  days?: Weekday[];
}

type Data = Pick<FitnoteData, 'workouts' | 'cycles' | 'dayOverrides' | 'archive' | 'dayExtras' | 'profile'>;

/** freshIds() appends `-<stamp>` to a set of generated plans: same stamp = one set. */
function stampOf(id: string): string | undefined {
  const shared = /^shared-([a-z0-9]+)-\d+$/.exec(id); // a shared cycle: shared-<stamp>-<i>
  if (shared) return shared[1];
  if (!id.startsWith('gen-')) return undefined;
  return /-([a-z0-9]{6,})$/.exec(id)?.[1];
}

/**
 * The archive: what the person keeps (stored items whose plans still exist),
 * plus every workout not in any item yet — sets from one cycle or one
 * generation become a series, the rest are singles. Nothing is lost.
 */
export function archiveOf(data: Data): ArchiveItem[] {
  const byId = new Map(data.workouts.map((w) => [w.id, w]));
  const items: ArchiveItem[] = (data.archive ?? [])
    .map((it) => ({ ...it, planIds: it.planIds.filter((id) => byId.has(id)) }))
    .filter((it) => it.planIds.length > 0);
  const covered = new Set(items.flatMap((it) => it.planIds));

  // series from cycles
  for (const c of data.cycles ?? []) {
    const ids = c.planIds.filter((id) => byId.has(id) && !covered.has(id));
    if (ids.length < 2) continue;
    const weeks = c.endDate ? Math.max(1, Math.round((daysBetween(c.startDate, c.endDate) + 1) / 7)) : 4;
    items.push({ id: `arch-${c.id}`, kind: 'series', title: c.title || seriesTitle(ids.length), planIds: ids, weeks, days: daysFor(ids.length, c.days) });
    ids.forEach((id) => covered.add(id));
  }
  // series from one generation
  const groups = new Map<string, string[]>();
  for (const w of data.workouts) {
    if (covered.has(w.id)) continue;
    const s = stampOf(w.id);
    if (s) groups.set(s, [...(groups.get(s) ?? []), w.id]);
  }
  for (const [s, ids] of groups) {
    if (ids.length < 2) continue;
    const first = byId.get(ids[0]);
    items.push({ id: `arch-${s}`, kind: 'series', title: first?.formatLabel || seriesTitle(ids.length), planIds: ids, weeks: 1, days: daysFor(ids.length, data.profile?.days) });
    ids.forEach((id) => covered.add(id));
  }
  // the rest: singles
  for (const w of data.workouts) {
    if (covered.has(w.id)) continue;
    items.push({ id: `arch-${w.id}`, kind: 'single', title: w.title, planIds: [w.id], weeks: 1 });
  }
  return items;
}

/** Russian plural: 1 тренировка, 2 тренировки, 5 тренировок. */
export function plural(n: number, one: string, few: string, many: string): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return one;
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return few;
  return many;
}

const seriesTitle = (n: number) => `Неделя · ${n} ${plural(n, 'тренировка', 'тренировки', 'тренировок')}`;

function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / 86400000);
}

/** A weekday per session: the profile's days if they fit, else the default spread. */
export function daysFor(n: number, preferred?: Weekday[]): Weekday[] {
  const base = preferred && preferred.length >= n ? preferred : defaultDays(n);
  return [...base].sort((a, b) => a - b).slice(0, n) as Weekday[];
}

/** Changing one session's day: onto a day another session has, they swap. */
export function setSessionDay(days: Weekday[], index: number, day: Weekday): Weekday[] {
  const next = [...days];
  const other = next.indexOf(day);
  if (other >= 0 && other !== index) next[other] = next[index];
  next[index] = day;
  return next;
}

/**
 * A series into the calendar from a Monday: a cycle with the sessions in
 * weekday order; whatever ran over those weeks ends the day before.
 */
export function placeSeriesAt<T extends Data>(data: T, item: ArchiveItem, startMonday: string, days: Weekday[], weeks: number): T {
  const start = mondayOf(startMonday);
  const order = item.planIds.map((id, i) => ({ id, day: days[i] ?? (i as Weekday) })).sort((a, b) => a.day - b.day);
  const cycle: Cycle = {
    id: `cycle-${start}-${item.id}`,
    title: item.title,
    planIds: order.map((o) => o.id),
    days: [...new Set(order.map((o) => o.day))].sort((a, b) => a - b) as Weekday[],
    startDate: start,
    endDate: addDays(start, weeks * 7 - 1),
  };
  const end = cycle.endDate!;
  const cycles = (data.cycles ?? [])
    .filter((c) => !(c.startDate >= start && c.startDate <= end))
    .map((c) => (c.startDate < start && (!c.endDate || c.endDate >= start) ? { ...c, endDate: addDays(start, -1) } : c));
  // later cycles that started after this one keep going after it
  const overrides: DayOverrides = Object.fromEntries(Object.entries(data.dayOverrides ?? {}).filter(([d]) => d < start || d > end));
  const archive = keepInArchive(data, { ...item, days, weeks });
  return { ...data, cycles: [...cycles, cycle], dayOverrides: overrides, archive };
}

/** A single workout on a date: the day's workout if it is free, otherwise a second one that day. */
export function placeSingleOn<T extends Data>(data: T, item: ArchiveItem, date: string): T {
  const planId = item.planIds[0];
  const cycles = data.cycles ?? [];
  const overrides = data.dayOverrides ?? {};
  const archive = keepInArchive(data, item);
  if (!planOn(cycles, overrides, date)) return { ...data, dayOverrides: { ...overrides, [date]: planId }, archive };
  const extras = data.dayExtras ?? {};
  return { ...data, dayExtras: { ...extras, [date]: [...(extras[date] ?? []), planId] }, archive };
}

/** Stores the item (with its chosen days) so the archive remembers it. */
function keepInArchive(data: Data, item: ArchiveItem): ArchiveItem[] {
  const list = archiveOf(data);
  return list.some((it) => it.id === item.id) ? list.map((it) => (it.id === item.id ? item : it)) : [...list, item];
}

/** All workouts of a date: the day's one and the extras. */
export function plansOnDate(data: Data, date: string): string[] {
  const main = planOn(data.cycles ?? [], data.dayOverrides ?? {}, date);
  return [...(main ? [main] : []), ...(data.dayExtras?.[date] ?? [])];
}

/** The workouts of a week, by date, for the first screen. */
export function weekPlans(data: Data, anyDateOfWeek: string): { date: string; planId: string }[] {
  const mon = mondayOf(anyDateOfWeek);
  const out: { date: string; planId: string }[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(mon, i);
    for (const planId of plansOnDate(data, d)) out.push({ date: d, planId });
  }
  return out;
}

/** Four weeks from a Monday: each date with its workouts. */
export function fourWeeks(data: Data, startMonday: string): { date: string; planIds: string[] }[][] {
  const mon = mondayOf(startMonday);
  return [0, 1, 2, 3].map((w) =>
    [0, 1, 2, 3, 4, 5, 6].map((i) => {
      const date = addDays(mon, w * 7 + i);
      return { date, planIds: plansOnDate(data, date) };
    })
  );
}

/** Removes an archive item and its workouts, unless the calendar still uses them from today on. */
export function removeFromArchive<T extends Data>(data: T, item: ArchiveItem, today: string): T | 'in-use' {
  const ids = new Set(item.planIds);
  const cycles = data.cycles ?? [];
  const usedByCycle = cycles.some((c) => (!c.endDate || c.endDate >= today) && c.planIds.some((id) => ids.has(id)));
  const usedOnDay =
    Object.entries(data.dayOverrides ?? {}).some(([d, id]) => d >= today && id && ids.has(id)) ||
    Object.entries(data.dayExtras ?? {}).some(([d, list]) => d >= today && list.some((id) => ids.has(id)));
  if (usedByCycle || usedOnDay) return 'in-use';
  return {
    ...data,
    workouts: data.workouts.filter((w) => !ids.has(w.id)),
    archive: archiveOf(data).filter((it) => it.id !== item.id),
  };
}

export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export { cycleAt, weekdayOf };
export type { WorkoutPlan };
