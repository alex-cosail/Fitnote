import {
  ActiveSession,
  Exercise,
  MetricType,
  MobilityStep,
  RirValue,
  SetLog,
  WorkoutLog,
} from '../../types';
import { calcAgt30 } from '../plan/targets';
import { carryoverTarget } from './carryover';

// Pure player transitions: (session, input, now) => next session.
// No React, no timers, no sound — the player calls these and plays sounds.

export interface NextPosition {
  nextRound: number;
  nextItemIndex: number;
  isNewRound: boolean;
  isWorkoutEnd: boolean;
}

export function getNextPosition(session: ActiveSession): NextPosition {
  // Round-flow mode is open-ended: after a round there is always another.
  if (session.isRoundFlow) {
    return {
      nextRound: session.currentRound + 1,
      nextItemIndex: 0,
      isNewRound: true,
      isWorkoutEnd: false,
    };
  }
  const isLastItemInRound =
    session.currentItemIndex >= session.items.length - 1;
  if (!isLastItemInRound) {
    return {
      nextRound: session.currentRound,
      nextItemIndex: session.currentItemIndex + 1,
      isNewRound: false,
      isWorkoutEnd: false,
    };
  }
  if (session.currentRound < session.totalRounds) {
    return {
      nextRound: session.currentRound + 1,
      nextItemIndex: 0,
      isNewRound: true,
      isWorkoutEnd: false,
    };
  }
  return {
    nextRound: session.currentRound,
    nextItemIndex: session.currentItemIndex,
    isNewRound: false,
    isWorkoutEnd: true,
  };
}

// Rounds fully logged so far (round-flow mode).
export function completedRounds(logs: SetLog[]): number {
  return logs.reduce((max, l) => Math.max(max, l.round), 0);
}

export function startCooldown(
  session: ActiveSession,
  now: number,
  extra: Partial<ActiveSession> = {}
): ActiveSession {
  return {
    ...session,
    ...extra,
    phase: 'cooldown',
    preCountdownSec: 5,
    phaseRemainingSec: session.cooldownMinutes * 60,
    phaseEndTimestamp: now + 5000,
    isPaused: false,
  };
}

// A timed phase (warm-up / rest / cool-down) reached zero.
export function timerZero(session: ActiveSession): ActiveSession {
  if (session.phase === 'warmup') {
    return {
      ...session,
      phase: 'exercise',
      preCountdownSec: 0,
      phaseRemainingSec: 0,
      phaseEndTimestamp: undefined,
      isPaused: false,
    };
  }
  if (session.phase === 'rest') {
    const nextPos = getNextPosition(session);
    return {
      ...session,
      currentRound: nextPos.nextRound,
      currentItemIndex: nextPos.nextItemIndex,
      phase:
        nextPos.isNewRound && !session.isRoundFlow ? 'round_banner' : 'exercise',
      phaseRemainingSec: 0,
      phaseEndTimestamp: undefined,
      isPaused: false,
    };
  }
  if (session.phase === 'cooldown') {
    return {
      ...session,
      phase: 'finish',
      phaseRemainingSec: 0,
      phaseEndTimestamp: undefined,
      isPaused: false,
    };
  }
  return session;
}

export function togglePause(session: ActiveSession, now: number): ActiveSession {
  if (session.isPaused) {
    const remSec =
      session.preCountdownSec && session.preCountdownSec > 0
        ? session.preCountdownSec
        : session.phaseRemainingSec;
    return { ...session, isPaused: false, phaseEndTimestamp: now + remSec * 1000 };
  }
  return { ...session, isPaused: true, phaseEndTimestamp: undefined };
}

export function addRestSeconds(
  session: ActiveSession,
  extraSec: number,
  now: number
): ActiveSession {
  const nextSec = session.phaseRemainingSec + extraSec;
  return {
    ...session,
    phaseRemainingSec: nextSec,
    phaseEndTimestamp: session.isPaused ? undefined : now + nextSec * 1000,
  };
}

export interface CompleteSetInput {
  exercise: Pick<Exercise, 'id' | 'name' | 'metric' | 'isPaired'>;
  value: number; // the right side for paired exercises
  pairedLeftValue: number | null;
  rir: RirValue;
  swappedFromName?: string;
  now: number;
}

// Logs the current set, applies carryover and moves to rest / next / cool-down.
export function completeSet(
  session: ActiveSession,
  input: CompleteSetInput
): ActiveSession {
  const { exercise, value, pairedLeftValue, rir, swappedFromName, now } = input;
  const item = session.items[session.currentItemIndex];

  const isPairedPair = Boolean(exercise.isPaired) && pairedLeftValue !== null;
  const leftVal = isPairedPair ? (pairedLeftValue as number) : undefined;
  const rightVal = isPairedPair ? value : undefined;
  const finalActual =
    leftVal !== undefined && rightVal !== undefined
      ? Math.min(leftVal, rightVal)
      : value;

  const log: SetLog = {
    round: session.currentRound,
    exerciseId: exercise.id,
    exerciseName: exercise.name,
    swappedFromName,
    metric: exercise.metric,
    target: item.target,
    plannedTarget: item.plannedTarget ?? item.target,
    actual: finalActual,
    leftActual: leftVal,
    rightActual: rightVal,
    rir,
    completedAt: new Date(now).toISOString(),
  };

  const nextTarget = carryoverTarget(exercise.metric, item.target, finalActual);
  const items =
    nextTarget !== item.target
      ? session.items.map((it, idx) =>
          idx === session.currentItemIndex
            ? { ...it, target: nextTarget, plannedTarget: it.plannedTarget ?? it.target }
            : it
        )
      : session.items;

  const logs = [...session.logs, log];
  const nextPos = getNextPosition(session);

  if (nextPos.isWorkoutEnd) {
    return startCooldown(session, now, { logs, items });
  }

  const restSec = nextPos.isNewRound
    ? session.restBetweenRounds
    : session.restBetweenExercises;

  if (restSec <= 0) {
    return {
      ...session,
      logs,
      items,
      currentRound: nextPos.nextRound,
      currentItemIndex: nextPos.nextItemIndex,
      phase: nextPos.isNewRound ? 'round_banner' : 'exercise',
    };
  }

  return {
    ...session,
    logs,
    items,
    phase: 'rest',
    phaseRemainingSec: restSec,
    phaseEndTimestamp: now + restSec * 1000,
    isPaused: false,
  };
}

// Round-flow "+1 round": logs every exercise of the round at its target.
export function plusRound(
  session: ActiveSession,
  exercises: Exercise[],
  now: number
): ActiveSession {
  const completedAt = new Date(now).toISOString();
  const roundLogs: SetLog[] = session.items.map((it) => {
    const ex = exercises.find((e) => e.id === it.exerciseId);
    return {
      round: session.currentRound,
      exerciseId: it.exerciseId,
      exerciseName: ex?.name ?? it.exerciseId,
      metric: ex?.metric ?? 'reps',
      target: it.target,
      plannedTarget: it.plannedTarget ?? it.target,
      actual: it.target,
      leftActual: ex?.isPaired ? it.target : undefined,
      rightActual: ex?.isPaired ? it.target : undefined,
      rir: '2+',
      completedAt,
    };
  });
  const logs = [...session.logs, ...roundLogs];
  const restSec = session.restBetweenRounds;

  if (restSec <= 0) {
    return {
      ...session,
      logs,
      currentRound: session.currentRound + 1,
      currentItemIndex: 0,
      phase: 'exercise',
    };
  }
  return {
    ...session,
    logs,
    phase: 'rest',
    phaseRemainingSec: restSec,
    phaseEndTimestamp: now + restSec * 1000,
    isPaused: false,
  };
}

// Swap the current exercise; same metric keeps the target, otherwise AGT 30%.
export function swapCurrentExercise(
  session: ActiveSession,
  currentMetric: MetricType,
  replacement: Exercise
): ActiveSession {
  const items = session.items.map((it, idx) => {
    if (idx !== session.currentItemIndex) return it;
    const nextTarget =
      replacement.metric === currentMetric ? it.target : calcAgt30(replacement);
    return {
      exerciseId: replacement.id,
      target: nextTarget,
      plannedTarget: nextTarget,
      swappedFromId: it.swappedFromId ?? it.exerciseId,
    };
  });
  return { ...session, items };
}

export function buildWorkoutLog(
  session: ActiveSession,
  note: string,
  now: number
): WorkoutLog {
  return {
    id: `wlog-${now}`,
    date: new Date(now).toISOString(),
    workoutTitle: session.workoutTitle,
    readiness: session.readiness,
    roundsCompleted: session.isRoundFlow
      ? completedRounds(session.logs)
      : session.totalRounds,
    roundsPlanned: session.totalRounds,
    durationSeconds: Math.max(
      60,
      Math.round((now - new Date(session.startedAt).getTime()) / 1000)
    ),
    sets: session.logs,
    note: note.trim() || undefined,
  };
}

/**
 * Warm-up block accounting for a tick: `delta` seconds passed. Returns the
 * new block index / seconds left in it and how many block boundaries were
 * crossed (one tick sound each).
 */
export function advanceWarmupSteps(
  stepIndex: number,
  stepRemainingSec: number,
  delta: number,
  steps: Pick<MobilityStep, 'durationSeconds'>[]
): { stepIndex: number; stepRemainingSec: number; crossed: number } {
  let index = stepIndex;
  let rem = stepRemainingSec;
  let crossed = 0;
  if (index < steps.length && delta > 0) {
    rem -= delta;
    while (index < steps.length && rem <= 0) {
      index += 1;
      crossed += 1;
      rem = index < steps.length ? rem + (steps[index].durationSeconds ?? 90) : 0;
    }
  }
  return { stepIndex: index, stepRemainingSec: rem, crossed };
}
