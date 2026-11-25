import { Exercise, WorkoutItem, WorkoutPlan } from '../../types';
import { Conditions, isAvailable } from '../catalog/filter';
import { ladderNeighbour } from '../catalog/ladder';
import { CatalogExercise, MovementPattern } from '../catalog/types';
import { targetFromSpec } from '../plan/resolveWorkout';
import { targetStep } from '../plan/targets';
import { COMPONENT, LEVEL_RANK } from './rules';
import { orderRound } from './order';
import { checkSession, SessionIssue } from './coverage';
import { Component } from './types';
import { FitnessLevel } from '../catalog/types';

// «Редактировать» the engine's base and «Создать свою» (PRODUCT_MAP_V3 §3.3).
// Pure plan edits; the screen keeps the result.

const maxOf = (exercises: Exercise[], id: string) => exercises.find((e) => e.id === id)?.checkup_max ?? 0;

function retarget(item: WorkoutItem, next: CatalogExercise, exercises: Exercise[]): WorkoutItem {
  const nextMax = maxOf(exercises, next.id);
  let target: number;
  if (item.spec) {
    target = targetFromSpec(item.spec, { checkup_max: nextMax, metric: next.metric });
  } else {
    const curMax = item.exerciseId ? maxOf(exercises, item.exerciseId) : 0;
    const raw = curMax > 0 ? (item.target * nextMax) / curMax : item.target;
    target = next.metric === 'seconds' ? Math.max(5, Math.round(raw / 5) * 5) : Math.max(1, Math.round(raw));
  }
  return { ...item, exerciseId: next.id, pattern: next.pattern, rank: next.rank, target };
}

const replaceAt = (plan: WorkoutPlan, idx: number, item: WorkoutItem): WorkoutPlan => ({
  ...plan,
  items: plan.items.map((it, i) => (i === idx ? item : it)),
});

/** −/+ target: by 1 rep or 5 s; the target becomes fixed (the person set it). */
export function changeTarget(plan: WorkoutPlan, idx: number, dir: 1 | -1, metric: 'reps' | 'seconds'): WorkoutPlan {
  const { step, min } = targetStep(metric);
  const it = plan.items[idx];
  const target = Math.max(min, it.target + dir * step);
  const { spec: _spec, ...rest } = it;
  return replaceAt(plan, idx, { ...rest, target });
}

export function changeRounds(plan: WorkoutPlan, delta: number): WorkoutPlan {
  return { ...plan, rounds: Math.min(20, Math.max(1, plan.rounds + delta)) };
}

/** −1 / +1 step on the ladder; skips exercises already in the plan. */
export function stepRank(
  plan: WorkoutPlan,
  idx: number,
  dir: 1 | -1,
  catalog: CatalogExercise[],
  exercises: Exercise[],
  cond: Conditions = {}
): WorkoutPlan {
  const it = plan.items[idx];
  if (!it.exerciseId) return plan;
  const others = new Set(plan.items.filter((_, i) => i !== idx).map((x) => x.exerciseId));
  let cur = it.exerciseId;
  for (let i = 0; i < 3; i++) {
    const next = ladderNeighbour(catalog, cur, dir, cond);
    if (!next) return plan;
    if (!others.has(next.id)) return replaceAt(plan, idx, retarget(it, next, exercises));
    cur = next.id;
  }
  return plan;
}

/** Alternatives for a slot: same pattern, nearest step first. */
export function alternatives(
  pattern: MovementPattern,
  rank: number,
  catalog: CatalogExercise[],
  cond: Conditions = {}
): CatalogExercise[] {
  return catalog
    .filter((c) => c.pattern === pattern && isAvailable(c, cond))
    .sort((a, b) => Math.abs(a.rank - rank) - Math.abs(b.rank - rank) || a.rank - b.rank || (a.id < b.id ? -1 : 1));
}

/** ⇄: the next alternative of the same pattern (cycling), not already in the plan. */
export function swapExercise(
  plan: WorkoutPlan,
  idx: number,
  catalog: CatalogExercise[],
  exercises: Exercise[],
  cond: Conditions = {}
): WorkoutPlan {
  const it = plan.items[idx];
  const cur = catalog.find((c) => c.id === it.exerciseId);
  const pattern = it.pattern ?? cur?.pattern;
  if (!pattern) return plan;
  const others = new Set(plan.items.filter((_, i) => i !== idx).map((x) => x.exerciseId));
  const list = alternatives(pattern, it.rank ?? cur?.rank ?? 3, catalog, cond).filter((c) => !others.has(c.id));
  if (list.length < 2 && list[0]?.id === it.exerciseId) return plan;
  const pos = list.findIndex((c) => c.id === it.exerciseId);
  const next = list[(pos + 1) % list.length];
  return next ? replaceAt(plan, idx, retarget(it, next, exercises)) : plan;
}

// ——— «Создать свою» ———

export type OwnZone = 'upper' | 'lower' | 'core' | 'balance' | 'favorites';

const ZONE_FILTER: Record<Exclude<OwnZone, 'favorites'>, (c: CatalogExercise) => boolean> = {
  upper: (c) => ['push_h', 'pull_h', 'push_v', 'pull_v'].includes(c.pattern),
  lower: (c) => ['squat', 'lunge', 'hinge'].includes(c.pattern),
  core: (c) => c.pattern === 'core',
  balance: (c) => c.stability !== 'bilateral',
};

export const OWN_CHOICES = 6;

/**
 * Click 2: 5–6 exercises for a zone — favorites first, then the steps
 * nearest to the person's level; already chosen ones are left out.
 */
export function zoneCandidates(
  zone: OwnZone,
  catalog: CatalogExercise[],
  favorites: string[],
  level: FitnessLevel,
  exclude: string[],
  cond: Conditions = {}
): CatalogExercise[] {
  const base = LEVEL_RANK[level];
  const pool = catalog.filter(
    (c) =>
      !exclude.includes(c.id) &&
      isAvailable(c, cond) &&
      (zone === 'favorites' ? favorites.includes(c.id) : ZONE_FILTER[zone](c))
  );
  return pool
    .sort(
      (a, b) =>
        Number(favorites.includes(b.id)) - Number(favorites.includes(a.id)) ||
        Math.abs(a.rank - base) - Math.abs(b.rank - base) ||
        (a.id < b.id ? -1 : 1)
    )
    .slice(0, OWN_CHOICES);
}

const ANTAGONIST: Record<MovementPattern, MovementPattern[]> = {
  push_h: ['pull_h', 'pull_v'],
  pull_h: ['push_h', 'push_v'],
  push_v: ['pull_v', 'pull_h'],
  pull_v: ['push_v', 'push_h'],
  squat: ['hinge'],
  lunge: ['hinge'],
  hinge: ['squat', 'lunge'],
  core: ['core'],
};

/** Antagonist offer right after adding (2–3 options, same plane first, near step). */
export function antagonistOptions(
  exerciseId: string,
  catalog: CatalogExercise[],
  exclude: string[],
  cond: Conditions = {}
): CatalogExercise[] {
  const c = catalog.find((x) => x.id === exerciseId);
  if (!c) return [];
  const pats = ANTAGONIST[c.pattern];
  return catalog
    .filter(
      (x) =>
        x.id !== c.id &&
        !exclude.includes(x.id) &&
        pats.includes(x.pattern) &&
        (c.pattern !== 'core' || x.family !== c.family) &&
        isAvailable(x, cond)
    )
    .sort(
      (a, b) =>
        pats.indexOf(a.pattern) - pats.indexOf(b.pattern) ||
        Math.abs(a.rank - c.rank) - Math.abs(b.rank - c.rank) ||
        (a.id < b.id ? -1 : 1)
    )
    .slice(0, 3);
}

/** A basket item with the target for the component's share. */
export function ownItem(c: CatalogExercise, component: Component, exercises: Exercise[]): WorkoutItem {
  const spec = { kind: 'pctMax' as const, pct: COMPONENT[component].pct };
  return {
    exerciseId: c.id,
    pattern: c.pattern,
    rank: c.rank,
    spec,
    target: targetFromSpec(spec, { checkup_max: maxOf(exercises, c.id), metric: c.metric }),
  };
}

/** The finished own workout: round order fixed (no two pushes / pulls in a row). */
export function buildOwnPlan(
  items: WorkoutItem[],
  rounds: number,
  component: Component,
  id: string,
  title: string,
  formatLabel: string
): WorkoutPlan {
  const order = orderRound(items.map((it) => ({ pattern: it.pattern!, priority: 1 })));
  return {
    id,
    title,
    subtitle: '',
    formatLabel,
    rounds,
    restBetweenExercises: COMPONENT[component].restEx,
    restBetweenRounds: COMPONENT[component].restRound,
    items: order.map((i) => items[i]),
  };
}

/** Coverage of a basket (§10), the order issue left out: it is fixed silently. */
export function basketIssues(items: WorkoutItem[], catalog: CatalogExercise[]): SessionIssue['code'][] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const ex = items.map((it) => byId.get(it.exerciseId!)).filter(Boolean) as CatalogExercise[];
  return checkSession(ex).map((i) => i.code).filter((c) => c !== 'order');
}

/** «Добавить сюда»: the exercise that closes an issue, near the person's step. */
export function fixFor(
  issue: SessionIssue['code'],
  items: WorkoutItem[],
  catalog: CatalogExercise[],
  level: FitnessLevel,
  favorites: string[],
  cond: Conditions = {}
): CatalogExercise | undefined {
  const exclude = items.map((it) => it.exerciseId!) as string[];
  const zone: OwnZone =
    issue === 'no_legs' ? 'lower' : issue === 'no_core' ? 'core' : issue === 'balance_quota' ? 'balance' : 'upper';
  let pool = zoneCandidates(zone, catalog, favorites, level, exclude, cond);
  if (issue === 'pull_lt_push') pool = pool.filter((c) => c.pattern === 'pull_h' || c.pattern === 'pull_v');
  if (issue === 'balance_quota') {
    const byId = new Map(catalog.map((c) => [c.id, c]));
    const lowerOk = items.some((it) => {
      const c = byId.get(it.exerciseId!);
      return c && ['squat', 'lunge', 'hinge'].includes(c.pattern) && c.stability !== 'bilateral';
    });
    pool = pool.filter((c) => (lowerOk ? !['squat', 'lunge', 'hinge'].includes(c.pattern) : ['squat', 'lunge', 'hinge'].includes(c.pattern)));
  }
  return pool[0];
}

export interface LadderPosition {
  /** Steps (ranks) available in this exercise's ladder family, easiest first. */
  ranks: number[];
  current: number;
  canEasier: boolean;
  canHarder: boolean;
}

/**
 * Where an exercise stands on its ladder (the family, under the conditions):
 * the card shows the scale and dims − / + at the ends.
 */
export function ladderPosition(id: string, catalog: CatalogExercise[], cond: Conditions = {}): LadderPosition | undefined {
  const c = catalog.find((x) => x.id === id);
  if (!c) return undefined;
  const family = catalog.filter((x) => x.family === c.family && (x.id === c.id || isAvailable(x, cond)));
  const ranks = [...new Set(family.map((x) => x.rank))].sort((a, b) => a - b);
  return {
    ranks,
    current: c.rank,
    canEasier: Boolean(ladderNeighbour(catalog, id, -1, cond)) && ranks[0] < c.rank,
    canHarder: Boolean(ladderNeighbour(catalog, id, 1, cond)) && ranks[ranks.length - 1] > c.rank,
  };
}
