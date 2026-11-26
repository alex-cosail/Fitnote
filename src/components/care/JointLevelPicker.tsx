import React from 'react';
import { JOINT_LEVELS, JointLevel, LEVEL_INFO } from '../../domain/care/care';

/** A joint's level as a numbered colored circle (gray without a number = free). */
export const LevelDot: React.FC<{ level?: JointLevel; size?: number }> = ({ level, size = 26 }) => {
  const info = level === undefined ? undefined : LEVEL_INFO[level];
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full text-xs font-bold"
      style={{
        width: size,
        height: size,
        background: info ? info.fill : '#F1EFE8',
        color: info ? info.text : '#5F5E5A',
        border: `1.5px solid ${info ? info.ring : '#B4B2A9'}`,
      }}
      aria-hidden="true"
    >
      {level ?? ''}
    </span>
  );
};

export const DOCTOR_LINE = 'Боль, травма, перелом — сначала врач. Fitnote не лечит и не подбирает упражнения при травме; уровни 0–3 — если врач разрешил двигаться.';

/**
 * «Как двигается?» — the level 0–4 of a joint, or free. We do not ask about
 * pain: the person chooses the state (care brief §0).
 */
export const JointLevelPicker: React.FC<{
  value?: JointLevel;
  onPick: (level: JointLevel | undefined) => void;
  allowFree?: boolean;
}> = ({ value, onPick, allowFree = true }) => (
  <div className="space-y-1.5">
    {allowFree && (
      <button
        type="button"
        onClick={() => onPick(undefined)}
        aria-pressed={value === undefined}
        className={`tap-scale flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3 text-left ${
          value === undefined ? 'border-[#111827] bg-gray-50 dark:border-[#F3F4F6] dark:bg-[#1A2333]' : 'border-gray-200 dark:border-[#2A3548]'
        }`}
      >
        <LevelDot />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">Свободно</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">Без ограничений</span>
        </span>
      </button>
    )}
    {[...JOINT_LEVELS].reverse().map((lv) => (
      <button
        key={lv}
        type="button"
        onClick={() => onPick(lv)}
        aria-pressed={value === lv}
        className={`tap-scale flex min-h-[48px] w-full items-center gap-3 rounded-xl border px-3 text-left ${
          value === lv ? 'border-[#111827] bg-gray-50 dark:border-[#F3F4F6] dark:bg-[#1A2333]' : 'border-gray-200 dark:border-[#2A3548]'
        }`}
      >
        <LevelDot level={lv} />
        <span className="min-w-0">
          <span className="block text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">{LEVEL_INFO[lv].name}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{LEVEL_INFO[lv].hint}</span>
        </span>
      </button>
    ))}
    <p className="pt-1 text-xs text-gray-500 dark:text-gray-400">{DOCTOR_LINE}</p>
  </div>
);
