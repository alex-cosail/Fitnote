import React from 'react';
import { ArrowLeftRight, Heart, Minus, Plus, X } from 'lucide-react';
import { formatMetricTarget } from '../domain/format';
import { LadderPosition } from '../domain/generator';
import { useT } from '../i18n';
import { Exercise } from '../types';
import { ExerciseSvg } from './ExerciseSvg';

interface ExerciseStepCardProps {
  exercise: Exercise;
  target: number;
  ladder?: LadderPosition;
  favorite: boolean;
  onTarget: (dir: 1 | -1) => void;
  onStep: (dir: 1 | -1) => void;
  onToggleFavorite: () => void;
  onSwap?: () => void;
  onRemove?: () => void;
}

/** Step marks: −− − ● + ++ for ranks 1..5. */
const RANK_MARK: Record<number, string> = { 1: '−−', 2: '−', 3: '●', 4: '+', 5: '++' };

const btn =
  'tap-scale flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-[#111827] disabled:opacity-30 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-[#F3F4F6]';

/**
 * Exercise card for editing (customer's layout, 25.11):
 *
 *   name ♥                       [−]
 *   [−]  picture  [+]        12 ×2
 *        −− − ● + ++             [+]
 *
 * Left − / + around the picture: an easier / harder step on the ladder (the
 * picture changes); the scale shows which steps exist and where we are.
 * Right − / +: reps or seconds.
 */
export const ExerciseStepCard: React.FC<ExerciseStepCardProps> = ({
  exercise, target, ladder, favorite, onTarget, onStep, onToggleFavorite, onSwap, onRemove,
}) => {
  const { t } = useT();
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-[#232E42] dark:bg-[#131A26]">
      <div className="flex items-start gap-2">
        {/* left: name, picture with ladder steps, scale */}
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-1.5">
            <p className="min-w-0 flex-1 text-sm font-bold leading-snug text-[#111827] dark:text-[#F3F4F6]">
              {exercise.name}
            </p>
            <button
              type="button"
              onClick={onToggleFavorite}
              aria-pressed={favorite}
              aria-label={t('gen.edit.favorite')}
              className="tap-scale -mt-1 flex h-8 w-8 shrink-0 items-center justify-center"
            >
              <Heart className={`h-4 w-4 ${favorite ? 'fill-[#DC2626] text-[#DC2626]' : 'text-gray-400'}`} />
            </button>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <button type="button" className={btn} onClick={() => onStep(-1)} disabled={!ladder?.canEasier} aria-label={t('gen.edit.easier')} title={t('gen.edit.easier')}>
              <Minus className="h-4 w-4" />
            </button>
            <ExerciseSvg svgKey={exercise.svgKey} className="h-20 min-w-0 flex-1" />
            <button type="button" className={btn} onClick={() => onStep(1)} disabled={!ladder?.canHarder} aria-label={t('gen.edit.harder')} title={t('gen.edit.harder')}>
              <Plus className="h-4 w-4" />
            </button>
          </div>
          {ladder && (
            <div className="mt-1 flex items-center justify-center gap-1" aria-label={t('card.step', { n: ladder.current })}>
              {ladder.ranks.map((r) => (
                <span
                  key={r}
                  className={`font-mono-num rounded-md px-1.5 py-0.5 text-[11px] font-bold ${
                    r === ladder.current
                      ? 'bg-[#DC2626] text-white'
                      : 'bg-gray-100 text-gray-400 dark:bg-[#1A2333] dark:text-gray-500'
                  }`}
                >
                  {RANK_MARK[r]}
                </span>
              ))}
            </div>
          )}
          {(onSwap || onRemove) && (
            <div className="mt-1.5 flex items-center justify-center gap-3">
              {onSwap && (
                <button type="button" onClick={onSwap} className="tap-scale flex min-h-[32px] items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                  {t('card.other')}
                </button>
              )}
              {onRemove && (
                <button type="button" onClick={onRemove} className="tap-scale flex min-h-[32px] items-center gap-1 text-xs font-semibold text-gray-500 dark:text-gray-400">
                  <X className="h-3.5 w-3.5" />
                  {t('own.remove')}
                </button>
              )}
            </div>
          )}
        </div>

        {/* right: reps / seconds stepper, − on top, + below */}
        <div className="flex w-[72px] shrink-0 flex-col items-center gap-1">
          <button type="button" className={btn} onClick={() => onTarget(-1)} aria-label={t('gen.edit.less')}>
            <Minus className="h-4 w-4" />
          </button>
          <p className="font-mono-num text-center text-xl font-bold leading-tight text-[#DC2626] dark:text-[#F87171]">
            {formatMetricTarget(target, exercise.metric)}
            {exercise.isPaired && <span className="block text-[11px] font-semibold text-gray-500 dark:text-gray-400">{t('card.perSide')}</span>}
          </p>
          <button type="button" className={btn} onClick={() => onTarget(1)} aria-label={t('gen.edit.more')}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
