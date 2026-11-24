import React from 'react';
import { Check, Pause, Play } from 'lucide-react';
import { COOLDOWN_STEPS } from '../../../data/seed';
import { formatClock } from '../../../domain/format';
import { soundEngine } from '../../../utils/audio';
import { ExerciseSvg } from '../../ExerciseSvg';
import { ExitConfirmModal } from '../ExitConfirmModal';
import { usePlayer } from '../PlayerContext';

export const CooldownPhase: React.FC = () => {
  const {
    isMuted,
    onExitSession,
    onUpdateSession,
    renderTopBar,
    session,
    setShowExitConfirm,
    showExitConfirm,
    togglePauseTimer,
  } = usePlayer();

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
};
