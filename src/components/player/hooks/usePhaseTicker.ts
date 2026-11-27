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
        } else if (session.phase === 'warmup') {
          const steps = session.warmupSteps ?? getWarmupPlan(session.warmupMinutes).steps;
          const delta = Math.max(0, session.phaseRemainingSec - remaining);
          const startIndex = session.warmupStepIndex ?? 0;
          const { stepIndex, stepRemainingSec, crossed } = advanceWarmupSteps(
            startIndex,
            session.warmupStepRemainingSec ?? steps[startIndex]?.durationSeconds ?? 0,
            delta,
            steps
          );
          for (let i = 0; i < crossed; i += 1) soundEngine.playTick(isMuted);
          // Side / direction change inside a step (v3.15): a soft double signal.
          const st = steps[startIndex];
          if (stepIndex === startIndex && st?.splitCueAt && st.durationSeconds) {
            const before = st.durationSeconds - (session.warmupStepRemainingSec ?? st.durationSeconds);
            const after = st.durationSeconds - stepRemainingSec;
            if (before < st.splitCueAt && after >= st.splitCueAt) {
              soundEngine.playTick(isMuted);
              window.setTimeout(() => soundEngine.playTick(isMuted), 180);
              if (!isMuted) navigator.vibrate?.([60, 80, 60]);
            }
          }
          onUpdateSession({
            ...session,
            phaseRemainingSec: remaining,
            warmupStepIndex: stepIndex,
            warmupStepRemainingSec: stepRemainingSec,
          });
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
