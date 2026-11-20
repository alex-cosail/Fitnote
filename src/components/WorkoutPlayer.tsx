import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeftRight,
  Check,
  FastForward,
  Minus,
  Pause,
  Play,
  Plus,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  COOLDOWN_STEPS,
  calcAgt30,
  findAntagonistMatches,
  formatClock,
  formatMetricTarget,
  getMuscleLabel,
  getWarmupPlan,
} from '../data/seed';
import {
  ActiveSession,
  Exercise,
  RirValue,
  SetLog,
  WorkoutLog,
} from '../types';
import { soundEngine } from '../utils/audio';
import { ExerciseSvg } from './ExerciseSvg';

interface WorkoutPlayerProps {
  session: ActiveSession;
  exercises: Exercise[];
  isMuted: boolean;
  onToggleMute: () => void;
  onUpdateSession: (next: ActiveSession) => void;
  onCompleteSession: (log: WorkoutLog) => void;
  onExitSession: () => void;
}

const HOLD_PREP_SEC = 5;
const HOLD_FLIP_SEC = 7;

type HoldMode = 'idle' | 'prep' | 'running' | 'flip' | 'paused';

interface HoldState {
  mode: HoldMode;
  side: 1 | 2;
  anchorMs: number; // start of the current prep / flip / running stretch
  baseSec: number; // running: seconds held before anchorMs (after a pause)
  countdown: number; // prep / flip: whole seconds left (display)
  elapsed: number; // running: whole seconds held (display)
  pausedFrom?: 'prep' | 'running' | 'flip';
  pausedLeftMs?: number; // prep / flip: time left when paused
}

const IDLE_HOLD: HoldState = {
  mode: 'idle',
  side: 1,
  anchorMs: 0,
  baseSec: 0,
  countdown: HOLD_PREP_SEC,
  elapsed: 0,
};

// Compact SVG ring: progress within the current round + round number.
const RoundProgressRing: React.FC<{
  progress: number;
  round: number;
  totalRounds: number;
}> = ({ progress, round, totalRounds }) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center"
      role="img"
      aria-label={`Круг ${round} из ${totalRounds}, пройдено ${Math.round(p * 100)}%`}
      title={`Круг ${round} из ${totalRounds}`}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-11 w-11 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          className="stroke-gray-200 dark:stroke-[#263248]"
        />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="stroke-[#DC2626] transition-all duration-300 dark:stroke-[#EF4444]"
        />
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <span className="font-mono-num text-[15px] font-bold text-[#111827] dark:text-[#F3F4F6]">
          {round}
        </span>
        <span className="font-mono-num mt-px text-[8px] font-semibold text-gray-500 dark:text-gray-400">
          из {totalRounds}
        </span>
      </div>
    </div>
  );
};

export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = ({
  session,
  exercises,
  isMuted,
  onToggleMute,
  onUpdateSession,
  onCompleteSession,
  onExitSession,
}) => {
  const currentItem = session.items[session.currentItemIndex];
  const currentExercise =
    exercises.find((e) => e.id === currentItem?.exerciseId) ?? exercises[0];

  const [repsValue, setRepsValue] = useState<number>(currentItem?.target ?? 10);
  const [rir, setRir] = useState<RirValue>('1');
  const [showAntagonistSheet, setShowAntagonistSheet] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [finishNote, setFinishNote] = useState('');
  const [pairedLeftValue, setPairedLeftValue] = useState<number | null>(null);
  // Brief "saved" highlight after a tap on the rep number, then move on.
  const [repSaveFlash, setRepSaveFlash] = useState(false);
  const repSaveTimeoutRef = useRef<number | null>(null);

  // Autopilot for seconds-based exercises:
  // 5s prep -> stopwatch counts up -> stops by itself at the target.
  // Paired holds: side 1 -> 7s flip buffer -> side 2.
  // Tap on the digits = pause / resume; double tap = reset to a fresh 5s prep.
  const [holdUi, setHoldUi] = useState<HoldState>(IDLE_HOLD);
  const holdRef = useRef<HoldState>(holdUi);
  const setHold = (next: HoldState) => {
    holdRef.current = next;
    setHoldUi(next);
  };
  const repsRef = useRef(repsValue);
  repsRef.current = repsValue;
  const holdTapTimeoutRef = useRef<number | null>(null);

  const startPrep = (side: 1 | 2) => {
    soundEngine.playTick(isMuted);
    setRepsValue(0);
    setHold({
      ...IDLE_HOLD,
      mode: 'prep',
      side,
      anchorMs: Date.now(),
      countdown: HOLD_PREP_SEC,
    });
  };

  const startFlip = () => {
    setRepsValue(0);
    setHold({
      ...IDLE_HOLD,
      mode: 'flip',
      side: 2,
      anchorMs: Date.now(),
      countdown: HOLD_FLIP_SEC,
    });
  };

  // Seconds held right now (live while running, else the stepper value).
  const getHeldSeconds = () => {
    const h = holdRef.current;
    if (h.mode === 'running') {
      return h.baseSec + Math.floor((Date.now() - h.anchorMs) / 1000);
    }
    return repsRef.current;
  };

  // Reset the stepper and (for timed exercises) auto-start the 5s prep
  // whenever a new exercise opens.
  useEffect(() => {
    if (!currentItem) return;
    setRir('1');
    setPairedLeftValue(null);
    if (
      session.phase === 'exercise' &&
      !session.isRoundFlow &&
      currentExercise.metric === 'seconds'
    ) {
      startPrep(1);
    } else {
      setRepsValue(currentItem.target);
      setHold(IDLE_HOLD);
    }
  }, [
    session.phase,
    session.currentRound,
    session.currentItemIndex,
    currentItem?.exerciseId,
  ]);

  useEffect(() => {
    return () => {
      if (holdTapTimeoutRef.current !== null) {
        window.clearTimeout(holdTapTimeoutRef.current);
      }
      if (repSaveTimeoutRef.current !== null) {
        window.clearTimeout(repSaveTimeoutRef.current);
      }
    };
  }, []);

  // Hold timer tick; reads the latest render through a ref so that the
  // auto-finish always sees fresh session state.
  const holdTickRef = useRef<() => void>(() => {});
  holdTickRef.current = () => {
    const h = holdRef.current;
    const now = Date.now();

    if (h.mode === 'prep' || h.mode === 'flip') {
      const totalSec = h.mode === 'prep' ? HOLD_PREP_SEC : HOLD_FLIP_SEC;
      const leftMs = totalSec * 1000 - (now - h.anchorMs);
      const rem = Math.max(0, Math.ceil(leftMs / 1000));
      if (rem === h.countdown) return;
      if (rem > 0) {
        if (h.mode === 'prep' || rem <= 3) soundEngine.playTick(isMuted);
        setHold({ ...h, countdown: rem });
        return;
      }
      soundEngine.playGo(isMuted);
      setRepsValue(0);
      setHold({
        ...h,
        mode: 'running',
        anchorMs: now,
        baseSec: 0,
        countdown: 0,
        elapsed: 0,
      });
      return;
    }

    if (h.mode === 'running' && currentItem) {
      const elapsed = h.baseSec + Math.floor((now - h.anchorMs) / 1000);
      if (elapsed === h.elapsed) return;
      const target = currentItem.target;
      if (elapsed >= target) {
        finishHoldAtTarget(target);
        return;
      }
      if (target - elapsed <= 3) soundEngine.playTick(isMuted);
      setRepsValue(elapsed);
      setHold({ ...h, elapsed });
    }
  };

  useEffect(() => {
    if (
      holdUi.mode !== 'prep' &&
      holdUi.mode !== 'flip' &&
      holdUi.mode !== 'running'
    ) {
      return;
    }
    const id = window.setInterval(() => holdTickRef.current(), 150);
    return () => window.clearInterval(id);
  }, [holdUi.mode]);

  // Target reached: side 1 of a paired hold -> flip buffer; otherwise the set
  // is logged and the player moves on to rest.
  const finishHoldAtTarget = (value: number) => {
    const h = holdRef.current;
    setRepsValue(value);
    if (currentExercise.isPaired && h.side === 1) {
      soundEngine.playDone(isMuted);
      setPairedLeftValue(value);
      startFlip();
      return;
    }
    completeSet(value);
  };

  const pauseHold = () => {
    const h = holdRef.current;
    const now = Date.now();
    if (h.mode === 'running') {
      const elapsed = h.baseSec + Math.floor((now - h.anchorMs) / 1000);
      setRepsValue(elapsed);
      setHold({ ...h, mode: 'paused', pausedFrom: 'running', elapsed });
    } else if (h.mode === 'prep' || h.mode === 'flip') {
      const totalSec = h.mode === 'prep' ? HOLD_PREP_SEC : HOLD_FLIP_SEC;
      setHold({
        ...h,
        mode: 'paused',
        pausedFrom: h.mode,
        pausedLeftMs: Math.max(0, totalSec * 1000 - (now - h.anchorMs)),
      });
    }
  };

  const toggleHoldPause = () => {
    const h = holdRef.current;
    const now = Date.now();
    if (h.mode === 'paused') {
      if (h.pausedFrom === 'running') {
        setHold({
          ...h,
          mode: 'running',
          anchorMs: now,
          baseSec: repsRef.current,
          elapsed: repsRef.current,
          pausedFrom: undefined,
        });
      } else if (h.pausedFrom) {
        const totalSec =
          h.pausedFrom === 'prep' ? HOLD_PREP_SEC : HOLD_FLIP_SEC;
        setHold({
          ...h,
          mode: h.pausedFrom,
          anchorMs: now - (totalSec * 1000 - (h.pausedLeftMs ?? 0)),
          pausedFrom: undefined,
          pausedLeftMs: undefined,
        });
      }
      return;
    }
    if (h.mode === 'idle') {
      startPrep(h.side);
      return;
    }
    pauseHold();
  };

  const handleTapHoldDigits = () => {
    if (currentExercise.metric !== 'seconds') return;
    soundEngine.unlock();
    if (holdTapTimeoutRef.current !== null) {
      // Double tap: reset the current side to a fresh 5s prep.
      window.clearTimeout(holdTapTimeoutRef.current);
      holdTapTimeoutRef.current = null;
      startPrep(holdRef.current.side);
      return;
    }
    holdTapTimeoutRef.current = window.setTimeout(() => {
      holdTapTimeoutRef.current = null;
      toggleHoldPause();
    }, 260);
  };

  const handleStepReps = (delta: number) => {
    const h = holdRef.current;
    if (h.mode === 'prep' || h.mode === 'flip' || h.mode === 'running') {
      pauseHold();
    }
    if (holdRef.current.mode === 'paused') {
      // A manual correction continues from the corrected value on resume.
      setHold({
        ...holdRef.current,
        pausedFrom: 'running',
        pausedLeftMs: undefined,
      });
    }
    setRepsValue((v) => Math.max(0, v + delta));
  };

  const lastTickSecondRef = useRef<number | null>(null);
  const warmupTapTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (warmupTapTimeoutRef.current !== null) {
        window.clearTimeout(warmupTapTimeoutRef.current);
      }
    };
  }, []);

  // Main countdown ticker for warmup / rest / cooldown (supports 5s pre-countdown)
  useEffect(() => {
    const isTimedPhase =
      session.phase === 'warmup' ||
      session.phase === 'rest' ||
      session.phase === 'cooldown';

    if (!isTimedPhase || session.isPaused) return;

    const tick = () => {
      const endTs = session.phaseEndTimestamp;
      if (!endTs) return;
      const remaining = Math.max(0, Math.ceil((endTs - Date.now()) / 1000));

      // 1) 5-second start countdown before warmup / cooldown
      if (session.preCountdownSec && session.preCountdownSec > 0) {
        if (remaining !== session.preCountdownSec) {
          if (remaining <= 0) {
            soundEngine.playGo(isMuted);
            onUpdateSession({
              ...session,
              preCountdownSec: 0,
              phaseEndTimestamp: Date.now() + session.phaseRemainingSec * 1000,
            });
          } else {
            soundEngine.playTick(isMuted);
            onUpdateSession({
              ...session,
              preCountdownSec: remaining,
            });
          }
        }
        return;
      }

      // 2) Active phase timer
      if (remaining !== session.phaseRemainingSec) {
        if (remaining > 0 && remaining <= 3 && lastTickSecondRef.current !== remaining) {
          lastTickSecondRef.current = remaining;
          soundEngine.playTick(isMuted);
        }

        if (remaining <= 0) {
          lastTickSecondRef.current = null;
          handleTimerZero();
        } else if (session.phase === 'warmup') {
          const steps = getWarmupPlan(session.warmupMinutes).steps;
          const delta = Math.max(0, session.phaseRemainingSec - remaining);
          let nextStepIndex = session.warmupStepIndex ?? 0;
          let nextStepRem =
            session.warmupStepRemainingSec ??
            steps[nextStepIndex]?.durationSeconds ??
            0;

          if (nextStepIndex < steps.length && delta > 0) {
            nextStepRem -= delta;
            while (nextStepIndex < steps.length && nextStepRem <= 0) {
              nextStepIndex += 1;
              if (nextStepIndex < steps.length) {
                nextStepRem += steps[nextStepIndex].durationSeconds ?? 90;
                soundEngine.playTick(isMuted);
              } else {
                nextStepRem = 0;
                soundEngine.playTick(isMuted);
              }
            }
          }

          onUpdateSession({
            ...session,
            phaseRemainingSec: remaining,
            warmupStepIndex: nextStepIndex,
            warmupStepRemainingSec: nextStepRem,
          });
        } else {
          onUpdateSession({
            ...session,
            phaseRemainingSec: remaining,
          });
        }
      }
    };

    const intervalId = window.setInterval(tick, 200);
    return () => window.clearInterval(intervalId);
  });

  // 1.5s Round Transition Banner auto-advance
  useEffect(() => {
    if (session.phase !== 'round_banner') return;
    soundEngine.playRound(isMuted);
    const timeoutId = window.setTimeout(() => {
      onUpdateSession({
        ...session,
        phase: 'exercise',
      });
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [session.phase, session.currentRound]);

  const getNextPosition = () => {
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
  };

  const handleTimerZero = () => {
    soundEngine.playGo(isMuted);
    if (session.phase === 'warmup') {
      onUpdateSession({
        ...session,
        phase: 'exercise',
        preCountdownSec: 0,
        phaseRemainingSec: 0,
        phaseEndTimestamp: undefined,
        isPaused: false,
      });
      return;
    }

    if (session.phase === 'rest') {
      const nextPos = getNextPosition();
      if (nextPos.isNewRound && !session.isRoundFlow) {
        onUpdateSession({
          ...session,
          currentRound: nextPos.nextRound,
          currentItemIndex: nextPos.nextItemIndex,
          phase: 'round_banner',
          phaseRemainingSec: 0,
          phaseEndTimestamp: undefined,
          isPaused: false,
        });
      } else {
        onUpdateSession({
          ...session,
          currentRound: nextPos.nextRound,
          currentItemIndex: nextPos.nextItemIndex,
          phase: 'exercise',
          phaseRemainingSec: 0,
          phaseEndTimestamp: undefined,
          isPaused: false,
        });
      }
      return;
    }

    if (session.phase === 'cooldown') {
      soundEngine.playFinish(isMuted);
      onUpdateSession({
        ...session,
        phase: 'finish',
        phaseRemainingSec: 0,
        phaseEndTimestamp: undefined,
        isPaused: false,
      });
    }
  };

  const togglePauseTimer = () => {
    if (session.isPaused) {
      const remSec =
        session.preCountdownSec && session.preCountdownSec > 0
          ? session.preCountdownSec
          : session.phaseRemainingSec;
      onUpdateSession({
        ...session,
        isPaused: false,
        phaseEndTimestamp: Date.now() + remSec * 1000,
      });
    } else {
      onUpdateSession({
        ...session,
        isPaused: true,
        phaseEndTimestamp: undefined,
      });
    }
  };

  const handleAddRestSeconds = (extraSec: number) => {
    const nextSec = session.phaseRemainingSec + extraSec;
    onUpdateSession({
      ...session,
      phaseRemainingSec: nextSec,
      phaseEndTimestamp: session.isPaused
        ? undefined
        : Date.now() + nextSec * 1000,
    });
  };

  const startCooldown = (extra: Partial<ActiveSession> = {}) => {
    onUpdateSession({
      ...session,
      ...extra,
      phase: 'cooldown',
      preCountdownSec: 5,
      phaseRemainingSec: session.cooldownMinutes * 60,
      phaseEndTimestamp: Date.now() + 5000,
      isPaused: false,
    });
  };

  // Manual "Done" / "Save left" button.
  const handleCompleteSet = () => {
    soundEngine.unlock();
    const value =
      currentExercise.metric === 'seconds' ? getHeldSeconds() : repsValue;

    // Paired unilateral exercise: Step 1 (Left, red) -> Step 2 (Right, green)
    if (currentExercise.isPaired && pairedLeftValue === null) {
      soundEngine.playTick(isMuted);
      setPairedLeftValue(value);
      if (currentExercise.metric === 'seconds') {
        startFlip();
      }
      return;
    }

    completeSet(value);
  };

  // Logs the set (value = right side for paired exercises) and moves on.
  const completeSet = (value: number) => {
    setHold(IDLE_HOLD);
    soundEngine.playDone(isMuted);

    const swappedFrom = currentItem.swappedFromId
      ? exercises.find((e) => e.id === currentItem.swappedFromId)?.name
      : undefined;

    const leftVal =
      currentExercise.isPaired && pairedLeftValue !== null
        ? pairedLeftValue
        : undefined;
    const rightVal =
      currentExercise.isPaired && pairedLeftValue !== null ? value : undefined;
    const finalActual =
      leftVal !== undefined && rightVal !== undefined
        ? Math.min(leftVal, rightVal)
        : value;

    setPairedLeftValue(null);

    const newLog: SetLog = {
      round: session.currentRound,
      exerciseId: currentExercise.id,
      exerciseName: currentExercise.name,
      swappedFromName: swappedFrom,
      metric: currentExercise.metric,
      target: currentItem.target,
      plannedTarget: currentItem.plannedTarget ?? currentItem.target,
      actual: finalActual,
      leftActual: leftVal,
      rightActual: rightVal,
      rir,
      completedAt: new Date().toISOString(),
    };

    // Smart carryover: the next round opens with this round's actual result.
    // Timed holds only carry upwards, so an early (or accidental) stop does
    // not cut the coach's target for the remaining rounds.
    // Only inside this session; the saved plan is untouched.
    const shouldCarry =
      finalActual > 0 &&
      (currentExercise.metric === 'seconds'
        ? finalActual > currentItem.target
        : finalActual !== currentItem.target);
    const nextItems =
      shouldCarry
        ? session.items.map((it, idx) =>
            idx === session.currentItemIndex
              ? {
                  ...it,
                  target: finalActual,
                  plannedTarget: it.plannedTarget ?? it.target,
                }
              : it
          )
        : session.items;

    const nextLogs = [...session.logs, newLog];
    const nextPos = getNextPosition();

    if (nextPos.isWorkoutEnd) {
      startCooldown({ logs: nextLogs, items: nextItems });
      return;
    }

    const restSec = nextPos.isNewRound
      ? session.restBetweenRounds
      : session.restBetweenExercises;

    if (restSec <= 0) {
      onUpdateSession({
        ...session,
        logs: nextLogs,
        items: nextItems,
        currentRound: nextPos.nextRound,
        currentItemIndex: nextPos.nextItemIndex,
        phase: nextPos.isNewRound ? 'round_banner' : 'exercise',
      });
      return;
    }

    onUpdateSession({
      ...session,
      logs: nextLogs,
      items: nextItems,
      phase: 'rest',
      phaseRemainingSec: restSec,
      phaseEndTimestamp: Date.now() + restSec * 1000,
      isPaused: false,
    });
  };

  // Round-flow "+1 round": logs every exercise of the round at its target.
  const handleRoundFlowPlusRound = () => {
    soundEngine.unlock();
    soundEngine.playDone(isMuted);
    const completedAt = new Date().toISOString();
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
    const nextLogs = [...session.logs, ...roundLogs];
    const restSec = session.restBetweenRounds;

    if (restSec <= 0) {
      onUpdateSession({
        ...session,
        logs: nextLogs,
        currentRound: session.currentRound + 1,
        currentItemIndex: 0,
        phase: 'exercise',
      });
      return;
    }

    onUpdateSession({
      ...session,
      logs: nextLogs,
      phase: 'rest',
      phaseRemainingSec: restSec,
      phaseEndTimestamp: Date.now() + restSec * 1000,
      isPaused: false,
    });
  };

  const handleRoundFlowFinish = () => {
    soundEngine.unlock();
    soundEngine.playGo(isMuted);
    startCooldown();
  };

  const handleSwapAntagonist = (replacement: Exercise) => {
    const nextItems = session.items.map((it, idx) => {
      if (idx !== session.currentItemIndex) return it;
      const nextTarget =
        replacement.metric === currentExercise.metric
          ? it.target
          : calcAgt30(replacement);
      return {
        exerciseId: replacement.id,
        target: nextTarget,
        plannedTarget: nextTarget,
        swappedFromId: it.swappedFromId ?? it.exerciseId,
      };
    });

    setPairedLeftValue(null);
    onUpdateSession({
      ...session,
      items: nextItems,
    });
    setShowAntagonistSheet(false);
  };

  // Round-flow: number of fully logged rounds.
  const roundFlowCompleted = session.logs.reduce(
    (max, l) => Math.max(max, l.round),
    0
  );

  const handleSaveFinish = () => {
    const elapsedSec = Math.max(
      60,
      Math.round(
        (Date.now() - new Date(session.startedAt).getTime()) / 1000
      )
    );
    const completedLog: WorkoutLog = {
      id: `wlog-${Date.now()}`,
      date: new Date().toISOString(),
      workoutTitle: session.workoutTitle,
      readiness: session.readiness,
      roundsCompleted: session.isRoundFlow
        ? roundFlowCompleted
        : session.totalRounds,
      roundsPlanned: session.totalRounds,
      durationSeconds: elapsedSec,
      sets: session.logs,
      note: finishNote.trim() || undefined,
    };
    onCompleteSession(completedLog);
  };

  const antagonistMatches = findAntagonistMatches(currentExercise, exercises);
  const nextPos = getNextPosition();
  const nextItem = session.items[nextPos.nextItemIndex];
  const nextExercise =
    exercises.find((e) => e.id === nextItem?.exerciseId) ?? currentExercise;

  // Progress ring: share of the current round's exercises reached
  // (during rest `currentItemIndex` still points at the finished exercise);
  // in round-flow mode, rounds done out of the goal.
  const ringProgress = session.isRoundFlow
    ? roundFlowCompleted / Math.max(1, session.totalRounds)
    : (session.currentItemIndex + 1) / Math.max(1, session.items.length);
  const ringRound =
    session.isRoundFlow && session.phase === 'rest'
      ? roundFlowCompleted
      : session.currentRound;

  // Tap on the rep number: highlight it briefly, then save the set / side.
  const handleTapRepNumber = () => {
    if (repSaveTimeoutRef.current !== null) return;
    soundEngine.unlock();
    setRepSaveFlash(true);
    repSaveTimeoutRef.current = window.setTimeout(() => {
      repSaveTimeoutRef.current = null;
      setRepSaveFlash(false);
      handleCompleteSet();
    }, 280);
  };

  // Large exercise picture (fills the free space) + muscles, name and cue.
  const renderExerciseVisual = (
    ex: Exercise,
    label?: string,
    tone: 'default' | 'rest' = 'default'
  ) => (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center text-center landscape:h-full">
      {label && (
        <p className="mb-1.5 shrink-0 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-[#67E8F9]">
          {label}
        </p>
      )}
      <div
        className={`flex min-h-[7rem] w-full flex-1 items-center justify-center rounded-2xl border p-2 ${
          tone === 'rest'
            ? 'border-[#67E8F9] bg-transparent dark:border-[#155E75]'
            : 'border-gray-200 bg-gray-50/70 dark:border-[#232E42] dark:bg-[#131A26]'
        }`}
      >
        <ExerciseSvg svgKey={ex.svgKey} className="h-full max-h-full w-full" />
      </div>

      <div className="mt-2 w-full shrink-0 landscape:mt-1.5">
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {ex.target_muscles.map(getMuscleLabel).join(' · ')}
          {ex.isPaired ? ' · парное' : ''}
        </p>
        <h2 className="font-display mt-0.5 break-words text-[clamp(1.35rem,3.6dvh,2.15rem)] font-bold leading-tight tracking-tight text-[#111827] landscape:text-[clamp(1.2rem,5.2dvh,2rem)] dark:text-[#F3F4F6]">
          {ex.name}
        </h2>
        <p className="mx-auto mt-0.5 line-clamp-2 max-w-md text-xs leading-snug text-gray-600 landscape:text-[11px] lg:landscape:text-sm dark:text-gray-300">
          {ex.cue}
        </p>
      </div>
    </div>
  );

  // Shared top bar inside player
  const renderTopBar = (
    centerLabel: string,
    showAntagonist = false,
    showRing = false,
    tone: 'default' | 'rest' = 'default'
  ) => (
    <header
      className={`flex h-12 shrink-0 items-center justify-between border-b px-4 landscape:h-11 lg:landscape:h-14 ${
        tone === 'rest'
          ? 'border-[#67E8F9] bg-[#BAF0F7] dark:border-[#155E75] dark:bg-[#083A47]'
          : 'border-gray-200 bg-white dark:border-[#1E293B] dark:bg-[#0F1520]'
      }`}
    >
      <button
        type="button"
        onClick={() => setShowExitConfirm(true)}
        className="tap-scale flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 hover:text-[#111827] dark:text-gray-300 dark:hover:bg-[#1E293B] dark:hover:text-white"
        aria-label="Выйти из тренировки"
      >
        <X className="h-5 w-5" />
      </button>

      <div className="text-center">
        <p className="font-mono-num text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
          {centerLabel}
        </p>
        <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
          {session.workoutTitle}
        </p>
      </div>

      <div className="flex items-center gap-1.5">
        {showAntagonist && (
          <button
            type="button"
            onClick={() => setShowAntagonistSheet(true)}
            className="tap-scale flex min-h-[44px] items-center gap-1 rounded-xl border border-gray-200 bg-white px-2.5 text-xs font-semibold text-[#111827] hover:bg-gray-50 dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6] dark:hover:bg-[#1A2333]"
          >
            <ArrowLeftRight className="h-3.5 w-3.5 text-[#DC2626] dark:text-[#F87171]" />
            <span className="hidden sm:inline">Antagonist</span>
          </button>
        )}
        <button
          type="button"
          onClick={onToggleMute}
          className={`tap-scale flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors ${
            tone === 'rest'
              ? `border-[#67E8F9] bg-transparent dark:border-[#155E75] ${
                  isMuted
                    ? 'text-[#0E7490]/70 dark:text-[#67E8F9]/70'
                    : 'text-[#111827] dark:text-[#F3F4F6]'
                }`
              : isMuted
                ? 'border-gray-200 bg-gray-100 text-gray-500 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-gray-400'
                : 'border-gray-200 bg-white text-[#111827] dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6]'
          }`}
          aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
          title={isMuted ? 'Звук выкл' : 'Звук вкл'}
        >
          {isMuted ? (
            <VolumeX className="h-4 w-4" />
          ) : (
            <Volume2 className="h-4 w-4 text-[#DC2626] dark:text-[#F87171]" />
          )}
        </button>
        {showRing && (
          <RoundProgressRing
            progress={ringProgress}
            round={ringRound}
            totalRounds={session.totalRounds}
          />
        )}
      </div>
    </header>
  );

  // PHASE: ROUND TRANSITION BANNER (1.5s)
  if (session.phase === 'round_banner') {
    return (
      <div
        onClick={() =>
          onUpdateSession({ ...session, phase: 'exercise' })
        }
        className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-[#111827] px-6 text-center text-white dark:bg-[#06090F]"
      >
        <p className="font-mono-num text-sm font-semibold uppercase tracking-widest text-[#DC2626] dark:text-[#F87171]">
          {session.workoutTitle}
        </p>
        <h2 className="font-display mt-2 text-7xl font-bold tracking-tight sm:text-8xl">
          ROUND {session.currentRound}
        </h2>
        <p className="font-mono-num mt-3 text-base text-gray-300">
          {session.currentRound} из {session.totalRounds}
        </p>
      </div>
    );
  }

  // PHASE: WARM-UP (Split 2-zone screen: Top/Left Picture+Title | Bottom/Right Timer)
  if (session.phase === 'warmup') {
    const firstExName = exercises.find(
      (e) => e.id === session.items[0]?.exerciseId
    )?.name;
    const warmupPlan = getWarmupPlan(session.warmupMinutes, firstExName);
    const warmupStepIndex = session.warmupStepIndex ?? 0;
    const currentWarmupStep =
      warmupStepIndex < warmupPlan.steps.length
        ? warmupPlan.steps[warmupStepIndex]
        : null;
    const warmupStepRemainingSec =
      session.warmupStepRemainingSec ??
      currentWarmupStep?.durationSeconds ??
      0;

    const preCountdownSec = session.preCountdownSec ?? 0;
    const isPrepCountdown = preCountdownSec > 0;

    const handleAdvanceWarmupStep = () => {
      soundEngine.unlock();
      if (warmupStepIndex >= warmupPlan.steps.length) return;
      const nextIndex = warmupStepIndex + 1;
      const nextStepSec =
        nextIndex < warmupPlan.steps.length
          ? (warmupPlan.steps[nextIndex].durationSeconds ?? 90)
          : 0;
      soundEngine.playTick(isMuted);
      onUpdateSession({
        ...session,
        warmupStepIndex: nextIndex,
        warmupStepRemainingSec: nextStepSec,
      });
    };

    const handleSkipWarmupToExercise = () => {
      soundEngine.unlock();
      soundEngine.playGo(isMuted);
      onUpdateSession({
        ...session,
        phase: 'exercise',
        preCountdownSec: 0,
        phaseRemainingSec: 0,
        phaseEndTimestamp: undefined,
        isPaused: false,
      });
    };

    const handleWarmupTimerTap = () => {
      soundEngine.unlock();
      if (warmupTapTimeoutRef.current !== null) {
        window.clearTimeout(warmupTapTimeoutRef.current);
        warmupTapTimeoutRef.current = null;
        handleSkipWarmupToExercise();
        return;
      }
      warmupTapTimeoutRef.current = window.setTimeout(() => {
        warmupTapTimeoutRef.current = null;
        togglePauseTimer();
      }, 260);
    };

    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-white dark:bg-[#0B0F17]">
        {renderTopBar('WARM-UP')}

        <main className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1 grid-rows-[minmax(0,1.25fr)_minmax(0,1fr)] gap-3 px-4 pt-3 pb-safe landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] landscape:grid-rows-1 landscape:gap-4 landscape:py-3">
          {/* TOP (Portrait) / LEFT (Landscape): Exercise Title + Picture (tap to advance) */}
          <button
            type="button"
            onClick={handleAdvanceWarmupStep}
            className="tap-scale flex min-h-0 min-w-0 flex-col items-center justify-between rounded-3xl border border-gray-200 bg-gray-50/70 p-4 text-center transition-colors active:bg-gray-100 landscape:p-3.5 dark:border-[#232E42] dark:bg-[#131A26] dark:active:bg-[#1A2333]"
          >
            {currentWarmupStep ? (
              <>
                <div className="w-full min-w-0">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span className="font-mono-num text-[#DC2626] dark:text-[#F87171]">
                      0{warmupStepIndex + 1} / 0{warmupPlan.steps.length}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num font-bold text-[#111827] dark:text-[#F3F4F6]">
                      {formatClock(warmupStepRemainingSec)}
                    </span>
                  </div>
                  <h2 className="font-display mt-1 break-words text-2xl font-bold leading-tight tracking-tight text-[#111827] sm:text-3xl landscape:text-[clamp(1.35rem,4.5dvh,2rem)] dark:text-[#F3F4F6]">
                    {currentWarmupStep.name}
                  </h2>
                  {currentWarmupStep.subtitle && (
                    <p className="mt-0.5 break-words text-xs font-medium text-gray-600 dark:text-gray-300">
                      {currentWarmupStep.subtitle}
                    </p>
                  )}
                </div>

                <div className="my-auto flex min-h-0 w-full items-center justify-center py-2">
                  <ExerciseSvg
                    svgKey={currentWarmupStep.svgKey}
                    className="h-36 w-52 max-h-full landscape:h-28 landscape:w-44 lg:landscape:h-40 lg:landscape:w-56"
                  />
                </div>

                <p className="text-[11px] font-medium text-gray-400 dark:text-gray-500">
                  Тап по картинке — следующее движение
                </p>
              </>
            ) : (
              <div className="my-auto flex flex-col items-center justify-center px-3">
                <span className="rounded-full bg-[#FEF2F2] px-3 py-1 text-xs font-bold text-[#DC2626] dark:bg-[#450A0A]/60 dark:text-[#F87171]">
                  Все блоки пройдены
                </span>
                <h2 className="font-display mt-3 text-4xl font-bold tracking-tight text-[#111827] sm:text-5xl dark:text-[#F3F4F6]">
                  Free Warm Up
                </h2>
                <p className="mt-2 max-w-xs text-xs text-gray-600 dark:text-gray-300">
                  Свободная разминка до конца таймера. Двойной тап по таймеру — старт тренировки.
                </p>
              </div>
            )}
          </button>

          {/* BOTTOM (Portrait) / RIGHT (Landscape): Interactive Timer (no duration selector) */}
          <div className="flex min-h-0 min-w-0 flex-col items-center justify-between rounded-3xl border border-gray-200 bg-white p-4 landscape:p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
            <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
              {warmupPlan.label} · {session.warmupMinutes} мин
            </span>

            <button
              type="button"
              onClick={handleWarmupTimerTap}
              className={`touch-manipulation flex w-full flex-1 flex-col items-center justify-center rounded-2xl px-3 py-2 text-center transition-colors ${
                session.isPaused || isPrepCountdown
                  ? 'bg-[#FEF2F2]/70 dark:bg-[#450A0A]/50'
                  : 'active:bg-gray-50 dark:active:bg-[#1A2333]'
              }`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-wider ${
                  session.isPaused || isPrepCountdown
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {session.isPaused
                  ? 'ПАУЗА'
                  : isPrepCountdown
                    ? 'ПРИГОТОВЬТЕСЬ'
                    : 'РАЗМИНКА'}
              </span>
              <div
                className={`font-mono-num mt-1 text-[4.5rem] font-bold leading-none tracking-tight sm:text-[5.5rem] landscape:text-[clamp(3.25rem,15dvh,5rem)] ${
                  session.isPaused || isPrepCountdown
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : 'text-[#111827] dark:text-[#F3F4F6]'
                }`}
              >
                {isPrepCountdown
                  ? preCountdownSec
                  : formatClock(session.phaseRemainingSec)}
              </div>
              {isPrepCountdown ? (
                <p className="font-mono-num mt-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Старт на {formatClock(session.phaseRemainingSec)}
                </p>
              ) : (
                <p className="mt-2.5 text-[11px] font-medium text-gray-500 dark:text-gray-400">
                  1 тап — пауза / старт · 2 тапа — к упражнениям
                </p>
              )}
            </button>

            <div className="flex items-center gap-1.5 pt-1" aria-hidden="true">
              {warmupPlan.steps.map((s, i) => (
                <span
                  key={s.id}
                  className={`h-1.5 rounded-full transition-all ${
                    i === warmupStepIndex
                      ? 'w-6 bg-[#DC2626] dark:bg-[#EF4444]'
                      : i < warmupStepIndex
                        ? 'w-2.5 bg-[#111827] dark:bg-[#E5E7EB]'
                        : 'w-2.5 bg-gray-200 dark:bg-[#263248]'
                  }`}
                />
              ))}
            </div>
          </div>
        </main>

        {showExitConfirm && (
          <ExitConfirmModal
            onCancel={() => setShowExitConfirm(false)}
            onConfirm={onExitSession}
          />
        )}
      </div>
    );
  }

  // PHASE: COOL-DOWN
  if (session.phase === 'cooldown') {
    const cooldownPrep = session.preCountdownSec ?? 0;
    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-white dark:bg-[#0B0F17]">
        {renderTopBar('COOL-DOWN')}

        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-between overflow-y-auto px-5 py-4">
          <div className="text-center">
            <p className="text-xs font-semibold text-[#DC2626] dark:text-[#F87171]">
              {cooldownPrep > 0
                ? 'Приготовьтесь к заминке'
                : 'Заминка и декомпрессия'}
            </p>
            <div
              className={`font-mono-num mt-1 text-6xl font-bold tracking-tight sm:text-7xl ${
                cooldownPrep > 0
                  ? 'text-[#DC2626] dark:text-[#F87171]'
                  : 'text-[#111827] dark:text-[#F3F4F6]'
              }`}
            >
              {cooldownPrep > 0
                ? cooldownPrep
                : formatClock(session.phaseRemainingSec)}
            </div>
            <div className="mt-3 flex justify-center">
              <button
                type="button"
                onClick={togglePauseTimer}
                className="tap-scale flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 text-xs font-semibold text-[#111827] dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6]"
              >
                {session.isPaused ? (
                  <>
                    <Play className="h-4 w-4 fill-current" /> Продолжить
                  </>
                ) : (
                  <>
                    <Pause className="h-4 w-4" /> Пауза
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="my-6 space-y-3">
            {COOLDOWN_STEPS.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-[#232E42] dark:bg-[#131A26]"
              >
                <ExerciseSvg
                  svgKey={step.svgKey}
                  className="h-20 w-28 shrink-0"
                />
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                      {step.name}
                    </h3>
                    <span className="font-mono-num text-xs font-semibold text-[#DC2626] dark:text-[#F87171]">
                      {step.durationHint}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed text-gray-600 dark:text-gray-300">
                    {step.cue}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="pb-safe pt-2">
            <button
              type="button"
              onClick={() => {
                soundEngine.playFinish(isMuted);
                onUpdateSession({
                  ...session,
                  phase: 'finish',
                  phaseRemainingSec: 0,
                  phaseEndTimestamp: undefined,
                });
              }}
              className="tap-scale flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-6 text-base font-bold text-white"
            >
              <Check className="h-5 w-5" />
              Завершить заминку
            </button>
          </div>
        </main>

        {showExitConfirm && (
          <ExitConfirmModal
            onCancel={() => setShowExitConfirm(false)}
            onConfirm={onExitSession}
          />
        )}
      </div>
    );
  }

  // PHASE: FINISH SUMMARY
  if (session.phase === 'finish') {
    const totalReps = session.logs
      .filter((l) => l.metric === 'reps')
      .reduce((acc, l) => acc + l.actual, 0);
    const totalHoldSec = session.logs
      .filter((l) => l.metric === 'seconds')
      .reduce((acc, l) => acc + l.actual, 0);
    const durationMin = Math.max(
      1,
      Math.round(
        (Date.now() - new Date(session.startedAt).getTime()) / 60000
      )
    );

    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-white dark:bg-[#0B0F17]">
        <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 px-5 dark:border-[#1E293B] dark:bg-[#0F1520]">
          <span className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
            Тренировка завершена
          </span>
          <button
            type="button"
            onClick={onExitSession}
            className="min-h-[44px] px-2 text-xs font-semibold text-gray-500 hover:text-[#111827] dark:text-gray-400 dark:hover:text-white"
          >
            Закрыть без сохранения
          </button>
        </header>

        <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-between overflow-y-auto px-5 py-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-[#DC2626] dark:text-[#F87171]">
              Отличная работа
            </p>
            <h2 className="font-display mt-1 text-4xl font-bold text-[#111827] dark:text-[#F3F4F6]">
              {session.workoutTitle}
            </h2>

            <div className="mt-5 grid grid-cols-3 gap-3">
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Длительность
                </p>
                <p className="font-mono-num mt-1 text-2xl font-bold text-[#111827] dark:text-[#F3F4F6]">
                  {durationMin}м
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Подходы
                </p>
                <p className="font-mono-num mt-1 text-2xl font-bold text-[#111827] dark:text-[#F3F4F6]">
                  {session.logs.length}
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
                <p className="text-xs text-gray-500 dark:text-gray-400">Объём</p>
                <p className="font-mono-num mt-1 text-2xl font-bold text-[#111827] dark:text-[#F3F4F6]">
                  {totalReps > 0 ? `${totalReps}` : `${totalHoldSec}с`}
                </p>
              </div>
            </div>

            {totalHoldSec > 0 && totalReps > 0 && (
              <p className="font-mono-num mt-2 text-xs text-gray-500 dark:text-gray-400">
                Плюс статика: {totalHoldSec} сек
              </p>
            )}

            <div className="mt-5">
              <label
                htmlFor="finish-note"
                className="block text-xs font-semibold text-gray-600 dark:text-gray-300"
              >
                Заметка к тренировке (необязательно)
              </label>
              <input
                id="finish-note"
                type="text"
                value={finishNote}
                onChange={(e) => setFinishNote(e.target.value)}
                placeholder="Например: хорошее самочувствие, турник в парке"
                className="mt-1.5 min-h-[46px] w-full rounded-xl border border-gray-300 bg-white px-3.5 text-sm text-[#111827] placeholder:text-gray-400 focus:border-[#111827] focus:outline-none dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:placeholder:text-gray-500 dark:focus:border-[#94A3B8]"
              />
            </div>

            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Записанные подходы ({session.logs.length})
              </p>
              <div className="max-h-52 divide-y divide-gray-100 overflow-y-auto rounded-2xl border border-gray-200 dark:divide-[#1E293B] dark:border-[#232E42] dark:bg-[#131A26]">
                {session.logs.map((log, i) => (
                  <div
                    key={`${log.completedAt}-${i}`}
                    className="flex items-center justify-between px-3.5 py-2.5 text-xs"
                  >
                    <div className="min-w-0 pr-2">
                      <span className="font-mono-num mr-2 text-gray-400 dark:text-gray-500">
                        R{log.round}
                      </span>
                      <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">
                        {log.exerciseName}
                      </span>
                    </div>
                    <div className="font-mono-num shrink-0 font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      {log.leftActual !== undefined &&
                      log.rightActual !== undefined
                        ? `${log.leftActual}/${log.rightActual}`
                        : log.actual}
                      {log.metric === 'seconds' ? 'с' : 'п'} · RIR {log.rir}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="pb-safe pt-5">
            <button
              type="button"
              onClick={handleSaveFinish}
              className="tap-scale flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-6 text-base font-bold text-white"
            >
              <Check className="h-5 w-5" />
              Сохранить в журнал
            </button>
          </div>
        </main>
      </div>
    );
  }

  // PHASE: REST TIMER — tinted "relax" screen: next exercise picture +
  // a full-width timer with the buttons below it.
  if (session.phase === 'rest') {
    const isUrgent =
      session.phaseRemainingSec > 0 && session.phaseRemainingSec <= 3;

    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-[#BAF0F7] dark:bg-[#083A47]">
        {renderTopBar(
          `ОТДЫХ · R${nextPos.nextRound}/${session.totalRounds}`,
          false,
          true,
          'rest'
        )}

        <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3 overflow-hidden px-4 pt-3 pb-safe sm:px-5 landscape:grid landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] landscape:gap-4 landscape:py-3">
          {/* Top (Portrait) / Left (Landscape): next exercise */}
          {renderExerciseVisual(
            nextExercise,
            `Далее · Круг ${nextPos.nextRound}/${session.totalRounds}`,
            'rest'
          )}

          {/* Bottom (Portrait) / Right (Landscape): big timer, buttons below */}
          <div className="@container flex w-full shrink-0 flex-col justify-center gap-2.5 landscape:h-full">
            <button
              type="button"
              onClick={togglePauseTimer}
              className={`touch-manipulation flex w-full flex-col items-center justify-center rounded-3xl border px-3 py-3 text-center transition-colors landscape:flex-1 ${
                session.isPaused || isUrgent
                  ? 'border-[#DC2626]/30 bg-[#FEF2F2]/80 dark:border-[#EF4444]/40 dark:bg-[#450A0A]/45'
                  : 'border-[#67E8F9] bg-transparent active:bg-[#A5EDF5] dark:border-[#155E75] dark:active:bg-[#0B4A58]'
              }`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  session.isPaused || isUrgent
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : 'text-[#0E7490] dark:text-[#67E8F9]'
                }`}
              >
                {session.isPaused ? 'ПАУЗА ОТДЫХА' : 'ОТДЫХ'}
              </span>
              <div
                className={`font-mono-num font-bold leading-none tracking-tight text-[min(30cqw,17dvh)] landscape:text-[min(30cqw,36dvh)] ${
                  session.isPaused || isUrgent
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : 'text-[#111827] dark:text-[#F3F4F6]'
                }`}
              >
                {formatClock(session.phaseRemainingSec)}
              </div>
              <span className="mt-1 text-[11px] font-medium text-[#0E7490]/80 dark:text-[#67E8F9]/70">
                Тап — пауза / продолжить
              </span>
            </button>

            <div className="grid w-full grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleAddRestSeconds(15)}
                className="tap-scale flex min-h-[52px] items-center justify-center rounded-2xl border border-[#A5F3FC] bg-white text-base font-bold text-[#111827] shadow-sm active:bg-[#CFFAFE] landscape:min-h-[48px] dark:border-[#155E75]/60 dark:bg-[#0B3A45] dark:text-[#F3F4F6] dark:active:bg-[#0E4652]"
              >
                +15 сек
              </button>
              <button
                type="button"
                onClick={() => {
                  lastTickSecondRef.current = null;
                  handleTimerZero();
                }}
                className="tap-scale flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl bg-[#111827] text-base font-bold text-white shadow-sm active:bg-black landscape:min-h-[48px] dark:bg-[#F3F4F6] dark:text-[#0B0F17] dark:active:bg-white"
              >
                Пропустить
                <FastForward className="h-4 w-4" />
              </button>
            </div>

            {session.isRoundFlow && (
              <button
                type="button"
                onClick={handleRoundFlowFinish}
                className="tap-scale flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-2xl border border-[#A5F3FC] bg-white text-sm font-bold text-[#111827] active:bg-[#CFFAFE] dark:border-[#155E75]/60 dark:bg-[#0B3A45] dark:text-[#F3F4F6] dark:active:bg-[#0E4652]"
              >
                Закончить → Заминка
              </button>
            )}
          </div>
        </main>

        {showExitConfirm && (
          <ExitConfirmModal
            onCancel={() => setShowExitConfirm(false)}
            onConfirm={onExitSession}
          />
        )}
      </div>
    );
  }

  // PHASE: ROUND-FLOW "15+" (whole round on one screen, open round counter)
  if (session.isRoundFlow) {
    const many = session.items.length > 4;
    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-white dark:bg-[#0B0F17]">
        {renderTopBar(`КРУГ ${session.currentRound}`, false, true)}

        <main className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)_auto] gap-3 px-4 pt-3 pb-safe landscape:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] landscape:grid-rows-1 landscape:gap-4 landscape:py-3">
          {/* Top (Portrait) / Left (Landscape): all exercises of the round */}
          <div
            className={`grid min-h-0 gap-2 overflow-y-auto ${
              many ? 'grid-cols-1' : 'grid-cols-2 auto-rows-fr'
            }`}
          >
            {session.items.map((it, idx) => {
              const ex = exercises.find((e) => e.id === it.exerciseId);
              if (!ex) return null;
              return (
                <div
                  key={`${it.exerciseId}-${idx}`}
                  className={`flex min-h-0 min-w-0 rounded-2xl border border-gray-200 bg-gray-50/70 p-2.5 dark:border-[#232E42] dark:bg-[#131A26] ${
                    many
                      ? 'items-center gap-3'
                      : 'flex-col items-center justify-center text-center'
                  }`}
                >
                  <ExerciseSvg
                    svgKey={ex.svgKey}
                    className={
                      many
                        ? 'h-12 w-16 shrink-0'
                        : 'h-[clamp(3.5rem,13dvh,7rem)] w-auto max-w-full landscape:h-[clamp(3rem,16dvh,6.5rem)]'
                    }
                  />
                  <div className={many ? 'min-w-0 flex-1' : 'mt-1.5 w-full min-w-0'}>
                    <p className="break-words text-xs font-bold leading-tight text-[#111827] sm:text-sm dark:text-[#F3F4F6]">
                      {ex.name}
                    </p>
                    <p className="font-mono-num mt-0.5 text-lg font-bold leading-none text-[#DC2626] dark:text-[#F87171]">
                      {formatMetricTarget(it.target, ex.metric)}
                      {ex.isPaired && (
                        <span className="ml-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          ×2 стороны
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom (Portrait) / Right (Landscape): round counter + actions */}
          <div className="flex min-h-0 flex-col justify-center gap-3 rounded-3xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Кругов выполнено
              </p>
              <div className="font-mono-num mt-1 text-[4.5rem] font-bold leading-none tracking-tight text-[#111827] sm:text-[5.5rem] landscape:text-[clamp(3.25rem,15dvh,5rem)] dark:text-[#F3F4F6]">
                {roundFlowCompleted}
              </div>
              <p className="font-mono-num mt-1 text-sm font-semibold text-[#DC2626] dark:text-[#F87171]">
                Цель: {session.totalRounds}+
              </p>
            </div>

            <button
              type="button"
              onClick={handleRoundFlowPlusRound}
              className="tap-scale flex min-h-[64px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-6 text-lg font-bold tracking-wide text-white shadow-sm active:bg-[#B91C1C]"
            >
              <Plus className="h-6 w-6" />
              +1 КРУГ ВЫПОЛНЕН
            </button>

            <button
              type="button"
              onClick={handleRoundFlowFinish}
              disabled={roundFlowCompleted < 1}
              className="tap-scale flex min-h-[48px] w-full items-center justify-center gap-1.5 rounded-2xl border border-gray-300 bg-white text-sm font-bold text-[#111827] active:bg-gray-100 disabled:opacity-40 dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#243044]"
            >
              Закончить → Заминка
            </button>
          </div>
        </main>

        {showExitConfirm && (
          <ExitConfirmModal
            onCancel={() => setShowExitConfirm(false)}
            onConfirm={onExitSession}
          />
        )}
      </div>
    );
  }

  // PHASE: ACTIVE EXERCISE
  const isPairedSecondStep =
    Boolean(currentExercise.isPaired) && pairedLeftValue !== null;
  const isTimed = currentExercise.metric === 'seconds';

  const sideColorText = currentExercise.isPaired
    ? isPairedSecondStep
      ? 'text-[#16A34A] dark:text-[#4ADE80]'
      : 'text-[#DC2626] dark:text-[#F87171]'
    : 'text-[#111827] dark:text-[#F3F4F6]';

  // Timed exercise display: countdown (prep / flip) or seconds held.
  const holdDigits =
    holdUi.mode === 'prep' || holdUi.mode === 'flip'
      ? formatClock(holdUi.countdown)
      : holdUi.mode === 'paused' && holdUi.pausedFrom !== 'running'
        ? formatClock(Math.ceil((holdUi.pausedLeftMs ?? 0) / 1000))
        : formatClock(repsValue);

  const holdTone =
    holdUi.mode === 'prep' || holdUi.mode === 'flip'
      ? {
          box: 'border-[#DC2626]/30 bg-[#FEF2F2]/80 dark:border-[#EF4444]/40 dark:bg-[#450A0A]/45',
          text: 'text-[#DC2626] dark:text-[#F87171]',
        }
      : holdUi.mode === 'paused'
        ? {
            box: 'border-[#D97706]/30 bg-[#FFFBEB] dark:border-[#FBBF24]/40 dark:bg-[#451A03]/50',
            text: 'text-[#D97706] dark:text-[#FBBF24]',
          }
        : {
            box: 'border-gray-200 bg-gray-50 dark:border-[#232E42] dark:bg-[#131A26]',
            text: 'text-[#111827] dark:text-[#F3F4F6]',
          };

  const holdCaption =
    holdUi.mode === 'prep'
      ? `Займите положение · старт через ${holdUi.countdown}с`
      : holdUi.mode === 'flip'
        ? `Переворот на другую сторону · ${holdUi.countdown}с`
        : holdUi.mode === 'running'
          ? `Цель ${formatClock(currentItem.target)} · тап — пауза · 2 тапа — заново`
          : holdUi.mode === 'paused'
            ? 'Пауза · тап — продолжить · 2 тапа — заново'
            : `Цель ${formatClock(currentItem.target)} · тап — старт`;

  const stepColClass =
    'tap-scale flex h-full items-center justify-center rounded-2xl border border-gray-200 bg-gray-50 text-[#111827] active:bg-gray-200 dark:border-[#232E42] dark:bg-[#131A26] dark:text-[#F3F4F6] dark:active:bg-[#1E293B]';

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-white dark:bg-[#0B0F17]">
      {renderTopBar(
        `Round ${session.currentRound} / ${session.totalRounds} · ${
          session.currentItemIndex + 1
        }/${session.items.length}`,
        true,
        true
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-5xl flex-1 flex-col gap-3 overflow-hidden px-4 pt-3 pb-safe sm:px-5 landscape:grid landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] landscape:gap-4 landscape:py-3">
        {/* Top (Portrait) / Left (Landscape): large picture + name + cue */}
        {renderExerciseVisual(currentExercise)}

        {/* Bottom (Portrait) / Right (Landscape): controls */}
        {isTimed ? (
          <div className="@container flex w-full shrink-0 flex-col justify-center gap-2.5 landscape:h-full">
            {/* Big hold timer: tap = pause / resume, double tap = reset */}
            <button
              type="button"
              onClick={handleTapHoldDigits}
              aria-label={
                holdUi.mode === 'paused' || holdUi.mode === 'idle'
                  ? `Запустить таймер ${currentExercise.name}`
                  : `Остановить таймер ${currentExercise.name}`
              }
              className={`touch-manipulation flex w-full flex-col items-center justify-center rounded-3xl border px-3 py-3 text-center transition-colors landscape:flex-1 ${holdTone.box}`}
            >
              <div
                className={`font-mono-num font-bold leading-none tracking-tight text-[min(30cqw,17dvh)] landscape:text-[min(30cqw,36dvh)] ${holdTone.text}`}
              >
                {holdDigits}
              </div>
            </button>

            <p className={`text-center text-xs font-semibold ${holdTone.text}`}>
              {holdCaption}
            </p>

            <button
              type="button"
              onClick={handleCompleteSet}
              className={`tap-scale flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-bold tracking-wide text-white shadow-sm transition-colors landscape:min-h-[48px] ${
                currentExercise.isPaired
                  ? isPairedSecondStep
                    ? 'bg-[#16A34A] active:bg-[#15803D]'
                    : 'bg-[#DC2626] active:bg-[#B91C1C]'
                  : 'bg-[#2563EB] active:bg-[#1E40AF]'
              }`}
            >
              <Check className="h-5 w-5" />
              {currentExercise.isPaired
                ? isPairedSecondStep
                  ? 'Правая сторона'
                  : 'Левая сторона'
                : 'Готово'}
            </button>
          </div>
        ) : (
          <div className="mx-auto flex w-full max-w-lg shrink-0 flex-col justify-center gap-2.5 landscape:h-full">
            {currentExercise.isPaired && (
              <div className="flex items-center justify-between px-1 text-xs font-semibold">
                <span className={sideColorText}>
                  {isPairedSecondStep
                    ? 'Подход 2/2 · Правая сторона'
                    : 'Подход 1/2 · Левая сторона'}
                </span>
                {isPairedSecondStep && pairedLeftValue !== null && (
                  <span className="font-mono-num text-gray-500 dark:text-gray-400">
                    Левая: {pairedLeftValue}
                  </span>
                )}
              </div>
            )}

            {/* RIR Selector (chosen before tapping the number) */}
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                Запас сил (RIR)
              </span>
              <div className="grid flex-1 grid-cols-3 gap-1.5 rounded-xl bg-gray-100 p-1 dark:bg-[#131A26]">
                {(['2+', '1', '0'] as RirValue[]).map((val) => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setRir(val)}
                    className={`tap-scale font-mono-num min-h-[40px] rounded-lg text-sm font-bold transition-colors ${
                      rir === val
                        ? 'bg-white text-[#111827] shadow-sm dark:bg-[#2C3A52] dark:text-white'
                        : 'text-gray-600 hover:text-[#111827] dark:text-gray-400 dark:hover:text-white'
                    }`}
                  >
                    {val}
                  </button>
                ))}
              </div>
            </div>

            {/* Three equal-height columns: [−] [number = save] [+] */}
            <div className="grid h-28 grid-cols-[1fr_1.6fr_1fr] gap-2 landscape:h-[clamp(5.5rem,30dvh,8.5rem)]">
              <button
                type="button"
                onClick={() => handleStepReps(-1)}
                className={stepColClass}
                aria-label="Уменьшить"
              >
                <Minus className="h-8 w-8" />
              </button>

              <button
                type="button"
                onClick={handleTapRepNumber}
                aria-label={`Сохранить ${repsValue}`}
                className={`touch-manipulation flex h-full items-center justify-center rounded-2xl border-2 transition-colors ${
                  repSaveFlash
                    ? 'border-[#16A34A] bg-[#DCFCE7] dark:border-[#4ADE80] dark:bg-[#052E16]'
                    : 'border-gray-300 bg-white active:bg-gray-50 dark:border-[#334155] dark:bg-[#1A2333] dark:active:bg-[#243044]'
                }`}
              >
                <span
                  className={`font-mono-num text-[4.75rem] font-bold leading-none landscape:text-[clamp(3.5rem,20dvh,5.5rem)] ${
                    repSaveFlash ? 'text-[#16A34A] dark:text-[#4ADE80]' : sideColorText
                  }`}
                >
                  {repsValue}
                </span>
              </button>

              <button
                type="button"
                onClick={() => handleStepReps(1)}
                className={stepColClass}
                aria-label="Увеличить"
              >
                <Plus className="h-8 w-8" />
              </button>
            </div>

            <p className="text-center text-xs font-semibold text-gray-500 dark:text-gray-400">
              {repSaveFlash
                ? 'Записано'
                : currentExercise.isPaired
                  ? `Тап по числу — сохранить ${isPairedSecondStep ? 'правую' : 'левую'} сторону`
                  : 'Тап по числу — сохранить подход'}
            </p>
          </div>
        )}
      </main>

      {/* Antagonist Swap Sheet */}
      {showAntagonistSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center dark:bg-black/70">
          <div className="w-full max-w-lg rounded-t-3xl bg-white p-5 sm:rounded-3xl dark:border dark:border-[#232E42] dark:bg-[#131A26]">
            <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-gray-300 sm:hidden dark:bg-[#334155]" />
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-[#1E293B]">
              <div>
                <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                  Подмена на антагонист
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Для «{currentExercise.name}» по пересечению тегов мышц
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowAntagonistSheet(false)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-[#1E293B]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 max-h-80 space-y-2 overflow-y-auto">
              {antagonistMatches.length === 0 ? (
                <p className="py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Совпадений по антагонистам в каталоге пока нет.
                </p>
              ) : (
                antagonistMatches.map((match) => (
                  <button
                    key={match.id}
                    type="button"
                    onClick={() => handleSwapAntagonist(match)}
                    className="tap-scale flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-left hover:border-[#DC2626] dark:border-[#232E42] dark:bg-[#1A2333] dark:hover:border-[#EF4444]"
                  >
                    <ExerciseSvg
                      svgKey={match.svgKey}
                      className="h-14 w-20 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm font-bold leading-snug text-[#111827] dark:text-[#F3F4F6]">
                        {match.name}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-gray-500 dark:text-gray-400">
                        {match.target_muscles.map(getMuscleLabel).join(' · ')}
                      </p>
                    </div>
                    <span className="font-mono-num shrink-0 text-xs font-bold text-[#DC2626] dark:text-[#F87171]">
                      Заменить
                    </span>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {showExitConfirm && (
        <ExitConfirmModal
          onCancel={() => setShowExitConfirm(false)}
          onConfirm={onExitSession}
        />
      )}
    </div>
  );
};

const ExitConfirmModal: React.FC<{
  onCancel: () => void;
  onConfirm: () => void;
}> = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm dark:bg-black/70">
    <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-xl dark:border dark:border-[#232E42] dark:bg-[#131A26]">
      <h3 className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">
        Поставить на паузу и выйти?
      </h3>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
        Прогресс текущей тренировки сохранён локально — вы сможете продолжить с
        того же места.
      </p>
      <div className="mt-5 grid grid-cols-2 gap-2.5">
        <button
          type="button"
          onClick={onCancel}
          className="tap-scale min-h-[46px] rounded-xl border border-gray-300 bg-white text-sm font-semibold text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
        >
          Остаться
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="tap-scale min-h-[46px] rounded-xl bg-[#111827] text-sm font-semibold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]"
        >
          Свернуть
        </button>
      </div>
    </div>
  </div>
);
