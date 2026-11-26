import React from 'react';
import { ArrowLeftRight, Volume2, VolumeX, X } from 'lucide-react';
import { RoundProgressRing } from './RoundProgressRing';

// Shared top bar inside the player: exit, title, antagonist, mute, ring.
export const PlayerTopBar: React.FC<{
  centerLabel: string;
  workoutTitle: string;
  isMuted: boolean;
  onExit: () => void;
  onToggleMute: () => void;
  onAntagonist?: () => void; // shown when set
  ring?: { progress: number; round: number; totalRounds: number };
  tone?: 'default' | 'rest';
}> = ({
  centerLabel,
  workoutTitle,
  isMuted,
  onExit,
  onToggleMute,
  onAntagonist,
  ring,
  tone = 'default',
}) => (
  <header
    className={`flex h-12 shrink-0 items-center justify-between border-b px-4 landscape:h-11 lg:landscape:h-14 ${
      tone === 'rest'
        ? 'border-[#67E8F9] bg-[#BAF0F7] dark:border-[#155E75] dark:bg-[#083A47]'
        : 'border-gray-200 bg-white dark:border-[#1E293B] dark:bg-[#0F1520]'
    }`}
  >
    <button
      type="button"
      onClick={onExit}
      className="tap-scale flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-gray-600 hover:bg-gray-100 hover:text-[#111827] dark:text-gray-300 dark:hover:bg-[#1E293B] dark:hover:text-white"
      aria-label="Выйти из тренировки"
    >
      <X className="h-5 w-5" />
    </button>

    <div className="min-w-0 flex-1 px-1 text-center">
      <p className="font-mono-num truncate whitespace-nowrap text-[13px] font-bold text-[#111827] sm:text-sm dark:text-[#F3F4F6]">
        {centerLabel}
      </p>
      <p className="truncate text-[11px] font-medium text-gray-500 dark:text-gray-400">
        {workoutTitle}
      </p>
    </div>

    <div className="flex items-center gap-1.5">
      {onAntagonist && (
        <button
          type="button"
          onClick={onAntagonist}
          className="tap-scale flex min-h-[44px] shrink-0 items-center gap-1 rounded-xl border border-gray-200 bg-white px-2 text-xs font-semibold text-[#111827] hover:bg-gray-50 dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6] dark:hover:bg-[#1A2333]"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 text-[#DC2626] dark:text-[#F87171]" />
          <span>Изменить</span>
        </button>
      )}
      <button
        type="button"
        onClick={onToggleMute}
        className={`tap-scale flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border transition-colors ${
          tone === 'rest'
            ? `border-[#67E8F9] bg-transparent dark:border-[#155E75] ${
                isMuted
                  ? 'text-[#0E7490]/70 dark:text-[#67E8F9]/70'
                  : 'text-[#111827] dark:text-[#F3F4F6]'
              }`
            : isMuted
              ? 'border-gray-200 bg-gray-100 text-gray-500 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-gray-400'
              : 'border-gray-200 bg-white text-[#111827] dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6]'
        }`}
        aria-label={isMuted ? 'Включить звук' : 'Выключить звук'}
        title={isMuted ? 'Звук выкл' : 'Звук вкл'}
      >
        {isMuted ? (
          <VolumeX className="h-4 w-4" />
        ) : (
          <Volume2 className="h-4 w-4 text-[#DC2626] dark:text-[#F87171]" />
        )}
      </button>
      {ring && (
        <RoundProgressRing
          progress={ring.progress}
          round={ring.round}
          totalRounds={ring.totalRounds}
        />
      )}
    </div>
  </header>
);
