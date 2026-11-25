import { WorkoutItem, WorkoutPlan } from '../../types';
import { MovementPattern } from '../catalog/types';
import { estimateSeconds } from './duration';
import { moveClass, orderRound } from './order';
import { ACCENT_MIN_ROUNDS, ACCENT_REST, COOLDOWN_MIN, MIN_ROUNDS_AFTER_CUT, SHORT_ROUNDS_SHARE, TEMPLATE_M, WARMUP_MIN, ZONE_PRIORITY } from './rules';
import { buildSession, zoneMarks } from './session';
import { DayMode, DayResult, GeneratedWorkout, GeneratorContext, GeneratorProfile } from './types';

// The four modes of one workout chosen right before it (GENERATOR_RULES §3.2):
// standard · short (⅔ rounds) · accent (focus + antagonists, minutes set by
// hand) · off (mobility only).

/** ⅔ of the rounds, at least 1: 3 → 2, 15 → 10. */
export function shortRounds(rounds: number): number {
  return Math.max(1, Math.round(rounds * SHORT_ROUNDS_SHARE));
}

/** Antagonist partner preference for a pattern (§5.1 pairs). */
function partnerRank(a: MovementPattern, b: MovementPattern): number {
  const ca = moveClass(a);
  const cb = moveClass(b);
  const plane = (p: MovementPattern) => (p.endsWith('_h') ? 'h' : p.endsWith('_v') ? 'v' : '');
  if ((ca === 'push' && cb === 'pull') || (ca === 'pull' && cb === 'push')) return plane(a) === plane(b) ? 0 : 1;
  const knee = (p: MovementPattern) => p === 'squat' || p === 'lunge';
  if ((knee(a) && b === 'hinge') || (a === 'hinge' && knee(b))) return 0;
  if ((ca === 'lower' && cb === 'core') || (ca === 'core' && cb === 'lower')) return 2;
  if (ca === 'lower' && cb === 'lower') return 3;
  return 9; // two pushes, two pulls, core + upper: not a pair
}

export interface Pair {
  items: number[]; // indices into plan.items
  priority: number;
}

/**
 * Splits a round into antagonist pairs: focus items pair first, then the
 * rest by queue order; an item without a partner stays alone.
 */
export function pairItems(items: WorkoutItem[], priorities: number[]): Pair[] {
  const free = new Set(items.map((_, i) => i));
  const pairs: Pair[] = [];
  const queue = items.map((_, i) => i).sort((a, b) => priorities[b] - priorities[a] || a - b);
  for (const i of queue) {
    if (!free.has(i)) continue;
    free.delete(i);
    let best: number | undefined;
    let bestRank = 9;
    for (const j of free) {
      const r = partnerRank(items[i].pattern!, items[j].pattern!);
      if (r < bestRank || (r === bestRank && best !== undefined && j < best)) {
        best = j;
        bestRank = r;
      }
    }
    if (best !== undefined && bestRank < 9) {
      free.delete(best);
      pairs.push({ items: [i, best], priority: Math.max(priorities[i], priorities[best]) });
    } else {
      pairs.push({ items: [i], priority: priorities[i] });
    }
  }
  return pairs;
}

function itemPriorities(gw: GeneratedWorkout, profile: GeneratorProfile): number[] {
  const marks = zoneMarks(profile);
  return gw.plan.items.map((it) =>
    gw.focus.includes(it.pattern!) ? 3 : ZONE_PRIORITY[marks.get(it.pattern!) ?? 'base']
  );
}

function reorder(plan: WorkoutPlan, priorities: number[]): WorkoutPlan {
  const order = orderRound(plan.items.map((it, i) => ({ pattern: it.pattern!, priority: priorities[i] })));
  return { ...plan, items: order.map((i) => plan.items[i]) };
}

/**
 * Accent under the given minutes: pairs are removed from the end of the
 * queue, base zones first, then +; focus pairs always stay. Without minutes
 * only the focus pairs stay. If the focus alone is still too long, rounds
 * are cut (not below 2).
 */
export function accentPlan(
  gw: GeneratedWorkout,
  profile: GeneratorProfile,
  ctx: Pick<GeneratorContext, 'catalog'>,
  minutes?: number,
  times: { warmupMinutes: number; cooldownMinutes: number } = { warmupMinutes: WARMUP_MIN.short, cooldownMinutes: COOLDOWN_MIN.short }
): { plan: WorkoutPlan; dropped: MovementPattern[] } {
  const catalogById = new Map(ctx.catalog.map((c) => [c.id, c]));
  const prio = itemPriorities(gw, profile);
  const pairs = pairItems(gw.plan.items, prio);
  const keep = new Set(pairs.map((_, i) => i));
  const opts = times;
  const build = (rounds = gw.plan.rounds) => {
    const idx = [...keep].flatMap((p) => pairs[p].items).sort((a, b) => a - b);
    return {
      ...gw.plan,
      rounds,
      restBetweenExercises: Math.min(gw.plan.restBetweenExercises, ACCENT_REST.restEx),
      restBetweenRounds: Math.min(gw.plan.restBetweenRounds, ACCENT_REST.restRound),
      items: idx.map((i) => gw.plan.items[i]),
    };
  };
  // Removal order: lowest priority first; on a tie, later in the queue first.
  const removable = pairs
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.priority < 3)
    .sort((a, b) => a.p.priority - b.p.priority || Math.max(...b.p.items) - Math.max(...a.p.items));
  // Most rounds (≤ standard, ≥ 2) that fit the minutes with the current pairs.
  const fit = () => {
    let rounds = gw.plan.rounds;
    while (rounds > MIN_ROUNDS_AFTER_CUT && estimateSeconds(build(rounds), catalogById, opts) > minutes! * 60) rounds--;
    return rounds;
  };
  // Enough rounds to still be a real workout: 3, or the standard if smaller.
  const goodRounds = Math.min(ACCENT_MIN_ROUNDS, gw.plan.rounds);
  let plan: WorkoutPlan;
  if (minutes === undefined) {
    for (const { i } of removable) keep.delete(i);
    plan = build();
  } else {
    // Remove pairs until the rest fits in enough rounds; only then cut rounds.
    for (const { i } of removable) {
      const r = fit();
      if (r >= goodRounds && estimateSeconds(build(r), catalogById, opts) <= minutes * 60) break;
      if (keep.size <= 1) break;
      keep.delete(i);
    }
    plan = build(fit());
  }
  const keptIds = new Set(plan.items);
  const dropped = [...new Set(gw.plan.items.filter((it) => !keptIds.has(it)).map((it) => it.pattern!))].filter(
    (p) => !plan.items.some((it) => it.pattern === p)
  );
  const keptPrio = plan.items.map((it) => prio[gw.plan.items.indexOf(it)]);
  return { plan: reorder(plan, keptPrio), dropped };
}

/** Applies the day's mode to a generated workout. */
export function applyMode(
  gw: GeneratedWorkout,
  mode: DayMode,
  profile: GeneratorProfile,
  ctx: GeneratorContext,
  minutes?: number
): DayResult {
  const catalogById = new Map(ctx.catalog.map((c) => [c.id, c]));
  const full = { warmupMinutes: WARMUP_MIN.full, cooldownMinutes: COOLDOWN_MIN.full };
  const short = { warmupMinutes: WARMUP_MIN.short, cooldownMinutes: COOLDOWN_MIN.short };
  const result = (plan: WorkoutPlan, times: typeof full, dropped: MovementPattern[] = []): DayResult => ({
    plan,
    mode,
    ...times,
    estimateSec: estimateSeconds(plan, catalogById, times),
    dropped,
  });

  switch (mode) {
    case 'standard':
      return result(gw.plan, full);
    case 'short':
      return result({ ...gw.plan, rounds: shortRounds(gw.plan.rounds) }, short);
    case 'accent': {
      const { plan, dropped } = accentPlan(gw, profile, ctx, minutes);
      return result(plan, short, dropped);
    }
    case 'off': {
      const m = buildSession(TEMPLATE_M, profile, ctx, {
        kind: 'M', component: 'M', index: 0, usedThisWeek: new Set(),
      });
      return result({ ...m.plan, id: `${gw.plan.id}-off` }, short);
    }
  }
}
