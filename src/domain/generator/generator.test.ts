import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { INITIAL_WORKOUTS } from '../../data/seed';
import { catalogTextsFor } from '../../data/catalogTexts';
import { WorkoutLog } from '../../types';
import { resolveExercises } from '../catalog/resolve';
import { MOVEMENT_PATTERNS, MovementPattern } from '../catalog/types';
import {
  DEFAULT_PROFILE, GeneratedWorkout, GeneratorContext, GeneratorProfile, HealthLevel,
  applyMode, buildMonth, buildWeek, calibrateMax, calibrateTempo, capMinutes, checkSession, deficitTemplate,
  estimateSeconds, fitRounds, hasSameDirectionInRow, historyFromLogs, nextTarget, orderRound, outcomeFromLog,
  antagonistOptions, basketIssues, buildOwnPlan, changeRounds, changeTarget, fixFor, ladderPosition, ownItem, stepRank, swapExercise, zoneCandidates,
  dayPlan, replaceGenerated, runGenerator, shortRounds, toWorkoutPlans, weekDebt, weekIsCovered,
} from '.';
import { CAP_TOLERANCE, DELOAD } from './rules';

const texts = catalogTextsFor('ru');
const byId = new Map(CATALOG.map((c) => [c.id, c]));

function ctxFor(profile: GeneratorProfile, extra: Partial<GeneratorContext> = {}): GeneratorContext {
  return {
    catalog: CATALOG,
    exercises: resolveExercises(CATALOG, texts, {}, [], profile.level),
    history: { lastDone: {}, swappedAway: {} },
    date: '2026-11-26',
    ...extra,
  };
}
const profileOf = (p: Partial<GeneratorProfile> = {}): GeneratorProfile => ({ ...DEFAULT_PROFILE, ...p });
const patterns = (g: GeneratedWorkout) => g.plan.items.map((it) => it.pattern!) as MovementPattern[];
const exercisesOf = (g: GeneratedWorkout) => g.plan.items.map((it) => byId.get(it.exerciseId!)!);
const isMain = (g: GeneratedWorkout) => g.component !== 'M' && !['ACC-A', 'ACC-B', 'TOPUP'].includes(g.kind);

// A sweep over profiles: every health level, 1–6 workouts a week, levels,
// age groups, accents and places.
const SWEEP: GeneratorProfile[] = [];
for (const healthLevel of ['mobility', 'form', 'strength'] as HealthLevel[])
  for (const perWeek of [1, 2, 3, 4, 5, 6])
    for (const level of ['low', 'medium', 'high'] as const)
      for (const ageGroup of ['teen', 'adult', 'masters'] as const)
        for (const variant of [0, 1, 2])
          SWEEP.push(
            profileOf({
              healthLevel, perWeek, level, ageGroup,
              zones: variant === 1 ? { upper_h: 'plusplus', squat: 'plus' } : variant === 2 ? { core: 'plusplus' } : {},
              usualConditions: variant === 2 ? { environment: 'home', equipment: ['bands'] } : DEFAULT_PROFILE.usualConditions,
              goalExerciseIds: variant === 1 ? ['chin-ups'] : [],
            })
          );

describe('week: strength, 3 a week, medium (default profile)', () => {
  const profile = profileOf();
  const week = buildWeek(profile, ctxFor(profile));

  it('is S-A, S-B, F', () => {
    expect(week.map((g) => g.kind)).toEqual(['S-A', 'S-B', 'F']);
  });

  it('covers every pattern twice, pulls not fewer than pushes, core every time', () => {
    expect(weekIsCovered(week.map(patterns), 3)).toBe(true);
  });

  it('a standard workout stays under the 45-minute cap', () => {
    expect(capMinutes(profile)).toBe(45);
    for (const g of week) expect(g.estimateSec).toBeLessThanOrEqual(45 * 60 * CAP_TOLERANCE);
  });

  it('A and B use different exercises for the same pattern where the catalog allows', () => {
    const a = new Set(week[0].plan.items.map((it) => it.exerciseId));
    const shared = week[1].plan.items.filter((it) => a.has(it.exerciseId));
    expect(shared.length).toBeLessThanOrEqual(1);
  });

  it('is deterministic', () => {
    expect(buildWeek(profile, ctxFor(profile))).toEqual(week);
  });
});

describe('week layouts', () => {
  it('1 a week: all 8 patterns in one workout', () => {
    for (const healthLevel of ['form', 'strength'] as HealthLevel[]) {
      const p = profileOf({ healthLevel, perWeek: 1 });
      const [g] = buildWeek(p, ctxFor(p));
      expect(new Set(patterns(g))).toEqual(new Set(MOVEMENT_PATTERNS));
    }
  });

  it('2 a week: every pattern once and every group twice', () => {
    const p = profileOf({ perWeek: 2 });
    const week = buildWeek(p, ctxFor(p));
    expect(weekDebt(week.map(patterns), 2)).toEqual([]);
  });

  it('4 a week (strength): S-A · F · S-B · M', () => {
    const p = profileOf({ perWeek: 4 });
    expect(buildWeek(p, ctxFor(p)).map((g) => g.kind)).toEqual(['S-A', 'F', 'S-B', 'M']);
  });

  it('5+ a week: accent A · top-up · accent B · top-up', () => {
    const p = profileOf({ perWeek: 8 });
    expect(buildWeek(p, ctxFor(p)).map((g) => g.kind)).toEqual(
      ['S-A', 'F', 'S-B', 'M', 'ACC-A', 'TOPUP', 'ACC-B', 'TOPUP']
    );
  });

  it('a top-up trains what the accent before it dropped', () => {
    const p = profileOf({ perWeek: 6 });
    const week = buildWeek(p, ctxFor(p));
    const acc = week.find((g) => g.kind === 'ACC-A')!;
    const topup = week.find((g) => g.kind === 'TOPUP')!;
    const sa = week.find((g) => g.kind === 'S-A')!;
    const dropped = patterns(sa).filter((x) => !patterns(acc).includes(x));
    expect(new Set(patterns(topup))).toEqual(new Set(dropped));
  });

  it('mobility level: mobility only', () => {
    const p = profileOf({ healthLevel: 'mobility', perWeek: 3 });
    expect(buildWeek(p, ctxFor(p)).every((g) => g.component === 'M')).toBe(true);
  });
});

describe('every generated workout (profile sweep)', () => {
  const all = SWEEP.flatMap((p) => buildWeek(p, ctxFor(p)).map((g) => ({ p, g })));

  it('never puts two pushes or two pulls in a row', () => {
    for (const { g } of all) expect(hasSameDirectionInRow(patterns(g)), g.plan.id).toBe(false);
  });

  it('never repeats an exercise inside a workout', () => {
    for (const { g } of all) {
      const ids = g.plan.items.map((it) => it.exerciseId);
      expect(new Set(ids).size, g.plan.id).toBe(ids.length);
    }
  });

  it('keeps the balance quota in S and F workouts', () => {
    for (const { g } of all.filter(({ g }) => isMain(g))) {
      const issues = checkSession(exercisesOf(g)).map((i) => i.code);
      expect(issues, `${g.plan.id} ${patterns(g).join(' ')}`).not.toContain('balance_quota');
    }
  });

  it('puts core last unless core is the focus', () => {
    for (const { g } of all.filter(({ g }) => isMain(g) && !g.focus.includes('core'))) {
      const ps = patterns(g);
      const firstCore = ps.indexOf('core');
      if (firstCore >= 0) expect(ps.slice(firstCore).every((x) => x === 'core'), g.plan.id).toBe(true);
    }
  });

  it('teen and masters: share ≤ 0.7; teen never gets a step closed for teens', () => {
    for (const { p, g } of all.filter(({ p }) => p.ageGroup !== 'adult')) {
      for (const it of g.plan.items) {
        expect(it.spec?.kind === 'pctMax' && it.spec.pct).toBeLessThanOrEqual(0.7);
        if (p.ageGroup === 'teen') {
          const c = byId.get(it.exerciseId!)!;
          expect(c.rank, c.id).toBeLessThan(5);
          expect(c.teenAllowed, c.id).not.toBe(false);
        }
      }
    }
  });

  it('S never plans above 80% of the max, nothing goes to failure', () => {
    for (const { g } of all) for (const it of g.plan.items) {
      expect(it.spec?.kind).toBe('pctMax');
      expect((it.spec as { pct: number }).pct).toBeLessThanOrEqual(0.8);
    }
  });

  it('standard rounds stay within the cap (or the minimum of 2)', () => {
    const catalogById = new Map(CATALOG.map((c) => [c.id, c]));
    for (const { p, g } of all.filter(({ g }) => g.component === 'S' && isMain(g))) {
      const cap = capMinutes(p) * 60 * CAP_TOLERANCE;
      if (g.plan.rounds > 2) expect(estimateSeconds(g.plan, catalogById), g.plan.id).toBeLessThanOrEqual(cap);
    }
  });
});

describe('accents, goals and favorites', () => {
  it('a ++ zone and a personal goal go first with a harder step', () => {
    const p = profileOf({ zones: { upper_v: 'plusplus' } });
    const [a] = buildWeek(p, ctxFor(p));
    expect(['pull_v', 'push_v']).toContain(patterns(a)[0]);
    const g = profileOf({ goalExerciseIds: ['chin-ups'] });
    const [ga] = buildWeek(g, ctxFor(g));
    expect(ga.plan.items[0].pattern).toBe('pull_v');
    expect(ga.focus).toEqual(['pull_v']);
  });

  it('a favorite wins its slot; a painful exercise is never picked', () => {
    const p = profileOf({ favorites: ['band-face-pull'], painful: ['floor-push-ups'] });
    const week = buildWeek(p, ctxFor(p));
    const ids = week.flatMap((g) => g.plan.items.map((it) => it.exerciseId));
    expect(ids).toContain('band-face-pull');
    expect(ids).not.toContain('floor-push-ups');
  });

  it('long-not-done exercises rotate in', () => {
    const p = profileOf();
    const [a] = buildWeek(p, ctxFor(p));
    const first = a.plan.items[0].exerciseId!;
    const [a2] = buildWeek(p, ctxFor(p, { history: { lastDone: { [first]: '2026-11-25' }, swappedAway: {} } }));
    expect(a2.plan.items.find((it) => it.pattern === a.plan.items[0].pattern)?.exerciseId).not.toBe(first);
  });
});

describe('day modes', () => {
  const p = profileOf();
  const ctx = ctxFor(p);
  const [sa] = buildWeek(p, ctx);

  it('short: the same exercises and targets, ⅔ of the rounds', () => {
    const d = applyMode(sa, 'short', p, ctx);
    expect(d.plan.items).toEqual(sa.plan.items);
    expect(d.plan.rounds).toBe(shortRounds(sa.plan.rounds));
    expect([shortRounds(3), shortRounds(15), shortRounds(1)]).toEqual([2, 10, 1]);
  });

  it('accent for 20 minutes: focus and its antagonist stay, base pairs go, dropped patterns are reported', () => {
    const d = applyMode(sa, 'accent', p, ctx, 20);
    const kept = d.plan.items.map((it) => it.pattern!);
    for (const f of sa.focus) expect(kept).toContain(f);
    expect(kept.length).toBeLessThan(sa.plan.items.length);
    expect(d.dropped.length).toBeGreaterThan(0);
    for (const x of d.dropped) expect(kept).not.toContain(x);
    expect(d.estimateSec <= 20 * 60 || d.plan.rounds === 2).toBe(true);
    expect(hasSameDirectionInRow(kept)).toBe(false);
  });

  it('accent without a goal or ++ keeps the big movements: legs + pull with hinge + push', () => {
    expect(sa.focus).toHaveLength(2);
    expect(['squat', 'lunge']).toContain(sa.focus[0]);
    expect(['pull_h', 'pull_v']).toContain(sa.focus[1]);
    const kept = applyMode(sa, 'accent', p, ctx, 20).plan.items.map((it) => it.pattern!);
    expect(kept).toContain('hinge');
    expect(kept.some((x) => x === 'push_h' || x === 'push_v')).toBe(true);
  });

  it('off: mobility only', () => {
    const d = applyMode(sa, 'off', p, ctx);
    expect(d.plan.rounds).toBe(2);
    expect(d.plan.items.every((it) => (it.spec as { pct: number }).pct === 0.4)).toBe(true);
  });
});

describe('month', () => {
  const p = profileOf({ goalExerciseIds: ['chin-ups'] });
  const month = buildMonth(p, ctxFor(p));

  it('4 weeks of the same frame; week 4 is a deload', () => {
    expect(month).toHaveLength(4);
    const w1 = month[0][0].plan;
    const w4 = month[3][0].plan;
    expect(w4.items.map((it) => it.exerciseId)).toEqual(w1.items.map((it) => it.exerciseId));
    expect(w4.rounds).toBe(Math.max(1, Math.round(w1.rounds * DELOAD.roundsShare)));
    expect((w4.items[0].spec as { pct: number }).pct).toBeCloseTo((w1.items[0].spec as { pct: number }).pct * 0.9, 3);
    expect(month[3].every((g) => g.deload)).toBe(true);
  });

  it('week 3 has one control test of the goal', () => {
    expect(month[2].filter((g) => g.checkpoint)).toHaveLength(1);
    expect(month[0].some((g) => g.checkpoint)).toBe(false);
  });
});

describe('coverage checks', () => {
  const ex = (ids: string[]) => ids.map((id) => byId.get(id)!);

  it('"no legs" on pull-ups + dips + australian pull-ups', () => {
    const codes = checkSession(ex(['strict-pull-ups', 'parallel-bar-dips', 'australian-pull-ups'])).map((i) => i.code);
    expect(codes).toContain('no_legs');
    expect(codes).toContain('no_core');
  });

  it('pulls fewer than pushes; two pushes in a row', () => {
    const codes = checkSession(ex(['floor-push-ups', 'pike-push-ups', 'air-squats', 'side-plank'])).map((i) => i.code);
    expect(codes).toEqual(expect.arrayContaining(['pull_lt_push', 'order']));
  });

  it('week debt names what is missing', () => {
    expect(weekDebt([['squat', 'push_h', 'pull_v', 'hinge', 'core', 'pull_h']], 1)).toEqual(['push_v', 'lunge']);
  });

  it('the deficit F workout fills the week and ends with core', () => {
    const t = deficitTemplate([['squat', 'push_h', 'pull_v', 'hinge', 'core', 'pull_h'], ['lunge', 'push_v', 'pull_h', 'hinge', 'core', 'pull_v']], 3);
    expect(new Set(t.map((s) => s.pattern))).toEqual(new Set(['squat', 'push_h', 'lunge', 'push_v', 'core']));
    expect(t[t.length - 1].pattern).toBe('core');
  });
});

describe('order inside a round', () => {
  it('alternates pushes and pulls, core last', () => {
    const items = (['pull_h', 'pull_v', 'core', 'push_h', 'squat', 'hinge'] as MovementPattern[]).map((pattern) => ({ pattern, priority: 1 }));
    const ps = orderRound(items).map((i) => items[i].pattern);
    expect(hasSameDirectionInRow(ps)).toBe(false);
    expect(ps[ps.length - 1]).toBe('core');
  });
});

describe('duration', () => {
  const catalogById = new Map(CATALOG.map((c) => [c.id, c]));
  const plan = {
    items: [{ exerciseId: 'floor-push-ups', target: 10 }, { exerciseId: 'side-plank', target: 30 }],
    rounds: 3, restBetweenExercises: 45, restBetweenRounds: 90,
  };

  it('estimate = warm-up + rounds + rests + cool-down', () => {
    // round: (10×3+10) + (30×2+10) + 45 = 155 s; 3 rounds + 2×90 + 13 min
    expect(estimateSeconds(plan, catalogById)).toBe(155 * 3 + 180 + 13 * 60);
  });

  it('cuts rounds to the cap, never below 2', () => {
    expect(fitRounds(plan, 3, 20 * 60, catalogById)).toBe(2);
    expect(fitRounds(plan, 3, 99 * 60, catalogById)).toBe(3);
  });

  it('tempo calibration: median of actual / estimate, clamped, after 3 workouts', () => {
    expect(calibrateTempo([{ estimatedSec: 100, actualSec: 80 }])).toBe(1);
    expect(calibrateTempo([80, 90, 120].map((a) => ({ estimatedSec: 100, actualSec: a })))).toBeCloseTo(0.9);
    expect(calibrateTempo([200, 300, 400].map((a) => ({ estimatedSec: 100, actualSec: a })))).toBe(1.4);
  });

  it('cap: 60 minutes only for high with a request', () => {
    expect(capMinutes(profileOf({ level: 'high' }))).toBe(45);
    expect(capMinutes(profileOf({ level: 'high', zones: { core: 'plus' } }))).toBe(60);
    expect(capMinutes(profileOf({ level: 'medium', goalExerciseIds: ['chin-ups'] }))).toBe(45);
  });
});

describe('progression', () => {
  it('easy +10% (at least +1); twice at the top of the window → rank +1', () => {
    expect(nextTarget(10, 'reps', ['easy'])).toEqual({ target: 11, rankStep: 0 });
    expect(nextTarget(5, 'reps', ['easy'])).toEqual({ target: 6, rankStep: 0 });
    expect(nextTarget(15, 'reps', ['easy', 'easy'])).toEqual({ target: 15, rankStep: 1 });
    expect(nextTarget(30, 'seconds', ['easy'])).toEqual({ target: 35, rankStep: 0 });
  });

  it('just right twice → +5%; hard −10%, twice → rank −1; pain excludes', () => {
    expect(nextTarget(20, 'reps', ['ok'])).toEqual({ target: 20, rankStep: 0 });
    expect(nextTarget(20, 'reps', ['ok', 'ok'])).toEqual({ target: 21, rankStep: 0 });
    expect(nextTarget(10, 'reps', ['hard'])).toEqual({ target: 9, rankStep: 0 });
    expect(nextTarget(10, 'reps', ['hard', 'hard'])).toEqual({ target: 10, rankStep: -1 });
    expect(nextTarget(10, 'reps', ['pain']).exclude).toBe(true);
  });

  it('max calibration: done ÷ share with the outcome factor, at most +10% a week', () => {
    expect(calibrateMax(6, 0.75, 'ok', 10, 'reps')).toBe(8);
    expect(calibrateMax(9, 0.75, 'easy', 10, 'reps')).toBe(11); // 13.2 capped at 11
    expect(calibrateMax(6, 0.75, 'hard', 10, 'reps')).toBe(7);
  });

  const log = (sets: { id: string; target: number; actual: number; rir: '2+' | '1' | '0'; swappedFromName?: string }[], done = 3, date = '2026-11-20'): WorkoutLog => ({
    id: date, date, workoutTitle: 'A', readiness: 'green', roundsCompleted: done, roundsPlanned: 3, durationSeconds: 2400,
    sets: sets.map((s, i) => ({
      round: i + 1, exerciseId: s.id, exerciseName: s.id, metric: 'reps', target: s.target, actual: s.actual,
      rir: s.rir, completedAt: date, swappedFromName: s.swappedFromName,
    })),
  });

  it('outcome from the journal until «Как зашло?» exists', () => {
    expect(outcomeFromLog(log([{ id: 'x', target: 8, actual: 8, rir: '2+' }]), 'x')).toBe('easy');
    expect(outcomeFromLog(log([{ id: 'x', target: 8, actual: 8, rir: '1' }]), 'x')).toBe('ok');
    expect(outcomeFromLog(log([{ id: 'x', target: 8, actual: 6, rir: '0' }]), 'x')).toBe('hard');
    expect(outcomeFromLog(log([{ id: 'x', target: 8, actual: 8, rir: '2+' }], 2), 'x')).toBe('hard');
    expect(outcomeFromLog(log([{ id: 'x', target: 8, actual: 8, rir: '2+' }]), 'y')).toBeUndefined();
  });

  it('history: last time done and swaps away', () => {
    const logs = [
      log([{ id: 'air-squats', target: 10, actual: 10, rir: '1', swappedFromName: 'Goblet Squat' }], 3, '2026-11-20'),
      log([{ id: 'air-squats', target: 10, actual: 10, rir: '1' }], 3, '2026-11-24'),
    ];
    const h = historyFromLogs(logs, [{ id: 'goblet-squat', name: 'Goblet Squat' }]);
    expect(h.lastDone['air-squats']).toBe('2026-11-24');
    expect(h.swappedAway['goblet-squat']).toBe(1);
  });
});

describe('generator screen glue', () => {
  const input = {
    catalog: CATALOG,
    exercises: resolveExercises(CATALOG, texts, {}, [], 'medium'),
    logs: [] as WorkoutLog[],
    date: '2026-11-26',
  };
  const label = (g: GeneratedWorkout, week?: number) => ({ title: `${week ?? ''}${g.kind}`, subtitle: '', formatLabel: g.component });

  it('week: the layout for the chosen level; coverage reported', () => {
    const r = runGenerator({ period: 'week', level: 'full', perWeek: 3 }, input);
    expect(r.weeks[0].map((g) => g.kind)).toEqual(['S-A', 'S-B', 'F']);
    expect(r.covered).toBe(true);
    expect(runGenerator({ period: 'week', level: 'agt', perWeek: 2 }, input).weeks[0].map((g) => g.kind)).toEqual(['F-A', 'F-B']);
    expect(runGenerator({ period: 'week', level: 'warmup', perWeek: 2 }, input).weeks[0].every((g) => g.component === 'M')).toBe(true);
  });

  it('single: the next workout of the week by how many were done in 7 days', () => {
    const one = (logs: WorkoutLog[]) => runGenerator({ period: 'single', level: 'full', perWeek: 3 }, { ...input, logs }).weeks[0];
    expect(one([])).toHaveLength(1);
    expect(one([])[0].kind).toBe('S-A');
    const done = { id: 'l', date: '2026-11-24', workoutTitle: 'x', readiness: 'green', roundsCompleted: 3, roundsPlanned: 3, durationSeconds: 1, sets: [] } as WorkoutLog;
    expect(one([done])[0].kind).toBe('S-B');
  });

  it('month: 4 weeks become plans titled by week', () => {
    const r = runGenerator({ period: 'month', level: 'full', perWeek: 3 }, input);
    const plans = toWorkoutPlans(r, label);
    expect(plans).toHaveLength(12);
    expect(plans[0].title).toBe('1S-A');
    expect(new Set(plans.map((p) => p.id)).size).toBe(12);
  });

  it('new generated plans replace old generated ones; coach plans stay', () => {
    const coach = { id: 'workout-a', title: 'A', subtitle: '', formatLabel: '', rounds: 3, restBetweenExercises: 45, restBetweenRounds: 90, items: [] };
    const old = { ...coach, id: 'gen-old' };
    const plans = toWorkoutPlans(runGenerator({ period: 'week', level: 'full', perWeek: 2 }, input), label);
    expect(replaceGenerated([old, coach], plans).map((p) => p.id)).toEqual([...plans.map((p) => p.id), 'workout-a']);
  });
});

describe('the plan played today (day mode on the Workout tab)', () => {
  const coachA = INITIAL_WORKOUTS.find((w) => w.id === 'workout-a')!;
  const opts = { catalog: CATALOG, warmupMinutes: 8, cooldownMinutes: 5 };

  it('standard and no-energy keep the plan; short plays ⅔ of the rounds', () => {
    expect(dayPlan(coachA, 'green', opts).plan).toBe(coachA);
    expect(dayPlan(coachA, 'red', opts).plan).toBe(coachA);
    const s = dayPlan(coachA, 'yellow', opts).plan;
    expect(s.rounds).toBe(2);
    expect(s.items).toEqual(coachA.items);
  });

  it('accent on a coach plan: focus pairs stay, the rest is reported', () => {
    const d = dayPlan(coachA, 'accent', { ...opts, accentMinutes: 20 });
    const ids = d.plan.items.map((it) => it.exerciseId);
    // Coach A: Bulgarian split squat + glute bridge, Australian pull-ups + push-ups are the big movements.
    expect(ids).toEqual(expect.arrayContaining(['bulgarian-split-squat', 'australian-pull-ups']));
    expect(ids.length).toBeLessThan(coachA.items.length);
    expect(d.dropped.length).toBeGreaterThan(0);
    expect(d.plan.restBetweenRounds).toBeLessThanOrEqual(45);
    expect(hasSameDirectionInRow(d.plan.items.map((it) => it.pattern!))).toBe(false);
  });

  it('more minutes keep more of the workout', () => {
    const short = dayPlan(coachA, 'accent', { ...opts, accentMinutes: 15 }).plan;
    const long = dayPlan(coachA, 'accent', { ...opts, accentMinutes: 60 }).plan;
    expect(long.items.length * long.rounds).toBeGreaterThanOrEqual(short.items.length * short.rounds);
  });

  it('own exercises (not in the catalog) are always kept', () => {
    const plan = { ...coachA, items: [...coachA.items, { exerciseId: 'custom-123', target: 10 }] };
    const ids = dayPlan(plan, 'accent', { ...opts, accentMinutes: 15 }).plan.items.map((it) => it.exerciseId);
    expect(ids).toContain('custom-123');
  });
});

describe('«Редактировать» and «Создать свою»', () => {
  const exercises = resolveExercises(CATALOG, texts, {}, [], 'medium');
  const p = profileOf();
  const [sa] = buildWeek(p, ctxFor(p));
  const plan = sa.plan;

  it('−/+ target makes it fixed; rounds stay within 1–20', () => {
    const e = changeTarget(plan, 0, 1, 'reps');
    expect(e.items[0].target).toBe(plan.items[0].target + 1);
    expect(e.items[0].spec).toBeUndefined();
    expect(changeRounds({ ...plan, rounds: 1 }, -1).rounds).toBe(1);
    expect(changeRounds({ ...plan, rounds: 20 }, 1).rounds).toBe(20);
  });

  it('step easier / harder moves along the ladder, never onto another slot', () => {
    const i = plan.items.findIndex((it) => it.exerciseId === 'floor-push-ups' || it.pattern === 'push_h');
    const harder = stepRank(plan, i, 1, CATALOG, exercises);
    const next = byId.get(harder.items[i].exerciseId!)!;
    expect(next.rank).toBeGreaterThan(byId.get(plan.items[i].exerciseId!)!.rank);
    const ids = harder.items.map((it) => it.exerciseId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('⇄ cycles through the same pattern', () => {
    const s1 = swapExercise(plan, 0, CATALOG, exercises);
    expect(s1.items[0].exerciseId).not.toBe(plan.items[0].exerciseId);
    expect(s1.items[0].pattern).toBe(plan.items[0].pattern);
  });

  it('a zone offers up to 6 exercises, favorites first, chosen ones left out', () => {
    const list = zoneCandidates('upper', CATALOG, ['band-face-pull'], 'medium', ['floor-push-ups']);
    expect(list.length).toBeLessThanOrEqual(6);
    expect(list[0].id).toBe('band-face-pull');
    expect(list.map((c) => c.id)).not.toContain('floor-push-ups');
    expect(zoneCandidates('balance', CATALOG, [], 'medium', []).every((c) => c.stability !== 'bilateral')).toBe(true);
  });

  it('antagonist offer: pull for a push, hinge for a squat', () => {
    expect(antagonistOptions('floor-push-ups', CATALOG, []).map((c) => c.pattern)).toEqual(
      expect.arrayContaining(['pull_h'])
    );
    expect(antagonistOptions('air-squats', CATALOG, []).every((c) => c.pattern === 'hinge')).toBe(true);
  });

  it('a basket of pulls and dips: no legs, no core; «Добавить сюда» fixes it', () => {
    const items = ['strict-pull-ups', 'parallel-bar-dips', 'australian-pull-ups'].map((id) => ownItem(byId.get(id)!, 'S', exercises));
    expect(basketIssues(items, CATALOG)).toEqual(expect.arrayContaining(['no_legs', 'no_core']));
    let next = items;
    for (const issue of basketIssues(next, CATALOG)) {
      const c = fixFor(issue, next, CATALOG, 'medium', []);
      if (c) next = [...next, ownItem(c, 'S', exercises)];
    }
    expect(basketIssues(next, CATALOG)).toEqual([]);
  });

  it('the own workout gets a round order without two pushes / pulls in a row', () => {
    const items = ['strict-pull-ups', 'australian-pull-ups', 'floor-push-ups', 'air-squats'].map((id) => ownItem(byId.get(id)!, 'S', exercises));
    const own = buildOwnPlan(items, 3, 'S', 'own-1', 'Своя', 'Сила');
    expect(hasSameDirectionInRow(own.items.map((it) => it.pattern!))).toBe(false);
    expect(own.restBetweenRounds).toBe(90);
  });
});

describe('ladder position on the card', () => {
  it('push-ups family: steps from knee push-ups to archer; ends dim the buttons', () => {
    const mid = ladderPosition('floor-push-ups', CATALOG)!;
    expect(mid.ranks).toEqual([1, 2, 3, 4, 5]);
    expect(mid.current).toBe(3);
    expect(mid.canEasier && mid.canHarder).toBe(true);
    const bottom = ladderPosition('knee-push-ups', CATALOG)!;
    expect(bottom.canEasier).toBe(false);
    const top = ladderPosition('archer-push-ups', CATALOG)!;
    expect(top.canHarder).toBe(false);
  });

  it('only the steps available here are shown (home: no bars)', () => {
    const home = ladderPosition('strict-pull-ups', CATALOG, { environment: 'home' })!;
    expect(home.ranks).toEqual([3]);
    expect(home.canEasier || home.canHarder).toBe(false);
  });
});
