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

  // Unified hold stopwatch for seconds-based exercises (tap digits: 5s countdown -> start -> tap to stop)
  const [holdUi, setHoldUi] = useState<{
    mode: 'idle' | 'countdown' | 'running';
    startMs: number;
    countdown: number;
    elapsed: number;
    prevValue: number;
  }>({
    mode: 'idle',
    startMs: 0,
    countdown: 5,
    elapsed: 0,
    prevValue: currentItem?.target ?? 10,
  });
  const holdRef = useRef(holdUi);
  const setHold = (next: {
    mode: 'idle' | 'countdown' | 'running';
    startMs: number;
    countdown: number;
    elapsed: number;
    prevValue: number;
  }) => {
    holdRef.current = next;
    setHoldUi(next);
  };

  // Sync stepper default when moving to a new exercise
  useEffect(() => {
    if (currentItem) {
      setRepsValue(currentItem.target);
      setRir('1');
      setPairedLeftValue(null);
      setHold({
        mode: 'idle',
        startMs: 0,
        countdown: 5,
        elapsed: 0,
        prevValue: currentItem.target,
      });
    }
  }, [session.currentRound, session.currentItemIndex, currentItem?.exerciseId]);

  // Accurate timestamp-based timer loop (5s countdown -> count-up stopwatch)
  useEffect(() => {
    if (holdUi.mode === 'idle') return;
    const id = window.setInterval(() => {
      const curr = holdRef.current;
      if (curr.mode === 'idle') return;
      const now = Date.now();

      if (curr.mode === 'countdown') {
        const rem = Math.max(0, 5 - Math.floor((now - curr.startMs) / 1000));
        if (rem === curr.countdown) return;

        if (rem > 0) {
          soundEngine.playTick(isMuted);
          setHold({ ...curr, countdown: rem });
          return;
        }

        soundEngine.playGo(isMuted);
        setRepsValue(0);
        setHold({
          ...curr,
          mode: 'running',
          startMs: now,
          countdown: 0,
          elapsed: 0,
        });
        return;
      }

      if (curr.mode === 'running') {
        const nextElapsed = Math.floor((now - curr.startMs) / 1000);
        if (nextElapsed === curr.elapsed) return;

        setRepsValue(nextElapsed);
        if (currentItem && nextElapsed === currentItem.target) {
          soundEngine.playGo(isMuted);
        }
        setHold({ ...curr, elapsed: nextElapsed });
      }
    }, 150);
    return () => window.clearInterval(id);
  }, [holdUi.mode, currentItem, isMuted]);

  const handleTapHoldDigits = () => {
    if (currentExercise.metric !== 'seconds') return;
    soundEngine.unlock();

    if (holdRef.current.mode === 'countdown') {
      setRepsValue(holdRef.current.prevValue);
      setHold({
        mode: 'idle',
        startMs: 0,
        countdown: 5,
        elapsed: 0,
        prevValue: holdRef.current.prevValue,
      });
      return;
    }

    if (holdRef.current.mode === 'running') {
      const finalSec = holdRef.current.elapsed;
      setRepsValue(finalSec);
      setHold({
        mode: 'idle',
        startMs: 0,
        countdown: 5,
        elapsed: 0,
        prevValue: finalSec,
      });
      return;
    }

    soundEngine.playTick(isMuted);
    setHold({
      mode: 'countdown',
      startMs: Date.now(),
      countdown: 5,
      elapsed: 0,
      prevValue: repsValue,
    });
  };

  const handleStepReps = (delta: number) => {
    if (holdRef.current.mode !== 'idle') {
      setHold({
        mode: 'idle',
        startMs: 0,
        countdown: 5,
        elapsed: 0,
        prevValue: repsValue,
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
      if (nextPos.isNewRound) {
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

  const handleCompleteSet = () => {
    soundEngine.unlock();
    setHold({
      mode: 'idle',
      startMs: 0,
      countdown: 5,
      elapsed: 0,
      prevValue: currentItem.target,
    });

    // Paired unilateral exercise: Step 1 (Left, red) -> Step 2 (Right, green)
    if (currentExercise.isPaired && pairedLeftValue === null) {
      soundEngine.playTick(isMuted);
      setPairedLeftValue(repsValue);
      if (currentExercise.metric === 'seconds') {
        setRepsValue(currentItem.target);
      }
      return;
    }

    soundEngine.playDone(isMuted);

    const swappedFrom = currentItem.swappedFromId
      ? exercises.find((e) => e.id === currentItem.swappedFromId)?.name
      : undefined;

    const leftVal =
      currentExercise.isPaired && pairedLeftValue !== null
        ? pairedLeftValue
        : undefined;
    const rightVal =
      currentExercise.isPaired && pairedLeftValue !== null
        ? repsValue
        : undefined;
    const finalActual =
      leftVal !== undefined && rightVal !== undefined
        ? Math.min(leftVal, rightVal)
        : repsValue;

    setPairedLeftValue(null);

    const newLog: SetLog = {
      round: session.currentRound,
      exerciseId: currentExercise.id,
      exerciseName: currentExercise.name,
      swappedFromName: swappedFrom,
      metric: currentExercise.metric,
      target: currentItem.target,
      actual: finalActual,
      leftActual: leftVal,
      rightActual: rightVal,
      rir,
      completedAt: new Date().toISOString(),
    };

    const nextLogs = [...session.logs, newLog];
    const nextPos = getNextPosition();

    if (nextPos.isWorkoutEnd) {
      const cdSec = session.cooldownMinutes * 60;
      onUpdateSession({
        ...session,
        logs: nextLogs,
        phase: 'cooldown',
        preCountdownSec: 5,
        phaseRemainingSec: cdSec,
        phaseEndTimestamp: Date.now() + 5000,
        isPaused: false,
      });
      return;
    }

    const restSec = nextPos.isNewRound
      ? session.restBetweenRounds
      : session.restBetweenExercises;

    if (restSec <= 0) {
      onUpdateSession({
        ...session,
        logs: nextLogs,
        currentRound: nextPos.nextRound,
        currentItemIndex: nextPos.nextItemIndex,
        phase: nextPos.isNewRound ? 'round_banner' : 'exercise',
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
      roundsCompleted: session.totalRounds,
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

  // Shared top bar inside player
  const renderTopBar = (centerLabel: string, showAntagonist = false) => (
    <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 landscape:h-11 lg:landscape:h-14 dark:border-[#1E293B] dark:bg-[#0F1520]">
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
            isMuted
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

  // PHASE: REST TIMER (Same 2-part layout as Active Exercise: SVG+Title & Timer+Buttons)
  if (session.phase === 'rest') {
    const isUrgent =
      session.phaseRemainingSec > 0 && session.phaseRemainingSec <= 3;

    return (
      <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-white dark:bg-[#0B0F17]">
        {renderTopBar(`ОТДЫХ · R${nextPos.nextRound}/${session.totalRounds}`)}

        <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col justify-between overflow-hidden px-4 pt-2 pb-safe sm:px-5 landscape:grid landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] landscape:items-center landscape:gap-4 landscape:py-2">
          {/* Top (Portrait) / Left (Landscape): Clear Next Exercise Diagram + Title */}
          <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center text-center">
            <p className="mb-1.5 text-xs font-bold uppercase tracking-wider text-[#DC2626] dark:text-[#F87171]">
              Далее · Круг {nextPos.nextRound}/{session.totalRounds}
            </p>

            <div className="flex w-full max-w-[15rem] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50/70 p-2.5 sm:max-w-xs sm:p-3.5 landscape:max-w-[13rem] landscape:p-2 lg:landscape:max-w-sm lg:landscape:p-4 dark:border-[#232E42] dark:bg-[#131A26]">
              <ExerciseSvg
                svgKey={nextExercise.svgKey}
                className="h-[clamp(5rem,20dvh,9rem)] w-auto max-w-full landscape:h-[clamp(4.75rem,27dvh,9rem)]"
              />
            </div>

            <div className="mt-2 w-full landscape:mt-1.5">
              <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
                {nextExercise.target_muscles.map(getMuscleLabel).join(' · ')}
                {nextExercise.isPaired ? ' · парное' : ''}
              </p>

              <h2 className="font-display mt-0.5 break-words text-[clamp(1.35rem,3.6dvh,2.15rem)] font-bold leading-tight tracking-tight text-[#111827] landscape:text-[clamp(1.2rem,5.2dvh,2rem)] dark:text-[#F3F4F6]">
                {nextExercise.name}
              </h2>
              <p className="mx-auto mt-0.5 line-clamp-2 max-w-md text-xs leading-snug text-gray-600 landscape:text-[11px] lg:landscape:text-sm dark:text-gray-300">
                {nextExercise.cue}
              </p>
            </div>
          </div>

          {/* Bottom Thumb Zone (Portrait) / Right (Landscape): Countdown Timer + [+15 сек] & [Пропустить] */}
          <div className="mx-auto flex w-full max-w-md shrink-0 flex-col justify-between gap-3 pt-2 landscape:h-full landscape:justify-center landscape:gap-4 landscape:pt-0">
            <button
              type="button"
              onClick={togglePauseTimer}
              className={`touch-manipulation flex flex-col items-center justify-center rounded-3xl border px-4 py-4 text-center transition-colors landscape:py-5 ${
                session.isPaused || isUrgent
                  ? 'border-[#DC2626]/30 bg-[#FEF2F2]/70 dark:border-[#EF4444]/40 dark:bg-[#450A0A]/45'
                  : 'border-gray-200 bg-gray-50/80 active:bg-gray-100 dark:border-[#232E42] dark:bg-[#131A26] dark:active:bg-[#1A2333]'
              }`}
            >
              <span
                className={`text-xs font-bold uppercase tracking-widest ${
                  session.isPaused || isUrgent
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                {session.isPaused ? 'ПАУЗА ОТДЫХА' : 'ОТДЫХ'}
              </span>
              <div
                className={`font-mono-num mt-1 text-[4.5rem] font-bold leading-none tracking-tight sm:text-[5.5rem] landscape:text-[clamp(3.25rem,16dvh,5rem)] ${
                  session.isPaused || isUrgent
                    ? 'text-[#DC2626] dark:text-[#F87171]'
                    : 'text-[#111827] dark:text-[#F3F4F6]'
                }`}
              >
                {formatClock(session.phaseRemainingSec)}
              </div>
              <span className="mt-1.5 text-[11px] font-medium text-gray-400 dark:text-gray-500">
                Тап — пауза / продолжить
              </span>
            </button>

            <div className="grid w-full grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleAddRestSeconds(15)}
                className="tap-scale flex min-h-[52px] items-center justify-center rounded-2xl border border-gray-300 bg-white text-base font-bold text-[#111827] shadow-sm active:bg-gray-100 landscape:min-h-[48px] lg:landscape:min-h-[56px] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#243044]"
              >
                +15 сек
              </button>
              <button
                type="button"
                onClick={() => {
                  lastTickSecondRef.current = null;
                  handleTimerZero();
                }}
                className="tap-scale flex min-h-[52px] items-center justify-center gap-1.5 rounded-2xl bg-[#111827] text-base font-bold text-white shadow-sm active:bg-black landscape:min-h-[48px] lg:landscape:min-h-[56px] dark:bg-[#F3F4F6] dark:text-[#0B0F17] dark:active:bg-white"
              >
                Пропустить
                <FastForward className="h-4 w-4" />
              </button>
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

  // PHASE: ACTIVE EXERCISE
  const isPairedSecondStep =
    Boolean(currentExercise.isPaired) && pairedLeftValue !== null;

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col overflow-hidden bg-white dark:bg-[#0B0F17]">
      {renderTopBar(
        `Round ${session.currentRound} / ${session.totalRounds} · ${
          session.currentItemIndex + 1
        }/${session.items.length}`,
        true
      )}

      <main className="mx-auto flex min-h-0 w-full max-w-4xl flex-1 flex-col justify-between overflow-hidden px-4 pt-2 pb-safe sm:px-5 landscape:grid landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] landscape:items-center landscape:gap-4 landscape:py-2">
        {/* Top (Portrait) / Left (Landscape): SVG Cue + Title + Technique + Hold Stopwatch */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-center text-center">
          <div className="flex w-full max-w-[15rem] items-center justify-center rounded-2xl border border-gray-200 bg-gray-50/70 p-2.5 sm:max-w-xs sm:p-3.5 landscape:max-w-[13rem] landscape:p-2 lg:landscape:max-w-sm lg:landscape:p-4 dark:border-[#232E42] dark:bg-[#131A26]">
            <ExerciseSvg
              svgKey={currentExercise.svgKey}
              className="h-[clamp(5rem,20dvh,9rem)] w-auto max-w-full landscape:h-[clamp(4.75rem,27dvh,9rem)]"
            />
          </div>

          <div className="mt-2 w-full landscape:mt-1.5">
            <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
              {currentExercise.target_muscles.map(getMuscleLabel).join(' · ')}
              {currentExercise.isPaired ? ' · парное' : ''}
            </p>

            <h2 className="font-display mt-0.5 break-words text-[clamp(1.35rem,3.6dvh,2.15rem)] font-bold leading-tight tracking-tight text-[#111827] landscape:text-[clamp(1.2rem,5.2dvh,2rem)] dark:text-[#F3F4F6]">
              {currentExercise.name}
            </h2>
            <p className="mx-auto mt-0.5 line-clamp-2 max-w-md text-xs leading-snug text-gray-600 landscape:text-[11px] lg:landscape:text-sm dark:text-gray-300">
              {currentExercise.cue}
            </p>
          </div>
        </div>

        {/* Bottom Thumb Zone (Portrait) / Right (Landscape): Stepper + RIR + Save CTA */}
        <div className="mx-auto w-full max-w-md shrink-0 space-y-2 pt-2 landscape:space-y-2 landscape:pt-0">
          {currentExercise.isPaired && (
            <div className="flex items-center justify-between px-1 text-xs font-semibold">
              <span
                className={
                  isPairedSecondStep
                    ? 'text-[#16A34A] dark:text-[#4ADE80]'
                    : 'text-[#DC2626] dark:text-[#F87171]'
                }
              >
                {isPairedSecondStep
                  ? 'Подход 2/2 · Правая сторона'
                  : 'Подход 1/2 · Левая сторона'}
              </span>
              {isPairedSecondStep && pairedLeftValue !== null && (
                <span className="font-mono-num text-gray-500 dark:text-gray-400">
                  Левая:{' '}
                  {currentExercise.metric === 'seconds'
                    ? formatClock(pairedLeftValue)
                    : pairedLeftValue}
                </span>
              )}
            </div>
          )}

          {/* Large Rep / Seconds Stepper (for seconds: tap digits for 5s countdown -> start -> tap to stop) */}
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-1.5 sm:p-2 dark:border-[#232E42] dark:bg-[#131A26]">
            <button
              type="button"
              onClick={() => handleStepReps(-1)}
              className="tap-scale flex h-12 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#111827] shadow-sm active:bg-gray-100 sm:h-14 sm:w-16 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#243044]"
              aria-label="Уменьшить"
            >
              <Minus className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>

            <div className="flex flex-1 items-center justify-center text-center">
              {currentExercise.metric === 'seconds' ? (
                <button
                  type="button"
                  onClick={handleTapHoldDigits}
                  aria-label={
                    holdUi.mode !== 'idle'
                      ? `Остановить таймер ${currentExercise.name}`
                      : `Запустить таймер ${currentExercise.name}`
                  }
                  className={`tap-scale font-mono-num flex min-h-[48px] items-center justify-center rounded-xl px-4 text-3xl font-bold leading-none transition-colors sm:min-h-[56px] sm:text-4xl ${
                    holdUi.mode === 'countdown'
                      ? 'bg-white text-[#DC2626] ring-2 ring-[#DC2626]/30 dark:bg-[#1E293B] dark:text-[#F87171] dark:ring-[#F87171]/40'
                      : holdUi.mode === 'running'
                        ? holdUi.elapsed >= currentItem.target
                          ? 'bg-white text-[#16A34A] ring-2 ring-[#16A34A]/30 dark:bg-[#1E293B] dark:text-[#4ADE80] dark:ring-[#4ADE80]/40'
                          : 'bg-white text-[#DC2626] ring-2 ring-[#DC2626]/30 dark:bg-[#1E293B] dark:text-[#F87171] dark:ring-[#F87171]/40'
                        : 'text-[#111827] hover:bg-white active:bg-white dark:text-[#F3F4F6] dark:hover:bg-[#1E293B] dark:active:bg-[#1E293B]'
                  }`}
                >
                  {holdUi.mode === 'countdown'
                    ? formatClock(holdUi.countdown)
                    : holdUi.mode === 'running'
                      ? formatClock(holdUi.elapsed)
                      : formatClock(repsValue)}
                </button>
              ) : (
                <div className="font-mono-num text-3xl font-bold leading-none text-[#111827] sm:text-4xl dark:text-[#F3F4F6]">
                  {repsValue}
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleStepReps(1)}
              className="tap-scale flex h-12 w-14 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#111827] shadow-sm active:bg-gray-100 sm:h-14 sm:w-16 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#243044]"
              aria-label="Увеличить"
            >
              <Plus className="h-5 w-5 sm:h-6 sm:w-6" />
            </button>
          </div>

          {/* RIR Selector */}
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
                  className={`tap-scale font-mono-num min-h-[38px] rounded-lg text-sm font-bold transition-colors sm:min-h-[42px] ${
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

          {/* Primary Save CTA (Blue for single; Red for Left side, Green for Right side on paired) */}
          <button
            type="button"
            onClick={handleCompleteSet}
            className={`tap-scale flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-base font-bold tracking-wide text-white shadow-sm transition-colors landscape:min-h-[48px] lg:landscape:min-h-[56px] lg:landscape:text-lg ${
              currentExercise.isPaired
                ? isPairedSecondStep
                  ? 'bg-[#16A34A] active:bg-[#15803D]'
                  : 'bg-[#DC2626] active:bg-[#B91C1C]'
                : 'bg-[#2563EB] hover:bg-[#1D4ED8] active:bg-[#1E40AF] dark:bg-[#2563EB] dark:hover:bg-[#3B82F6] dark:active:bg-[#1D4ED8]'
            }`}
          >
            <Check className="h-5 w-5" />
            {currentExercise.isPaired
              ? isPairedSecondStep
                ? 'Сохранить правую'
                : 'Сохранить левую'
              : 'ГОТОВО'}
          </button>
        </div>
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
