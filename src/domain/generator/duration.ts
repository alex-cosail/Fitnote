import { WorkoutPlan } from '../../types';
import { CatalogExercise } from '../catalog/types';
import { GeneratorProfile } from './types';
import {
  CAP_MINUTES, COOLDOWN_MIN, MIN_ROUNDS_AFTER_CUT, SEC_PER_REP, TEMPO_FACTOR, TRANSITION_SEC, WARMUP_MIN,
} from './rules';

// Duration estimate, the standard cap and calibration (GENERATOR_RULES §3).

export interface DurationOptions {
  warmupMinutes?: number;
  cooldownMinutes?: number;
  tempoFactor?: number; // from calibrateTempo; 1 = not calibrated
}

/** Seconds of one set: reps × 3 s (× 2 per side for paired) or the seconds, + transition. */
export function setSeconds(target: number, metric: 'reps' | 'seconds', paired: boolean, tempo = 1): number {
  const work = metric === 'seconds' ? target : target * SEC_PER_REP * tempo;
  return work * (paired ? 2 : 1) + TRANSITION_SEC;
}

/** Work part of one round, seconds. */
export function roundSeconds(
  plan: Pick<WorkoutPlan, 'items' | 'restBetweenExercises'>,
  catalogById: Map<string, CatalogExercise>,
  tempo = 1
): number {
  const sets = plan.items.map((it) => {
    const c = it.exerciseId ? catalogById.get(it.exerciseId) : undefined;
    return setSeconds(it.target, c?.metric ?? 'reps', Boolean(c?.isPaired), tempo);
  });
  return sets.reduce((a, b) => a + b, 0) + Math.max(0, sets.length - 1) * plan.restBetweenExercises;
}

/** Whole workout, seconds: warm-up + rounds + rests between rounds + cool-down. */
export function estimateSeconds(
  plan: Pick<WorkoutPlan, 'items' | 'rounds' | 'restBetweenExercises' | 'restBetweenRounds'>,
  catalogById: Map<string, CatalogExercise>,
  opts: DurationOptions = {}
): number {
  const warm = (opts.warmupMinutes ?? WARMUP_MIN.full) * 60;
  const cool = (opts.cooldownMinutes ?? COOLDOWN_MIN.full) * 60;
  const round = roundSeconds(plan, catalogById, opts.tempoFactor ?? 1);
  return Math.round(warm + plan.rounds * round + Math.max(0, plan.rounds - 1) * plan.restBetweenRounds + cool);
}

/** Standard cap: 45 min; 60 only for `high` with a + / ++ zone or a personal goal. */
export function capMinutes(profile: GeneratorProfile): number {
  const hasRequest =
    Object.values(profile.zones).some((m) => m === 'plus' || m === 'plusplus') ||
    profile.goalExerciseIds.length > 0;
  return profile.level === 'high' && hasRequest ? CAP_MINUTES.advanced : CAP_MINUTES.normal;
}

/**
 * Most rounds (≤ wanted) that fit the cap; never fewer than the minimum.
 * Exercises are not touched (§3.1).
 */
export function fitRounds(
  plan: Pick<WorkoutPlan, 'items' | 'restBetweenExercises' | 'restBetweenRounds'>,
  wanted: number,
  capSec: number,
  catalogById: Map<string, CatalogExercise>,
  opts: DurationOptions = {},
  minRounds = MIN_ROUNDS_AFTER_CUT
): number {
  let rounds = wanted;
  while (rounds > minRounds && estimateSeconds({ ...plan, rounds }, catalogById, opts) > capSec) rounds--;
  return rounds;
}

/**
 * Tempo factor from the journal: median of actual ÷ estimated duration,
 * clamped to 0.6–1.4; 1 until there are 3 workouts.
 */
export function calibrateTempo(samples: { estimatedSec: number; actualSec: number }[]): number {
  const ratios = samples
    .filter((s) => s.estimatedSec > 0 && s.actualSec > 0)
    .map((s) => s.actualSec / s.estimatedSec)
    .sort((a, b) => a - b);
  if (ratios.length < TEMPO_FACTOR.minSamples) return 1;
  const mid = Math.floor(ratios.length / 2);
  const median = ratios.length % 2 ? ratios[mid] : (ratios[mid - 1] + ratios[mid]) / 2;
  return Math.min(TEMPO_FACTOR.max, Math.max(TEMPO_FACTOR.min, median));
}
