import React from 'react';
import { ChevronLeft, ChevronRight, Dumbbell, Leaf, Zap } from 'lucide-react';
import { WEEKDAY_SHORT } from '../../domain/schedule/archive';
import type { PlanKind } from '../../domain/schedule/kind';

const KIND: Record<PlanKind, { icon: typeof Dumbbell; tone: string }> = {
  S: { icon: Dumbbell, tone: 'text-[#111827] dark:text-[#F3F4F6]' },
  F: { icon: Zap, tone: 'text-[#0B5F73] dark:text-[#5EC4D8]' },
  M: { icon: Leaf, tone: 'text-[#15803D] dark:text-[#4ADE80]' },
};

interface Props {
  weeks: { date: string; planIds: string[] }[][];
  today: string;
  kindOf: (planId: string) => PlanKind | undefined;
  onShift: (weeks: number) => void;
  /** Tap a day: show its workouts (or pick it as the start). */
  selected?: string;
  onDay: (date: string) => void;
  /** Picking a start day: only these dates are offered. */
  pick?: { allow: (date: string) => boolean; hint: string; onCancel: () => void };
}

/**
 * The calendar for 4 weeks from the current one (field test 28.11): workouts
 * and cycles as icons, two a day allowed; arrows move by 4 weeks. When a
 * start day is being chosen, only the allowed days can be tapped.
 */
export const FourWeekCalendar: React.FC<Props> = ({ weeks, today, kindOf, onShift, selected, onDay, pick }) => {
  const first = weeks[0]?.[0]?.date;
  const last = weeks[3]?.[6]?.date;
  const fmt = (d?: string) => (d ? d.split('-').reverse().slice(0, 2).join('.') : '');
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3 dark:border-[#232E42] dark:bg-[#131A26]">
      <div className="flex items-center justify-between">
        <button type="button" onClick={() => onShift(-4)} className="tap-scale flex h-10 w-10 items-center justify-center rounded-xl text-gray-500" aria-label="Предыдущие 4 недели">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <p className="font-mono-num text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
          {fmt(first)} – {fmt(last)}
        </p>
        <button type="button" onClick={() => onShift(4)} className="tap-scale flex h-10 w-10 items-center justify-center rounded-xl text-gray-500" aria-label="Следующие 4 недели">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
      {pick && (
        <div className="mt-1 flex items-center justify-between gap-2 rounded-xl bg-[#ECFAFC] px-3 py-2 text-sm font-semibold text-[#0B5F73] dark:bg-[#0B2E36]/60 dark:text-[#5EC4D8]">
          <span>{pick.hint}</span>
          <button type="button" onClick={pick.onCancel} className="tap-scale min-h-[36px] rounded-lg px-2 text-xs underline">
            Отмена
          </button>
        </div>
      )}
      <div className="mt-2 grid grid-cols-7 gap-1 text-center">
        {WEEKDAY_SHORT.map((d) => (
          <span key={d} className="text-[11px] font-semibold text-gray-500 dark:text-gray-400">
            {d}
          </span>
        ))}
        {weeks.flat().map((cell) => {
          const allowed = pick ? pick.allow(cell.date) : true;
          const isToday = cell.date === today;
          const past = cell.date < today;
          return (
            <button
              key={cell.date}
              type="button"
              disabled={!allowed}
              onClick={() => onDay(cell.date)}
              aria-label={`${cell.date}${cell.planIds.length ? `, тренировок: ${cell.planIds.length}` : ''}`}
              className={`tap-scale flex min-h-[50px] flex-col items-center justify-start rounded-lg border pt-1 transition-colors disabled:opacity-30 ${
                selected === cell.date
                  ? 'border-[#111827] bg-gray-50 dark:border-[#F3F4F6] dark:bg-[#1A2333]'
                  : pick && allowed
                    ? 'border-[#0B5F73]/50 bg-[#ECFAFC] dark:border-[#5EC4D8]/40 dark:bg-[#0B2E36]/40'
                    : 'border-transparent'
              } ${past && !pick ? 'opacity-50' : ''}`}
            >
              <span
                className={`font-mono-num text-xs ${
                  isToday ? 'rounded-full bg-[#DC2626] px-1.5 font-bold text-white' : 'text-[#111827] dark:text-[#F3F4F6]'
                }`}
              >
                {Number(cell.date.slice(8))}
              </span>
              <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                {cell.planIds.slice(0, 2).map((id, i) => {
                  const k = kindOf(id);
                  const Icon = k ? KIND[k].icon : Dumbbell;
                  return <Icon key={i} className={`h-3.5 w-3.5 ${k ? KIND[k].tone : 'text-gray-400'}`} aria-hidden="true" />;
                })}
                {cell.planIds.length > 2 && <span className="text-[10px] font-bold text-gray-500">+{cell.planIds.length - 2}</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
