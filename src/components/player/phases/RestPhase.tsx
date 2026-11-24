import React from 'react';
import { FastForward } from 'lucide-react';
import { formatClock } from '../../../domain/format';
import { ExitConfirmModal } from '../ExitConfirmModal';
import { usePlayer } from '../PlayerContext';

export const RestPhase: React.FC = () => {
  const {
    handleAddRestSeconds,
    handleRoundFlowFinish,
    handleTimerZero,
    lastTickSecondRef,
    nextExercise,
    nextPos,
    onExitSession,
    renderExerciseVisual,
    renderTopBar,
    session,
    setShowExitConfirm,
    showExitConfirm,
    togglePauseTimer,
  } = usePlayer();

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
};
