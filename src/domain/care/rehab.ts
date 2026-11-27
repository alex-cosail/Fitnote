import type { CatalogExercise } from '../catalog/types';
import type { Joint } from '../catalog/joints';
import { blockedByCare, CareRule } from './care';
import { jointLoad } from '../catalog/joints';

// Step 0 in a workout (v3.14): when a slot is not possible because of a joint
// at level 1–3, a movement for that joint takes it — the highest level the
// person has allowed, not used yet in this workout. Level 0: nothing.

export function rehabFor(catalog: CatalogExercise[], joint: Joint, level: number, used: Set<string> = new Set()): CatalogExercise | undefined {
  if (level < 1 || level > 3) return undefined;
  return catalog
    .filter((c) => c.rehab?.joint === joint && c.rehab.level <= level && !used.has(c.id))
    .sort((a, b) => b.rehab!.level - a.rehab!.level)[0];
}

/** The joint that blocks this exercise (for a slot without an exercise: any of its pattern). */
export function blockingRule(
  catalog: CatalogExercise[],
  care: CareRule[] | undefined,
  exercise?: CatalogExercise,
  pattern?: CatalogExercise['pattern']
): CareRule | undefined {
  if (!care?.length) return undefined;
  if (exercise) return blockedByCare(exercise, care);
  const sample = catalog.find((c) => c.pattern === pattern && !c.rehab && blockedByCare(c, care));
  return sample ? blockedByCare(sample, care) : undefined;
}

/** Fixed, gentle targets by level: no maxima, no tests to failure. */
export function rehabTarget(c: CatalogExercise): number {
  const level = c.rehab?.level ?? 2;
  if (c.metric === 'seconds') return [0, 20, 25, 30][level];
  return [0, 6, 8, 10][level];
}

/**
 * «Здоровье и восстановление» (Addendum №5): no tests to failure — fixed
 * targets. Ordinary movements 12 reps (or 30 s); a movement that touches a
 * joint at level 4 («бережно») — 10.
 */
export function longevityTarget(c: CatalogExercise, care: CareRule[] = []): number {
  const load = jointLoad(c);
  const gentle = care.some((r) => r.level === 4 && (load[r.joint] ?? 0) >= 1);
  if (c.metric === 'seconds') return gentle ? 20 : 30;
  return gentle ? 10 : 12;
}
