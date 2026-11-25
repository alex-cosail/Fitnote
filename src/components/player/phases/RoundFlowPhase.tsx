import React from 'react';
import { formatMetricTarget } from '../../../domain/format';
import { ExerciseSvg } from '../../ExerciseSvg';
import { ExitConfirmModal } from '../ExitConfirmModal';
import { usePlayer } from '../PlayerContext';

export const RoundFlowPhase: React.FC = () => {
  const {
    exercises,
    handleRoundFlowFinish,
    handleTapRoundNumber,
    onExitSession,
    renderTopBar,
    repSaveFlash,
    roundFlowCompleted,
    session,
    setShowExitConfirm,
    showExitConfirm,
  } = usePlayer();

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

        {/* Bottom (Portrait) / Right (Landscape): current round — tap = round done */}
        <div className="flex min-h-0 flex-col gap-2.5 landscape:h-full">
          <button
            type="button"
            onClick={handleTapRoundNumber}
            aria-label={`Круг ${session.currentRound} выполнен`}
            className={`touch-manipulation flex h-44 w-full flex-col items-center justify-center rounded-3xl border-2 px-3 [container-type:size] transition-colors landscape:h-auto landscape:min-h-0 landscape:flex-1 ${
              repSaveFlash
                ? 'border-[#16A34A] bg-[#DCFCE7] dark:border-[#4ADE80] dark:bg-[#052E16]'
                : 'border-gray-300 bg-white active:bg-gray-50 dark:border-[#334155] dark:bg-[#131A26] dark:active:bg-[#1A2333]'
            }`}
          >
            <span
              className={`font-mono-num font-bold leading-none tracking-tight text-[min(62cqh,50cqw)] ${
                repSaveFlash ? 'text-[#16A34A] dark:text-[#4ADE80]' : 'text-[#111827] dark:text-[#F3F4F6]'
              }`}
            >
              {session.currentRound}
            </span>
            <span className="font-mono-num mt-1 text-sm font-semibold text-gray-500 dark:text-gray-400">
              {repSaveFlash ? 'Круг записан' : `из ${session.totalRounds} · тап — круг выполнен`}
            </span>
          </button>

          <button
            type="button"
            onClick={handleRoundFlowFinish}
            disabled={roundFlowCompleted < 1}
            className="tap-scale flex min-h-[52px] w-full shrink-0 items-center justify-center gap-1.5 rounded-2xl border border-gray-300 bg-white text-sm font-bold text-[#111827] active:bg-gray-100 disabled:opacity-40 dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#243044]"
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
};
