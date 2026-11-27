import React, { useMemo, useState } from 'react';
import { CalendarPlus, Play, Trash2, X } from 'lucide-react';
import { ArchiveItem, WEEKDAY_SHORT, daysFor, fourWeeks, plural, setSessionDay } from '../../domain/schedule/archive';
import type { PlanKind } from '../../domain/schedule/kind';
import { addDays, mondayOf, weekdayOf, type Weekday } from '../../domain/schedule/schedule';
import type { FitnoteData, WorkoutPlan } from '../../types';
import { FourWeekCalendar } from './FourWeekCalendar';

interface Props {
  archive: ArchiveItem[];
  /** Data with the cycles as shown on the first screen. */
  calendarData: Pick<FitnoteData, 'workouts' | 'cycles' | 'dayOverrides' | 'archive' | 'dayExtras' | 'profile'>;
  planById: Map<string, WorkoutPlan>;
  kindOf: (planId: string) => PlanKind | undefined;
  profileDays?: Weekday[];
  today: string;
  onPlaceSeries: (item: ArchiveItem, startMonday: string, days: Weekday[], weeks: number) => void;
  onPlaceSingle: (item: ArchiveItem, date: string) => void;
  onToday: (item: ArchiveItem) => void;
  onRemove: (item: ArchiveItem) => 'in-use' | void;
  onOpenDay: (date: string) => void;
}

const WEEKS = [1, 2, 4];

/**
 * The constructor (field test 28.11): the 4-week calendar and the archive —
 * singles and series. Open one → its sessions with the days from the profile
 * (change them) → «В календарь» → the start day: a Monday for a series, any
 * day for a single (two a day are fine).
 */
export const ArchivePanel: React.FC<Props> = ({
  archive, calendarData, planById, kindOf, profileDays, today, onPlaceSeries, onPlaceSingle, onToday, onRemove, onOpenDay,
}) => {
  const [anchor, setAnchor] = useState(mondayOf(today));
  const [open, setOpen] = useState<ArchiveItem | null>(null);
  const [days, setDays] = useState<Weekday[]>([]);
  const [weeks, setWeeks] = useState(4);
  const [picking, setPicking] = useState<ArchiveItem | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | undefined>();
  const [notice, setNotice] = useState('');

  const weeksView = useMemo(() => fourWeeks(calendarData, anchor), [calendarData, anchor]);
  const series = archive.filter((a) => a.kind === 'series');
  const singles = archive.filter((a) => a.kind === 'single');
  const fmt = (d: string) => d.split('-').reverse().slice(0, 2).join('.');

  const openItem = (item: ArchiveItem) => {
    setOpen(item);
    setDays(item.days?.length === item.planIds.length ? item.days : daysFor(item.planIds.length, profileDays));
    setWeeks(item.weeks || 1);
  };
  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 4000);
  };

  const onDay = (date: string) => {
    if (picking) {
      if (picking.kind === 'series') {
        onPlaceSeries(picking, date, days, weeks);
        flash(`«${picking.title}» — с ${fmt(date)}, ${weeks} нед.`);
      } else {
        onPlaceSingle(picking, date);
        flash(`«${picking.title}» — ${fmt(date)}`);
      }
      setPicking(null);
      setSelectedDay(date);
      return;
    }
    setSelectedDay(date === selectedDay ? undefined : date);
  };

  const dayList = selectedDay ? weeksView.flat().find((c) => c.date === selectedDay)?.planIds ?? [] : [];

  const row = (item: ArchiveItem) => {
    const first = planById.get(item.planIds[0]);
    const meta =
      item.kind === 'series'
        ? `${item.planIds.length} ${plural(item.planIds.length, 'занятие', 'занятия', 'занятий')} · ${item.planIds.length}/нед · ${item.weeks} нед.`
        : first
          ? `${first.rounds} ${first.rounds === 1 ? 'круг' : 'круга'} · ${first.items.length} упр.`
          : '';
    return (
      <button
        key={item.id}
        type="button"
        onClick={() => openItem(item)}
        className="tap-scale flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-left dark:border-[#232E42] dark:bg-[#131A26]"
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">{item.title}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{meta}</span>
        </span>
        <CalendarPlus className="h-4 w-4 shrink-0 text-gray-400" />
      </button>
    );
  };

  return (
    <section className="mx-auto max-w-6xl px-5 pt-5">
      <h1 className="font-display text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">Конструктор</h1>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Календарь на 4 недели и архив ваших тренировок.</p>

      <div className="mt-4">
        <FourWeekCalendar
          weeks={weeksView}
          today={today}
          kindOf={kindOf}
          onShift={(n) => setAnchor((a) => addDays(a, n * 7))}
          selected={selectedDay}
          onDay={onDay}
          pick={
            picking
              ? {
                  allow: (d) => d >= today && (picking.kind === 'single' || weekdayOf(d) === 0),
                  hint: picking.kind === 'series' ? 'Выберите понедельник старта' : 'Выберите день',
                  onCancel: () => setPicking(null),
                }
              : undefined
          }
        />
        {notice && <p className="mt-2 rounded-xl bg-[#ECFAFC] px-3 py-2 text-sm font-semibold text-[#0B5F73] dark:bg-[#0B2E36]/60 dark:text-[#5EC4D8]" role="status">{notice}</p>}
        {selectedDay && !picking && (
          <div className="mt-2 rounded-xl border border-gray-200 p-2.5 dark:border-[#232E42]">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{fmt(selectedDay)}</p>
            {dayList.length === 0 ? (
              <p className="text-sm text-gray-500 dark:text-gray-400">Отдых</p>
            ) : (
              dayList.map((id, i) => (
                <button key={`${id}-${i}`} type="button" onClick={() => onOpenDay(selectedDay)} className="tap-scale block w-full py-1 text-left text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">
                  {planById.get(id)?.title ?? id}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      <h2 className="font-display mt-6 text-xl font-bold text-[#111827] dark:text-[#F3F4F6]">Архив</h2>
      {series.length > 0 && (
        <>
          <p className="mt-2 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Серии</p>
          <div className="space-y-1.5">{series.map(row)}</div>
        </>
      )}
      {singles.length > 0 && (
        <>
          <p className="mt-3 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Разовые</p>
          <div className="space-y-1.5">{singles.map(row)}</div>
        </>
      )}
      {archive.length === 0 && <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Пока пусто — соберите тренировку ниже.</p>}

      {open && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setOpen(null)}>
          <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl dark:bg-[#0F1520]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={open.title}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{open.kind === 'series' ? 'Серия' : 'Разовая'}</p>
                <h3 className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">{open.title}</h3>
              </div>
              <button type="button" onClick={() => setOpen(null)} className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500" aria-label="Закрыть">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              {open.planIds.map((id, i) => {
                const p = planById.get(id);
                return (
                  <div key={id} className="rounded-xl border border-gray-200 p-2.5 dark:border-[#232E42]">
                    <p className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">{p?.title ?? id}</p>
                    {p && <p className="text-xs text-gray-500 dark:text-gray-400">{p.items.length} упр. · {p.rounds} {p.rounds === 1 ? 'круг' : 'круга'}</p>}
                    {open.kind === 'series' && (
                      <div className="mt-1.5 grid grid-cols-7 gap-1">
                        {WEEKDAY_SHORT.map((d, wd) => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDays((cur) => setSessionDay(cur, i, wd as Weekday))}
                            aria-pressed={days[i] === wd}
                            className={`tap-scale min-h-[36px] rounded-lg text-xs font-semibold ${
                              days[i] === wd ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]' : 'bg-gray-100 text-gray-600 dark:bg-[#1A2333] dark:text-gray-300'
                            }`}
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {open.kind === 'series' && (
              <div className="mt-3">
                <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Сколько недель</p>
                <div className="flex gap-1.5">
                  {WEEKS.map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setWeeks(w)}
                      aria-pressed={weeks === w}
                      className={`tap-scale min-h-[40px] flex-1 rounded-xl text-sm font-semibold ${
                        weeks === w ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]' : 'bg-gray-100 text-gray-600 dark:bg-[#1A2333] dark:text-gray-300'
                      }`}
                    >
                      {w} нед.
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-4 grid grid-cols-2 gap-2">
              {open.kind === 'single' && (
                <button
                  type="button"
                  onClick={() => {
                    onToday(open);
                    setOpen(null);
                  }}
                  className="tap-scale flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl border border-gray-300 text-sm font-semibold text-[#111827] dark:border-[#334155] dark:text-[#F3F4F6]"
                >
                  <Play className="h-4 w-4" />
                  Сегодня
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  setPicking(open);
                  setOpen(null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`tap-scale flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] text-sm font-bold text-white ${open.kind === 'series' ? 'col-span-2' : ''}`}
              >
                <CalendarPlus className="h-4 w-4" />
                В календарь
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (onRemove(open) === 'in-use') flash('Эта тренировка стоит в календаре — сначала уберите её оттуда.');
                setOpen(null);
              }}
              className="tap-scale mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 text-xs font-semibold text-gray-500"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Удалить из архива
            </button>
          </div>
        </div>
      )}
    </section>
  );
};
