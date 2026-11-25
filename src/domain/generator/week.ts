import { MovementPattern } from '../catalog/types';
import { weekDebt } from './coverage';
import { estimateSeconds } from './duration';
import { accentPlan, shortRounds } from './modes';
import { moveClass } from './order';
import {
  CHECKPOINT_WEEK, DELOAD, F_SLOTS, TEMPLATE_A, TEMPLATE_ALL, TEMPLATE_B, TEMPLATE_F_A, TEMPLATE_F_B, TEMPLATE_M,
  TemplateSlot, WEEK, WEEK_EXTRA_CYCLE,
} from './rules';
import { buildSession, goalPatterns } from './session';
import { Component, GeneratedWorkout, GeneratorContext, GeneratorProfile, SessionKind } from './types';

// The week and the month (GENERATOR_RULES §4, §9.2).

export function weekLayout(profile: GeneratorProfile): SessionKind[] {
  const n = Math.max(1, Math.floor(profile.perWeek));
  const base = WEEK[profile.healthLevel][Math.min(n, 4) as 1 | 2 | 3 | 4] as SessionKind[];
  if (n <= 4) return base;
  const extra = profile.healthLevel === 'mobility'
    ? new Array<SessionKind>(n - 4).fill('M')
    : Array.from({ length: n - 4 }, (_, i) => WEEK_EXTRA_CYCLE[i % WEEK_EXTRA_CYCLE.length] as SessionKind);
  return [...base, ...extra];
}

const TEMPLATES: Partial<Record<SessionKind, { t: TemplateSlot[]; c: Component }>> = {
  'S-A': { t: TEMPLATE_A, c: 'S' },
  'S-B': { t: TEMPLATE_B, c: 'S' },
  'S-ALL': { t: TEMPLATE_ALL, c: 'S' },
  'F-A': { t: TEMPLATE_F_A, c: 'F' },
  'F-B': { t: TEMPLATE_F_B, c: 'F' },
  'F-ALL': { t: TEMPLATE_ALL, c: 'F' },
  M: { t: TEMPLATE_M, c: 'M' },
};

/**
 * Slots of the deficit-driven F workout: what the week still lacks, with
 * at least one leg movement, pulls not fewer than pushes inside the week,
 * and core last.
 */
export function deficitTemplate(before: MovementPattern[][], perWeek: number): TemplateSlot[] {
  const debt = weekDebt(before, perWeek).filter((p) => p !== 'core');
  const all = before.flat();
  let pulls = all.filter((p) => moveClass(p) === 'pull').length;
  let pushes = all.filter((p) => moveClass(p) === 'push').length;
  const chosen: MovementPattern[] = [];
  const take = (p: MovementPattern) => {
    chosen.push(p);
    if (moveClass(p) === 'pull') pulls++;
    if (moveClass(p) === 'push') pushes++;
  };
  // One of each class first: legs, pull, push (a push only if pulls stay ≥ pushes).
  for (const cls of ['lower', 'pull', 'push'] as const) {
    const p = debt.find((d) => moveClass(d) === cls && !chosen.includes(d));
    if (p && (cls !== 'push' || pulls >= pushes + 1)) take(p);
  }
  for (const p of debt) {
    if (chosen.length >= F_SLOTS - 1) break;
    if (chosen.includes(p)) continue;
    if (moveClass(p) === 'push' && pulls < pushes + 1) continue;
    take(p);
  }
  // Fill up with the F basics if the week is already covered.
  for (const p of ['squat', 'pull_h', 'push_h', 'lunge'] as MovementPattern[]) {
    if (chosen.length >= F_SLOTS - 1) break;
    if (chosen.includes(p)) continue;
    if (moveClass(p) === 'push' && pulls < pushes + 1) continue;
    take(p);
  }
  return [...chosen.map((pattern) => ({ pattern })), { pattern: 'core' as MovementPattern }];
}

const patternsOf = (gw: GeneratedWorkout) => gw.plan.items.map((it) => it.pattern!) as MovementPattern[];

/** Builds the week: workouts in layout order. */
export function buildWeek(profile: GeneratorProfile, ctx: GeneratorContext): GeneratedWorkout[] {
  const layout = weekLayout(profile);
  const used = new Set<string>();
  const out: (GeneratedWorkout | undefined)[] = new Array(layout.length);
  const remember = (gw: GeneratedWorkout) => gw.plan.items.forEach((it) => it.exerciseId && used.add(it.exerciseId));

  // 1) template workouts
  layout.forEach((kind, index) => {
    const tpl = TEMPLATES[kind];
    if (!tpl) return;
    const gw = buildSession(tpl.t, profile, ctx, { kind, component: tpl.c, index, usedThisWeek: used });
    out[index] = gw;
    remember(gw);
  });

  // 2) deficit-driven F workouts, each seeing the ones before
  layout.forEach((kind, index) => {
    if (kind !== 'F') return;
    const before = out.filter((g): g is GeneratedWorkout => Boolean(g) && g!.component !== 'M').map(patternsOf);
    const gw = buildSession(deficitTemplate(before, profile.perWeek), profile, ctx, {
      kind, component: 'F', index, usedThisWeek: used,
    });
    out[index] = gw;
    remember(gw);
  });

  // 3) 5+: accent A / B and top-ups of what the accent dropped
  const main: Component = profile.healthLevel === 'form' ? 'F' : 'S';
  const source = (kind: SessionKind) =>
    out.find((g) => g?.kind === (main === 'S' ? (kind === 'ACC-A' ? 'S-A' : 'S-B') : kind === 'ACC-A' ? 'F-A' : 'F-B'));
  let lastDropped: MovementPattern[] = [];
  const catalogById = new Map(ctx.catalog.map((c) => [c.id, c]));
  layout.forEach((kind, index) => {
    if (kind === 'ACC-A' || kind === 'ACC-B') {
      const src = source(kind);
      if (!src) return;
      const { plan, dropped } = accentPlan(src, profile, ctx);
      lastDropped = dropped;
      const id = `gen-${ctx.date}-${index}-${kind}`;
      const p = { ...plan, id, title: kind };
      out[index] = { ...src, kind, plan: p, estimateSec: estimateSeconds(p, catalogById) };
    } else if (kind === 'TOPUP') {
      const tpl: TemplateSlot[] = (lastDropped.length ? lastDropped : ['hinge', 'core'] as MovementPattern[]).map(
        (pattern) => ({ pattern })
      );
      const gw = buildSession(tpl, profile, ctx, { kind, component: main, index, usedThisWeek: used });
      const rounds = main === 'S' ? 2 : shortRounds(gw.plan.rounds);
      const p = { ...gw.plan, rounds };
      out[index] = { ...gw, plan: p, estimateSec: estimateSeconds(p, catalogById) };
      remember(gw);
    }
  });

  return out.filter((g): g is GeneratedWorkout => Boolean(g));
}

/**
 * The month: N workouts a week for 4 weeks (§9.2). Only the frame is built
 * ahead; each workout is rebuilt before its start from the latest data.
 * Week 4 is a deload; week 3 carries the personal goal's control test.
 */
export function buildMonth(profile: GeneratorProfile, ctx: GeneratorContext): GeneratedWorkout[][] {
  const week = buildWeek(profile, ctx);
  const goals = goalPatterns(profile, ctx.catalog);
  const catalogById = new Map(ctx.catalog.map((c) => [c.id, c]));
  return [1, 2, 3, 4].map((n) =>
    week.map((gw, i) => {
      const id = `${gw.plan.id}-w${n}`;
      if (n === 4) {
        const plan = {
          ...gw.plan,
          id,
          rounds: Math.max(1, Math.round(gw.plan.rounds * DELOAD.roundsShare)),
          items: gw.plan.items.map((it) => ({
            ...it,
            spec: it.spec?.kind === 'pctMax' ? { kind: 'pctMax' as const, pct: +(it.spec.pct * DELOAD.pctShare).toFixed(3) } : it.spec,
            target: Math.max(1, Math.round(it.target * DELOAD.pctShare)),
          })),
        };
        return { ...gw, plan, deload: true, estimateSec: estimateSeconds(plan, catalogById) };
      }
      const firstWithGoal = week.findIndex((w) => w.component !== 'M' && patternsOf(w).some((p) => goals.includes(p)));
      const checkpoint = n === CHECKPOINT_WEEK && goals.length > 0 && i === firstWithGoal;
      return { ...gw, plan: { ...gw.plan, id }, ...(checkpoint ? { checkpoint: true } : {}) };
    })
  );
}
