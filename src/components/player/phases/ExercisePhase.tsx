import React from 'react';
import { Check, Minus, Plus, X } from 'lucide-react';
import { getMuscleLabel } from '../../../domain/catalog/muscles';
import { formatClock } from '../../../domain/format';
import { RirValue } from '../../../types';
import { ExerciseSvg } from '../../ExerciseSvg';
import { ExitConfirmModal } from '../ExitConfirmModal';
import { usePlayer } from '../PlayerContext';

export const ExercisePhase: React.FC = () => {
  const {
    antagonistMatches,
    currentExercise,
    currentItem,
    handleCompleteSet,
    handleStepReps,
    handleSwapAntagonist,
    handleTapHoldDigits,
    handleTapRepNumber,
    holdUi,
    onExitSession,
    pairedLeftValue,
    renderExerciseVisual,
    renderTopBar,
    repSaveFlash,
    repsValue,
    rir,
    session,
    setRir,
    setShowAntagonistSheet,
    setShowExitConfirm,
    showAntagonistSheet,
    showExitConfirm,
  } = usePlayer();

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
            <div className="grid h-28 grid-cols-[1fr_1.6fr_1fr] gap-2 landscape:h-auto landscape:min-h-[6rem] landscape:flex-1 landscape:grid-cols-[1fr_2.2fr_1fr]">
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
                className={`touch-manipulation flex h-full min-w-0 items-center [container-type:size] justify-center rounded-2xl border-2 transition-colors ${
                  repSaveFlash
                    ? 'border-[#16A34A] bg-[#DCFCE7] dark:border-[#4ADE80] dark:bg-[#052E16]'
                    : 'border-gray-300 bg-white active:bg-gray-50 dark:border-[#334155] dark:bg-[#1A2333] dark:active:bg-[#243044]'
                }`}
              >
                <span
                  className={`font-mono-num text-[4.75rem] font-bold leading-none landscape:text-[min(78cqh,52cqw)] ${
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
