import React from 'react';
import { Check, Pause, Play } from 'lucide-react';
import { breathPhase, buildCooldown } from '../../../domain/cooldown/cooldown';
import { formatClock } from '../../../domain/format';
import { formatFlow } from '../../../domain/warmup/warmup';
import { soundEngine } from '../../../utils/audio';
import { ExerciseSvg } from '../../ExerciseSvg';
import { ExitConfirmModal } from '../ExitConfirmModal';
import { usePlayer } from '../PlayerContext';

/**
 * Cool-down flow (Addendum №7, v3.16): «Начать заминку» or «Без заминки»,
 * then 7 standing positions one after another, the side change inside a
 * step, breathing 4 s in / 6 s out, and the steps for today's work marked.
 */
export const CooldownPhase: React.FC = () => {
  const { isMuted, onExitSession, onUpdateSession, renderTopBar, session, setShowExitConfirm, showExitConfirm, togglePauseTimer } = usePlayer();

  const steps = session.cooldownSteps?.length ? session.cooldownSteps : buildCooldown();
  const total = steps.reduce((s, x) => s + (x.durationSeconds ?? 0), 0);
  const prep = session.preCountdownSec ?? 0;
  const index = Math.min(session.cooldownStepIndex ?? 0, steps.length - 1);
  const step = steps[index];
  const stepLeft = session.cooldownStepRemainingSec ?? step?.durationSeconds ?? 0;
  const elapsed = Math.max(0, total - session.phaseRemainingSec);
  const breath = breathPhase(elapsed);

  const finish = () => {
    soundEngine.playFinish(isMuted);
    onUpdateSession({ ...session, phase: 'finish', phaseRemainingSec: 0, phaseEndTimestamp: undefined });
  };
  const startNow = () => {
    soundEngine.unlock();
    soundEngine.playGo(isMuted);
    onUpdateSession({ ...session, preCountdownSec: 0, isPaused: false, phaseEndTimestamp: Date.now() + session.phaseRemainingSec * 1000 });
  };
  const next = () => {
    soundEngine.unlock();
    if (index >= steps.length - 1) return;
    soundEngine.playTick(isMuted);
    const left = steps.slice(index + 1).reduce((s, x) => s + (x.durationSeconds ?? 0), 0);
    onUpdateSession({
      ...session,
      cooldownStepIndex: index + 1,
      cooldownStepRemainingSec: steps[index + 1].durationSeconds,
      phaseRemainingSec: left,
      ...(session.isPaused ? {} : { phaseEndTimestamp: Date.now() + left * 1000 }),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex h-[100dvh] flex-col bg-white dark:bg-[#0B0F17]">
      {renderTopBar('COOL-DOWN')}

      {prep > 0 ? (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-5 text-center">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">Основная часть позади</p>
          <h2 className="font-display text-3xl font-bold text-[#111827] dark:text-[#F3F4F6]">Заминка · {formatFlow(total)}</h2>
          <p className="max-w-xs text-sm text-gray-600 dark:text-gray-300">7 позиций стоя у стойки: дыхание, грудь, спина, бёдра, икры. Пульс и мышцы успокоятся.</p>
          <button type="button" onClick={startNow} className="tap-scale flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-6 text-base font-bold text-white">
            <Play className="h-5 w-5 fill-current" />
            Начать заминку ({formatFlow(total)}) · {prep}
          </button>
          <button type="button" onClick={finish} className="tap-scale min-h-[44px] text-sm font-semibold text-gray-500 underline dark:text-gray-400">
            Завершить без заминки
          </button>
        </main>
      ) : (
        <main className="mx-auto grid min-h-0 w-full max-w-5xl flex-1 grid-cols-1 grid-rows-[minmax(0,1.3fr)_minmax(0,1fr)] gap-3 px-4 pt-3 pb-safe landscape:grid-cols-2 landscape:grid-rows-1">
          <button
            type="button"
            onClick={next}
            className={`tap-scale flex min-h-0 flex-col items-center justify-between rounded-3xl border p-4 text-center ${
              step?.highlight ? 'border-[#0B5F73]/50 bg-[#ECFAFC] dark:border-[#5EC4D8]/40 dark:bg-[#0B2E36]/50' : 'border-gray-200 bg-gray-50/70 dark:border-[#232E42] dark:bg-[#131A26]'
            }`}
          >
            {step && (
              <>
                <div className="w-full">
                  <div className="flex items-center justify-center gap-2 text-xs font-semibold text-gray-500 dark:text-gray-400">
                    <span className="font-mono-num text-[#DC2626] dark:text-[#F87171]">
                      {String(index + 1).padStart(2, '0')} / {String(steps.length).padStart(2, '0')}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono-num font-bold text-[#111827] dark:text-[#F3F4F6]">{formatClock(stepLeft)}</span>
                  </div>
                  <h2 className="font-display mt-1 text-xl font-bold leading-tight text-[#111827] sm:text-2xl dark:text-[#F3F4F6]">{step.name}</h2>
                  <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                    {step.highlight && (
                      <span className="rounded-full bg-[#0B5F73] px-2.5 py-0.5 text-xs font-bold text-white">После сегодняшней тренировки</span>
                    )}
                    {step.splitCueAt && step.durationSeconds && (
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          step.durationSeconds - stepLeft >= step.splitCueAt ? 'bg-[#DC2626] text-white' : 'bg-gray-100 text-gray-500 dark:bg-[#1A2333] dark:text-gray-400'
                        }`}
                      >
                        {step.durationSeconds - stepLeft >= step.splitCueAt ? 'Смена стороны' : `Смена через ${Math.max(0, step.splitCueAt - (step.durationSeconds - stepLeft))} с`}
                      </span>
                    )}
                  </div>
                </div>
                <ExerciseSvg svgKey={step.svgKey} className="my-auto h-32 w-48 max-h-full landscape:h-28" />
                <p className="line-clamp-3 text-xs leading-snug text-gray-600 dark:text-gray-300">{step.cue}</p>
                <p className="mt-1 text-[11px] font-medium text-gray-400 dark:text-gray-500">Тап — следующая позиция</p>
              </>
            )}
          </button>

          <div className="flex min-h-0 flex-col items-center justify-between rounded-3xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]">
            {/* Breathing 4–6: the circle grows on the in-breath, shrinks on the out-breath */}
            <div className="flex flex-1 flex-col items-center justify-center">
              <div className="relative flex h-28 w-28 items-center justify-center">
                <span
                  className="absolute inset-0 rounded-full bg-[#ECFAFC] dark:bg-[#0B2E36]"
                  style={{
                    transform: `scale(${breath.phase === 'in' ? 0.55 + (0.45 * (4 - breath.left + 1)) / 4 : 0.55 + (0.45 * (breath.left - 1)) / 6})`,
                    transition: session.isPaused ? 'none' : 'transform 1s linear',
                  }}
                />
                <span className="relative text-center">
                  <span className="block text-sm font-bold text-[#0B5F73] dark:text-[#5EC4D8]">{breath.phase === 'in' ? 'Вдох' : 'Выдох'}</span>
                  <span className="font-mono-num block text-2xl font-bold text-[#111827] dark:text-[#F3F4F6]">{breath.left}</span>
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">4 секунды вдох · 6 секунд выдох</p>
            </div>
            <div className="w-full">
              <div className="flex items-center justify-center gap-3">
                <span className="font-mono-num text-3xl font-bold text-[#111827] dark:text-[#F3F4F6]">{formatClock(session.phaseRemainingSec)}</span>
                <button
                  type="button"
                  onClick={togglePauseTimer}
                  className="tap-scale flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-3 text-xs font-semibold text-[#111827] dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
                >
                  {session.isPaused ? <Play className="h-4 w-4 fill-current" /> : <Pause className="h-4 w-4" />}
                  {session.isPaused ? 'Дальше' : 'Пауза'}
                </button>
              </div>
              <button type="button" onClick={finish} className="tap-scale mt-3 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-6 text-base font-bold text-white">
                <Check className="h-5 w-5" />
                Завершить заминку
              </button>
              <div className="mt-2 flex justify-center gap-1" aria-hidden="true">
                {steps.map((s, i) => (
                  <span key={s.id} className={`h-1.5 rounded-full ${i === index ? 'w-6 bg-[#DC2626]' : i < index ? 'w-2.5 bg-[#111827] dark:bg-[#E5E7EB]' : 'w-2.5 bg-gray-200 dark:bg-[#263248]'}`} />
                ))}
              </div>
            </div>
          </div>
        </main>
      )}

      {showExitConfirm && <ExitConfirmModal onCancel={() => setShowExitConfirm(false)} onConfirm={onExitSession} />}
    </div>
  );
};
