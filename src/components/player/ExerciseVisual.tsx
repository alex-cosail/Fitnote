import React, { useState } from 'react';
import { Pencil } from 'lucide-react';
import { getMuscleLabel } from '../../domain/catalog/muscles';
import { Exercise } from '../../types';
import { ExerciseSvg } from '../ExerciseSvg';

// Large exercise picture (fills the free space) + muscles, name and cue,
// and the person's own note for this exercise (v3.8: «жёлтая + синяя»).
export const ExerciseVisual: React.FC<{
  exercise: Exercise;
  label?: string;
  tone?: 'default' | 'rest';
  note?: string;
  onNote?: (text: string) => void;
}> = ({ exercise: ex, label, tone = 'default', note, onNote }) => {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const save = () => {
    onNote?.(draft.trim());
    setEditing(false);
  };

  return (
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
        {editing ? (
          <form
            className="mx-auto mt-1 flex max-w-md gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
          >
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={80}
              placeholder="Например: жёлтая + синяя резинка"
              className="min-h-[40px] min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
            />
            <button type="submit" className="tap-scale min-h-[40px] rounded-xl bg-[#111827] px-3 text-sm font-bold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]">
              OK
            </button>
          </form>
        ) : note ? (
          <button
            type="button"
            disabled={!onNote}
            onClick={() => {
              setDraft(note);
              setEditing(true);
            }}
            className="mx-auto mt-1 flex max-w-md items-center gap-1.5 rounded-lg bg-[#FFFBEB] px-2.5 py-1 text-xs font-semibold text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FBBF24]"
          >
            <Pencil className="h-3 w-3 shrink-0" />
            <span className="min-w-0 break-words text-left">{note}</span>
          </button>
        ) : (
          <>
            <p className="mx-auto mt-0.5 line-clamp-2 max-w-md text-xs leading-snug text-gray-600 landscape:text-[11px] lg:landscape:text-sm dark:text-gray-300">
              {ex.cue}
            </p>
            {onNote && (
              <button
                type="button"
                onClick={() => {
                  setDraft('');
                  setEditing(true);
                }}
                className="mx-auto mt-0.5 flex items-center gap-1 text-[11px] font-semibold text-gray-400 dark:text-gray-500"
              >
                <Pencil className="h-3 w-3" />
                Моя заметка
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
