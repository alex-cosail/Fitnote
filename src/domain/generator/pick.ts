import { Conditions, isAvailable } from '../catalog/filter';
import { CatalogExercise } from '../catalog/types';
import { PICK } from './rules';
import { GeneratorContext, GeneratorProfile, SlotSpec } from './types';

// Exercise for a slot by score (GENERATOR_RULES §7).

export interface PickOptions {
  usedThisSession: Set<string>;
  usedThisWeek: Set<string>;
  conditions: Conditions;
  /** Widen the rank window (balance quota retry). */
  rankWindow?: number;
  /** Only unilateral / unstable exercises (balance quota). */
  onlyUnstable?: boolean;
  /** Do not fall back to any rank when nothing is inside the window. */
  strictWindow?: boolean;
}

function daysBetween(fromIso: string, toIso: string): number {
  return Math.max(0, (Date.parse(toIso) - Date.parse(fromIso)) / 86_400_000);
}

export function pickScore(
  c: CatalogExercise,
  slot: SlotSpec,
  profile: GeneratorProfile,
  ctx: GeneratorContext,
  opts: PickOptions
): number {
  let score = 0;
  if (profile.favorites.includes(c.id)) score += PICK.favorite;
  if (profile.goalExerciseIds.includes(c.id)) score += PICK.goal;
  const last = ctx.history.lastDone[c.id];
  // Never done counts as "long ago".
  score += last
    ? Math.min(PICK.recencyCap, (daysBetween(last, ctx.date) / 7) * PICK.recencyPerWeek)
    : PICK.recencyCap;
  if ((ctx.history.swappedAway[c.id] ?? 0) >= PICK.dislikedSwaps) score += PICK.disliked;
  score += PICK.rankDistance * Math.abs(c.rank - slot.rank);
  if (slot.families?.includes(c.family)) score += PICK.family;
  if (slot.unilateral && c.stability !== 'bilateral') score += PICK.unilateral;
  if (opts.usedThisWeek.has(c.id)) score += PICK.usedThisWeek;
  if (opts.usedThisSession.has(c.id)) score += PICK.usedThisSession;
  return score;
}

/**
 * Best exercise for the slot among available ones of its pattern within
 * ±1 rank (or the window given); falls back to any rank. Ties → by id.
 * Painful exercises are never picked.
 */
export function pickExercise(
  slot: SlotSpec,
  profile: GeneratorProfile,
  ctx: GeneratorContext,
  opts: PickOptions
): CatalogExercise | undefined {
  const window = opts.rankWindow ?? 1;
  const pool = ctx.catalog.filter(
    (c) =>
      c.pattern === slot.pattern &&
      !profile.painful.includes(c.id) &&
      !opts.usedThisSession.has(c.id) &&
      (!opts.onlyUnstable || c.stability !== 'bilateral') &&
      isAvailable(c, opts.conditions)
  );
  const near = pool.filter((c) => Math.abs(c.rank - slot.rank) <= window);
  const candidates = near.length > 0 || opts.strictWindow ? near : pool;
  const scored = candidates
    .map((c) => ({ c, s: pickScore(c, slot, profile, ctx, opts) }))
    .sort((a, b) => b.s - a.s || (a.c.id < b.c.id ? -1 : a.c.id > b.c.id ? 1 : 0));
  return scored[0]?.c;
}
