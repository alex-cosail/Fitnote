import { Exercise, TargetSpec, WorkoutItem, WorkoutPlan } from '../../types';
import { Conditions, isAvailable } from '../catalog/filter';
import { pickForPattern } from '../catalog/ladder';
import { CatalogExercise } from '../catalog/types';
import { calcAgt30 } from './targets';
import { SUBSTITUTE } from '../generator/rules';

export interface ResolveContext {
  catalog: CatalogExercise[];
  exercises: Exercise[]; // resolved list (catalog + user maxima + custom)
  conditions?: Conditions;
}

export interface ResolvedItem {
  slotIndex: number;
  exerciseId: string;
  target: number;
  // The plan named another exercise that is not available here.
  substitutedFrom?: string;
  // No exercise fits this slot under the conditions (the slot is kept
  // with its pinned exercise if it has one).
  unavailable?: boolean;
}

// Fraction of the max for "leave N in the tank".
const RIR_PCT: Record<0 | 1 | 2 | 3, number> = { 0: 0.9, 1: 0.8, 2: 0.7, 3: 0.6 };

function roundTarget(value: number, metric: Exercise['metric']): number {
  if (metric === 'seconds') return Math.max(5, Math.round(value / 5) * 5);
  return Math.max(1, Math.round(value));
}

/** Target for an exercise from a spec and the user's max. */
export function targetFromSpec(spec: TargetSpec, ex: Pick<Exercise, 'checkup_max' | 'metric'>): number {
  if (spec.kind === 'fixed') return spec.value;
  const pct = spec.kind === 'pctMax' ? spec.pct : RIR_PCT[spec.rir];
  return roundTarget(ex.checkup_max * pct, ex.metric);
}

/**
 * Resolves plan slots into concrete exercises and targets for this user:
 * 1. a pinned exercise that is available is used as is;
 * 2. otherwise the nearest-rank available exercise of the slot's pattern
 *    (same ladder family preferred) replaces it;
 * 3. targets: AGT plans → 30% of max; `spec` → from the max; else the fixed
 *    `target`, scaled by the max ratio when the exercise was substituted.
 * With no conditions every catalog exercise is available, so old plans
 * resolve exactly as before.
 */
export function resolveWorkout(plan: Pick<WorkoutPlan, 'items' | 'useAgt30'>, ctx: ResolveContext): ResolvedItem[] {
  const cond = ctx.conditions ?? {};
  const catalogById = new Map(ctx.catalog.map((c) => [c.id, c]));
  const exById = new Map(ctx.exercises.map((e) => [e.id, e]));

  const resolved: ResolvedItem[] = [];
  plan.items.forEach((item: WorkoutItem, slotIndex) => {
    const pinnedEx = item.exerciseId ? exById.get(item.exerciseId) : undefined;
    const pinnedCat = item.exerciseId ? catalogById.get(item.exerciseId) : undefined;
    // Custom exercises (not in the catalog) are always considered available.
    const pinnedOk = Boolean(pinnedEx) && (!pinnedCat || isAvailable(pinnedCat, cond));

    let chosen: Exercise | undefined = pinnedOk ? pinnedEx : undefined;
    let substitutedFrom: string | undefined;

    if (!chosen) {
      const pattern = item.pattern ?? pinnedCat?.pattern;
      const rank = item.rank ?? pinnedCat?.rank ?? 3;
      let pick = pattern
        ? pickForPattern(ctx.catalog, pattern, rank, cond, pinnedCat?.family)
        : undefined;
      // Not possible here at all (vertical pull at home without a bar): the
      // substitute pattern takes the slot — a band row (GENERATOR_RULES §11).
      const sub = pattern ? SUBSTITUTE[pattern] : undefined;
      if (!pick && sub) pick = pickForPattern(ctx.catalog, sub, rank, cond);
      if (pick) {
        chosen = exById.get(pick.id);
        if (item.exerciseId && item.exerciseId !== pick.id) substitutedFrom = item.exerciseId;
      }
    }

    if (!chosen) {
      // Nothing fits: keep the pinned exercise (if known) and flag the slot.
      if (pinnedEx) {
        resolved.push({ slotIndex, exerciseId: pinnedEx.id, target: item.target, unavailable: true });
      }
      return;
    }

    let target: number;
    if (plan.useAgt30) {
      target = calcAgt30(chosen);
    } else if (item.spec) {
      target = targetFromSpec(item.spec, chosen);
    } else if (substitutedFrom && pinnedEx && pinnedEx.checkup_max > 0 && pinnedEx.metric === chosen.metric) {
      target = roundTarget((item.target * chosen.checkup_max) / pinnedEx.checkup_max, chosen.metric);
    } else if (substitutedFrom && pinnedEx && pinnedEx.metric !== chosen.metric) {
      target = calcAgt30(chosen);
    } else {
      target = item.target;
    }

    resolved.push({ slotIndex, exerciseId: chosen.id, target, substitutedFrom });
  });
  return resolved;
}
