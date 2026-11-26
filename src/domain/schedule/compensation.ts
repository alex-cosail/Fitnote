import { Exercise, WorkoutItem, WorkoutLog, WorkoutPlan } from '../../types';
import { CatalogExercise, MovementPattern } from '../catalog/types';
import { weekDebt } from '../generator/coverage';
import { orderRound } from '../generator/order';
import { pickExercise } from '../generator/pick';
import { COMPONENT, LEVEL_RANK } from '../generator/rules';
import { GeneratorContext, GeneratorProfile } from '../generator/types';
import { targetFromSpec } from '../plan/resolveWorkout';
import { PlanKind } from './kind';
import { addDays, logDate, mondayOf, weekDates } from './schedule';

// Compensation (customer idea, 26.11), introduced softly:
// — at the weekend, «Добор недели» if the week missed movements;
// — on Monday, the first workout can take in what last week lacked, and a
//   week that went «тяжело» suggests starting short.

export interface WeekReview {
  monday: string;
  workouts: number;
  missing: MovementPattern[];
  hard: number;
  easy: number;
}

/** What a week of the journal covered (each workout = one session). */
export function reviewWeek(logs: WorkoutLog[], catalog: CatalogExercise[], date: string, perWeek: number): WeekReview {
  const days = new Set(weekDates(date));
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const week = logs.filter((l) => days.has(logDate(l)));
  const sessions = week.map(
    (l) => [...new Set(l.sets.map((s) => byId.get(s.exerciseId)?.pattern).filter(Boolean))] as MovementPattern[]
  );
  return {
    monday: mondayOf(date),
    workouts: week.length,
    missing: week.length ? weekDebt(sessions, Math.max(1, Math.min(perWeek, week.length + 1))) : [],
    hard: week.filter((l) => l.outcome === 'hard').length,
    easy: week.filter((l) => l.outcome === 'easy').length,
  };
}

/** Friday–Sunday with at least one workout done and movements missing. */
export function topUpDue(review: WeekReview, today: string): boolean {
  const wd = weekDates(today).indexOf(today); // 0 = Monday
  return wd >= 4 && review.monday === mondayOf(today) && review.workouts > 0 && review.missing.length > 0;
}

export interface MondayNote {
  missing: MovementPattern[]; // last week lacked these
  goShort: boolean; // last week went mostly «тяжело»
}

/**
 * The start of a week: what last week lacked (to take into the first
 * workout) and whether it went hard. Shown until the first workout of the
 * week is logged.
 */
export function mondayNote(logs: WorkoutLog[], catalog: CatalogExercise[], today: string, perWeek: number): MondayNote | undefined {
  const thisWeek = new Set(weekDates(today));
  if (logs.some((l) => thisWeek.has(logDate(l)))) return undefined;
  const last = reviewWeek(logs, catalog, addDays(mondayOf(today), -7), perWeek);
  if (last.workouts === 0) return undefined;
  const goShort = last.hard * 2 >= last.workouts && last.hard > 0;
  const missing = last.missing.slice(0, 2);
  if (!missing.length && !goShort) return undefined;
  return { missing, goShort };
}

const PCT_BY_KIND: Record<PlanKind, number> = { S: COMPONENT.S.pct, F: COMPONENT.F.pct, M: COMPONENT.M.pct };

/**
 * Adds one exercise per missing pattern to a plan (at most two), picked like
 * the generator does (favorites, the person's step, conditions); the round
 * order is fixed again. The original is kept for «Вернуть как было».
 */
export function addPatterns(
  plan: WorkoutPlan,
  patterns: MovementPattern[],
  kind: PlanKind,
  profile: GeneratorProfile,
  ctx: GeneratorContext
): WorkoutPlan {
  const used = new Set(plan.items.map((it) => it.exerciseId!).filter(Boolean));
  const byIdAll = new Map(ctx.catalog.map((c) => [c.id, c]));
  const has = new Set(plan.items.map((it) => it.pattern ?? byIdAll.get(it.exerciseId!)?.pattern));
  const pct = PCT_BY_KIND[kind];
  const added: WorkoutItem[] = [];
  for (const pattern of patterns.filter((p) => !has.has(p)).slice(0, 2)) {
    const c = pickExercise(
      { pattern, rank: LEVEL_RANK[profile.level], priority: 2 },
      profile,
      ctx,
      { usedThisSession: used, usedThisWeek: new Set(), conditions: { ...(profile.usualConditions ?? {}), ageGroup: profile.ageGroup } }
    );
    if (!c) continue;
    used.add(c.id);
    const max = ctx.exercises.find((e: Exercise) => e.id === c.id)?.checkup_max ?? c.defaultMax[profile.level];
    const spec = { kind: 'pctMax' as const, pct };
    added.push({ exerciseId: c.id, pattern: c.pattern, rank: c.rank, spec, target: targetFromSpec(spec, { checkup_max: max, metric: c.metric }) });
  }
  if (!added.length) return plan;
  const byId = new Map(ctx.catalog.map((c) => [c.id, c]));
  const items = [...plan.items, ...added];
  const order = orderRound(items.map((it) => ({ pattern: (it.pattern ?? byId.get(it.exerciseId!)?.pattern ?? 'core') as MovementPattern, priority: 1 })));
  return {
    ...plan,
    original: plan.original ?? { rounds: plan.rounds, items: plan.items.map((it) => ({ ...it })) },
    items: order.map((i) => items[i]),
  };
}
