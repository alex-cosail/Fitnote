import React, { useEffect, useRef, useState } from 'react';
import { Check, Minus, Plus } from 'lucide-react';
import { getMuscleLabel } from '../domain/catalog/muscles';
import {
  formatClock,
  formatMetricTarget as formatMetricShort,
} from '../domain/format';
import { CheckUpEntry, Exercise } from '../types';
import { soundEngine } from '../utils/audio';
import { ExerciseSvg } from './ExerciseSvg';
import { CATALOG } from '../data/catalog';
import type { SvgKey } from '../types';

interface CheckUpTabProps {
  exercises: Exercise[];
  /** Base tests (one per pattern) shown first; the rest are estimated. */
  baseIds?: string[];
  history: CheckUpEntry[];
  isMuted: boolean;
  onRecordCheckUp: (exerciseId: string, newMax: number) => void;
  /** Own exercise without a picture: choose one from the catalog (v3.11). */
  onPickPicture?: (exerciseId: string, svgKey: SvgKey) => void;
}

interface TimerState {
  exerciseId: string;
  mode: 'countdown' | 'running';
  startMs: number;
  countdownSec: number;
  elapsedSec: number;
  prevMax: number;
  prevDraft: number;
}

export const CheckUpTab: React.FC<CheckUpTabProps> = ({
  exercises,
  baseIds,
  history,
  isMuted,
  onRecordCheckUp,
  onPickPicture,
}) => {
  const [pictureFor, setPictureFor] = useState<Exercise | null>(null);
  const pictureChoices = CATALOG.map((c) => ({ key: c.svgKey, name: exercises.find((e) => e.id === c.id)?.name ?? c.id }));
  const [draftValues, setDraftValues] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    exercises.forEach((ex) => {
      initial[ex.id] = ex.checkup_max;
    });
    return initial;
  });

  // Tracks first-side saved value for paired (unilateral) exercises.
  // Undefined => 1st approach (red Save button); defined => 2nd approach (green Save button).
  const [pairedFirstValues, setPairedFirstValues] = useState<
    Record<string, number>
  >({});

  const [savedFlashId, setSavedFlashId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const baseSet = new Set(baseIds ?? exercises.map((e) => e.id));
  const baseList = (baseIds ?? []).map((id) => exercises.find((e) => e.id === id)).filter(Boolean) as Exercise[];
  // step-0 movements (v3.14) have fixed gentle targets: no check-up for them
  const rehabIds = new Set(CATALOG.filter((c) => c.rehab).map((c) => c.id));
  const others = baseIds ? exercises.filter((e) => !baseSet.has(e.id) && !e.isCustom && !rehabIds.has(e.id)) : [];
  const custom = exercises.filter((e) => e.isCustom);
  const visible = baseIds ? [...baseList, ...custom, ...(showAll ? others : [])] : exercises;
  const [timerState, setTimerState] = useState<TimerState | null>(null);

  const timerRef = useRef<TimerState | null>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const historyRef = useRef<HTMLElement | null>(null);
  const milestonePlayedRef = useRef<boolean>(false);

  const setTimer = (next: TimerState | null) => {
    timerRef.current = next;
    setTimerState(next);
  };

  const getDraft = (ex: Exercise) =>
    draftValues[ex.id] !== undefined ? draftValues[ex.id] : ex.checkup_max;

  const setDraft = (id: string, val: number) => {
    setDraftValues((prev) => ({
      ...prev,
      [id]: Math.max(0, val),
    }));
  };

  // Accurate timestamp-based timer loop for 5s pre-start countdown -> count-up stopwatch
  useEffect(() => {
    if (!timerState) return;

    const intervalId = window.setInterval(() => {
      const curr = timerRef.current;
      if (!curr) return;
      const now = Date.now();

      if (curr.mode === 'countdown') {
        const rem = Math.max(0, 5 - Math.floor((now - curr.startMs) / 1000));
        if (rem === curr.countdownSec) return;

        if (rem > 0) {
          if (rem <= 3) {
            soundEngine.playTick(isMuted);
          }
          setTimer({ ...curr, countdownSec: rem });
          return;
        }

        // Countdown hit 0 -> start count-up stopwatch
        soundEngine.playGo(isMuted);
        milestonePlayedRef.current = false;
        setDraft(curr.exerciseId, 0);
        setTimer({
          ...curr,
          mode: 'running',
          startMs: now,
          countdownSec: 0,
          elapsedSec: 0,
        });
        return;
      }

      // Running count-up mode
      const elapsed = Math.floor((now - curr.startMs) / 1000);
      if (elapsed === curr.elapsedSec) return;

      setDraft(curr.exerciseId, elapsed);

      if (
        curr.prevMax > 0 &&
        elapsed >= curr.prevMax &&
        !milestonePlayedRef.current
      ) {
        milestonePlayedRef.current = true;
        soundEngine.playRound(isMuted);
      }

      setTimer({ ...curr, elapsedSec: elapsed });
    }, 150);

    return () => window.clearInterval(intervalId);
  }, [Boolean(timerState), isMuted]);

  const handleTapTimerDigits = (ex: Exercise) => {
    if (ex.metric !== 'seconds') return;
    soundEngine.unlock();

    // Tapping digits while this card's timer is active stops/cancels it
    if (timerState && timerState.exerciseId === ex.id) {
      if (timerState.mode === 'countdown') {
        // Cancel countdown and restore previous draft
        setDraft(ex.id, timerState.prevDraft);
      } else {
        // Stop count-up and keep elapsed seconds as draft
        setDraft(ex.id, Math.max(1, timerState.elapsedSec));
      }
      setTimer(null);
      return;
    }

    // Start 5s countdown before count-up
    milestonePlayedRef.current = false;
    setTimer({
      exerciseId: ex.id,
      mode: 'countdown',
      startMs: Date.now(),
      countdownSec: 5,
      elapsedSec: 0,
      prevMax: ex.checkup_max,
      prevDraft: getDraft(ex),
    });
  };

  const handleManualStep = (ex: Exercise, nextVal: number) => {
    if (timerState && timerState.exerciseId === ex.id) {
      setTimer(null);
    }
    setDraft(ex.id, Math.max(1, nextVal));
  };

  const scrollToNextCard = (index: number) => {
    window.setTimeout(() => {
      const nextCard = cardRefs.current[index + 1];
      if (nextCard) {
        const isLandscape =
          typeof window !== 'undefined' &&
          window.matchMedia('(orientation: landscape)').matches;
        nextCard.scrollIntoView({
          behavior: 'smooth',
          block: isLandscape ? 'center' : 'start',
        });
      } else if (historyRef.current) {
        historyRef.current.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }
    }, 180);
  };

  const handleSave = (ex: Exercise, index: number) => {
    // Stop timer if still running on this card
    let currentVal = getDraft(ex);
    if (timerState && timerState.exerciseId === ex.id) {
      if (timerState.mode === 'running') {
        currentVal = Math.max(1, timerState.elapsedSec);
        setDraft(ex.id, currentVal);
      } else {
        currentVal = timerState.prevDraft;
        setDraft(ex.id, currentVal);
      }
      setTimer(null);
    }

    currentVal = Math.max(1, currentVal);

    // Paired unilateral exercise: 1st tap = red -> turns green; 2nd tap = saves & advances
    if (ex.isPaired) {
      const firstSideVal = pairedFirstValues[ex.id];
      if (firstSideVal === undefined) {
        setPairedFirstValues((prev) => ({
          ...prev,
          [ex.id]: currentVal,
        }));
        return;
      }

      // Second approach completed -> save balanced max, reset paired state, advance
      const finalVal = Math.min(firstSideVal, currentVal);
      setDraft(ex.id, finalVal);
      onRecordCheckUp(ex.id, finalVal);
      setPairedFirstValues((prev) => {
        const copy = { ...prev };
        delete copy[ex.id];
        return copy;
      });
      setSavedFlashId(ex.id);
      window.setTimeout(() => {
        setSavedFlashId((curr) => (curr === ex.id ? null : curr));
      }, 1000);
      scrollToNextCard(index);
      return;
    }

    // Standard exercise: save immediately and advance
    onRecordCheckUp(ex.id, currentVal);
    setSavedFlashId(ex.id);
    window.setTimeout(() => {
      setSavedFlashId((curr) => (curr === ex.id ? null : curr));
    }, 1200);
    scrollToNextCard(index);
  };

  const formatShortDate = (iso?: string) => {
    if (!iso) return 'Базовое значение';
    try {
      return new Date(iso).toLocaleDateString('ru-RU', {
        day: '2-digit',
        month: 'short',
      });
    } catch {
      return iso;
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 pt-4 pb-32 sm:px-5 landscape:pb-12 lg:pb-12">
      <div className="border-b border-gray-200 pb-3 dark:border-[#1E293B]">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
          Ежемесячное тестирование максимумов
        </p>
        <h1 className="font-display mt-0.5 text-2xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6] sm:text-3xl">
          Check-Up
        </h1>
        <p className="mt-1 max-w-2xl text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
          {baseIds
            ? `Достаточно ${baseList.length} базовых упражнений — по одному на каждое движение. Остальные максимумы приложение рассчитает по лестнице. `
            : ''}
          Нажмите на цифры таймера для отсчёта 5 секунд перед стартом; повторный
          тап остановит секундомер.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-start">
        <div className="min-w-0 space-y-3 landscape:space-y-4 lg:col-span-8">
          {visible.map((ex, index) => {
            const draft = getDraft(ex);
            const isDirty = draft !== ex.checkup_max;
            const isFlashed = savedFlashId === ex.id;
            const stepDelta = ex.metric === 'seconds' ? 5 : 1;
            const isSecondPairedApproach =
              Boolean(ex.isPaired) && pairedFirstValues[ex.id] !== undefined;

            const cardTimer =
              timerState && timerState.exerciseId === ex.id ? timerState : null;

            const displayText = cardTimer
              ? cardTimer.mode === 'countdown'
                ? formatClock(cardTimer.countdownSec)
                : formatClock(cardTimer.elapsedSec)
              : ex.metric === 'seconds'
                ? formatClock(draft)
                : String(draft);

            const digitColorClass = cardTimer
              ? cardTimer.mode === 'countdown'
                ? 'text-[#DC2626] dark:text-[#F87171]'
                : cardTimer.elapsedSec >= cardTimer.prevMax
                  ? 'text-[#16A34A] dark:text-[#4ADE80]'
                  : 'text-[#DC2626] dark:text-[#F87171]'
              : 'text-[#111827] dark:text-[#F3F4F6]';

            // Paired exercises: Red on 1st approach, Green on 2nd approach.
            // Unpaired exercises: Distinct shades of blue (ocean blue on saved flash, royal blue when modified, soft ice-blue otherwise) — never red, green, or pause-like dark gray.
            const saveButtonColorClass = ex.isPaired
              ? isSecondPairedApproach
                ? 'bg-[#16A34A] text-white'
                : 'bg-[#DC2626] text-white'
              : isFlashed
                ? 'bg-[#0284C7] text-white'
                : isDirty
                  ? 'bg-[#2563EB] text-white hover:bg-[#1D4ED8] active:bg-[#1E40AF]'
                  : 'border border-[#93C5FD] bg-[#EFF6FF] text-[#1D4ED8] hover:bg-[#DBEAFE] active:bg-[#BFDBFE] dark:border-[#3B82F6]/45 dark:bg-[#1E3A8A]/40 dark:text-[#93C5FD] dark:hover:bg-[#1E3A8A]/65';

            const saveButtonText =
              !ex.isPaired && isFlashed ? 'Сохранено' : 'Сохранить';

            const renderDigitsBlock = (sizeClass: string) =>
              ex.metric === 'seconds' ? (
                <button
                  type="button"
                  onClick={() => handleTapTimerDigits(ex)}
                  aria-label={
                    cardTimer
                      ? `Остановить таймер ${ex.name}`
                      : `Запустить таймер ${ex.name}`
                  }
                  className={`tap-scale font-mono-num min-h-[48px] rounded-2xl px-2.5 py-1.5 font-bold leading-none transition-colors ${sizeClass} ${digitColorClass} ${
                    cardTimer
                      ? 'bg-gray-100 ring-2 ring-[#DC2626]/30 dark:bg-[#1E293B] dark:ring-[#EF4444]/40'
                      : 'hover:bg-gray-50 active:bg-gray-100 dark:hover:bg-[#1A2333] dark:active:bg-[#1E293B]'
                  }`}
                >
                  {displayText}
                </button>
              ) : (
                <span
                  className={`font-mono-num font-bold leading-none ${sizeClass} text-[#111827] dark:text-[#F3F4F6]`}
                >
                  {displayText}
                </span>
              );

            return (
              <article
                key={ex.id}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className="scroll-mt-3 flex w-full min-w-0 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-[#232E42] dark:bg-[#131A26] landscape:min-h-[calc(100dvh-86px)] landscape:justify-center landscape:p-4 sm:landscape:p-5 lg:landscape:min-h-[340px]"
              >
                {/* PORTRAIT LAYOUT */}
                <div className="flex min-w-0 flex-col gap-3 landscape:hidden">
                  <div className="min-w-0">
                    <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
                      {ex.target_muscles.map(getMuscleLabel).join(' · ')}
                    </p>
                    <h2 className="mt-0.5 break-words text-lg font-bold leading-tight text-[#111827] dark:text-[#F3F4F6]">
                      {ex.name}
                      {!baseSet.has(ex.id) && !ex.lastCheckupDate && !ex.isCustom && (
                        <span className="ml-2 align-middle rounded-md bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-500 dark:bg-[#1A2333] dark:text-gray-400">
                          расчётный
                        </span>
                      )}
                    </h2>
                  </div>

                  <div className="grid grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] items-center gap-3">
                    <div className="flex items-center justify-center rounded-xl bg-gray-50/80 py-2 dark:bg-[#1A2333]">
                      <ExerciseSvg
                        svgKey={ex.svgKey}
                        className="h-20 w-full max-w-[140px]"
                      />
                    </div>
                    {ex.isCustom && ex.svgKey === 'generic_strength' && onPickPicture && (
                      <button type="button" onClick={() => setPictureFor(ex)} className="tap-scale col-span-2 min-h-[36px] rounded-lg text-xs font-semibold text-[#0B5F73] underline dark:text-[#5EC4D8]">
                        Выбрать картинку
                      </button>
                    )}

                    <div className="flex items-center justify-center text-center">
                      {renderDigitsBlock(
                        ex.metric === 'seconds' ? 'text-3xl' : 'text-4xl'
                      )}
                    </div>
                  </div>

                  <div className="flex w-full items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleManualStep(ex, draft - stepDelta)}
                      className="tap-scale flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-[#111827] active:bg-gray-200 dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#263348]"
                      aria-label={`Уменьшить ${ex.name}`}
                    >
                      <Minus className="h-5 w-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSave(ex, index)}
                      className={`tap-scale flex h-12 flex-1 items-center justify-center gap-1.5 rounded-xl px-4 text-sm font-bold transition-colors ${saveButtonColorClass}`}
                    >
                      <Check className="h-4 w-4" />
                      {saveButtonText}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleManualStep(ex, draft + stepDelta)}
                      className="tap-scale flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-gray-300 bg-gray-50 text-[#111827] active:bg-gray-200 dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#263348]"
                      aria-label={`Увеличить ${ex.name}`}
                    >
                      <Plus className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* LANDSCAPE LAYOUT */}
                <div className="hidden min-w-0 landscape:grid landscape:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] landscape:items-center landscape:gap-4 sm:landscape:gap-6">
                  {/* LEFT: Title + Muscle Description + Larger SVG below */}
                  <div className="flex min-w-0 flex-col">
                    <div className="min-w-0">
                      <p className="text-xs leading-snug text-gray-500 dark:text-gray-400">
                        {ex.target_muscles.map(getMuscleLabel).join(' · ')}
                      </p>
                      <h2 className="mt-0.5 break-words text-xl font-bold leading-tight text-[#111827] dark:text-[#F3F4F6] sm:text-2xl">
                        {ex.name}
                      </h2>
                    </div>

                    <div className="mt-2.5 flex items-center justify-center rounded-xl bg-gray-50/80 py-3 dark:bg-[#1A2333]">
                      <ExerciseSvg
                        svgKey={ex.svgKey}
                        className="h-32 w-full max-w-[180px] lg:h-40 lg:max-w-[220px]"
                      />
                    </div>
                    {ex.isCustom && ex.svgKey === 'generic_strength' && onPickPicture && (
                      <button type="button" onClick={() => setPictureFor(ex)} className="tap-scale mt-1 min-h-[36px] rounded-lg text-xs font-semibold text-[#0B5F73] underline dark:text-[#5EC4D8]">
                        Выбрать картинку
                      </button>
                    )}
                  </div>

                  {/* RIGHT: [-] [Large Number/Timer] [+] centered, and [Сохранить] safely below */}
                  <div className="flex min-w-0 flex-col items-center justify-center">
                    <div className="flex w-full items-center justify-center gap-2.5 sm:gap-4">
                      <button
                        type="button"
                        onClick={() => handleManualStep(ex, draft - stepDelta)}
                        className="tap-scale flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-300 bg-gray-50 text-[#111827] shadow-xs active:bg-gray-200 dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#263348] sm:h-16 sm:w-16"
                        aria-label={`Уменьшить ${ex.name}`}
                      >
                        <Minus className="h-6 w-6 sm:h-7 sm:w-7" />
                      </button>

                      <div className="flex min-w-[68px] items-center justify-center text-center sm:min-w-[92px]">
                        {renderDigitsBlock(
                          ex.metric === 'seconds'
                            ? 'text-3xl sm:text-4xl lg:text-5xl'
                            : 'text-4xl sm:text-5xl lg:text-6xl'
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleManualStep(ex, draft + stepDelta)}
                        className="tap-scale flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-gray-300 bg-gray-50 text-[#111827] shadow-xs active:bg-gray-200 dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#263348] sm:h-16 sm:w-16"
                        aria-label={`Увеличить ${ex.name}`}
                      >
                        <Plus className="h-6 w-6 sm:h-7 sm:w-7" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSave(ex, index)}
                      className={`tap-scale mt-4 flex min-h-[50px] w-full max-w-[260px] items-center justify-center gap-2 rounded-2xl px-4 text-sm font-bold transition-colors sm:mt-5 sm:min-h-[52px] ${saveButtonColorClass}`}
                    >
                      <Check className="h-4 w-4" />
                      {saveButtonText}
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
          {baseIds && others.length > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="tap-scale flex min-h-[50px] w-full items-center justify-center rounded-2xl border border-dashed border-gray-300 px-4 text-sm font-semibold text-gray-600 dark:border-[#334155] dark:text-gray-300"
            >
              {showAll
                ? 'Скрыть остальные'
                : `Остальные упражнения (${others.length}) — расчётные максимумы`}
            </button>
          )}
        </div>

        {/* Check-Up History Log */}
        <aside
          ref={historyRef}
          className="scroll-mt-4 min-w-0 rounded-2xl border border-gray-200 bg-gray-50/70 p-4 dark:border-[#232E42] dark:bg-[#131A26] lg:sticky lg:top-6 lg:col-span-4"
        >
          <h2 className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
            История замеров
          </h2>
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
            Последние зафиксированные максимумы
          </p>

          {history.length === 0 ? (
            <p className="py-6 text-center text-xs text-gray-500 dark:text-gray-400">
              Замеры ещё не записывались.
            </p>
          ) : (
            <div className="mt-3 max-h-[460px] divide-y divide-gray-200 overflow-y-auto dark:divide-[#1E293B]">
              {history.slice(0, 20).map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between gap-2 py-2.5 text-xs"
                >
                  <div className="min-w-0">
                    <p className="break-words font-semibold text-[#111827] dark:text-[#F3F4F6]">
                      {entry.exerciseName}
                    </p>
                    <p className="text-[11px] text-gray-500 dark:text-gray-400">
                      {formatShortDate(entry.date)}
                    </p>
                  </div>
                  <div className="font-mono-num shrink-0 text-right">
                    <p className="font-bold text-[#111827] dark:text-[#F3F4F6]">
                      {formatMetricShort(entry.value, entry.metric)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      {pictureFor && onPickPicture && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setPictureFor(null)}>
          <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl dark:bg-[#0F1520]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Выбрать картинку">
            <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Картинка для</p>
            <h3 className="mb-3 text-base font-bold text-[#111827] dark:text-[#F3F4F6]">{pictureFor.name}</h3>
            <div className="grid grid-cols-3 gap-2">
              {pictureChoices.map((p) => (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => {
                    onPickPicture(pictureFor.id, p.key);
                    setPictureFor(null);
                  }}
                  className="tap-scale flex flex-col items-center gap-1 rounded-xl border border-gray-200 p-1.5 text-center dark:border-[#2A3548]"
                >
                  <ExerciseSvg svgKey={p.key} className="h-14 w-full" />
                  <span className="line-clamp-2 text-[10px] leading-tight text-gray-600 dark:text-gray-300">{p.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
