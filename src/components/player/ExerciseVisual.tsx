import React from 'react';
import { getMuscleLabel } from '../../domain/catalog/muscles';
import { Exercise } from '../../types';
import { ExerciseSvg } from '../ExerciseSvg';

// Large exercise picture (fills the free space) + muscles, name and cue.
export const ExerciseVisual: React.FC<{
  exercise: Exercise;
  label?: string;
  tone?: 'default' | 'rest';
}> = ({ exercise: ex, label, tone = 'default' }) => (
  <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center text-center landscape:h-full">
    {label && (
      <p className="mb-1.5 shrink-0 text-xs font-bold uppercase tracking-wider text-[#0E7490] dark:text-[#67E8F9]">
        {label}
      </p>
    )}
    <div
      className={`flex min-h-[7rem] w-full flex-1 items-center justify-center rounded-2xl border p-2 ${
        tone === 'rest'
          ? 'border-[#67E8F9] bg-transparent dark:border-[#155E75]'
          : 'border-gray-200 bg-gray-50/70 dark:border-[#232E42] dark:bg-[#131A26]'
      }`}
    >
      <ExerciseSvg svgKey={ex.svgKey} className="h-full max-h-full w-full" />
    </div>

    <div className="mt-2 w-full shrink-0 landscape:mt-1.5">
      <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400">
        {ex.target_muscles.map(getMuscleLabel).join(' · ')}
        {ex.isPaired ? ' · парное' : ''}
      </p>
      <h2 className="font-display mt-0.5 break-words text-[clamp(1.35rem,3.6dvh,2.15rem)] font-bold leading-tight tracking-tight text-[#111827] landscape:text-[clamp(1.2rem,5.2dvh,2rem)] dark:text-[#F3F4F6]">
        {ex.name}
      </h2>
      <p className="mx-auto mt-0.5 line-clamp-2 max-w-md text-xs leading-snug text-gray-600 landscape:text-[11px] lg:landscape:text-sm dark:text-gray-300">
        {ex.cue}
      </p>
    </div>
  </div>
);
