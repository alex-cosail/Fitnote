import { MetricType } from '../../types';

/**
 * Smart carryover between rounds: the target for the next round of the same
 * exercise, given what was actually done this round.
 *
 * - Reps: the next round copies the actual result (up or down).
 * - Timed holds: only upwards, so an early or accidental stop does not cut
 *   the coach's target for the remaining rounds.
 * - A zero result (skipped) never changes the target.
 */
export function carryoverTarget(
  metric: MetricType,
  currentTarget: number,
  actual: number
): number {
  if (actual <= 0) return currentTarget;
  if (metric === 'seconds') return Math.max(currentTarget, actual);
  return actual;
}
