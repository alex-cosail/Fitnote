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

type Data = Pick<FitnoteData, 'workouts' | 'cycles' | 'dayOverrides' | 'archive' | 'dayExtras' | 'profile' | 'repeats'>;

/** A single workout every week on one weekday (v3.13), on top of the series. */
export interface Repeat {
  id: string;
  planId: string;
  weekday: Weekday;
  startDate: string;
  endDate?: string; // open-ended: «пока не уберу»
  skips?: string[]; // dates taken off one by one
}

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

/** All workouts of a date: the day's one, the extras and the weekly repeats. */
export function plansOnDate(data: Data, date: string): string[] {
  const main = planOn(data.cycles ?? [], data.dayOverrides ?? {}, date);
  const wd = weekdayOf(date);
  const repeats = (data.repeats ?? [])
    .filter((r) => r.weekday === wd && r.startDate <= date && (!r.endDate || date <= r.endDate) && !r.skips?.includes(date))
    .map((r) => r.planId);
  return [...(main ? [main] : []), ...(data.dayExtras?.[date] ?? []), ...repeats];
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
  const usedByRepeat = (data.repeats ?? []).some((r) => ids.has(r.planId) && (!r.endDate || r.endDate >= today));
  if (usedByCycle || usedOnDay || usedByRepeat) return 'in-use';
  const rest = archiveOf(data).filter((it) => it.id !== item.id);
  // a workout another item still lists (a single inside a built week) stays
  const stillListed = new Set(rest.flatMap((it) => it.planIds));
  return {
    ...data,
    workouts: data.workouts.filter((w) => !ids.has(w.id) || stillListed.has(w.id)),
    archive: rest,
  };
}

// ——— v3.13: taking off, repeating, copying, building a week ———

/** «Убрать с этой даты»: only this date; the workout stays in the archive. */
export function removeFromDate<T extends Data>(data: T, planId: string, date: string): T {
  const extras = data.dayExtras?.[date] ?? [];
  if (extras.includes(planId)) {
    const i = extras.indexOf(planId);
    return { ...data, dayExtras: { ...(data.dayExtras ?? {}), [date]: [...extras.slice(0, i), ...extras.slice(i + 1)] } };
  }
  if (planOn(data.cycles ?? [], data.dayOverrides ?? {}, date) === planId) {
    return { ...data, dayOverrides: { ...(data.dayOverrides ?? {}), [date]: null } };
  }
  const repeats = (data.repeats ?? []).map((r) =>
    r.planId === planId && r.weekday === weekdayOf(date) && r.startDate <= date && (!r.endDate || date <= r.endDate)
      ? { ...r, skips: [...(r.skips ?? []), date] }
      : r
  );
  return { ...data, repeats };
}

/** «Очистить календарь с этой даты»: everything from the date on; the running series ends the day before. */
export function clearFrom<T extends Data>(data: T, date: string): T {
  const before = addDays(date, -1);
  const cycles = (data.cycles ?? [])
    .filter((c) => c.startDate < date)
    .map((c) => (!c.endDate || c.endDate >= date ? { ...c, endDate: before } : c));
  const dayOverrides = Object.fromEntries(Object.entries(data.dayOverrides ?? {}).filter(([d]) => d < date));
  const dayExtras = Object.fromEntries(Object.entries(data.dayExtras ?? {}).filter(([d]) => d < date));
  const repeats = (data.repeats ?? [])
    .filter((r) => r.startDate < date)
    .map((r) => (!r.endDate || r.endDate >= date ? { ...r, endDate: before } : r));
  return { ...data, cycles, dayOverrides, dayExtras, repeats };
}

/** «Убрать из календаря»: the item's dates from today on; the past and the journal stay. */
export function unschedule<T extends Data>(data: T, item: ArchiveItem, today: string): T {
  const ids = new Set(item.planIds);
  const before = addDays(today, -1);
  const own = (c: Cycle) => c.planIds.some((id) => ids.has(id));
  const cycles = (data.cycles ?? [])
    .filter((c) => !(own(c) && c.startDate >= today))
    .map((c) => (own(c) && (!c.endDate || c.endDate >= today) ? { ...c, endDate: before } : c));
  const dayOverrides = Object.fromEntries(Object.entries(data.dayOverrides ?? {}).filter(([d, id]) => !(d >= today && id && ids.has(id))));
  const dayExtras = Object.fromEntries(
    Object.entries(data.dayExtras ?? {}).map(([d, list]) => [d, d >= today ? list.filter((id) => !ids.has(id)) : list])
  );
  const repeats = (data.repeats ?? [])
    .filter((r) => !(ids.has(r.planId) && r.startDate >= today))
    .map((r) => (ids.has(r.planId) && (!r.endDate || r.endDate >= today) ? { ...r, endDate: before } : r));
  return { ...data, cycles, dayOverrides, dayExtras, repeats };
}

/** «Каждую неделю»: a single on this weekday from the date, for N weeks or until taken off. */
export function placeRepeat<T extends Data>(data: T, item: ArchiveItem, date: string, weeks?: number): T {
  const r: Repeat = {
    id: `rep-${date}-${item.planIds[0]}`,
    planId: item.planIds[0],
    weekday: weekdayOf(date),
    startDate: date,
    ...(weeks ? { endDate: addDays(date, weeks * 7 - 1) } : {}),
  };
  return { ...data, repeats: [...(data.repeats ?? []).filter((x) => x.id !== r.id), r], archive: keepInArchive(data, item) };
}

/** «Скопировать в разовые»: a session of a series becomes its own single (a copy). */
export function copyToSingles<T extends Data>(data: T, planId: string, stamp: string): T {
  const p = data.workouts.find((w) => w.id === planId);
  if (!p) return data;
  // the source id keeps two quick copies of different sessions apart
  const copy = { ...p, id: `own-copy-${stamp}-${planId.replace(/[^a-z0-9]+/gi, '').slice(-12)}` };
  const archive = [...archiveOf(data), { id: `arch-${copy.id}`, kind: 'single' as const, title: p.title, planIds: [copy.id], weeks: 1 }];
  return { ...data, workouts: [copy, ...data.workouts], archive };
}

/**
 * «Собрать в неделю»: the chosen singles move into a new series (customer,
 * 29.11) — «В разовые» brings a copy back when needed.
 */
export function buildSeries<T extends Data>(data: T, planIds: string[], title: string, days: Weekday[], weeks: number, stamp: string): T & { builtId: string } {
  const item: ArchiveItem = { id: `arch-week-${stamp}`, kind: 'series', title, planIds, weeks, days };
  const moved = new Set(planIds);
  const rest = archiveOf(data).filter((it) => !(it.kind === 'single' && moved.has(it.planIds[0])));
  return { ...data, archive: [...rest, item], builtId: item.id };
}

/** «Переименовать» (v3.18): the archive item, a single's workout and the series' cycles. */
export function renameItem<T extends Data>(data: T, item: ArchiveItem, title: string): T {
  const name = title.trim();
  if (!name) return data;
  const ids = new Set(item.planIds);
  const list = archiveOf(data);
  const archive = list.some((it) => it.id === item.id)
    ? list.map((it) => (it.id === item.id ? { ...it, title: name } : it))
    : [...list, { ...item, title: name }];
  const workouts = item.kind === 'single' ? data.workouts.map((w) => (ids.has(w.id) ? { ...w, title: name } : w)) : data.workouts;
  const same = (c: Cycle) => c.planIds.length === item.planIds.length && c.planIds.every((id) => ids.has(id));
  const cycles = item.kind === 'series' ? (data.cycles ?? []).map((c) => (same(c) ? { ...c, title: name } : c)) : data.cycles;
  return { ...data, archive, workouts, cycles };
}

export const WEEKDAY_SHORT = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

export { cycleAt, weekdayOf };
export type { WorkoutPlan };
