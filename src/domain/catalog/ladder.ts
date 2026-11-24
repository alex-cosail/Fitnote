import { Conditions, isAvailable } from './filter';
import { CatalogExercise } from './types';

/**
 * Neighbour on the progression ladder, one step easier (-1) or harder (+1).
 * The explicit `ladder.minus1 / plus1` link wins when it is available under
 * the conditions; otherwise the nearest available rank in the same family
 * in that direction (equal rank counts only as a last resort).
 */
export function ladderNeighbour(
  catalog: CatalogExercise[],
  exerciseId: string,
  direction: -1 | 1,
  cond: Conditions = {}
): CatalogExercise | undefined {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const current = byId.get(exerciseId);
  if (!current) return undefined;

  const preferredId = direction < 0 ? current.ladder?.minus1 : current.ladder?.plus1;
  const preferred = preferredId ? byId.get(preferredId) : undefined;
  if (preferred && isAvailable(preferred, cond)) return preferred;

  const family = catalog.filter(
    (c) => c.family === current.family && c.id !== current.id && isAvailable(c, cond)
  );
  const inDirection = family
    .filter((c) => (direction < 0 ? c.rank < current.rank : c.rank > current.rank))
    .sort((a, b) => Math.abs(a.rank - current.rank) - Math.abs(b.rank - current.rank));
  if (inDirection.length > 0) return inDirection[0];
  return family.find((c) => c.rank === current.rank);
}

/**
 * Best available catalog exercise for a pattern near a desired rank:
 * nearest rank first, then the easier one on a tie.
 */
export function pickForPattern(
  catalog: CatalogExercise[],
  pattern: CatalogExercise['pattern'],
  rank: number,
  cond: Conditions = {},
  preferFamily?: string
): CatalogExercise | undefined {
  const candidates = catalog.filter((c) => c.pattern === pattern && isAvailable(c, cond));
  const score = (c: CatalogExercise) =>
    Math.abs(c.rank - rank) * 10 + (c.rank > rank ? 1 : 0) + (preferFamily && c.family !== preferFamily ? 5 : 0);
  return [...candidates].sort((a, b) => score(a) - score(b))[0];
}
