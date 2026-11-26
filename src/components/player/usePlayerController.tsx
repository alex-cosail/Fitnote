import { useEffect, useRef, useState } from 'react';
import { CATALOG } from '../../data/catalog';
import { findAntagonistMatches } from '../../domain/catalog/antagonists';
import type { Conditions } from '../../domain/catalog/filter';
import { changeOptions, sessionSwaps } from '../../domain/session/change';
import { blockedByCare, CareLevel, CareReason, JOINT_NAMES } from '../../domain/care/care';
import { Joint, mainJoints } from '../../domain/catalog/joints';
import { ladderNeighbour } from '../../domain/catalog/ladder';
import { ladderPosition } from '../../domain/generator';
import { applyCareToSession } from '../../domain/session/careSession';
import {
  addRestSeconds,
  buildWorkoutLog,
  completedRounds,
  completeSet as completeSetTransition,
  getNextPosition,
  plusRound,
  startCooldown,
  swapCurrentExercise,
  timerZero,
  togglePause,
} from '../../domain/session/transitions';
import { ActiveSession, Exercise, RirValue, WorkoutLog } from '../../types';
import {
  androidCalendarIntentUrl,
  buildIcsEvent,
  googleCalendarUrl,
  isAndroid,
  nextReminderDate,
  REMINDER_ALARM_MINUTES,
  ReminderPrefs,
  roundedTimeOfDay,
} from '../../domain/reminder/ics';
import { soundEngine } from '../../utils/audio';
import { shareOrDownloadCalendar } from '../../utils/download';
import { ExerciseVisual } from './ExerciseVisual';
import { useHoldTimer } from './hooks/useHoldTimer';
import { usePhaseTicker } from './hooks/usePhaseTicker';
import { PlayerTopBar } from './PlayerTopBar';

export interface WorkoutPlayerProps {
  session: ActiveSession;
  exercises: Exercise[];
  isMuted: boolean;
  onToggleMute: () => void;
  onUpdateSession: (next: ActiveSession) => void;
  onCompleteSession: (log: WorkoutLog) => void;
  onExitSession: () => void;
  reminderPrefs?: ReminderPrefs;
  onReminderPrefsChange?: (prefs: ReminderPrefs) => void;
  /** For «Изменить»: what is available here (v3.8). */
  conditions?: Conditions;
  notes?: Record<string, string>;
  onNote?: (exerciseId: string, text: string) => void;
  /** «Пауза: болит» (v3.9): the places go to «Я → Берегу». */
  onCare?: (joints: Joint[], level: CareLevel, reason: CareReason) => void;
}

/**
 * All player state, timers and handlers. Phase components read the result
 * through PlayerContext; WorkoutPlayer only picks the phase to show.
 */
export function usePlayerController({
  session,
  exercises,
  isMuted,
  onToggleMute,
  onUpdateSession,
  onCompleteSession,
  onExitSession,
  reminderPrefs,
  onReminderPrefsChange,
  conditions,
  notes,
  onNote,
  onCare,
}: WorkoutPlayerProps) {
  const currentItem = session.items[session.currentItemIndex];
  const currentExercise =
    exercises.find((e) => e.id === currentItem?.exerciseId) ?? exercises[0];

  const [rir, setRir] = useState<RirValue>('1');
  const [showAntagonistSheet, setShowAntagonistSheet] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [finishNote, setFinishNote] = useState('');
  // Changes made during the workout: keep them in the plan or only today.
  const [keepSwaps, setKeepSwaps] = useState(false);
  // «Пауза: болит» and the confirmation for a protected exercise (v3.9).
  const [showPause, setShowPause] = useState(false);
  const [careConfirm, setCareConfirm] = useState<{ ex: Exercise; jointAcc: string } | null>(null);
  const [careNotice, setCareNotice] = useState('');
  // «Как зашло?» — calibration for the next workouts (GENERATOR_RULES §9.1).
  const [finishOutcome, setFinishOutcome] = useState<'easy' | 'ok' | 'hard' | undefined>(undefined);
  // "When is the next workout?" — defaults to the last answer.
  const [reminderDays, setReminderDays] = useState<ReminderPrefs['daysAhead']>(
    reminderPrefs?.daysAhead ?? 0
  );
  const [reminderTime, setReminderTime] = useState<string>(
    () => reminderPrefs?.time ?? roundedTimeOfDay(new Date())
  );
  const [pairedLeftValue, setPairedLeftValue] = useState<number | null>(null);
  // Brief "saved" highlight after a tap on the rep number, then move on.
  const [repSaveFlash, setRepSaveFlash] = useState(false);
  const repSaveTimeoutRef = useRef<number | null>(null);

  // Target reached on a timed hold: side 1 of a paired hold -> flip buffer;
  // otherwise the set is logged and the player moves on (via ref so the
  // timer always calls the latest render's handlers).
  const targetReachedRef = useRef<(value: number, side: 1 | 2) => void>(() => {});
  const {
    holdUi,
    repsValue,
    setRepsValue,
    startPrep,
    startFlip,
    getHeldSeconds,
    tapDigits,
    stepValue,
    stopHold,
    resetIdle,
  } = useHoldTimer({
    isMuted,
    initialValue: currentItem?.target ?? 10,
    getTarget: () => currentItem?.target,
    onTargetReached: (value, side) => targetReachedRef.current(value, side),
  });

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
      resetIdle(currentItem.target);
    }
  }, [
    session.phase,
    session.currentRound,
    session.currentItemIndex,
    currentItem?.exerciseId,
  ]);

  useEffect(() => {
    return () => {
      if (repSaveTimeoutRef.current !== null) {
        window.clearTimeout(repSaveTimeoutRef.current);
      }
    };
  }, []);

  targetReachedRef.current = (value, side) => {
    if (currentExercise.isPaired && side === 1) {
      soundEngine.playDone(isMuted);
      setPairedLeftValue(value);
      startFlip();
      return;
    }
    completeSet(value);
  };

  const handleTapHoldDigits = () => {
    if (currentExercise.metric !== 'seconds') return;
    tapDigits();
  };

  const handleStepReps = (delta: number) => stepValue(delta);

  const { lastTickSecondRef } = usePhaseTicker({
    session,
    isMuted,
    onUpdateSession,
    onTimerZero: () => handleTimerZero(),
  });
  const warmupTapTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (warmupTapTimeoutRef.current !== null) {
        window.clearTimeout(warmupTapTimeoutRef.current);
      }
    };
  }, []);

  // Transitions are pure functions in domain/session/transitions.ts; the
  // handlers below only add sounds and local UI state.
  const handleTimerZero = () => {
    soundEngine.playGo(isMuted);
    if (session.phase === 'cooldown') soundEngine.playFinish(isMuted);
    onUpdateSession(timerZero(session));
  };

  const togglePauseTimer = () => {
    onUpdateSession(togglePause(session, Date.now()));
  };

  const handleAddRestSeconds = (extraSec: number) => {
    onUpdateSession(addRestSeconds(session, extraSec, Date.now()));
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
    stopHold();
    soundEngine.playDone(isMuted);
    const swappedFromName = currentItem.swappedFromId
      ? exercises.find((e) => e.id === currentItem.swappedFromId)?.name
      : undefined;
    setPairedLeftValue(null);
    onUpdateSession(
      completeSetTransition(session, {
        exercise: currentExercise,
        value,
        pairedLeftValue,
        rir,
        swappedFromName,
        now: Date.now(),
      })
    );
  };

  const handleRoundFlowPlusRound = () => {
    soundEngine.unlock();
    soundEngine.playDone(isMuted);
    onUpdateSession(plusRound(session, exercises, Date.now()));
  };

  // Round-flow: tap on the round number = round done (brief highlight first).
  const handleTapRoundNumber = () => {
    if (repSaveTimeoutRef.current !== null) return;
    soundEngine.unlock();
    setRepSaveFlash(true);
    repSaveTimeoutRef.current = window.setTimeout(() => {
      repSaveTimeoutRef.current = null;
      setRepSaveFlash(false);
      handleRoundFlowPlusRound();
    }, 280);
  };

  const handleRoundFlowFinish = () => {
    soundEngine.unlock();
    soundEngine.playGo(isMuted);
    onUpdateSession(startCooldown(session, Date.now()));
  };

  const handleSwapAntagonist = (replacement: Exercise) => {
    setPairedLeftValue(null);
    onUpdateSession(
      swapCurrentExercise(session, currentExercise, replacement)
    );
    setShowAntagonistSheet(false);
  };

  const roundFlowCompleted = completedRounds(session.logs);

  const reminderEvent = () => {
    const now = new Date();
    const appUrl = `${window.location.origin}${window.location.pathname}#/workout`;
    return {
      uid: `fitnote-${now.getTime()}@fitnote`,
      title: 'Fitnote: следующая тренировка',
      description: `Открыть Fitnote: ${appUrl}`,
      url: appUrl,
      start: nextReminderDate(reminderDays, reminderTime, now),
      durationMinutes: 60,
      alarmMinutesBefore: REMINDER_ALARM_MINUTES,
      now,
    };
  };

  // Saves the workout; if a day is chosen, first hands a calendar event with a
  // one-hour alarm to the phone (still inside the tap, as sharing requires).
  const handleSaveFinish = async () => {
    const swaps = sessionSwaps(session.items);
    const log = {
      ...buildWorkoutLog(session, finishNote, Date.now()),
      ...(finishOutcome ? { outcome: finishOutcome } : {}),
      ...(swaps.length ? { swaps, swapsKept: keepSwaps } : {}),
    };
    onReminderPrefsChange?.({ daysAhead: reminderDays, time: reminderTime });
    if (reminderDays > 0 && isAndroid(navigator.userAgent)) {
      // Android: open the calendar on a pre-filled "New event" screen.
      const ev = reminderEvent();
      window.location.href = androidCalendarIntentUrl(ev, googleCalendarUrl(ev));
    } else if (reminderDays > 0) {
      const ev = reminderEvent();
      const name = `fitnote-${ev.start.toISOString().slice(0, 10)}.ics`;
      try {
        await shareOrDownloadCalendar(name, buildIcsEvent(ev));
      } catch {
        // Share sheet closed or refused: the workout is saved anyway.
      }
    }
    onCompleteSession(log);
  };

  const antagonistMatches = findAntagonistMatches(currentExercise, exercises);
  // Options ignore «Берегу» so a protected exercise can still be chosen —
  // with a question (customer, 27.11).
  const condNoCare: Conditions = { ...(conditions ?? {}), care: undefined };
  const changeOpts = changeOptions(currentExercise.id, CATALOG, exercises, condNoCare);
  const protectedIds = new Set(
    CATALOG.filter((c) => blockedByCare(c, conditions?.care)).map((c) => c.id)
  );
  const currentLadder = ladderPosition(currentExercise.id, CATALOG, condNoCare);

  const pickExercise = (ex: Exercise) => {
    const cat = CATALOG.find((c) => c.id === ex.id);
    const rule = cat ? blockedByCare(cat, conditions?.care) : undefined;
    if (rule) {
      setCareConfirm({ ex, jointAcc: JOINT_NAMES[rule.joint].acc });
      return;
    }
    handleSwapAntagonist(ex);
  };
  const handleLadderStep = (dir: 1 | -1) => {
    const n = ladderNeighbour(CATALOG, currentExercise.id, dir, condNoCare);
    const ex = n && exercises.find((e) => e.id === n.id);
    if (ex) pickExercise(ex);
  };
  const handleLadderJump = (rank: number) => {
    let id = currentExercise.id;
    for (let i = 0; i < 6; i++) {
      const cur = CATALOG.find((c) => c.id === id);
      if (!cur || cur.rank === rank) break;
      const n = ladderNeighbour(CATALOG, id, rank < cur.rank ? -1 : 1, condNoCare);
      if (!n) break;
      id = n.id;
    }
    const ex = exercises.find((e) => e.id === id);
    if (ex && ex.id !== currentExercise.id) pickExercise(ex);
  };
  const handlePainPause = (joints: Joint[], level: CareLevel, reason: CareReason) => {
    onCare?.(joints, level, reason);
    const rules = [...(conditions?.care ?? []), ...joints.map((joint) => ({ joint, level }))];
    const r = applyCareToSession(session, rules, { catalog: CATALOG, exercises, conditions: condNoCare }, Date.now(), [currentExercise.id]);
    setPairedLeftValue(null);
    onUpdateSession(r.session);
    setShowPause(false);
    const place = joints.map((j) => JOINT_NAMES[j].acc).join(', ');
    const parts = [r.replaced.length ? `заменено ${r.replaced.length}` : '', r.dropped.length ? `убрано ${r.dropped.length}` : ''].filter(Boolean);
    setCareNotice(`Бережём ${place}${parts.length ? ': ' + parts.join(', ') : ''}`);
    window.setTimeout(() => setCareNotice(''), 5000);
  };
  const pauseSuggested = (() => {
    const cat = CATALOG.find((c) => c.id === currentExercise.id);
    return cat ? mainJoints(cat) : [];
  })();
  const todaySwaps = sessionSwaps(session.items);
  const nextPos = getNextPosition(session);
  const nextItem = session.items[nextPos.nextItemIndex];
  const nextExercise =
    exercises.find((e) => e.id === nextItem?.exerciseId) ?? currentExercise;

  // Progress ring: share of the current round's exercises reached
  // (during rest `currentItemIndex` still points at the finished exercise);
  // in round-flow mode, rounds done out of the goal.
  const ringProgress = session.isRoundFlow
    ? roundFlowCompleted / Math.max(1, session.totalRounds)
    : (session.currentItemIndex + 1) / Math.max(1, session.items.length);
  // Always the round in progress (field report: a lower "done" count demotivates).
  const ringRound = session.currentRound;

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

  // Render helpers kept with the same call signature the phases use.
  const renderExerciseVisual = (
    ex: Exercise,
    label?: string,
    tone: 'default' | 'rest' = 'default'
  ) => (
    <ExerciseVisual
      exercise={ex}
      label={label}
      tone={tone}
      note={notes?.[ex.id]}
      onNote={onNote && tone === 'default' ? (text) => onNote(ex.id, text) : undefined}
      {...(tone === 'default' && ex.id === currentExercise.id && session.phase === 'exercise'
        ? {
            ladder: currentLadder,
            onStep: handleLadderStep,
            onJump: handleLadderJump,
            onPause: () => setShowPause(true),
            onSwap: () => setShowAntagonistSheet(true),
          }
        : {})}
    />
  );

  const renderTopBar = (
    centerLabel: string,
    showAntagonist = false,
    showRing = false,
    tone: 'default' | 'rest' = 'default'
  ) => (
    <PlayerTopBar
      centerLabel={centerLabel}
      workoutTitle={session.workoutTitle}
      isMuted={isMuted}
      onExit={() => setShowExitConfirm(true)}
      onToggleMute={onToggleMute}
      onAntagonist={showAntagonist ? () => setShowAntagonistSheet(true) : undefined}
      ring={
        showRing
          ? { progress: ringProgress, round: ringRound, totalRounds: session.totalRounds }
          : undefined
      }
      tone={tone}
    />
  );

  return {
    antagonistMatches,
    changeOpts,
    protectedIds,
    pickExercise,
    showPause,
    setShowPause,
    pauseSuggested,
    handlePainPause,
    careConfirm,
    setCareConfirm,
    careNotice,
    todaySwaps,
    keepSwaps,
    setKeepSwaps,
    currentExercise,
    currentItem,
    exercises,
    finishNote,
    finishOutcome,
    setFinishOutcome,
    reminderDays,
    setReminderDays,
    reminderTime,
    setReminderTime,
    reminderGoogleUrl: () => googleCalendarUrl(reminderEvent()),
    reminderOnAndroid: typeof navigator !== 'undefined' && isAndroid(navigator.userAgent),
    handleAddRestSeconds,
    handleCompleteSet,
    handleRoundFlowFinish,
    handleRoundFlowPlusRound,
    handleTapRoundNumber,
    handleSaveFinish,
    handleStepReps,
    handleSwapAntagonist,
    handleTapHoldDigits,
    handleTapRepNumber,
    handleTimerZero,
    holdUi,
    isMuted,
    lastTickSecondRef,
    nextExercise,
    nextPos,
    onExitSession,
    onUpdateSession,
    pairedLeftValue,
    renderExerciseVisual,
    renderTopBar,
    repSaveFlash,
    repsValue,
    rir,
    roundFlowCompleted,
    session,
    setFinishNote,
    setRir,
    setShowAntagonistSheet,
    setShowExitConfirm,
    showAntagonistSheet,
    showExitConfirm,
    togglePauseTimer,
    warmupTapTimeoutRef,
  };
}
