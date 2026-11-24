import React from 'react';

// Compact SVG ring: progress within the current round + round number.
export const RoundProgressRing: React.FC<{
  progress: number;
  round: number;
  totalRounds: number;
}> = ({ progress, round, totalRounds }) => {
  const r = 20;
  const c = 2 * Math.PI * r;
  const p = Math.min(1, Math.max(0, progress));
  return (
    <div
      className="relative flex h-11 w-11 shrink-0 items-center justify-center"
      role="img"
      aria-label={`Круг ${round} из ${totalRounds}, пройдено ${Math.round(p * 100)}%`}
      title={`Круг ${round} из ${totalRounds}`}
    >
      <svg viewBox="0 0 48 48" className="absolute inset-0 h-11 w-11 -rotate-90">
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          className="stroke-gray-200 dark:stroke-[#263248]"
        />
        <circle
          cx="24"
          cy="24"
          r={r}
          fill="none"
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - p)}
          className="stroke-[#DC2626] transition-all duration-300 dark:stroke-[#EF4444]"
        />
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <span className="font-mono-num text-[15px] font-bold text-[#111827] dark:text-[#F3F4F6]">
          {round}
        </span>
        <span className="font-mono-num mt-px text-[8px] font-semibold text-gray-500 dark:text-gray-400">
          из {totalRounds}
        </span>
      </div>
    </div>
  );
};

