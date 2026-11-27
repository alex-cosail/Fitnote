import { useEffect, useRef } from 'react';
import { getWarmupPlan } from '../../../data/seed';
import { advanceWarmupSteps } from '../../../domain/session/transitions';
import { ActiveSession } from '../../../types';
import { soundEngine } from '../../../utils/audio';

interface Options {
  session: ActiveSession;
  isMuted: boolean;
  onUpdateSession: (next: ActiveSession) => void;
  onTimerZero: () => void;
}

/**
 * Timestamp-based ticker for warm-up / rest / cool-down (with the 5s
 * pre-countdown) and the 1.5s round banner. Returns the ref that remembers
 * the last 3-2-1 beep, so "Skip" can reset it.
 */
export function usePhaseTicker({
  session,
  isMuted,
  onUpdateSession,
  onTimerZero,
}: Options) {
  const lastTickSecondRef = useRef<number | null>(null);

  // Re-created every render on purpose: the tick always sees the latest
  // session and callbacks.
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
            onUpdateSession({ ...session, preCountdownSec: remaining });
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
          onTimerZero();
        } else if (session.phase === 'warmup' || (session.phase === 'cooldown' && session.cooldownSteps?.length)) {
          // Warm-up and cool-down flows (v3.15–v3.16): steps inside one timer.
          const isWarm = session.phase === 'warmup';
          const steps = isWarm ? session.warmupSteps ?? getWarmupPlan(session.warmupMinutes).steps : session.cooldownSteps!;
          const startIndex = (isWarm ? session.warmupStepIndex : session.cooldownStepIndex) ?? 0;
          const startRem = (isWarm ? session.warmupStepRemainingSec : session.cooldownStepRemainingSec) ?? steps[startIndex]?.durationSeconds ?? 0;
          const delta = Math.max(0, session.phaseRemainingSec - remaining);
          const { stepIndex, stepRemainingSec, crossed } = advanceWarmupSteps(startIndex, startRem, delta, steps);
          for (let i = 0; i < crossed; i += 1) soundEngine.playTick(isMuted);
          // Side / direction change inside a step: a soft double signal.
          const st = steps[startIndex];
          if (stepIndex === startIndex && st?.splitCueAt && st.durationSeconds) {
            const before = st.durationSeconds - startRem;
            const after = st.durationSeconds - stepRemainingSec;
            if (before < st.splitCueAt && after >= st.splitCueAt) {
              soundEngine.playTick(isMuted);
              window.setTimeout(() => soundEngine.playTick(isMuted), 180);
              if (!isMuted) navigator.vibrate?.([60, 80, 60]);
            }
          }
          onUpdateSession(
            isWarm
              ? { ...session, phaseRemainingSec: remaining, warmupStepIndex: stepIndex, warmupStepRemainingSec: stepRemainingSec }
              : { ...session, phaseRemainingSec: remaining, cooldownStepIndex: stepIndex, cooldownStepRemainingSec: stepRemainingSec }
          );
        } else {
          onUpdateSession({ ...session, phaseRemainingSec: remaining });
        }
      }
    };

    const intervalId = window.setInterval(tick, 200);
    return () => window.clearInterval(intervalId);
  });

  // 1.5s round transition banner auto-advance
  useEffect(() => {
    if (session.phase !== 'round_banner') return;
    soundEngine.playRound(isMuted);
    const timeoutId = window.setTimeout(() => {
      onUpdateSession({ ...session, phase: 'exercise' });
    }, 1500);
    return () => window.clearTimeout(timeoutId);
  }, [session.phase, session.currentRound]);

  return { lastTickSecondRef };
}
