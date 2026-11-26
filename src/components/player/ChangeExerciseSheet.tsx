import React from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { formatMetricTarget } from '../../domain/format';
import { ChangeOptions, swapTarget } from '../../domain/session/change';
import { Exercise } from '../../types';
import { ExerciseSvg } from '../ExerciseSvg';

interface Props {
  current: Exercise;
  target: number;
  options: ChangeOptions;
  antagonists: Exercise[];
  /** Protected by «Берегу»: shown with a mark, picking asks first. */
  protectedIds?: Set<string>;
  onPick: (ex: Exercise) => void;
  onClose: () => void;
}

/**
 * «Изменить» during a workout (v3.8): easier / harder on the ladder, the same
 * movement type, or the antagonist. From this set to the end of the workout.
 */
export const ChangeExerciseSheet: React.FC<Props> = ({ current, target, options, antagonists, protectedIds, onPick, onClose }) => {
  const newTarget = (ex: Exercise) => formatMetricTarget(swapTarget(target, current, ex), ex.metric);

  const Row = ({ ex }: { ex: Exercise }) => (
    <button
      type="button"
      onClick={() => onPick(ex)}
      className="tap-scale flex w-full items-center gap-3 rounded-2xl border border-gray-200 bg-white p-2.5 text-left hover:border-[#DC2626] dark:border-[#232E42] dark:bg-[#1A2333]"
    >
      <ExerciseSvg svgKey={ex.svgKey} className="h-12 w-16 shrink-0" />
      <span className="min-w-0 flex-1 break-words text-sm font-bold leading-snug text-[#111827] dark:text-[#F3F4F6]">
        {ex.name}
        {protectedIds?.has(ex.id) && <span className="ml-1.5 rounded bg-[#FEF3C7] px-1 text-[10px] font-bold text-[#92400E]">бережём</span>}
      </span>
      <span className="font-mono-num shrink-0 text-sm font-bold text-[#DC2626] dark:text-[#F87171]">{newTarget(ex)}</span>
    </button>
  );

  const Step = ({ ex, dir }: { ex?: Exercise; dir: 'easier' | 'harder' }) => (
    <button
      type="button"
      disabled={!ex}
      onClick={() => ex && onPick(ex)}
      className="tap-scale flex min-h-[132px] flex-1 flex-col items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 p-2.5 text-center disabled:opacity-40 dark:border-[#232E42] dark:bg-[#131A26]"
    >
      <span className="flex items-center gap-1 text-xs font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        {dir === 'easier' ? <ArrowDown className="h-3.5 w-3.5" /> : <ArrowUp className="h-3.5 w-3.5" />}
        {dir === 'easier' ? 'Легче' : 'Тяжелее'}
      </span>
      {ex ? (
        <>
          <ExerciseSvg svgKey={ex.svgKey} className="h-12 w-16" />
          <span className="line-clamp-2 text-xs font-bold leading-tight text-[#111827] dark:text-[#F3F4F6]">{ex.name}</span>
          {protectedIds?.has(ex.id) && <span className="rounded bg-[#FEF3C7] px-1 text-[10px] font-bold text-[#92400E]">бережём</span>}
          <span className="font-mono-num text-sm font-bold text-[#DC2626] dark:text-[#F87171]">{newTarget(ex)}</span>
        </>
      ) : (
        <span className="my-auto text-xs text-gray-500">нет ступени</span>
      )}
    </button>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center dark:bg-black/70" onClick={onClose}>
      <div
        className="max-h-[88dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl dark:border dark:border-[#232E42] dark:bg-[#0F1520]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Изменить упражнение"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">Изменить: {current.name}</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">С этого подхода до конца тренировки. Цель — от вашего максимума.</p>
          </div>
          <button type="button" onClick={onClose} className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500" aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>

        {(options.easier || options.harder) && (
          <div className="mt-3 flex gap-2">
            <Step ex={options.easier} dir="easier" />
            <Step ex={options.harder} dir="harder" />
          </div>
        )}

        {options.samePattern.length > 0 && (
          <>
            <p className="mt-4 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Другое того же типа</p>
            <div className="space-y-1.5">
              {options.samePattern.slice(0, 8).map((ex) => (
                <Row key={ex.id} ex={ex} />
              ))}
            </div>
          </>
        )}

        {antagonists.length > 0 && (
          <>
            <p className="mt-4 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Антагонист (другие мышцы)</p>
            <div className="space-y-1.5">
              {antagonists.slice(0, 5).map((ex) => (
                <Row key={ex.id} ex={ex} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
