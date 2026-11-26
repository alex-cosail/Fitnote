import React, { useRef, useState } from 'react';
import { CalendarDays, Check, ChevronLeft, ChevronRight, Dumbbell, Leaf, Zap } from 'lucide-react';
import { DayView } from '../domain/schedule/schedule';
import { PlanKind } from '../domain/schedule/kind';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/ru';

interface WeekStripProps {
  days: DayView[];
  kindOf: (planId: string) => PlanKind | undefined;
  titleOf: (planId: string) => string;
  selectedDate?: string;
  warning?: string;
  onSelect: (day: DayView) => void;
  onMove: (from: string, to: string) => void;
  onWeek: (delta: -1 | 1) => void;
  weekLabel: string;
  onCalendar?: () => void;
}

const LONG_PRESS_MS = 420;

const KIND_STYLE: Record<PlanKind, { icon: React.FC<{ className?: string }>; tone: string }> = {
  S: { icon: Dumbbell, tone: 'text-[#111827] dark:text-[#F3F4F6]' },
  F: { icon: Zap, tone: 'text-[#0B5F73] dark:text-[#5EC4D8]' },
  M: { icon: Leaf, tone: 'text-[#15803D] dark:text-[#4ADE80]' },
};

/**
 * The week (customer, 26.11): 7 cells with the workout type — dumbbells for
 * strength, a bolt for form circuits, a leaf for mobility, empty for rest;
 * ✓ done, dashed — missed, today ringed. Tap — that day's workout. Long press
 * and drag onto another day — move (onto a busy day the two swap).
 */
export const WeekStrip: React.FC<WeekStripProps> = ({
  days, kindOf, titleOf, selectedDate, warning, onSelect, onMove, onWeek, weekLabel, onCalendar,
}) => {
  const { t } = useT();
  const [dragFrom, setDragFrom] = useState<string | null>(null);
  const [hover, setHover] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const pressed = useRef<{ date: string; moved: boolean } | null>(null);

  const cancelTimer = () => {
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = null;
  };
  const dateAt = (x: number, y: number) =>
    (document.elementFromPoint(x, y)?.closest('[data-day]') as HTMLElement | null)?.dataset.day ?? null;

  const onDown = (e: React.PointerEvent, day: DayView) => {
    pressed.current = { date: day.date, moved: false };
    cancelTimer();
    if (day.planId && day.status !== 'done') {
      timer.current = window.setTimeout(() => {
        setDragFrom(day.date);
        setHover(day.date);
        navigator.vibrate?.(15);
      }, LONG_PRESS_MS);
    }
    (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
  };
  const onMoveEvt = (e: React.PointerEvent) => {
    if (!pressed.current) return;
    if (!dragFrom) {
      // moving before the long press: a scroll or a slip, not a drag
      if (Math.abs(e.movementX) + Math.abs(e.movementY) > 6) {
        pressed.current.moved = true;
        cancelTimer();
      }
      return;
    }
    setHover(dateAt(e.clientX, e.clientY));
  };
  const onUp = (e: React.PointerEvent, day: DayView) => {
    cancelTimer();
    const p = pressed.current;
    pressed.current = null;
    if (dragFrom) {
      const to = dateAt(e.clientX, e.clientY);
      if (to && to !== dragFrom) onMove(dragFrom, to);
      setDragFrom(null);
      setHover(null);
      return;
    }
    if (p && !p.moved) onSelect(day);
  };
  const onCancel = () => {
    cancelTimer();
    pressed.current = null;
    setDragFrom(null);
    setHover(null);
  };

  return (
    <section>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{weekLabel}</span>
        <div className="flex items-center gap-1">
          {onCalendar && (
            <button type="button" onClick={onCalendar} className="tap-scale flex h-8 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-gray-500" aria-label={t('ready.calendar')}>
              <CalendarDays className="h-4 w-4" />
            </button>
          )}
          <button type="button" onClick={() => onWeek(-1)} className="tap-scale flex h-8 w-8 items-center justify-center rounded-lg text-gray-500" aria-label={t('week.prev')}>
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => onWeek(1)} className="tap-scale flex h-8 w-8 items-center justify-center rounded-lg text-gray-500" aria-label={t('week.next')}>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1" style={{ touchAction: dragFrom ? 'none' : 'pan-y' }}>
        {days.map((day) => {
          const kind = day.planId ? kindOf(day.planId) : undefined;
          const K = kind ? KIND_STYLE[kind] : undefined;
          const Icon = K?.icon;
          const selected = selectedDate === day.date;
          const dragging = dragFrom === day.date;
          const target = dragFrom && hover === day.date && !dragging;
          const dayNum = Number(day.date.slice(8, 10));
          return (
            <button
              key={day.date}
              type="button"
              data-day={day.date}
              onPointerDown={(e) => onDown(e, day)}
              onPointerMove={onMoveEvt}
              onPointerUp={(e) => onUp(e, day)}
              onPointerCancel={onCancel}
              onContextMenu={(e) => e.preventDefault()}
              aria-label={`${t(`week.day.${day.weekday}` as TranslationKey)} ${dayNum}: ${day.planId ? titleOf(day.planId) : t('week.rest')}${
                day.status === 'done' ? ` · ${t('week.done')}` : day.status === 'missed' ? ` · ${t('week.missed')}` : ''
              }`}
              aria-pressed={selected}
              className={`relative flex min-h-[64px] select-none flex-col items-center justify-center gap-0.5 rounded-xl border-2 px-0.5 py-1 transition-transform ${
                dragging
                  ? 'scale-110 border-[#DC2626] bg-white shadow-lg dark:bg-[#1A2333]'
                  : target
                    ? 'border-[#0B5F73] bg-[#ECFAFC] dark:bg-[#0B2E36]/60'
                    : selected
                      ? 'border-[#111827] bg-white dark:border-[#F3F4F6] dark:bg-[#1A2333]'
                      : day.status === 'missed'
                        ? 'border-dashed border-gray-300 bg-white dark:border-[#475569] dark:bg-[#131A26]'
                        : 'border-transparent bg-gray-50 dark:bg-[#131A26]'
              } ${day.status === 'today' && !selected && !dragging ? 'ring-2 ring-[#DC2626] ring-offset-1 dark:ring-offset-[#0B0F17]' : ''}`}
            >
              <span className="text-[10px] font-semibold uppercase text-gray-500 dark:text-gray-400">
                {t(`week.day.${day.weekday}` as TranslationKey)}
              </span>
              <span className="font-mono-num text-xs font-bold text-[#111827] dark:text-[#F3F4F6]">{dayNum}</span>
              <span className="flex h-5 items-center justify-center">
                {Icon ? <Icon className={`h-4 w-4 ${K!.tone} ${day.status === 'missed' ? 'opacity-50' : ''}`} /> : <span className="h-1 w-1 rounded-full bg-gray-300 dark:bg-[#475569]" />}
              </span>
              {day.status === 'done' && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#15803D] text-white">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[11px] text-gray-500 dark:text-gray-400">{dragFrom ? t('week.dropHint') : t('week.hint')}</p>
      {warning && <p className="mt-1 text-xs font-semibold text-amber-700 dark:text-amber-400">{warning}</p>}
    </section>
  );
};
