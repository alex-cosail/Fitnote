import { describe, expect, it } from 'vitest';
import { INITIAL_EXERCISES } from '../../data/seed';
import { ActiveSession } from '../../types';
import {
  addRestSeconds,
  advanceWarmupSteps,
  buildWorkoutLog,
  completedRounds,
  completeSet,
  getNextPosition,
  plusRound,
  startCooldown,
  swapCurrentExercise,
  timerZero,
  togglePause,
} from './transitions';

const NOW = Date.UTC(2026, 10, 24, 10, 0, 0);
const ex = (id: string) => INITIAL_EXERCISES.find((e) => e.id === id)!;

const base = (over: Partial<ActiveSession> = {}): ActiveSession => ({
  id: 's',
  workoutId: 'w',
  workoutTitle: 'Test',
  readiness: 'green',
  totalRounds: 2,
  currentRound: 1,
  currentItemIndex: 0,
  phase: 'exercise',
  warmupMinutes: 8,
  cooldownMinutes: 5,
  phaseRemainingSec: 0,
  isPaused: false,
  items: [
    { exerciseId: 'floor-push-ups', target: 12, plannedTarget: 12 },
    { exerciseId: 'side-plank', target: 20, plannedTarget: 20 },
  ],
  logs: [],
  startedAt: new Date(NOW - 30 * 60 * 1000).toISOString(),
  restBetweenExercises: 45,
  restBetweenRounds: 90,
  ...over,
});

describe('getNextPosition', () => {
  it('next item, then next round, then end', () => {
    expect(getNextPosition(base())).toMatchObject({ nextItemIndex: 1, isNewRound: false });
    expect(getNextPosition(base({ currentItemIndex: 1 }))).toMatchObject({
      nextRound: 2,
      nextItemIndex: 0,
      isNewRound: true,
    });
    expect(
      getNextPosition(base({ currentItemIndex: 1, currentRound: 2 })).isWorkoutEnd
    ).toBe(true);
  });

  it('round-flow never ends', () => {
    const p = getNextPosition(base({ isRoundFlow: true, currentRound: 40 }));
    expect(p).toMatchObject({ nextRound: 41, isNewRound: true, isWorkoutEnd: false });
  });
});

describe('completeSet', () => {
  const pushups = ex('floor-push-ups');

  it('logs the set, carries the result over and starts rest between exercises', () => {
    const next = completeSet(base(), {
      exercise: pushups,
      value: 10,
      pairedLeftValue: null,
      rir: '1',
      now: NOW,
    });
    expect(next.phase).toBe('rest');
    expect(next.phaseRemainingSec).toBe(45);
    expect(next.phaseEndTimestamp).toBe(NOW + 45000);
    expect(next.items[0]).toMatchObject({ target: 10, plannedTarget: 12 });
    expect(next.logs[0]).toMatchObject({
      round: 1,
      exerciseId: 'floor-push-ups',
      target: 12,
      plannedTarget: 12,
      actual: 10,
      rir: '1',
    });
  });

  it('paired: logs both sides, actual = weaker side', () => {
    const next = completeSet(base(), {
      exercise: ex('bulgarian-split-squat'),
      value: 14,
      pairedLeftValue: 12,
      rir: '2+',
      now: NOW,
    });
    expect(next.logs[0]).toMatchObject({ leftActual: 12, rightActual: 14, actual: 12 });
  });

  it('last set of the last round starts the cool-down with a 5s prep', () => {
    const next = completeSet(base({ currentItemIndex: 1, currentRound: 2 }), {
      exercise: ex('side-plank'),
      value: 20,
      pairedLeftValue: 20,
      rir: '1',
      now: NOW,
    });
    expect(next).toMatchObject({
      phase: 'cooldown',
      preCountdownSec: 5,
      phaseRemainingSec: 300,
      phaseEndTimestamp: NOW + 5000,
    });
    expect(next.logs).toHaveLength(1);
  });

  it('end of a round uses the between-rounds rest', () => {
    const next = completeSet(base({ currentItemIndex: 1 }), {
      exercise: ex('side-plank'),
      value: 20,
      pairedLeftValue: 20,
      rir: '1',
      now: NOW,
    });
    expect(next.phase).toBe('rest');
    expect(next.phaseRemainingSec).toBe(90);
  });

  it('zero rest skips straight to the next exercise or round banner', () => {
    const s = base({ restBetweenExercises: 0, restBetweenRounds: 0 });
    expect(
      completeSet(s, { exercise: pushups, value: 12, pairedLeftValue: null, rir: '1', now: NOW })
    ).toMatchObject({ phase: 'exercise', currentItemIndex: 1 });
    expect(
      completeSet(
        { ...s, currentItemIndex: 1 },
        { exercise: ex('side-plank'), value: 20, pairedLeftValue: 20, rir: '1', now: NOW }
      )
    ).toMatchObject({ phase: 'round_banner', currentRound: 2, currentItemIndex: 0 });
  });
});

describe('timerZero', () => {
  it('warm-up → exercise', () => {
    expect(timerZero(base({ phase: 'warmup', preCountdownSec: 0 })).phase).toBe('exercise');
  });

  it('rest → next exercise, or round banner on a new round', () => {
    expect(timerZero(base({ phase: 'rest' }))).toMatchObject({
      phase: 'exercise',
      currentItemIndex: 1,
    });
    expect(timerZero(base({ phase: 'rest', currentItemIndex: 1 }))).toMatchObject({
      phase: 'round_banner',
      currentRound: 2,
    });
  });

  it('round-flow rest → next round without banner', () => {
    expect(timerZero(base({ phase: 'rest', isRoundFlow: true }))).toMatchObject({
      phase: 'exercise',
      currentRound: 2,
      currentItemIndex: 0,
    });
  });

  it('cool-down → finish', () => {
    expect(timerZero(base({ phase: 'cooldown' })).phase).toBe('finish');
  });
});

describe('pause and rest extension', () => {
  it('pause clears the end time; resume restarts from the remaining seconds', () => {
    const running = base({ phase: 'rest', phaseRemainingSec: 30, phaseEndTimestamp: NOW + 30000 });
    const paused = togglePause(running, NOW);
    expect(paused).toMatchObject({ isPaused: true, phaseEndTimestamp: undefined });
    expect(togglePause(paused, NOW + 5000)).toMatchObject({
      isPaused: false,
      phaseEndTimestamp: NOW + 5000 + 30000,
    });
  });

  it('resume during a pre-countdown uses the pre-countdown seconds', () => {
    const paused = base({ phase: 'cooldown', isPaused: true, preCountdownSec: 3, phaseRemainingSec: 300 });
    expect(togglePause(paused, NOW).phaseEndTimestamp).toBe(NOW + 3000);
  });

  it('+15 s extends rest', () => {
    const r = addRestSeconds(base({ phase: 'rest', phaseRemainingSec: 10 }), 15, NOW);
    expect(r).toMatchObject({ phaseRemainingSec: 25, phaseEndTimestamp: NOW + 25000 });
    const p = addRestSeconds(base({ phase: 'rest', phaseRemainingSec: 10, isPaused: true }), 15, NOW);
    expect(p.phaseEndTimestamp).toBeUndefined();
  });
});

describe('round-flow', () => {
  it('+1 round logs the whole round at target with RIR 2+ and starts rest', () => {
    const s = base({ isRoundFlow: true, restBetweenRounds: 40 });
    const next = plusRound(s, INITIAL_EXERCISES, NOW);
    expect(next.phase).toBe('rest');
    expect(next.logs).toHaveLength(2);
    expect(next.logs[1]).toMatchObject({
      exerciseId: 'side-plank',
      actual: 20,
      leftActual: 20,
      rightActual: 20,
      rir: '2+',
    });
    expect(completedRounds(next.logs)).toBe(1);
  });

  it('logs the real number of rounds', () => {
    let s = base({ isRoundFlow: true, totalRounds: 15, restBetweenRounds: 0 });
    s = plusRound(s, INITIAL_EXERCISES, NOW);
    s = plusRound(s, INITIAL_EXERCISES, NOW);
    const log = buildWorkoutLog(startCooldown(s, NOW), '  ', NOW);
    expect(log).toMatchObject({ roundsCompleted: 2, roundsPlanned: 15, note: undefined });
  });
});

describe('swap and workout log', () => {
  it('same metric keeps the target, a different metric uses AGT 30%', () => {
    const s = base();
    expect(swapCurrentExercise(s, 'reps', ex('parallel-bar-dips')).items[0]).toMatchObject({
      exerciseId: 'parallel-bar-dips',
      target: 12,
      swappedFromId: 'floor-push-ups',
    });
    expect(swapCurrentExercise(s, 'reps', ex('dead-hang')).items[0].target).toBe(15);
  });

  it('workout log: duration at least a minute, note trimmed', () => {
    const log = buildWorkoutLog(base({ startedAt: new Date(NOW).toISOString() }), ' ok ', NOW);
    expect(log.durationSeconds).toBe(60);
    expect(log.note).toBe('ok');
    expect(log.roundsCompleted).toBe(2);
  });
});

describe('warm-up block accounting', () => {
  const steps = [{ durationSeconds: 10 }, { durationSeconds: 20 }, { durationSeconds: 30 }];

  it('counts down inside a block', () => {
    expect(advanceWarmupSteps(0, 10, 3, steps)).toEqual({ stepIndex: 0, stepRemainingSec: 7, crossed: 0 });
  });

  it('crosses into the next block carrying the remainder', () => {
    expect(advanceWarmupSteps(0, 2, 5, steps)).toEqual({ stepIndex: 1, stepRemainingSec: 17, crossed: 1 });
  });

  it('after the last block stays at the end with 0 left', () => {
    expect(advanceWarmupSteps(2, 1, 5, steps)).toEqual({ stepIndex: 3, stepRemainingSec: 0, crossed: 1 });
    expect(advanceWarmupSteps(3, 0, 5, steps)).toEqual({ stepIndex: 3, stepRemainingSec: 0, crossed: 0 });
  });
});
