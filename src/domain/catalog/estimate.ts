import { Conditions, isAvailable } from './filter';
import { CatalogExercise, FitnessLevel, MaxEntry, MovementPattern } from './types';

// Check-up without 67 tests (field test 26.11): a few base exercises are
// measured, the rest get an estimated max from their ladder family.

/** Classic test per pattern, best first; the first one available here wins. */
const BASE_PREFERENCE: Record<MovementPattern, string[]> = {
  push_h: ['floor-push-ups', 'incline-push-ups', 'knee-push-ups'],
  pull_h: ['australian-pull-ups', 'band-row', 'seated-band-row'],
  push_v: ['pike-push-ups', 'band-overhead-press', 'incline-pike-push-ups'],
  pull_v: ['strict-pull-ups', 'negative-pull-ups', 'band-assisted-pull-ups'],
  squat: ['air-squats', 'box-squats'],
  hinge: ['romanian-deadlift', 'single-leg-glute-bridge', 'glute-bridge'],
  lunge: ['reverse-lunges', 'split-squats'],
  core: ['side-plank', 'high-plank', 'dead-hang'],
};
const PATTERN_ORDER: MovementPattern[] = ['push_h', 'pull_h', 'push_v', 'pull_v', 'squat', 'hinge', 'lunge', 'core'];

/** Up to 8 base check-up exercises (one per pattern) for these conditions. */
export function baseCheckupIds(catalog: CatalogExercise[], cond: Conditions = {}): string[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  const out: string[] = [];
  for (const p of PATTERN_ORDER) {
    const pref = BASE_PREFERENCE[p].map((id) => byId.get(id)).find((c) => c && isAvailable(c, cond));
    const pick =
      pref ??
      catalog
        .filter((c) => c.pattern === p && isAvailable(c, cond))
        .sort((a, b) => Math.abs(a.rank - 3) - Math.abs(b.rank - 3) || (a.id < b.id ? -1 : 1))[0];
    if (pick) out.push(pick.id);
  }
  return out;
}

export type MaxSource = 'measured' | 'estimated' | 'default';

/**
 * Max of every catalog exercise: measured if the person tested it; else
 * estimated from a measured exercise of the same ladder family (its max ×
 * the ratio of the default maxima at the person's level); else the default
 * for the level.
 */
export function estimateMaxes(
  catalog: CatalogExercise[],
  maxes: Record<string, MaxEntry>,
  level: FitnessLevel
): Record<string, { value: number; source: MaxSource }> {
  const out: Record<string, { value: number; source: MaxSource }> = {};
  for (const c of catalog) {
    const own = maxes[c.id];
    if (own) {
      out[c.id] = { value: own.value, source: 'measured' };
      continue;
    }
    // nearest measured relative in the family with the same metric
    const relatives = catalog
      .filter((r) => r.family === c.family && r.id !== c.id && r.metric === c.metric && maxes[r.id])
      .sort((a, b) => Math.abs(a.rank - c.rank) - Math.abs(b.rank - c.rank) || (a.id < b.id ? -1 : 1));
    const rel = relatives[0];
    if (rel && rel.defaultMax[level] > 0) {
      const raw = (maxes[rel.id].value * c.defaultMax[level]) / rel.defaultMax[level];
      const value = c.metric === 'seconds' ? Math.max(5, Math.round(raw / 5) * 5) : Math.max(1, Math.round(raw));
      out[c.id] = { value, source: 'estimated' };
    } else {
      out[c.id] = { value: c.defaultMax[level], source: 'default' };
    }
  }
  return out;
}
