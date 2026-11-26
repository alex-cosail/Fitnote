import type { Exercise, WorkoutPlan } from '../../types';
import { Conditions, isAvailable } from '../catalog/filter';
import { ladderNeighbour } from '../catalog/ladder';
import type { CatalogExercise } from '../catalog/types';
import { resolveWorkout } from '../plan/resolveWorkout';

// «Изменить» during a workout (field test 27.11, v3.8): easier / harder on
// the ladder, another exercise of the same pattern, or the antagonist. The
// change holds from the current set to the end of the workout; at the finish
// the person decides whether it stays in the plan.

export interface ChangeOptions {
  easier?: Exercise;
  harder?: Exercise;
  /** Same pattern, available here, nearest rank first (without the two above). */
  samePattern: Exercise[];
}

export function changeOptions(
  currentId: string,
  catalog: CatalogExercise[],
  exercises: Exercise[],
  conditions: Conditions = {}
): ChangeOptions {
  const exById = new Map(exercises.map((e) => [e.id, e]));
  const current = catalog.find((c) => c.id === currentId);
  if (!current) return { samePattern: [] };
  const easier = ladderNeighbour(catalog, currentId, -1, conditions);
  const harder = ladderNeighbour(catalog, currentId, 1, conditions);
  const skip = new Set([currentId, easier?.id, harder?.id]);
  const samePattern = catalog
    .filter((c) => c.pattern === current.pattern && !skip.has(c.id) && isAvailable(c, conditions))
    .sort((a, b) => Math.abs(a.rank - current.rank) - Math.abs(b.rank - current.rank) || a.rank - b.rank)
    .map((c) => exById.get(c.id))
    .filter((e): e is Exercise => Boolean(e));
  return {
    easier: easier ? exById.get(easier.id) : undefined,
    harder: harder ? exById.get(harder.id) : undefined,
    samePattern,
  };
}

function roundTarget(value: number, metric: Exercise['metric']): number {
  if (metric === 'seconds') return Math.max(5, Math.round(value / 5) * 5);
  return Math.max(1, Math.round(value));
}

/**
 * Target in the new exercise: the same share of the max (12 of 25 → 12 of
 * 30 becomes 14). Without maxima — 30% of the new max, or the same number.
 */
export function swapTarget(target: number, from: Exercise, to: Exercise): number {
  if (to.checkup_max <= 0) return target;
  const share = from.checkup_max > 0 && from.metric === to.metric ? target / from.checkup_max : 0.3;
  return roundTarget(to.checkup_max * Math.min(1, share), to.metric);
}

export interface Swap {
  from: string;
  to: string;
}

/**
 * Keeps today's changes in the plan: every slot that resolved to `from`
 * now pins `to` (pattern and step follow the new exercise; a fixed target
 * is scaled by the maxima, a share of the max stays as it is).
 */
export function applySwaps(
  plan: WorkoutPlan,
  swaps: Swap[],
  ctx: { catalog: CatalogExercise[]; exercises: Exercise[] }
): WorkoutPlan {
  if (swaps.length === 0) return plan;
  const resolved = resolveWorkout(plan, ctx);
  const resolvedId = new Map(resolved.map((r) => [r.slotIndex, r.exerciseId]));
  const exById = new Map(ctx.exercises.map((e) => [e.id, e]));
  const catById = new Map(ctx.catalog.map((c) => [c.id, c]));
  const to = new Map(swaps.map((s) => [s.from, s.to]));
  const items = plan.items.map((it, i) => {
    const was = resolvedId.get(i);
    const next = was ? to.get(was) : undefined;
    if (!was || !next) return it;
    const cat = catById.get(next);
    const fromEx = exById.get(was);
    const toEx = exById.get(next);
    const target = !it.spec && fromEx && toEx ? swapTarget(it.target, fromEx, toEx) : it.target;
    return {
      ...it,
      exerciseId: next,
      target,
      ...(cat ? { pattern: cat.pattern, rank: cat.rank } : {}),
    };
  });
  return { ...plan, items };
}

/** What was changed in this session: one entry per slot, the latest exercise. */
export function sessionSwaps(items: { exerciseId: string; swappedFromId?: string }[]): Swap[] {
  const out: Swap[] = [];
  for (const it of items) {
    if (it.swappedFromId && it.swappedFromId !== it.exerciseId && !out.some((s) => s.from === it.swappedFromId)) {
      out.push({ from: it.swappedFromId, to: it.exerciseId });
    }
  }
  return out;
}
