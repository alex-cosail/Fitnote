import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { isAvailable } from '../catalog/filter';
import { JOINTS, jointLoad, mainJoints } from '../catalog/joints';
import { pickForPattern } from '../catalog/ladder';
import { resolveExercises } from '../catalog/resolve';
import { buildWeek, DEFAULT_PROFILE } from '../generator';
import { applyCareToSession } from '../session/careSession';
import type { ActiveSession } from '../../types';
import { answerReview, blockedByCare, careToReview, setCare } from './care';

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
  it('stop on the shoulder removes pike push-ups and pull-ups, keeps squats and the band face pull', () => {
    const care = [{ joint: 'shoulder' as const, level: 'stop' as const }];
    expect(isAvailable(cat('pike-push-ups'), { care })).toBe(false);
    expect(isAvailable(cat('strict-pull-ups'), { care })).toBe(false);
    expect(isAvailable(cat('air-squats'), { care })).toBe(true);
    expect(isAvailable(cat('band-face-pull'), { care })).toBe(true);
  });

  it('gentle removes only the strong load', () => {
    const care = [{ joint: 'knee' as const, level: 'gentle' as const }];
    expect(blockedByCare(cat('bulgarian-split-squat'), care)).toBeTruthy();
    expect(blockedByCare(cat('box-squats'), care)).toBeUndefined();
  });

  it('a pattern takes a safe exercise: a horizontal pull with the shoulder protected is a light band row', () => {
    const p = pickForPattern(CATALOG, 'pull_h', 3, { care: [{ joint: 'shoulder', level: 'stop' }] });
    expect(p && (jointLoad(p).shoulder ?? 0)).toBeLessThan(2);
  });

  it('the generator respects it: no shoulder-heavy exercise in a week', () => {
    const profile = { ...DEFAULT_PROFILE, usualConditions: { ...DEFAULT_PROFILE.usualConditions, care: [{ joint: 'shoulder' as const, level: 'stop' as const }] } };
    const week = buildWeek(profile, { catalog: CATALOG, exercises, history: { lastDone: {}, swappedAway: {} }, date: '2026-11-27' });
    for (const g of week) for (const it of g.plan.items) if (it.exerciseId) expect((jointLoad(cat(it.exerciseId)).shoulder ?? 0) < 2).toBe(true);
  });

  it('setting care: review in a week; stop is never softened by a later discomfort', () => {
    let list = setCare([], { joint: 'shoulder', level: 'stop', reason: 'pain', since: '2026-11-27', source: 'self' });
    expect(list[0].reviewAt).toBe('2026-12-04');
    list = setCare(list, { joint: 'shoulder', level: 'gentle', reason: 'discomfort', since: '2026-11-28', source: 'self' });
    expect(list[0].level).toBe('stop');
    expect(careToReview(list, '2026-12-01')).toHaveLength(0);
    expect(careToReview(list, '2026-12-05')).toHaveLength(1);
  });

  it('«Как плечо?»: passed → gentle → off; same → one more week', () => {
    const start = setCare([], { joint: 'shoulder', level: 'stop', reason: 'pain', since: '2026-11-27', source: 'self' });
    const a = answerReview(start, 'shoulder', 'passed', '2026-12-04');
    expect(a[0]).toMatchObject({ level: 'gentle', reviewAt: '2026-12-11' });
    expect(answerReview(a, 'shoulder', 'passed', '2026-12-11')).toHaveLength(0);
    expect(answerReview(start, 'shoulder', 'same', '2026-12-04')[0]).toMatchObject({ level: 'stop', reviewAt: '2026-12-11' });
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
    const r = applyCareToSession(session(['pike-push-ups', 'air-squats', 'strict-pull-ups'], 0), [{ joint: 'shoulder', level: 'stop' }], { catalog: CATALOG, exercises }, 0);
    const ids = r.session.items.map((i) => i.exerciseId);
    expect(ids[1]).toBe('air-squats');
    for (const id of ids) expect((jointLoad(cat(id)).shoulder ?? 0) < 2).toBe(true);
    expect(r.replaced.length + r.dropped.length).toBe(2);
  });

  it('a dropped last slot moves on to the next round (no vertical pull spares the shoulder)', () => {
    const r = applyCareToSession(session(['air-squats', 'strict-pull-ups'], 1), [{ joint: 'shoulder', level: 'stop' }], { catalog: CATALOG, exercises }, 0);
    expect(r.dropped).toEqual(['strict-pull-ups']);
    expect(r.session.items.map((i) => i.exerciseId)).toEqual(['air-squats']);
    expect(r.session).toMatchObject({ currentRound: 3, currentItemIndex: 0 });
  });
});
