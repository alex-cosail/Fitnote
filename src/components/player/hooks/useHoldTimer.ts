import { useEffect, useRef, useState } from 'react';
import { soundEngine } from '../../../utils/audio';

// Autopilot for seconds-based exercises:
// 5s prep -> stopwatch counts up -> stops by itself at the target.
// Paired holds: side 1 -> 7s flip buffer -> side 2.
// Tap on the digits = pause / resume; double tap = reset to a fresh 5s prep.

export const HOLD_PREP_SEC = 5;
export const HOLD_FLIP_SEC = 7;

export type HoldMode = 'idle' | 'prep' | 'running' | 'flip' | 'paused';

export interface HoldState {
  mode: HoldMode;
  side: 1 | 2;
  anchorMs: number; // start of the current prep / flip / running stretch
  baseSec: number; // running: seconds held before anchorMs (after a pause)
  countdown: number; // prep / flip: whole seconds left (display)
  elapsed: number; // running: whole seconds held (display)
  pausedFrom?: 'prep' | 'running' | 'flip';
  pausedLeftMs?: number; // prep / flip: time left when paused
}

export const IDLE_HOLD: HoldState = {
  mode: 'idle',
  side: 1,
  anchorMs: 0,
  baseSec: 0,
  countdown: HOLD_PREP_SEC,
  elapsed: 0,
};

interface Options {
  isMuted: boolean;
  initialValue: number;
  // Current target in seconds (read on every tick).
  getTarget: () => number | undefined;
  // Called once when the stopwatch reaches the target on `side`.
  onTargetReached: (value: number, side: 1 | 2) => void;
}

/**
 * Hold stopwatch state plus the stepper value it shares with the reps UI
 * (`repsValue` is the seconds held for timed exercises).
 */
export function useHoldTimer({
  isMuted,
  initialValue,
  getTarget,
  onTargetReached,
}: Options) {
  const [repsValue, setRepsValue] = useState<number>(initialValue);
  const [holdUi, setHoldUi] = useState<HoldState>(IDLE_HOLD);
  const holdRef = useRef<HoldState>(holdUi);
  const setHold = (next: HoldState) => {
    holdRef.current = next;
    setHoldUi(next);
  };
  const repsRef = useRef(repsValue);
  repsRef.current = repsValue;
  const holdTapTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (holdTapTimeoutRef.current !== null) {
        window.clearTimeout(holdTapTimeoutRef.current);
      }
    };
  }, []);

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

  // Tick reads the latest render through a ref so that the auto-finish
  // always sees fresh session state.
  const tickRef = useRef<() => void>(() => {});
  tickRef.current = () => {
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
      setHold({ ...h, mode: 'running', anchorMs: now, baseSec: 0, countdown: 0, elapsed: 0 });
      return;
    }

    const target = getTarget();
    if (h.mode === 'running' && target !== undefined) {
      const elapsed = h.baseSec + Math.floor((now - h.anchorMs) / 1000);
      if (elapsed === h.elapsed) return;
      if (elapsed >= target) {
        setRepsValue(target);
        onTargetReached(target, h.side);
        return;
      }
      if (target - elapsed <= 3) soundEngine.playTick(isMuted);
      setRepsValue(elapsed);
      setHold({ ...h, elapsed });
    }
  };

  useEffect(() => {
    if (holdUi.mode !== 'prep' && holdUi.mode !== 'flip' && holdUi.mode !== 'running') {
      return;
    }
    const id = window.setInterval(() => tickRef.current(), 150);
    return () => window.clearInterval(id);
  }, [holdUi.mode]);

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
        const totalSec = h.pausedFrom === 'prep' ? HOLD_PREP_SEC : HOLD_FLIP_SEC;
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

  // Single tap (delayed 260 ms) = pause / resume; double tap = fresh 5s prep.
  const tapDigits = () => {
    soundEngine.unlock();
    if (holdTapTimeoutRef.current !== null) {
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

  const stepValue = (delta: number) => {
    const h = holdRef.current;
    if (h.mode === 'prep' || h.mode === 'flip' || h.mode === 'running') {
      pauseHold();
    }
    if (holdRef.current.mode === 'paused') {
      // A manual correction continues from the corrected value on resume.
      setHold({ ...holdRef.current, pausedFrom: 'running', pausedLeftMs: undefined });
    }
    setRepsValue((v) => Math.max(0, v + delta));
  };

  const stopHold = () => setHold(IDLE_HOLD);

  const resetIdle = (value: number) => {
    setRepsValue(value);
    setHold(IDLE_HOLD);
  };

  return {
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
  };
}
