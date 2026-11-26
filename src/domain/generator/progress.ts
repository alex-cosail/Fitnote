import { Exercise, MetricType, WorkoutLog } from '../../types';
import { PROGRESS, S_WINDOW } from './rules';
import { GeneratorHistory } from './types';

// Progression between workouts and max calibration (GENERATOR_RULES §9.1),
// plus what the generator reads from the journal.

/** «Как зашло?»: easy · just right · hard; pain excludes the exercise. */
export type Outcome = 'easy' | 'ok' | 'hard' | 'pain';

function step(metric: MetricType, current: number, share: number): number {
  const raw = current * share;
  const min = metric === 'seconds' ? 5 : 1;
  const delta = Math.sign(share) * Math.max(min, Math.abs(Math.round(raw)));
  const next = current + delta;
  return metric === 'seconds' ? Math.max(5, Math.round(next / 5) * 5) : Math.max(1, next);
}

export interface NextTarget {
  target: number;
  rankStep: -1 | 0 | 1;
  exclude?: boolean;
}

/**
 * Next target from the recent outcomes of this exercise (latest last):
 * easy → +10% (twice at the top of the window → rank +1); just right twice
 * → +5%; hard → −10% (twice → rank −1); pain → excluded.
 */
export function nextTarget(current: number, metric: MetricType, outcomes: Outcome[]): NextTarget {
  const last = outcomes[outcomes.length - 1];
  const prev = outcomes[outcomes.length - 2];
  if (!last) return { target: current, rankStep: 0 };
  if (last === 'pain') return { target: current, rankStep: 0, exclude: true };
  if (last === 'easy') {
    if (prev === 'easy' && current >= S_WINDOW[metric].max) return { target: current, rankStep: 1 };
    return { target: step(metric, current, PROGRESS.easyStep), rankStep: 0 };
  }
  if (last === 'hard') {
    if (prev === 'hard') return { target: current, rankStep: -1 };
    return { target: step(metric, current, PROGRESS.hardStep), rankStep: 0 };
  }
  if (prev === 'ok') return { target: step(metric, current, PROGRESS.okStepAfterTwo), rankStep: 0 };
  return { target: current, rankStep: 0 };
}

/**
 * Max estimate after a workout: done ÷ share, × 1.1 for easy, × 0.9 for
 * hard; never more than +10% over the max at the start of the week.
 */
export function calibrateMax(
  done: number,
  pct: number,
  outcome: Exclude<Outcome, 'pain'>,
  weekStartMax: number,
  metric: MetricType
): number {
  const factor = outcome === 'easy' ? PROGRESS.easyMaxFactor : outcome === 'hard' ? PROGRESS.hardMaxFactor : 1;
  const est = (done / pct) * factor;
  const capped = Math.min(est, weekStartMax * (1 + PROGRESS.maxGrowthPerWeek));
  return metric === 'seconds' ? Math.max(5, Math.round(capped / 5) * 5) : Math.max(1, Math.round(capped));
}

/**
 * Outcome of an exercise in a logged workout while there is no «Как зашло?»
 * screen yet (step 2): all rounds done, every set on target with 2+ in the
 * tank → easy; a set below target or rounds not finished → hard; else ok.
 */
export function outcomeFromLog(log: WorkoutLog, exerciseId: string): Exclude<Outcome, 'pain'> | undefined {
  const sets = log.sets.filter((s) => s.exerciseId === exerciseId);
  if (sets.length === 0) return undefined;
  const finished = log.roundsCompleted >= log.roundsPlanned;
  if (!finished || sets.some((s) => s.actual < s.target)) return 'hard';
  if (sets.every((s) => s.rir === '2+')) return 'easy';
  return 'ok';
}

/** Last time done and swaps away, from the journal (newest logs first or not). */
export function historyFromLogs(logs: WorkoutLog[], exercises: Pick<Exercise, 'id' | 'name'>[]): GeneratorHistory {
  const lastDone: Record<string, string> = {};
  const swappedAway: Record<string, number> = {};
  const idByName = new Map(exercises.map((e) => [e.name, e.id]));
  const sorted = [...logs].sort((a, b) => (a.date < b.date ? 1 : -1));
  for (const log of sorted) {
    for (const s of log.sets) {
      if (!lastDone[s.exerciseId] || lastDone[s.exerciseId] < log.date) lastDone[s.exerciseId] = log.date;
    }
  }
  // Swaps: count the workouts among the last 5 where the exercise was swapped away.
  for (const log of sorted.slice(0, 5)) {
    const swapped = new Set(log.sets.map((s) => s.swappedFromName).filter(Boolean).map((n) => idByName.get(n!)));
    for (const id of swapped) if (id) swappedAway[id] = (swappedAway[id] ?? 0) + 1;
  }
  return { lastDone, swappedAway };
}

/**
 * New maxima after a workout with «Как зашло?» (customer, 26.11: maxima may
 * be recalculated automatically). Per exercise: the best set ÷ the share of
 * the max that was planned, × 1.1 easy / × 0.9 hard; up at most +10%, down
 * at most −15% per workout. Unreliable shares (< 15% or > 95%) are skipped.
 */
export function calibrateFromLog(
  log: WorkoutLog,
  maxOf: (exerciseId: string) => { value: number; metric: MetricType } | undefined
): Record<string, number> {
  if (!log.outcome) return {};
  const out: Record<string, number> = {};
  const ids = [...new Set(log.sets.map((s) => s.exerciseId))];
  for (const id of ids) {
    const m = maxOf(id);
    if (!m || m.value <= 0) continue;
    const sets = log.sets.filter((s) => s.exerciseId === id);
    const target = sets[0].plannedTarget ?? sets[0].target;
    const pct = target / m.value;
    if (pct < 0.15 || pct > 0.95) continue;
    const done = Math.max(...sets.map((s) => s.actual));
    const raw = calibrateMax(done, pct, log.outcome, m.value, m.metric);
    const floor = m.metric === 'seconds' ? Math.max(5, Math.round((m.value * 0.85) / 5) * 5) : Math.max(1, Math.round(m.value * 0.85));
    const next = Math.max(floor, raw);
    if (next !== m.value) out[id] = next;
  }
  return out;
}
