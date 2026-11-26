import React, { useState } from 'react';
import { X } from 'lucide-react';
import { JointLevel, JOINT_NAMES } from '../../domain/care/care';
import { JOINTS, Joint } from '../../domain/catalog/joints';
import { JointLevelPicker } from '../care/JointLevelPicker';

interface Props {
  exerciseName: string;
  /** Pre-selected: the joints this exercise loads. */
  suggested: Joint[];
  onApply: (joints: Joint[], level: JointLevel) => void;
  onClose: () => void;
}

/**
 * Past the easiest step (care brief §0): lower the level of the joints this
 * exercise loads. We do not ask about pain — the person chooses the state.
 */
export const PainPauseSheet: React.FC<Props> = ({ exerciseName, suggested, onApply, onClose }) => {
  const [joints, setJoints] = useState<Joint[]>(suggested.slice(0, 1));
  const toggle = (j: Joint) => setJoints((cur) => (cur.includes(j) ? cur.filter((x) => x !== j) : [...cur, j]));
  const ordered = [...suggested, ...JOINTS.filter((j) => !suggested.includes(j))];

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center dark:bg-black/70" onClick={onClose}>
      <div
        className="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl dark:border dark:border-[#232E42] dark:bg-[#0F1520]"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Понизить уровень"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wide text-[#B45309] dark:text-[#FBBF24]">Понизить уровень</p>
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">{exerciseName}</h3>
          </div>
          <button type="button" onClick={onClose} className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500" aria-label="Закрыть">
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="mt-3 mb-1.5 text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">Какой сустав?</p>
        <div className="flex flex-wrap gap-1.5">
          {ordered.map((j) => (
            <button
              key={j}
              type="button"
              onClick={() => toggle(j)}
              aria-pressed={joints.includes(j)}
              className={`tap-scale min-h-[42px] rounded-xl px-3 text-sm font-semibold ${
                joints.includes(j)
                  ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                  : 'bg-gray-100 text-gray-700 dark:bg-[#131A26] dark:text-gray-300'
              }`}
            >
              {JOINT_NAMES[j].name}
            </button>
          ))}
        </div>

        <p className="mt-4 mb-1.5 text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">Как двигается?</p>
        <JointLevelPicker allowFree={false} onPick={(lv) => joints.length > 0 && lv !== undefined && onApply(joints, lv)} />
        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          Упражнения, которые нагружают это место, заменим или уберём — сегодня и дальше. Сустав появится в «Я» на скелете; через неделю спросим, как дела.
        </p>
      </div>
    </div>
  );
};

/** «В личной анкете стоит запрет…» when the person picks a protected exercise themselves. */
export const CareConfirm: React.FC<{ exerciseName: string; jointAcc: string; onYes: () => void; onNo: () => void }> = ({
  exerciseName,
  jointAcc,
  onYes,
  onNo,
}) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-5 dark:bg-black/70">
    <div className="w-full max-w-sm rounded-3xl bg-white p-5 dark:border dark:border-[#232E42] dark:bg-[#0F1520]" role="alertdialog" aria-label="Запрет в анкете">
      <p className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">В личной анкете стоит запрет</p>
      <p className="mt-1.5 text-sm text-gray-600 dark:text-gray-300">
        «{exerciseName}» нагружает {jointAcc}, а вы его сейчас бережёте. Вы уверены?
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <button type="button" onClick={onNo} className="tap-scale min-h-[48px] rounded-xl bg-[#111827] text-sm font-bold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]">
          Нет
        </button>
        <button type="button" onClick={onYes} className="tap-scale min-h-[48px] rounded-xl border border-gray-300 text-sm font-semibold text-[#111827] dark:border-[#334155] dark:text-[#F3F4F6]">
          Да
        </button>
      </div>
    </div>
  </div>
);
