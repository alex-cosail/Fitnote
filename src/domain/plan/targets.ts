import { Exercise, MetricType, ReadinessLevel } from '../../types';

// AGT 30%: 30% of the Check-Up max; seconds rounded to 5 (min 5), reps min 1.
export function calcAgt30(exercise: Pick<Exercise, 'checkup_max' | 'metric'>): number {
  const raw = exercise.checkup_max * 0.3;
  if (exercise.metric === 'seconds') {
    return Math.max(5, Math.round(raw / 5) * 5);
  }
  return Math.max(1, Math.round(raw));
}

// Rounds actually played for the day's mode:
// standard = plan, short = ⅔ (min 1; 3 → 2, 15 → 10), red = 2-round mobility
// block; accent keeps the plan's rounds (cut to its minutes in dayPlan).
export function getEffectiveRounds(
  planRounds: number,
  readiness: ReadinessLevel
): number {
  if (readiness === 'red') return 2;
  if (readiness === 'yellow') return Math.max(1, Math.round((planRounds * 2) / 3));
  return planRounds;
}

// Step and minimum for -/+ target tuning: reps by 1 (min 1), seconds by 5 (min 5).
export function targetStep(metric: MetricType): { step: number; min: number } {
  return metric === 'seconds' ? { step: 5, min: 5 } : { step: 1, min: 1 };
}
