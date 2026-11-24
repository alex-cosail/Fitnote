import React from 'react';
import { getWarmupPlan } from '../../../data/seed';
import { formatClock } from '../../../domain/format';
import { Exercise } from '../../../types';
import { soundEngine } from '../../../utils/audio';
import { ExerciseSvg } from '../../ExerciseSvg';
import { ExitConfirmModal } from '../ExitConfirmModal';
import { usePlayer } from '../PlayerContext';

export const WarmupPhase: React.FC = () => {
  const {
    exercises,
    isMuted,
    onExitSession,
    onUpdateSession,
    renderTopBar,
    session,
    setShowExitConfirm,
    showExitConfirm,
    togglePauseTimer,
    warmupTapTimeoutRef,
  } = usePlayer();

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
};
