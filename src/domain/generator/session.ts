import { WorkoutItem, WorkoutPlan } from '../../types';
import { Conditions } from '../catalog/filter';
import { ladderNeighbour } from '../catalog/ladder';
import { CatalogExercise, MovementPattern } from '../catalog/types';
import { targetFromSpec } from '../plan/resolveWorkout';
import { capMinutes, estimateSeconds, fitRounds } from './duration';
import { moveClass, orderRound } from './order';
import { pickExercise } from './pick';
import {
  AGE_PCT_CAP, CAP_TOLERANCE, COMPONENT, F_MIN_ROUNDS, F_STEP_DOWN_BELOW_REPS, LEVEL_RANK, M_RANK, MAX_PLUSPLUS_ZONES,
  S_ROUNDS_HIGH, S_STEP_DOWN_BELOW_REPS, S_WINDOW, TemplateSlot, ZONE_PATTERNS, ZONE_PRIORITY, ZONE_RANK_STEP,
} from './rules';
import {
  Component, GeneratedWorkout, GeneratorContext, GeneratorProfile, SessionKind, SlotSpec, Zone, ZoneMark,
} from './types';

// One workout: slots, accents, picks, balance quota, targets, order, rounds
// (GENERATOR_RULES §2, §5, §6).

const LOWER: MovementPattern[] = ['squat', 'lunge', 'hinge'];
const QUOTA_PREFERENCE: MovementPattern[] = ['core', 'pull_h', 'push_h', 'push_v', 'pull_v', 'lunge', 'hinge', 'squat'];

/** Zones with ++ (at most two, in zone order) and the mark of every pattern. */
export function zoneMarks(profile: GeneratorProfile): Map<MovementPattern, ZoneMark> {
  const marks = new Map<MovementPattern, ZoneMark>();
  let plusplus = 0;
  for (const zone of Object.keys(ZONE_PATTERNS) as Zone[]) {
    let mark = profile.zones[zone] ?? 'base';
    if (mark === 'plusplus') {
      if (plusplus >= MAX_PLUSPLUS_ZONES) mark = 'plus';
      else plusplus++;
    }
    for (const p of ZONE_PATTERNS[zone]) marks.set(p, mark);
  }
  return marks;
}

export function goalPatterns(profile: GeneratorProfile, catalog: CatalogExercise[]): MovementPattern[] {
  const byId = new Map(catalog.map((c) => [c.id, c]));
  return [...new Set(profile.goalExerciseIds.map((id) => byId.get(id)?.pattern).filter(Boolean))] as MovementPattern[];
}

/**
 * Focus of a workout (§3.2): personal goal → ++ zones → the big movements
 * that pump lymph: a knee-dominant leg movement and a pull.
 */
export function focusPatterns(
  profile: GeneratorProfile,
  catalog: CatalogExercise[],
  present: MovementPattern[]
): MovementPattern[] {
  const goal = goalPatterns(profile, catalog).filter((p) => present.includes(p));
  if (goal.length) return goal;
  const marks = zoneMarks(profile);
  const pp = present.filter((p) => marks.get(p) === 'plusplus');
  if (pp.length) return [...new Set(pp)];
  const legs = present.find((p) => p === 'squat' || p === 'lunge');
  const pull = present.find((p) => moveClass(p) === 'pull');
  return [legs, pull].filter(Boolean) as MovementPattern[];
}

export function slotsFor(
  template: TemplateSlot[],
  component: Component,
  profile: GeneratorProfile,
  catalog: CatalogExercise[]
): SlotSpec[] {
  const marks = zoneMarks(profile);
  const goals = goalPatterns(profile, catalog);
  const base = component === 'M' ? M_RANK : LEVEL_RANK[profile.level];
  return template.map((t) => {
    const mark = marks.get(t.pattern) ?? 'base';
    const isGoal = goals.includes(t.pattern);
    const step = component === 'M' ? 0 : isGoal ? 1 : ZONE_RANK_STEP[mark];
    return {
      ...t,
      rank: Math.max(1, Math.min(5, base + step)),
      priority: isGoal ? 3 : ZONE_PRIORITY[mark],
    };
  });
}

export function sharePct(component: Component, profile: GeneratorProfile): number {
  const pct = COMPONENT[component].pct;
  return profile.ageGroup === 'adult' ? pct : Math.min(pct, AGE_PCT_CAP);
}

function maxOf(ctx: GeneratorContext, id: string): number {
  return ctx.exercises.find((e) => e.id === id)?.checkup_max ?? 0;
}

/**
 * Keeps the target inside the component's window by stepping the ladder
 * (§2): S above 15 reps / 60 s → +1, S below 3 reps → −1, F below 2 → −1.
 */
export function adjustToWindow(
  c: CatalogExercise,
  component: Component,
  pct: number,
  ctx: GeneratorContext,
  cond: Conditions,
  painful: string[]
): CatalogExercise {
  let cur = c;
  for (let i = 0; i < 2; i++) {
    const target = targetFromSpec({ kind: 'pctMax', pct }, { checkup_max: maxOf(ctx, cur.id), metric: cur.metric });
    let dir: -1 | 1 | 0 = 0;
    if (component === 'S') {
      const w = S_WINDOW[cur.metric];
      if (target > w.max) dir = 1;
      else if (cur.metric === 'reps' && target < S_STEP_DOWN_BELOW_REPS) dir = -1;
    } else if (component === 'F' && cur.metric === 'reps' && target < F_STEP_DOWN_BELOW_REPS) {
      dir = -1;
    }
    if (!dir) break;
    const next = ladderNeighbour(ctx.catalog, cur.id, dir, cond);
    if (!next || next.pattern !== cur.pattern || painful.includes(next.id)) break;
    cur = next;
  }
  return cur;
}

const isUnstable = (c?: CatalogExercise) => Boolean(c) && c!.stability !== 'bilateral';

export interface BuildOptions {
  kind: SessionKind;
  component: Component;
  index: number;
  usedThisWeek: Set<string>;
  roundsOverride?: number;
}

/** Builds one generated workout from template slots. */
export function buildSession(
  template: TemplateSlot[],
  profile: GeneratorProfile,
  ctx: GeneratorContext,
  opts: BuildOptions
): GeneratedWorkout {
  const { component } = opts;
  const cond: Conditions = { ...(profile.usualConditions ?? {}), ageGroup: profile.ageGroup };
  const slots = slotsFor(template, component, profile, ctx.catalog);
  const used = new Set<string>();
  const picks: (CatalogExercise | undefined)[] = new Array(slots.length);

  // High-priority slots pick first, so the goal and accents get the best fits.
  const pickOrder = slots.map((_, i) => i).sort((a, b) => slots[b].priority - slots[a].priority || a - b);
  for (const i of pickOrder) {
    const c = pickExercise(slots[i], profile, ctx, { usedThisSession: used, usedThisWeek: opts.usedThisWeek, conditions: cond });
    picks[i] = c;
    if (c) used.add(c.id);
  }

  // Balance quota (§5.2): one unilateral / unstable on the legs or hips and
  // one on the upper body or core, in S and F workouts.
  if (component !== 'M') {
    const fixQuota = (groupPatterns: MovementPattern[]) => {
      const idx = slots.map((_, i) => i).filter((i) => groupPatterns.includes(slots[i].pattern));
      if (idx.some((i) => isUnstable(picks[i]))) return;
      // Favorites and the goal keep their slots; base-priority slots go first.
      const keepPick = (i: number) =>
        Boolean(picks[i]) && (profile.favorites.includes(picks[i]!.id) || profile.goalExerciseIds.includes(picks[i]!.id));
      // Gentlest unilateral options first: core and horizontal pull up top, lunge and hinge below.
      const pref = (i: number) => QUOTA_PREFERENCE.indexOf(slots[i].pattern);
      const order = idx.filter((j) => !keepPick(j)).sort((a, b) => slots[a].priority - slots[b].priority || pref(a) - pref(b) || a - b);
      // First a variant near the person's step in any slot; only then any step.
      for (const [strict, rankWindow] of [[true, 1], [true, 2], [false, 2]] as const) {
        for (const i of order) {
          const without = new Set([...used].filter((id) => id !== picks[i]?.id));
          const c = pickExercise({ ...slots[i], unilateral: true }, profile, ctx, {
            usedThisSession: without, usedThisWeek: opts.usedThisWeek, conditions: cond,
            rankWindow, onlyUnstable: true, strictWindow: strict,
          });
          if (isUnstable(c)) {
            if (picks[i]) used.delete(picks[i]!.id);
            picks[i] = c;
            used.add(c!.id);
            return;
          }
        }
      }
    };
    fixQuota(LOWER);
    fixQuota(['core', 'pull_h', 'push_h', 'pull_v', 'push_v']);
  }

  const pct = sharePct(component, profile);
  const picked = slots
    .map((slot, i) => ({ slot, c: picks[i] }))
    .filter((x): x is { slot: SlotSpec; c: CatalogExercise } => Boolean(x.c));
  const chosen = picked.map(({ slot, c }, _i, all) => {
    // Never step onto an exercise another slot already uses.
    const others = all.filter((x) => x.c.id !== c.id).map((x) => x.c.id);
    // Favorites and the goal exercise stay as chosen: the person picked them.
    const pinned = profile.favorites.includes(c.id) || profile.goalExerciseIds.includes(c.id);
    const adjusted = pinned ? c : adjustToWindow(c, component, pct, ctx, cond, [...profile.painful, ...others]);
    return { slot, c: adjusted };
  });
  // A ladder step must not break the balance quota: undo it in that group.
  if (component !== 'M') {
    for (const group of [LOWER, ['core', 'pull_h', 'push_h', 'pull_v', 'push_v'] as MovementPattern[]]) {
      const inGroup = chosen.map((_, i) => i).filter((i) => group.includes(chosen[i].slot.pattern));
      const before = inGroup.some((i) => isUnstable(picked[i].c));
      const after = inGroup.some((i) => isUnstable(chosen[i].c));
      if (before && !after) for (const i of inGroup) chosen[i] = picked[i];
    }
  }

  const order = orderRound(chosen.map(({ slot }) => slot));
  const items: WorkoutItem[] = order.map((i) => {
    const { c } = chosen[i];
    const spec = { kind: 'pctMax' as const, pct };
    return {
      exerciseId: c.id,
      pattern: c.pattern,
      rank: c.rank,
      spec,
      target: targetFromSpec(spec, { checkup_max: maxOf(ctx, c.id), metric: c.metric }),
    };
  });

  const rule = COMPONENT[component];
  const catalogById = new Map(ctx.catalog.map((c) => [c.id, c]));
  const base: WorkoutPlan = {
    id: `gen-${ctx.date}-${opts.index}-${opts.kind}`,
    title: opts.kind,
    subtitle: '',
    formatLabel: '',
    rounds: rule.rounds,
    restBetweenExercises: rule.restEx,
    restBetweenRounds: rule.restRound,
    items,
  };
  const capSec = capMinutes(profile) * 60 * CAP_TOLERANCE;
  let rounds: number;
  if (opts.roundsOverride !== undefined) rounds = opts.roundsOverride;
  else if (component === 'S') rounds = fitRounds(base, profile.level === 'high' ? S_ROUNDS_HIGH : rule.rounds, capSec, catalogById);
  else if (component === 'F') rounds = fitRounds(base, rule.rounds, capSec, catalogById, {}, F_MIN_ROUNDS);
  else rounds = rule.rounds;

  const plan = { ...base, rounds };
  const present = items.map((it) => it.pattern!) as MovementPattern[];
  return {
    kind: opts.kind,
    component,
    plan,
    focus: focusPatterns(profile, ctx.catalog, present),
    estimateSec: estimateSeconds(plan, catalogById),
  };
}
