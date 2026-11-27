import { ReadinessLevel, WorkoutItem, WorkoutPlan } from '../../types';
import { CatalogExercise, MovementPattern } from '../catalog/types';
import { DEFAULT_PROFILE } from './defaults';
import { accentPlan, shortRounds } from './modes';
import { focusPatterns } from './session';
import { GeneratorProfile } from './types';

// The plan actually played today for the chosen mode (GENERATOR_RULES §3.2).
// Works for any plan: generated, coach (A/B/C) or imported; patterns of
// pinned exercises come from the catalog.

export const DEFAULT_ACCENT_MINUTES = 20;
export const ACCENT_MINUTES = { min: 10, max: 60, step: 5 };

/** Warm-up and cool-down for the mode: short and accent use 5 / 3 minutes (§3.3). */
export function dayTimes(mode: ReadinessLevel, warmupMinutes: number): { warmupMinutes: number; cooldownMinutes: number } {
  if (mode === 'yellow' || mode === 'accent') return { warmupMinutes: Math.min(warmupMinutes, 5), cooldownMinutes: 3 };
  return { warmupMinutes, cooldownMinutes: 5 };
}

export interface DayOptions {
  catalog: CatalogExercise[];
  accentMinutes?: number;
  warmupMinutes: number;
  cooldownMinutes: number;
  profile?: GeneratorProfile;
}

export interface DayPlan {
  plan: WorkoutPlan;
  /** Patterns the accent left out: do them as mobility, in free time or next workout. */
  dropped: MovementPattern[];
}

/**
 * standard → the plan; short → ⅔ of the rounds, same exercises and targets;
 * accent → focus pairs with antagonists under the minutes (warm-up and
 * cool-down included), supersets; red → the plan (the app plays its
 * mobility block instead).
 */
export function dayPlan(plan: WorkoutPlan, mode: ReadinessLevel, opts: DayOptions): DayPlan {
  // «Здоровье и восстановление» (Addendum №5): 2 rounds, 60 s between
  // exercises and 105 s between rounds, the round opens with a pull.
  if (opts.profile?.usualConditions?.longevity) plan = longevityPlan(plan, opts.catalog);
  if (mode === 'yellow') return { plan: { ...plan, rounds: shortRounds(plan.rounds) }, dropped: [] };
  if (mode !== 'accent') return { plan, dropped: [] };

  const byId = new Map(opts.catalog.map((c) => [c.id, c]));
  const withPattern = (it: WorkoutItem): WorkoutItem => ({
    ...it,
    pattern: it.pattern ?? (it.exerciseId ? byId.get(it.exerciseId)?.pattern : undefined),
  });
  const items = plan.items.map(withPattern);
  const known = items.filter((it) => it.pattern);
  const unknown = items.filter((it) => !it.pattern); // own exercises: always kept
  if (known.length === 0) return { plan, dropped: [] };

  const profile = opts.profile ?? DEFAULT_PROFILE;
  const present = known.map((it) => it.pattern!) as MovementPattern[];
  const gw = {
    kind: 'S-A' as const,
    component: plan.useAgt30 ? ('F' as const) : ('S' as const),
    plan: { ...plan, items: known },
    focus: focusPatterns(profile, opts.catalog, present),
    estimateSec: 0,
  };
  const { plan: acc, dropped } = accentPlan(gw, profile, { catalog: opts.catalog }, opts.accentMinutes ?? DEFAULT_ACCENT_MINUTES, {
    warmupMinutes: opts.warmupMinutes,
    cooldownMinutes: opts.cooldownMinutes,
  });
  return { plan: { ...acc, items: [...acc.items, ...unknown] }, dropped };
}

export const LONGEVITY = { rounds: 2, restBetweenExercises: 60, restBetweenRounds: 105 };

/** The plan for «Здоровье и восстановление»: gentle volume, a pull first. */
export function longevityPlan(plan: WorkoutPlan, catalog: CatalogExercise[]): WorkoutPlan {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const patternOf = (it: WorkoutItem) => it.pattern ?? (it.exerciseId ? byId.get(it.exerciseId)?.pattern : undefined);
  const first = plan.items.findIndex((it) => patternOf(it) === 'pull_h') ;
  const items = first > 0 ? [plan.items[first], ...plan.items.filter((_, i) => i !== first)] : plan.items;
  return {
    ...plan,
    items,
    useAgt30: false,
    rounds: Math.min(plan.rounds, LONGEVITY.rounds),
    restBetweenExercises: Math.max(plan.restBetweenExercises, LONGEVITY.restBetweenExercises),
    restBetweenRounds: Math.max(plan.restBetweenRounds, LONGEVITY.restBetweenRounds),
  };
}
