import { CatalogExercise, MOVEMENT_PATTERNS, MovementPattern } from '../catalog/types';
import { hasSameDirectionInRow, moveClass } from './order';

// Coverage checks for "Create your own", an AI / coach answer and the week
// (GENERATOR_RULES §4.3, §10). Codes only; the screen turns them into words.

export type SessionIssue =
  | { code: 'no_legs' }
  | { code: 'pull_lt_push' }
  | { code: 'no_core' }
  | { code: 'balance_quota' }
  | { code: 'order' }; // two pushes / pulls in a row — fixed silently

const LOWER: MovementPattern[] = ['squat', 'lunge', 'hinge'];

export function countPatterns(patterns: MovementPattern[]): Record<MovementPattern, number> {
  const out = Object.fromEntries(MOVEMENT_PATTERNS.map((p) => [p, 0])) as Record<MovementPattern, number>;
  for (const p of patterns) out[p]++;
  return out;
}

/** Checks one workout given its exercises in round order. */
export function checkSession(exercises: Pick<CatalogExercise, 'pattern' | 'stability'>[]): SessionIssue[] {
  const patterns = exercises.map((e) => e.pattern);
  const issues: SessionIssue[] = [];
  if (!patterns.some((p) => LOWER.includes(p))) issues.push({ code: 'no_legs' });
  const pulls = patterns.filter((p) => moveClass(p) === 'pull').length;
  const pushes = patterns.filter((p) => moveClass(p) === 'push').length;
  if (pulls < pushes) issues.push({ code: 'pull_lt_push' });
  if (!patterns.includes('core')) issues.push({ code: 'no_core' });
  const unstable = (e: Pick<CatalogExercise, 'stability'>) => e.stability !== 'bilateral';
  const lowerOk = exercises.some((e) => LOWER.includes(e.pattern) && unstable(e));
  const upperOk = exercises.some((e) => !LOWER.includes(e.pattern) && unstable(e));
  if (!lowerOk || !upperOk) issues.push({ code: 'balance_quota' });
  if (hasSameDirectionInRow(patterns)) issues.push({ code: 'order' });
  return issues;
}

/**
 * Patterns the week still needs (§4.3), most missing first.
 * 1 workout a week: every pattern once. 2: every pattern once and the
 * groups (knee-dominant legs, hinge, push, pull, core) twice. 3+: every
 * pattern twice. Core is expected in every workout.
 */
export function weekDebt(sessions: MovementPattern[][], perWeek: number): MovementPattern[] {
  const counts = countPatterns(sessions.flat());
  const need: Partial<Record<MovementPattern, number>> = {};
  const perPattern = perWeek >= 3 ? 2 : 1;
  for (const p of MOVEMENT_PATTERNS) need[p] = Math.max(0, perPattern - counts[p]);
  if (perWeek === 2) {
    const group = (ps: MovementPattern[]) => ps.reduce((a, p) => a + counts[p], 0);
    const groups: MovementPattern[][] = [['squat', 'lunge'], ['hinge'], ['push_h', 'push_v'], ['pull_h', 'pull_v'], ['core']];
    for (const g of groups) {
      if (group(g) < 2) {
        const least = [...g].sort((a, b) => counts[a] - counts[b])[0];
        need[least] = Math.max(need[least] ?? 0, 1);
      }
    }
  }
  return MOVEMENT_PATTERNS.filter((p) => (need[p] ?? 0) > 0).sort((a, b) => (need[b] ?? 0) - (need[a] ?? 0));
}

/** Week rules hold: no debt and pulls ≥ pushes. */
export function weekIsCovered(sessions: MovementPattern[][], perWeek: number): boolean {
  const all = sessions.flat();
  const pulls = all.filter((p) => moveClass(p) === 'pull').length;
  const pushes = all.filter((p) => moveClass(p) === 'push').length;
  return weekDebt(sessions, perWeek).length === 0 && pulls >= pushes && sessions.every((s) => s.includes('core'));
}
