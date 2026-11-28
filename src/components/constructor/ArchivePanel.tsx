import React, { useMemo, useRef, useState } from 'react';
import { CalendarMinus, CalendarPlus, Check, Copy, Eraser, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { ArchiveItem, WEEKDAY_SHORT, daysFor, fourWeeks, plural, setSessionDay } from '../../domain/schedule/archive';
import type { PlanKind } from '../../domain/schedule/kind';
import { addDays, mondayOf, weekdayOf, type Weekday } from '../../domain/schedule/schedule';
import type { FitnoteData, WorkoutPlan } from '../../types';
import { FourWeekCalendar } from './FourWeekCalendar';

/** How a single is put: one day or every week (N weeks, or until taken off). */
export type Repeat = { kind: 'once' } | { kind: 'weekly'; weeks?: number };

interface Props {
  archive: ArchiveItem[];
  calendarData: Pick<FitnoteData, 'workouts' | 'cycles' | 'dayOverrides' | 'archive' | 'dayExtras' | 'profile' | 'repeats'>;
  planById: Map<string, WorkoutPlan>;
  kindOf: (planId: string) => PlanKind | undefined;
  profileDays?: Weekday[];
  today: string;
  onPlaceSeries: (item: ArchiveItem, startMonday: string, days: Weekday[], weeks: number) => void;
  onPlaceSingle: (item: ArchiveItem, date: string, repeat: Repeat) => void;
  onToday: (item: ArchiveItem, repeat: Repeat) => void;
  onRemove: (item: ArchiveItem) => 'in-use' | void;
  onUnschedule: (item: ArchiveItem) => void;
  onRemoveFromDate: (planId: string, date: string) => void;
  onClearFrom: (date: string) => void;
  onCopyToSingles: (planId: string) => void;
  onBuildSeries: (planIds: string[], title: string, days: Weekday[], weeks: number) => void;
  onRename: (item: ArchiveItem, title: string) => void;
  onOpenDay: (date: string) => void;
}

const WEEKS = [1, 2, 4];
const REPEAT_WEEKS: (number | undefined)[] = [2, 4, 8, undefined];

const chip = (on: boolean) =>
  `tap-scale min-h-[40px] rounded-xl px-3 text-sm font-semibold ${
    on ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]' : 'bg-gray-100 text-gray-600 dark:bg-[#1A2333] dark:text-gray-300'
  }`;

/** Bottom sheet frame. */
const Sheet: React.FC<{ title: string; eyebrow?: string; onClose: () => void; children: React.ReactNode; titleAction?: React.ReactNode }> = ({ title, eyebrow, onClose, children, titleAction }) => (
  <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={onClose}>
    <div className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl dark:bg-[#0F1520]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={title}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {eyebrow && <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">{eyebrow}</p>}
          <h3 className="flex items-center gap-1 text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">
            <span className="min-w-0 break-words">{title}</span>
            {titleAction}
          </h3>
        </div>
        <button type="button" onClick={onClose} className="tap-scale flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-gray-500" aria-label="Закрыть">
          <X className="h-5 w-5" />
        </button>
      </div>
      {children}
    </div>
  </div>
);

/** «Только этот день» / «Каждую неделю» with 2 · 4 · 8 · until taken off. */
const RepeatPicker: React.FC<{ value: Repeat; onChange: (r: Repeat) => void }> = ({ value, onChange }) => (
  <div className="mt-3">
    <div className="grid grid-cols-2 gap-1.5">
      <button type="button" className={chip(value.kind === 'once')} onClick={() => onChange({ kind: 'once' })}>
        Только этот день
      </button>
      <button type="button" className={chip(value.kind === 'weekly')} onClick={() => onChange({ kind: 'weekly', weeks: 4 })}>
        Каждую неделю
      </button>
    </div>
    {value.kind === 'weekly' && (
      <div className="mt-1.5 grid grid-cols-4 gap-1.5">
        {REPEAT_WEEKS.map((w) => (
          <button key={w ?? 'open'} type="button" className={chip(value.weeks === w)} onClick={() => onChange({ kind: 'weekly', weeks: w })}>
            {w ? `${w} нед.` : 'Пока не уберу'}
          </button>
        ))}
      </div>
    )}
  </div>
);

/**
 * The constructor (field test 28.11): the 4-week calendar and the archive.
 * A day: its workouts (take one off), «Добавить тренировку», «Очистить с
 * этой даты». An item: days, weeks or a weekly repeat, «В календарь»,
 * «Убрать из календаря». A long press on singles selects them — «Собрать в
 * неделю» asks for the days and makes a series.
 */
export const ArchivePanel: React.FC<Props> = (props) => {
  const { archive, calendarData, planById, kindOf, profileDays, today } = props;
  const [anchor, setAnchor] = useState(mondayOf(today));
  const [open, setOpen] = useState<ArchiveItem | null>(null);
  const [days, setDays] = useState<Weekday[]>([]);
  const [weeks, setWeeks] = useState(4);
  const [repeat, setRepeat] = useState<Repeat>({ kind: 'once' });
  const [picking, setPicking] = useState<ArchiveItem | null>(null);
  const [fixedStart, setFixedStart] = useState<string | null>(null); // adding from a day
  const [dayMenu, setDayMenu] = useState<string | null>(null);
  const [adding, setAdding] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [selecting, setSelecting] = useState<string[] | null>(null);
  const [building, setBuilding] = useState(false);
  const [buildTitle, setBuildTitle] = useState('Моя неделя');
  const [notice, setNotice] = useState('');
  const [renaming, setRenaming] = useState<string | null>(null);
  const pressTimer = useRef<number | null>(null);
  const longPressed = useRef(false);

  const weeksView = useMemo(() => fourWeeks(calendarData, anchor), [calendarData, anchor]);
  const series = archive.filter((a) => a.kind === 'series');
  const singles = archive.filter((a) => a.kind === 'single');
  const fmt = (d: string) => d.split('-').reverse().slice(0, 2).join('.');
  const title = (id: string) => planById.get(id)?.title ?? id;

  const flash = (text: string) => {
    setNotice(text);
    window.setTimeout(() => setNotice(''), 4000);
  };
  const openItem = (item: ArchiveItem, start: string | null = null) => {
    setOpen(item);
    setFixedStart(start);
    setDays(item.days?.length === item.planIds.length ? item.days : daysFor(item.planIds.length, profileDays));
    setWeeks(item.weeks || 1);
    setRepeat({ kind: 'once' });
  };
  const placeSingle = (item: ArchiveItem, date: string, r: Repeat) => {
    props.onPlaceSingle(item, date, r);
    flash(r.kind === 'weekly' ? `«${item.title}» — каждую неделю с ${fmt(date)}${r.weeks ? `, ${r.weeks} нед.` : ''}` : `«${item.title}» — ${fmt(date)}`);
  };
  const placeSeries = (item: ArchiveItem, start: string) => {
    props.onPlaceSeries(item, start, days, weeks);
    flash(`«${item.title}» — с ${fmt(mondayOf(start))}, ${weeks} нед.`);
  };

  const onDay = (date: string) => {
    if (picking) {
      if (picking.kind === 'series') placeSeries(picking, date);
      else placeSingle(picking, date, repeat);
      setPicking(null);
      return;
    }
    setDayMenu(date);
  };

  // long press on a single → selection for «Собрать в неделю»
  const pressStart = (item: ArchiveItem) => {
    longPressed.current = false;
    if (item.kind !== 'single') return;
    pressTimer.current = window.setTimeout(() => {
      longPressed.current = true;
      setSelecting((cur) => (cur ? cur : [item.planIds[0]]));
      navigator.vibrate?.(20);
    }, 500);
  };
  const pressEnd = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
    pressTimer.current = null;
  };
  const tapItem = (item: ArchiveItem) => {
    if (longPressed.current) return;
    if (selecting) {
      if (item.kind !== 'single') return;
      const id = item.planIds[0];
      setSelecting((cur) => (cur!.includes(id) ? cur!.filter((x) => x !== id) : [...cur!, id]));
      return;
    }
    openItem(item);
  };

  const row = (item: ArchiveItem) => {
    const first = planById.get(item.planIds[0]);
    const selected = selecting?.includes(item.planIds[0]) && item.kind === 'single';
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
        onClick={() => tapItem(item)}
        onPointerDown={() => pressStart(item)}
        onPointerUp={pressEnd}
        onPointerLeave={pressEnd}
        onPointerCancel={pressEnd}
        onContextMenu={(e) => e.preventDefault()}
        className={`tap-scale flex w-full select-none items-center justify-between gap-3 rounded-xl border px-3 py-2.5 text-left ${
          selected ? 'border-[#111827] bg-gray-50 dark:border-[#F3F4F6] dark:bg-[#1A2333]' : 'border-gray-200 bg-white dark:border-[#232E42] dark:bg-[#131A26]'
        } ${selecting && item.kind !== 'single' ? 'opacity-40' : ''}`}
      >
        <span className="min-w-0">
          <span className="block truncate text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">{item.title}</span>
          <span className="block text-xs text-gray-500 dark:text-gray-400">{meta}</span>
        </span>
        {selecting && item.kind === 'single' ? (
          <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border ${selected ? 'border-[#111827] bg-[#111827] text-white' : 'border-gray-300'}`}>
            {selected && <Check className="h-4 w-4" />}
          </span>
        ) : (
          <CalendarPlus className="h-4 w-4 shrink-0 text-gray-400" />
        )}
      </button>
    );
  };

  const dayPlans = dayMenu ? weeksView.flat().find((c) => c.date === dayMenu)?.planIds ?? fourWeeks(calendarData, dayMenu)[0].find((c) => c.date === dayMenu)?.planIds ?? [] : [];

  return (
    <section className="mx-auto max-w-6xl px-5 pt-5 pb-4">
      <h1 className="font-display text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">Конструктор</h1>
      <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">Тап по дню — что в нём; долгое нажатие на разовую — собрать неделю.</p>

      <div className="mt-4">
        <FourWeekCalendar
          weeks={weeksView}
          today={today}
          kindOf={kindOf}
          onShift={(n) => setAnchor((a) => addDays(a, n * 7))}
          selected={dayMenu ?? undefined}
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

      {/* selection bar */}
      {selecting && (
        <div className="sticky bottom-24 z-30 mt-3 flex items-center gap-2 rounded-2xl bg-[#111827] p-2 text-white shadow-lg dark:bg-[#F3F4F6] dark:text-[#0B0F17]">
          <button
            type="button"
            disabled={selecting.length < 2}
            onClick={() => {
              setDays(daysFor(selecting.length, profileDays));
              setWeeks(1);
              setBuilding(true);
            }}
            className="tap-scale min-h-[44px] flex-1 rounded-xl bg-[#DC2626] px-3 text-sm font-bold text-white disabled:opacity-50"
          >
            Собрать в неделю ({selecting.length})
          </button>
          <button type="button" onClick={() => setSelecting(null)} className="tap-scale min-h-[44px] rounded-xl px-3 text-sm font-semibold">
            Отмена
          </button>
        </div>
      )}

      {/* a day: its workouts, add, clear from here */}
      {dayMenu && !adding && (
        <Sheet eyebrow={WEEKDAY_SHORT[weekdayOf(dayMenu)]} title={fmt(dayMenu)} onClose={() => { setDayMenu(null); setConfirmClear(false); }}>
          <div className="mt-2 space-y-1.5">
            {dayPlans.length === 0 && <p className="text-sm text-gray-500 dark:text-gray-400">Отдых</p>}
            {dayPlans.map((id, i) => (
              <div key={`${id}-${i}`} className="flex items-center justify-between gap-2 rounded-xl border border-gray-200 px-3 py-2 dark:border-[#232E42]">
                <button type="button" onClick={() => props.onOpenDay(dayMenu)} className="min-w-0 truncate text-left text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
                  {title(id)}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    props.onRemoveFromDate(id, dayMenu);
                    flash(`«${title(id)}» убрана с ${fmt(dayMenu)}`);
                  }}
                  className="tap-scale flex min-h-[36px] shrink-0 items-center gap-1 rounded-lg border border-gray-300 px-2 text-xs font-semibold text-[#111827] dark:border-[#334155] dark:text-[#F3F4F6]"
                >
                  <CalendarMinus className="h-3.5 w-3.5" />
                  Убрать
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setAdding(dayMenu)}
            className="tap-scale mt-3 flex min-h-[50px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Добавить тренировку
          </button>
          {confirmClear ? (
            <div className="mt-2 rounded-xl bg-[#FEF2F2] p-2.5 text-sm text-[#991B1B] dark:bg-[#450A0A]/50 dark:text-[#FCA5A5]">
              Убрать всё с {fmt(dayMenu)} и дальше? Тренировки останутся в архиве.
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <button type="button" onClick={() => setConfirmClear(false)} className="tap-scale min-h-[40px] rounded-lg bg-white text-sm font-semibold text-[#111827]">Нет</button>
                <button
                  type="button"
                  onClick={() => {
                    props.onClearFrom(dayMenu);
                    flash(`Календарь очищен с ${fmt(dayMenu)}`);
                    setConfirmClear(false);
                    setDayMenu(null);
                  }}
                  className="tap-scale min-h-[40px] rounded-lg bg-[#DC2626] text-sm font-bold text-white"
                >
                  Да, очистить
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmClear(true)} className="tap-scale mt-2 flex min-h-[44px] w-full items-center justify-center gap-1.5 text-xs font-semibold text-gray-500">
              <Eraser className="h-3.5 w-3.5" />
              Очистить календарь с этой даты
            </button>
          )}
        </Sheet>
      )}

      {/* add from a day: choose from the archive */}
      {adding && (
        <Sheet eyebrow={`Добавить на ${fmt(adding)}`} title="Что поставить?" onClose={() => { setAdding(null); setDayMenu(null); }}>
          {weekdayOf(adding) !== 0 && series.length > 0 && <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Серия начинается с понедельника — здесь только разовые.</p>}
          <div className="mt-2 space-y-1.5">
            {(weekdayOf(adding) === 0 ? archive : singles).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  const date = adding;
                  setAdding(null);
                  setDayMenu(null);
                  openItem(item, date);
                }}
                className="tap-scale flex w-full items-center justify-between gap-3 rounded-xl border border-gray-200 px-3 py-2.5 text-left dark:border-[#232E42]"
              >
                <span className="min-w-0 truncate text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">{item.title}</span>
                <span className="shrink-0 text-xs text-gray-500">{item.kind === 'series' ? 'серия' : 'разовая'}</span>
              </button>
            ))}
          </div>
        </Sheet>
      )}

      {/* an item */}
      {open && (
        <Sheet eyebrow={open.kind === 'series' ? 'Серия' : 'Разовая'} title={open.title}
          titleAction={
            renaming === null ? (
              <button type="button" onClick={() => setRenaming(open.title)} className="tap-scale flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-gray-400 hover:text-[#111827] dark:hover:text-[#F3F4F6]" aria-label="Переименовать">
                <Pencil className="h-4 w-4" />
              </button>
            ) : undefined
          }
          onClose={() => { setOpen(null); setRenaming(null); }}>
          {renaming !== null ? (
            <form
              className="mt-2 flex gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                const name = renaming.trim();
                if (name) {
                  props.onRename(open, name);
                  setOpen({ ...open, title: name });
                }
                setRenaming(null);
              }}
            >
              <input
                autoFocus
                value={renaming}
                onChange={(e) => setRenaming(e.target.value)}
                maxLength={40}
                aria-label="Новое название"
                className="min-h-[44px] min-w-0 flex-1 rounded-xl border border-gray-300 bg-white px-3 text-sm dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
              />
              <button type="submit" className="tap-scale min-h-[44px] rounded-xl bg-[#111827] px-3 text-sm font-bold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]">
                OK
              </button>
            </form>
          ) : null}
          <div className="mt-3 space-y-2">
            {open.planIds.map((id, i) => {
              const p = planById.get(id);
              return (
                <div key={id} className="rounded-xl border border-gray-200 p-2.5 dark:border-[#232E42]">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">{p?.title ?? id}</p>
                      {p && <p className="text-xs text-gray-500 dark:text-gray-400">{p.items.length} упр. · {p.rounds} {p.rounds === 1 ? 'круг' : 'круга'}</p>}
                    </div>
                    {open.kind === 'series' && (
                      <button
                        type="button"
                        onClick={() => {
                          props.onCopyToSingles(id);
                          flash(`«${p?.title ?? id}» скопирована в разовые`);
                        }}
                        className="tap-scale flex min-h-[32px] shrink-0 items-center gap-1 rounded-lg px-1.5 text-[11px] font-semibold text-gray-500"
                        aria-label={`Скопировать ${p?.title ?? id} в разовые`}
                      >
                        <Copy className="h-3.5 w-3.5" />В разовые
                      </button>
                    )}
                  </div>
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

          {open.kind === 'series' ? (
            <div className="mt-3">
              <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Сколько недель</p>
              <div className="grid grid-cols-3 gap-1.5">
                {WEEKS.map((w) => (
                  <button key={w} type="button" onClick={() => setWeeks(w)} aria-pressed={weeks === w} className={chip(weeks === w)}>
                    {w} нед.
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <RepeatPicker value={repeat} onChange={setRepeat} />
          )}

          <div className="mt-4 grid grid-cols-2 gap-2">
            {open.kind === 'single' && !fixedStart && (
              <button
                type="button"
                onClick={() => {
                  props.onToday(open, repeat);
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
                const item = open;
                setOpen(null);
                if (fixedStart) {
                  if (item.kind === 'series') placeSeries(item, fixedStart);
                  else placeSingle(item, fixedStart, repeat);
                  setFixedStart(null);
                  return;
                }
                setPicking(item);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`tap-scale flex min-h-[50px] items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] text-sm font-bold text-white ${open.kind === 'series' || fixedStart ? 'col-span-2' : ''}`}
            >
              <CalendarPlus className="h-4 w-4" />
              {fixedStart ? `Поставить на ${fmt(fixedStart)}` : 'В календарь'}
            </button>
          </div>
          {!fixedStart && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  props.onUnschedule(open);
                  flash(`«${open.title}» убрана из календаря с сегодняшнего дня`);
                  setOpen(null);
                }}
                className="tap-scale flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl border border-gray-200 text-xs font-semibold text-[#111827] dark:border-[#2A3548] dark:text-[#F3F4F6]"
              >
                <CalendarMinus className="h-3.5 w-3.5" />
                Убрать из календаря
              </button>
              <button
                type="button"
                onClick={() => {
                  if (props.onRemove(open) === 'in-use') flash('Эта тренировка стоит в календаре — сначала уберите её оттуда.');
                  setOpen(null);
                }}
                className="tap-scale flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl text-xs font-semibold text-gray-500"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Удалить из архива
              </button>
            </div>
          )}
        </Sheet>
      )}

      {/* «Уточним дни занятий» → a new series */}
      {building && selecting && (
        <Sheet eyebrow="Собрать в неделю" title="Уточним дни занятий" onClose={() => setBuilding(false)}>
          <input
            value={buildTitle}
            onChange={(e) => setBuildTitle(e.target.value)}
            maxLength={40}
            className="mt-2 min-h-[46px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6]"
            aria-label="Название серии"
          />
          <div className="mt-3 space-y-2">
            {selecting.map((id, i) => (
              <div key={id} className="rounded-xl border border-gray-200 p-2.5 dark:border-[#232E42]">
                <p className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">{title(id)}</p>
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
              </div>
            ))}
          </div>
          <p className="mt-3 mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Сколько недель</p>
          <div className="grid grid-cols-3 gap-1.5">
            {WEEKS.map((w) => (
              <button key={w} type="button" onClick={() => setWeeks(w)} className={chip(weeks === w)}>
                {w} нед.
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              props.onBuildSeries(selecting, buildTitle.trim() || 'Моя неделя', days, weeks);
              flash(`Серия «${buildTitle.trim() || 'Моя неделя'}» создана — поставьте её в календарь`);
              setBuilding(false);
              setSelecting(null);
            }}
            className="tap-scale mt-4 flex min-h-[52px] w-full items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] text-sm font-bold text-white"
          >
            <Check className="h-4 w-4" />
            Создать серию
          </button>
        </Sheet>
      )}
    </section>
  );
};
