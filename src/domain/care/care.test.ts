import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { isAvailable } from '../catalog/filter';
import { JOINTS, jointLoad, mainJoints } from '../catalog/joints';
import { pickForPattern } from '../catalog/ladder';
import { resolveExercises } from '../catalog/resolve';
import { buildWeek, DEFAULT_PROFILE } from '../generator';
import { applyCareToSession } from '../session/careSession';
import { resolveWorkout } from '../plan/resolveWorkout';
import type { ActiveSession } from '../../types';
import { answerReview, blockedByCare, careToReview, normalizeCare, setCare } from './care';

const cat = (id: string) => CATALOG.find((c) => c.id === id)!;
const exercises = resolveExercises(CATALOG, catalogTextsFor('ru'), {}, [], 'medium');

describe('joint loads', () => {
  it('every catalog exercise loads at least one joint, with known names', () => {
    for (const c of CATALOG) {
      const load = jointLoad(c);
      expect(Object.keys(load).length).toBeGreaterThan(0);
      for (const j of Object.keys(load)) expect(JOINTS).toContain(j);
    }
  });

  it('pike push-ups: shoulder first, then the wrist', () => {
    expect(mainJoints(cat('pike-push-ups'))).toEqual(['shoulder', 'elbow_wrist']);
  });
});

describe('«Берегу»', () => {
  it('level 3 on the shoulder removes pike push-ups and pull-ups, keeps squats and the band face pull', () => {
    const care = [{ joint: 'shoulder' as const, level: 3 as const }];
    expect(isAvailable(cat('pike-push-ups'), { care })).toBe(false);
    expect(isAvailable(cat('strict-pull-ups'), { care })).toBe(false);
    expect(isAvailable(cat('air-squats'), { care })).toBe(true);
    expect(isAvailable(cat('band-face-pull'), { care })).toBe(true);
  });

  it('level 0 removes even a light load; level 4 only the strong one', () => {
    expect(isAvailable(cat('band-face-pull'), { care: [{ joint: 'shoulder', level: 0 }] })).toBe(false);
    const care = [{ joint: 'knee' as const, level: 4 as const }];
    expect(blockedByCare(cat('bulgarian-split-squat'), care)).toBeTruthy();
    expect(blockedByCare(cat('box-squats'), care)).toBeUndefined();
  });

  it('a pattern takes a safe exercise: a horizontal pull with the shoulder protected is light', () => {
    const p = pickForPattern(CATALOG, 'pull_h', 3, { care: [{ joint: 'shoulder', level: 2 }] });
    expect(p && (jointLoad(p).shoulder ?? 0)).toBeLessThan(2);
  });

  it('the generator respects it: no shoulder-heavy exercise in a week', () => {
    const profile = { ...DEFAULT_PROFILE, usualConditions: { ...DEFAULT_PROFILE.usualConditions, care: [{ joint: 'shoulder' as const, level: 1 as const }] } };
    const week = buildWeek(profile, { catalog: CATALOG, exercises, history: { lastDone: {}, swappedAway: {} }, date: '2026-11-27' });
    for (const g of week) for (const it of g.plan.items) if (it.exerciseId) expect((jointLoad(cat(it.exerciseId)).shoulder ?? 0) < 2).toBe(true);
  });

  it('setting a level: review in a week; the latest choice wins', () => {
    let list = setCare([], { joint: 'shoulder', level: 0, since: '2026-11-27', source: 'self' });
    expect(list[0].reviewAt).toBe('2026-12-04');
    list = setCare(list, { joint: 'shoulder', level: 3, since: '2026-11-28', source: 'self' });
    expect(list).toHaveLength(1);
    expect(list[0].level).toBe(3);
    expect(careToReview(list, '2026-12-01')).toHaveLength(0);
    expect(careToReview(list, '2026-12-05')).toHaveLength(1);
  });

  it('«Как плечо?»: passed → two levels up, better → one, past 4 — free; same → a week more', () => {
    const start = setCare([], { joint: 'shoulder', level: 1, since: '2026-11-27', source: 'self' });
    expect(answerReview(start, 'shoulder', 'passed', '2026-12-04')[0]).toMatchObject({ level: 3, reviewAt: '2026-12-11' });
    expect(answerReview(start, 'shoulder', 'better', '2026-12-04')[0].level).toBe(2);
    expect(answerReview(start, 'shoulder', 'same', '2026-12-04')[0]).toMatchObject({ level: 1, reviewAt: '2026-12-11' });
    const four = setCare([], { joint: 'knee', level: 4, since: '2026-11-27', source: 'self' });
    expect(answerReview(four, 'knee', 'better', '2026-12-04')).toHaveLength(0);
  });

  it('older data: stop → 0, gentle → 4', () => {
    expect(normalizeCare([{ joint: 'knee', level: 'stop', since: 'x', source: 'self' }, { joint: 'neck', level: 'gentle', since: 'x', source: 'self' }]).map((c) => c.level)).toEqual([0, 4]);
    expect(normalizeCare(undefined)).toEqual([]);
  });
});

describe('«Пауза: болит» during a workout', () => {
  const session = (items: string[], current = 0): ActiveSession =>
    ({
      id: 's', workoutId: 'w', workoutTitle: 'T', readiness: 'green', totalRounds: 3, currentRound: 2, currentItemIndex: current,
      phase: 'exercise', warmupMinutes: 8, cooldownMinutes: 5, phaseRemainingSec: 0, isPaused: false, logs: [],
      startedAt: '2026-11-27T10:00:00Z', restBetweenExercises: 30, restBetweenRounds: 60,
      items: items.map((id) => ({ exerciseId: id, target: 10, plannedTarget: 10 })),
    }) as ActiveSession;

  it('replaces every exercise of the session that loads the joint', () => {
    const r = applyCareToSession(session(['pike-push-ups', 'air-squats', 'strict-pull-ups'], 0), [{ joint: 'shoulder', level: 2 }], { catalog: CATALOG, exercises }, 0);
    const ids = r.session.items.map((i) => i.exerciseId);
    expect(ids[1]).toBe('air-squats');
    for (const id of ids) expect((jointLoad(cat(id)).shoulder ?? 0) < 2).toBe(true);
    expect(r.replaced.length + r.dropped.length).toBe(2);
  });

  it('level 0: a dropped last slot moves on to the next round (nothing moves the shoulder)', () => {
    const r = applyCareToSession(session(['air-squats', 'strict-pull-ups'], 1), [{ joint: 'shoulder', level: 0 }], { catalog: CATALOG, exercises }, 0);
    expect(r.dropped).toEqual(['strict-pull-ups']);
    expect(r.session.items.map((i) => i.exerciseId)).toEqual(['air-squats']);
    expect(r.session).toMatchObject({ currentRound: 3, currentItemIndex: 0 });
  });

  it('levels 1–3: the slot takes a step-0 movement for that joint at the allowed level', () => {
    const r = applyCareToSession(session(['air-squats', 'strict-pull-ups'], 1), [{ joint: 'shoulder', level: 2 }], { catalog: CATALOG, exercises }, 0);
    expect(r.session.items.map((i) => i.exerciseId)).toEqual(['air-squats', 'rehab-shoulder-pendulum']);
    expect(r.session.items[1].target).toBe(8);
  });
});

describe('step 0 at the start of a workout', () => {
  it('knee at level 2: squats become «Встать со стула», 8 times; knee at 0 — no knee movement at all', () => {
    const plan = { items: [{ exerciseId: 'bulgarian-split-squat', target: 12 }, { exerciseId: 'floor-push-ups', target: 15 }] };
    const r = resolveWorkout(plan, { catalog: CATALOG, exercises, conditions: { care: [{ joint: 'knee', level: 2 }] } });
    expect(r[0]).toMatchObject({ exerciseId: 'rehab-sit-to-stand', target: 8, rehab: true });
    expect(r[1].exerciseId).toBe('floor-push-ups');
    const zero = resolveWorkout(plan, { catalog: CATALOG, exercises, conditions: { care: [{ joint: 'knee', level: 0 }] } });
    expect(zero[0].unavailable).toBe(true);
  });

  it('two blocked slots of one joint get two different movements', () => {
    const plan = { items: [{ exerciseId: 'strict-pull-ups', target: 6 }, { exerciseId: 'pike-push-ups', target: 10 }] };
    const r = resolveWorkout(plan, { catalog: CATALOG, exercises, conditions: { care: [{ joint: 'shoulder', level: 3 }] } });
    expect(new Set(r.map((x) => x.exerciseId)).size).toBe(2);
    for (const x of r) expect(CATALOG.find((c) => c.id === x.exerciseId)!.rehab?.joint ?? 'shoulder-safe').toBeTruthy();
  });

});
