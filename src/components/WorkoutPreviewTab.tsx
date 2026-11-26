import React, { useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ArrowUp,
  Clock,
  Minus,
  Play,
  Plus,
  RotateCcw,
  ShieldAlert,
  Share2,
  Trash2,
} from 'lucide-react';
import {
  COOLDOWN_STEPS,
  RED_MOBILITY_EXERCISES,
  getWarmupPlan,
} from '../data/seed';
import { getMuscleLabel } from '../domain/catalog/muscles';
import { formatMetricTarget } from '../domain/format';
import { CATALOG } from '../data/catalog';
import { ResolvedItem, resolveWorkout } from '../domain/plan/resolveWorkout';
import { targetStep } from '../domain/plan/targets';
import { ACCENT_MINUTES, DEFAULT_ACCENT_MINUTES, dayPlan, dayTimes, estimateSeconds, ladderPosition, stepRank, stepToRank, swapExercise } from '../domain/generator';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/ru';
import {
  ActiveSession,
  Exercise,
  ReadinessLevel,
  WorkoutPlan,
} from '../types';
import { ExerciseSvg } from './ExerciseSvg';
import { LadderPicture } from './LadderPicture';

interface WorkoutPreviewTabProps {
  workouts: WorkoutPlan[];
  exercises: Exercise[];
  selectedWorkoutId: string;
  readiness: ReadinessLevel;
  profile?: import('../domain/generator').GeneratorProfile;
  accentMinutes?: number;
  warmupMinutes: number;
  activeSession: ActiveSession | null;
  onSelectWorkout: (id: string) => void;
  onDeleteWorkout: (id: string) => void;
  onUpdateWorkout: (plan: WorkoutPlan) => void;
  onChangeReadiness: (level: ReadinessLevel) => void;
  onChangeAccentMinutes: (minutes: number) => void;
  onShare?: (plan: WorkoutPlan) => void;
  onChangeWarmupMinutes: (mins: number) => void;
  onStartWorkout: () => void;
  onResumeWorkout: () => void;
  onDiscardActiveSession: () => void;
}

const PROTECTED_WORKOUT_IDS = new Set([
  'workout-a',
  'workout-b',
  'workout-c-agt',
]);

export const WorkoutPreviewTab: React.FC<WorkoutPreviewTabProps> = ({
  workouts,
  exercises,
  selectedWorkoutId,
  readiness,
  profile,
  accentMinutes = DEFAULT_ACCENT_MINUTES,
  warmupMinutes,
  activeSession,
  onSelectWorkout,
  onDeleteWorkout,
  onUpdateWorkout,
  onChangeReadiness,
  onChangeAccentMinutes,
  onShare,
  onChangeWarmupMinutes,
  onStartWorkout,
  onResumeWorkout,
  onDiscardActiveSession,
}) => {
  const { t } = useT();
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const selectedPlan =
    workouts.find((w) => w.id === selectedWorkoutId) ?? workouts[0];

  const isCustomWorkout = !PROTECTED_WORKOUT_IDS.has(selectedPlan.id);

  // Reset delete confirmation when switching workouts or after 3s timeout
  useEffect(() => {
    setConfirmDeleteId(null);
  }, [selectedPlan.id]);

  useEffect(() => {
    if (!confirmDeleteId) return;
    const timer = window.setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => window.clearTimeout(timer);
  }, [confirmDeleteId]);

  const handleDeleteClick = () => {
    if (!isCustomWorkout) return;
    if (confirmDeleteId === selectedPlan.id) {
      setConfirmDeleteId(null);
      onDeleteWorkout(selectedPlan.id);
    } else {
      setConfirmDeleteId(selectedPlan.id);
    }
  };

  const getExercise = (id: string) =>
    exercises.find((ex) => ex.id === id) ?? exercises[0];

  // The plan actually played today for the chosen mode (same as the start).
  const times = dayTimes(readiness, warmupMinutes);
  const today = dayPlan(selectedPlan, readiness, {
    catalog: CATALOG,
    accentMinutes,
    profile,
    ...times,
  });
  const todayPlan = today.plan;
  const effectiveRounds = readiness === 'red' ? 2 : todayPlan.rounds;

  // What will actually be played: plan slots resolved for this user (same
  // engine as the workout start), or the fixed red-day mobility block.
  const displayedItems: ResolvedItem[] =
    readiness === 'red'
      ? RED_MOBILITY_EXERCISES.map((it, i) => ({
          slotIndex: i,
          exerciseId: it.exerciseId,
          target: it.target,
        }))
      : resolveWorkout(todayPlan, { catalog: CATALOG, exercises });

  const catalogById = new Map(CATALOG.map((c) => [c.id, c]));
  const estimatedMinutes =
    readiness === 'red'
      ? 20
      : Math.round(
          estimateSeconds(todayPlan, catalogById, times) / 60
        );

  const headerFormatText =
    readiness === 'red'
      ? 'Mobility & Decompression · 20 min'
      : `${selectedPlan.formatLabel} · ${effectiveRounds} ${
          effectiveRounds === 1 ? 'Round' : 'Rounds'
        } · ~${estimatedMinutes} min`;

  const warmupOptions = [8, 10, 12, 15];
  const firstExerciseName = displayedItems[0]
    ? getExercise(displayedItems[0].exerciseId)?.name
    : undefined;
  const warmupPlan = getWarmupPlan(times.warmupMinutes, firstExerciseName);

  // The day's mode (GENERATOR_RULES §3.2), formerly the readiness traffic light.
  const readinessOptions: {
    id: ReadinessLevel;
    label: string;
    sub: string;
    dotColor: string;
    activeBorder: string;
    activeBg: string;
  }[] = [
    {
      id: 'green',
      label: t('mode.standard'),
      sub: t('mode.standard.sub'),
      dotColor: 'bg-[#16A34A]',
      activeBorder: 'border-[#16A34A] dark:border-[#22C55E]',
      activeBg: 'bg-[#F0FDF4] dark:bg-[#052E16]/55',
    },
    {
      id: 'yellow',
      label: t('mode.short'),
      sub: t('mode.short.sub'),
      dotColor: 'bg-[#D97706]',
      activeBorder: 'border-[#D97706] dark:border-[#F59E0B]',
      activeBg: 'bg-[#FFFBEB] dark:bg-[#451A03]/55',
    },
    {
      id: 'accent',
      label: t('mode.accent'),
      sub: t('mode.accent.sub', { min: accentMinutes }),
      dotColor: 'bg-[#0B5F73]',
      activeBorder: 'border-[#0B5F73] dark:border-[#5EC4D8]',
      activeBg: 'bg-[#ECFAFC] dark:bg-[#0B2E36]/60',
    },
    {
      id: 'red',
      label: t('mode.off'),
      sub: t('mode.off.sub'),
      dotColor: 'bg-[#DC2626]',
      activeBorder: 'border-[#DC2626] dark:border-[#EF4444]',
      activeBg: 'bg-[#FEF2F2] dark:bg-[#450A0A]/60',
    },
  ];

  const changeAccent = (delta: number) =>
    onChangeAccentMinutes(
      Math.min(ACCENT_MINUTES.max, Math.max(ACCENT_MINUTES.min, accentMinutes + delta))
    );
  const patternNames = (ps: string[]) =>
    ps.map((p) => t(('pattern.' + p) as TranslationKey)).join(', ');

  // Manual tuning of the coach's numbers ("couch tuning"): hidden for the red
  // mobility block and for AGT plans, where targets come from the Check-Up.
  // Hidden for the accent too: its rounds and order differ from the plan.
  const canTune = (readiness === 'green' || readiness === 'yellow') && !selectedPlan.useAgt30;
  const MAX_ROUNDS = 20;

  const withOriginal = (plan: WorkoutPlan): WorkoutPlan =>
    plan.original
      ? plan
      : {
          ...plan,
          original: {
            rounds: plan.rounds,
            items: plan.items.map((it) => ({ ...it })),
          },
        };

  const handleChangeRounds = (delta: number) => {
    const nextRounds = Math.min(
      MAX_ROUNDS,
      Math.max(1, selectedPlan.rounds + delta)
    );
    if (nextRounds === selectedPlan.rounds) return;
    onUpdateWorkout({ ...withOriginal(selectedPlan), rounds: nextRounds });
  };

  const handleChangeTarget = (idx: number, ex: Exercise, direction: 1 | -1) => {
    const { step, min } = targetStep(ex.metric);
    const current = selectedPlan.items[idx].target;
    const nextTarget = Math.max(min, current + direction * step);
    if (nextTarget === current) return;
    const base = withOriginal(selectedPlan);
    onUpdateWorkout({
      ...base,
      items: base.items.map((it, i) =>
        i === idx ? { ...it, target: nextTarget } : it
      ),
    });
  };

  // − / + around the picture: an easier / harder step on the ladder; «Другое»
  // swaps for another exercise of the same pattern. Both change the plan
  // (the original is kept for «Вернуть как было»), decided 26.11.
  const cond = profile?.usualConditions;
  const handleStepExercise = (idx: number, direction: 1 | -1) => {
    const base = withOriginal(selectedPlan);
    const next = stepRank(base, idx, direction, CATALOG, exercises, cond);
    if (next !== base) onUpdateWorkout(next);
  };
  const handleJumpExercise = (idx: number, rank: number) => {
    const base = withOriginal(selectedPlan);
    const next = stepToRank(base, idx, rank, CATALOG, exercises, cond);
    if (next !== base) onUpdateWorkout(next);
  };
  const handleSwapExercise = (idx: number) => {
    const base = withOriginal(selectedPlan);
    const next = swapExercise(base, idx, CATALOG, exercises, cond);
    if (next !== base) onUpdateWorkout(next);
  };

  const isTuned = Boolean(
    selectedPlan.original &&
      (selectedPlan.original.rounds !== selectedPlan.rounds ||
        selectedPlan.original.items.some(
          (it, i) => it.target !== selectedPlan.items[i]?.target || it.exerciseId !== selectedPlan.items[i]?.exerciseId
        ))
  );

  const handleResetToCoachPlan = () => {
    if (!selectedPlan.original) return;
    const { original, ...rest } = selectedPlan;
    onUpdateWorkout({
      ...rest,
      rounds: original.rounds,
      items: original.items.map((it) => ({ ...it })),
    });
  };

  const stepBtnClass =
    'tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#111827] active:bg-gray-100 disabled:opacity-35 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-[#F3F4F6] dark:active:bg-[#243044]';

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 pt-3 pb-32 sm:px-5 landscape:px-5 landscape:pb-12">
      {/* Resume Autosaved Active Session Banner */}
      {activeSession && (
        <div className="flex flex-col gap-2.5 rounded-2xl border border-[#DC2626]/30 bg-[#FEF2F2] p-3.5 dark:border-[#EF4444]/35 dark:bg-[#450A0A]/50 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-[#DC2626] dark:text-[#F87171]">
              Незавершённая тренировка
            </p>
            <p className="mt-0.5 truncate text-xs font-semibold text-[#111827] dark:text-[#F3F4F6] sm:text-sm">
              {activeSession.workoutTitle} · Круг {activeSession.currentRound}/
              {activeSession.totalRounds} · Подходов:{' '}
              <span className="tabular-nums">{activeSession.logs.length}</span>
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={onDiscardActiveSession}
              className="tap-scale flex min-h-[44px] items-center justify-center gap-1 rounded-xl border border-gray-300 bg-white px-3 text-xs font-semibold text-gray-700 hover:bg-gray-50 dark:border-[#334155] dark:bg-[#1A2333] dark:text-gray-200 dark:hover:bg-[#232F44]"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Сброс
            </button>
            <button
              type="button"
              onClick={onResumeWorkout}
              className="tap-scale flex min-h-[44px] items-center justify-center gap-1.5 rounded-xl bg-[#DC2626] px-3.5 text-xs font-semibold text-white hover:bg-[#B91C1C]"
            >
              <Play className="h-3.5 w-3.5 fill-current" />
              Продолжить
            </button>
          </div>
        </div>
      )}

      {/* TOP CONTROL HERO BLOCK (Constrained to 1 screen height with scrollable left workout list) */}
      <div className="flex flex-col gap-3 landscape:grid landscape:h-[calc(100dvh-88px)] landscape:max-h-[365px] landscape:grid-cols-[175px_minmax(0,1fr)_175px] landscape:items-stretch landscape:gap-3 lg:h-[calc(100dvh-110px)] lg:max-h-[400px] lg:landscape:h-[calc(100dvh-110px)] lg:landscape:max-h-[400px] lg:grid-cols-[235px_minmax(0,1fr)_225px] lg:gap-5">
        {/* LEFT COLUMN (Landscape & Desktop): Scrollable stack of workout plans */}
        <div className="hidden min-h-0 flex-col gap-1.5 overflow-y-auto pr-1 landscape:flex">
          {workouts.map((plan) => {
            const isSelected = plan.id === selectedPlan.id;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => onSelectWorkout(plan.id)}
                className={`tap-scale flex min-h-[54px] shrink-0 flex-col items-start justify-center rounded-2xl border px-3 py-2 text-left transition-colors lg:min-h-[62px] ${
                  isSelected
                    ? 'border-[#111827] bg-[#111827] text-white shadow-sm dark:border-[#F3F4F6] dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                    : 'border-gray-200 bg-white text-[#111827] hover:border-gray-300 dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6] dark:hover:border-[#475569]'
                }`}
              >
                <span className="w-full truncate text-xs font-bold lg:text-sm">
                  {plan.title}
                </span>
                <span
                  className={`font-mono-num mt-0.5 text-[11px] ${
                    isSelected
                      ? 'text-gray-300 dark:text-gray-600'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {plan.rounds} {plan.rounds === 1 ? 'круг' : 'круга'} ·{' '}
                  {plan.items.length} упр.
                </span>
              </button>
            );
          })}
        </div>

        {/* PORTRAIT-ONLY Controls: Workout row + Traffic Light row */}
        <div className="space-y-3 landscape:hidden">
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                План тренировки ({workouts.length})
              </span>
              <span className="font-mono-num text-xs text-gray-500 dark:text-gray-400">
                Отдых: {todayPlan.restBetweenExercises}с /{' '}
                {todayPlan.restBetweenRounds}с
              </span>
            </div>
            <div className="grid max-h-[126px] grid-cols-3 gap-1.5 overflow-y-auto pr-0.5 sm:gap-2">
              {workouts.map((plan) => {
                const isSelected = plan.id === selectedPlan.id;
                return (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => onSelectWorkout(plan.id)}
                    className={`tap-scale flex min-h-[50px] w-full min-w-0 flex-col items-center justify-center rounded-2xl px-1.5 py-2 text-center transition-colors ${
                      isSelected
                        ? 'border-2 border-[#111827] bg-[#111827] text-white shadow-sm dark:border-[#F3F4F6] dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                        : 'border border-gray-300 bg-gray-50/70 text-[#111827] hover:border-gray-400 dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6] dark:hover:border-[#475569]'
                    }`}
                    title={plan.title}
                  >
                    <span className="line-clamp-2 w-full whitespace-normal break-words text-[12px] font-bold leading-tight">
                      {plan.title}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <span className="mb-1.5 block text-xs font-semibold text-gray-500 dark:text-gray-400">
              {t('mode.title')}
            </span>
            <div className="grid grid-cols-4 gap-1 sm:gap-2">
              {readinessOptions.map((opt) => {
                const active = readiness === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => onChangeReadiness(opt.id)}
                    className={`tap-scale flex min-h-[54px] w-full min-w-0 flex-col items-start justify-center overflow-hidden rounded-2xl px-2 py-2 text-left transition-colors sm:px-3 ${
                      active
                        ? `border-2 ${opt.activeBorder} ${opt.activeBg} text-[#111827] shadow-2xs dark:text-[#F3F4F6]`
                        : 'border border-gray-300 bg-gray-50/50 text-[#111827] hover:border-gray-400 dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#E5E7EB] dark:hover:border-[#475569]'
                    }`}
                  >
                    <span className="flex w-full min-w-0 items-center gap-1 text-[11px] font-bold leading-tight sm:gap-1.5 sm:text-xs">
                      <span
                        className={`inline-block h-2 w-2 shrink-0 rounded-full sm:h-2.5 sm:w-2.5 ${opt.dotColor}`}
                        aria-hidden="true"
                      />
                      <span className="min-w-0 break-words">{opt.label}</span>
                    </span>
                    <span className="mt-0.5 w-full break-words text-[10px] font-medium leading-tight text-gray-600 dark:text-gray-400 sm:text-[11px]">
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* CENTER COLUMN (Landscape: Highlighted active workout + START) / DESCRIPTION CARD (Portrait) */}
        <section className="flex min-h-0 flex-col justify-between rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#263248] dark:bg-[#131A26] landscape:border-2 landscape:border-[#111827] landscape:bg-gray-50/70 landscape:p-3.5 dark:landscape:border-[#475569] dark:landscape:bg-[#141C2A] lg:landscape:p-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h1 className="font-display text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6] landscape:text-[clamp(1.5rem,4.5dvh,2.25rem)] lg:text-4xl">
                {readiness === 'red' ? 'Recovery Mobility' : selectedPlan.title}
              </h1>

              <div className="flex items-center gap-2">
                <span className="font-mono-num text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Отдых:{' '}
                  {readiness === 'red' ? 20 : todayPlan.restBetweenExercises}
                  с /{' '}
                  {readiness === 'red' ? 45 : todayPlan.restBetweenRounds}с
                </span>

                {onShare && readiness !== 'red' && (
                  <button
                    type="button"
                    onClick={() => onShare(selectedPlan)}
                    aria-label="Поделиться тренировкой"
                    title="Поделиться"
                    className="tap-scale flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-[#111827] dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-gray-400"
                  >
                    <Share2 className="h-3.5 w-3.5" />
                  </button>
                )}
                {isCustomWorkout && readiness !== 'red' && (
                  <button
                    type="button"
                    onClick={handleDeleteClick}
                    title={
                      confirmDeleteId === selectedPlan.id
                        ? 'Нажмите ещё раз для удаления'
                        : 'Удалить импортированный план'
                    }
                    aria-label="Удалить импортированный план"
                    className={`tap-scale flex h-8 shrink-0 items-center justify-center gap-1 rounded-xl border px-2 text-[11px] font-bold transition-colors ${
                      confirmDeleteId === selectedPlan.id
                        ? 'border-[#DC2626] bg-[#DC2626] text-white'
                        : 'border-gray-200 bg-white text-gray-400 hover:border-[#DC2626]/40 hover:text-[#DC2626] dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-gray-400 dark:hover:border-[#EF4444]/40 dark:hover:text-[#F87171]'
                    }`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {confirmDeleteId === selectedPlan.id && (
                      <span>Удалить?</span>
                    )}
                  </button>
                )}
              </div>
            </div>

            <p className="font-mono-num mt-1 text-xs font-semibold text-[#DC2626] dark:text-[#F87171] sm:text-sm">
              {headerFormatText}
            </p>
            <p className="mt-1 line-clamp-2 text-xs text-gray-600 dark:text-gray-300 sm:text-sm">
              {readiness === 'red'
                ? 'Мягкая мобилизация суставов, вис на перекладине и дыхание без закисления.'
                : selectedPlan.subtitle}
            </p>

            {readiness === 'accent' && (
              <div className="mt-2 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                    {t('mode.accent.minutes')}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeAccent(-ACCENT_MINUTES.step)}
                    disabled={accentMinutes <= ACCENT_MINUTES.min}
                    className={stepBtnClass}
                    aria-label={t('mode.accent.less')}
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="font-mono-num min-w-[4.5rem] text-center text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                    {t('mode.accent.value', { min: accentMinutes })}
                  </span>
                  <button
                    type="button"
                    onClick={() => changeAccent(ACCENT_MINUTES.step)}
                    disabled={accentMinutes >= ACCENT_MINUTES.max}
                    className={stepBtnClass}
                    aria-label={t('mode.accent.more')}
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {today.dropped.length > 0 && (
                  <p className="rounded-xl border border-[#0B5F73]/30 bg-[#ECFAFC] p-2 text-[11px] leading-snug text-[#0B5F73] dark:border-[#5EC4D8]/30 dark:bg-[#0B2E36]/60 dark:text-[#5EC4D8] lg:text-xs">
                    {t('mode.accent.dropped', { list: patternNames(today.dropped) })}
                  </p>
                )}
              </div>
            )}

            {readiness === 'red' && (
              <div className="mt-2 flex items-start gap-2 rounded-xl border border-gray-200 bg-white p-2 text-[11px] text-gray-700 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-gray-200 lg:text-xs">
                <ShieldAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#DC2626] dark:text-[#F87171]" />
                <span className="line-clamp-2">
                  Режим восстановления: 20-минутный блок разминки, виса и
                  мягкого кора.
                </span>
              </div>
            )}
          </div>

          {/* START WORKOUT button inside workout description card */}
          <div className="mt-3.5 pt-1 landscape:mt-3">
            <button
              type="button"
              onClick={onStartWorkout}
              className="tap-scale flex min-h-[50px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-5 text-base font-bold tracking-wide text-white shadow-sm hover:bg-[#B91C1C] landscape:min-h-[46px] landscape:text-sm lg:min-h-[54px] lg:landscape:text-base"
            >
              <Play className="h-5 w-5 fill-current landscape:h-4 landscape:w-4 lg:landscape:h-5 lg:landscape:w-5" />
              START WORKOUT
            </button>
          </div>
        </section>

        {/* RIGHT COLUMN (Landscape): the day's mode, 4 options with descriptions */}
        <div className="hidden min-h-0 flex-col landscape:flex">
          <span className="mb-1.5 px-0.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
            {t('mode.title')}
          </span>
          <div className="flex flex-1 flex-col gap-1.5">
            {readinessOptions.map((opt) => {
              const active = readiness === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => onChangeReadiness(opt.id)}
                  className={`tap-scale flex min-h-[46px] flex-1 flex-col items-start justify-center rounded-2xl border px-3 py-1.5 text-left transition-colors ${
                    active
                      ? `${opt.activeBorder} ${opt.activeBg} text-[#111827] shadow-xs dark:text-[#F3F4F6]`
                      : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-[#263248] dark:bg-[#131A26] dark:text-gray-300 dark:hover:border-[#475569]'
                  }`}
                >
                  <span className="flex items-center gap-2 text-xs font-bold lg:text-sm">
                    <span
                      className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${opt.dotColor}`}
                      aria-hidden="true"
                    />
                    {opt.label}
                  </span>
                  <span className="font-mono-num mt-0.5 pl-4.5 text-[11px] font-medium text-gray-600 dark:text-gray-400">
                    {opt.sub}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FULL-WIDTH EXERCISE FLOW BELOW */}
      <div className="space-y-4">
        {/* 1) Warm-Up Cards */}
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Этап 1 · {warmupPlan.label}
              </p>
              <h2 className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6] sm:text-base">
                Warm-Up (Разминка)
              </h2>
            </div>
            {times.warmupMinutes !== warmupMinutes ? (
              <span className="font-mono-num rounded-xl bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-600 dark:bg-[#131A26] dark:text-gray-300">
                {times.warmupMinutes}м
              </span>
            ) : (
            <div className="flex items-center gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 dark:border-[#263248] dark:bg-[#131A26]">
              {warmupOptions.map((mins) => (
                <button
                  key={mins}
                  type="button"
                  onClick={() => onChangeWarmupMinutes(mins)}
                  className={`tap-scale font-mono-num min-h-[36px] min-w-[40px] rounded-lg px-2 text-xs font-semibold transition-colors ${
                    warmupMinutes === mins
                      ? 'bg-white text-[#111827] shadow-sm dark:bg-[#2C3A52] dark:text-white'
                      : 'text-gray-600 hover:text-[#111827] dark:text-gray-400 dark:hover:text-[#F3F4F6]'
                  }`}
                >
                  {mins}м
                </button>
              ))}
            </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 landscape:gap-2">
            {warmupPlan.steps.map((step, idx) => (
              <article
                key={step.id}
                className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26] landscape:flow-root landscape:p-3"
              >
                <div className="landscape:float-left landscape:mr-3.5 landscape:mb-0.5 landscape:w-[46%] landscape:max-w-[50%] lg:landscape:w-[340px]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-num shrink-0 text-sm font-bold text-[#DC2626] dark:text-[#F87171] landscape:text-xs">
                      0{idx + 1}
                    </span>
                    <h3 className="min-w-0 break-words text-lg font-bold leading-snug text-[#111827] dark:text-[#F3F4F6] landscape:text-base landscape:leading-tight">
                      {step.name}
                    </h3>
                  </div>

                  {step.subtitle && (
                    <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400 landscape:hidden">
                      {step.subtitle}
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between gap-3 landscape:mt-1.5 landscape:justify-start landscape:gap-3">
                    <ExerciseSvg
                      svgKey={step.svgKey}
                      className="h-16 w-24 shrink-0 landscape:h-11 landscape:w-16"
                    />
                    <div className="flex items-baseline gap-1.5 text-right landscape:text-left">
                      <p className="font-mono-num text-2xl font-bold leading-none text-[#111827] dark:text-[#F3F4F6] landscape:text-xl">
                        {step.durationHint}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 border-t border-gray-100 pt-2.5 text-[13px] leading-relaxed text-gray-700 dark:border-[#1E293B] dark:text-gray-300 landscape:mt-0 landscape:border-t-0 landscape:pt-0 landscape:text-xs landscape:leading-snug">
                  {step.cue}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* 2) Main Exercise Cards */}
        <section className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2 px-0.5">
            <h2 className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
              {readiness === 'red'
                ? 'Блок мобильности · 2 круга'
                : `Основной блок · ${effectiveRounds} ${
                    effectiveRounds === 1 ? 'круг' : 'круга'
                  }`}
              {(readiness === 'yellow' || readiness === 'accent') && todayPlan.rounds !== selectedPlan.rounds && (
                <span className="ml-1.5 text-xs font-medium text-gray-500 dark:text-gray-400">
                  (по плану {selectedPlan.rounds})
                </span>
              )}
            </h2>

            {canTune && (
              <div className="flex items-center gap-1.5">
                {isTuned && (
                  <button
                    type="button"
                    onClick={handleResetToCoachPlan}
                    className="tap-scale flex min-h-[36px] items-center gap-1 rounded-lg px-2 text-xs font-semibold text-[#DC2626] dark:text-[#F87171]"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Вернуть как было
                  </button>
                )}
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                  Круги
                </span>
                <button
                  type="button"
                  onClick={() => handleChangeRounds(-1)}
                  disabled={selectedPlan.rounds <= 1}
                  className={stepBtnClass}
                  aria-label="Убрать круг"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="font-mono-num min-w-[1.75rem] text-center text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                  {selectedPlan.rounds}
                </span>
                <button
                  type="button"
                  onClick={() => handleChangeRounds(1)}
                  disabled={selectedPlan.rounds >= MAX_ROUNDS}
                  className={stepBtnClass}
                  aria-label="Добавить круг"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 gap-2.5 landscape:gap-2">
            {displayedItems.map((item, idx) => {
              const ex = getExercise(item.exerciseId);
              const plannedTarget = item.target;
              const planTarget =
                todayPlan.items[item.slotIndex]?.target ?? item.target;

              return (
                <article
                  key={`${item.exerciseId}-${idx}`}
                  className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26] landscape:flow-root landscape:p-3"
                >
                  <div className="landscape:float-left landscape:mr-3.5 landscape:mb-0.5 landscape:w-[46%] landscape:max-w-[50%] lg:landscape:w-[340px]">
                    <div className="flex items-baseline gap-2">
                      <span className="font-mono-num shrink-0 text-sm font-bold text-[#DC2626] dark:text-[#F87171] landscape:text-xs">
                        0{idx + 1}
                      </span>
                      <h3 className="min-w-0 break-words text-lg font-bold leading-snug text-[#111827] dark:text-[#F3F4F6] landscape:text-base landscape:leading-tight">
                        {ex.name}
                      </h3>
                    </div>

                    <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400 landscape:hidden">
                      {ex.target_muscles.map(getMuscleLabel).join(' · ')}
                      {ex.isPaired ? ' · на каждую сторону' : ''}
                    </p>

                    <div className="mt-2.5 flex items-center justify-between gap-3 landscape:mt-1.5 landscape:justify-start landscape:gap-3">
                      {canTune ? (
                        <LadderPicture
                          svgKey={ex.svgKey}
                          name={ex.name}
                          ladder={ladderPosition(ex.id, CATALOG, cond)}
                          onStep={(dir) => handleStepExercise(item.slotIndex, dir)}
                          onJump={(rank) => handleJumpExercise(item.slotIndex, rank)}
                          onSwap={() => handleSwapExercise(item.slotIndex)}
                          className="h-20 w-full landscape:h-12"
                        />
                      ) : (
                        <ExerciseSvg
                          svgKey={ex.svgKey}
                          className="h-16 w-24 shrink-0 landscape:h-11 landscape:w-16"
                        />
                      )}
                      <div className="flex items-center gap-1.5 text-right landscape:text-left">
                        {canTune && (
                          <button
                            type="button"
                            onClick={() => handleChangeTarget(item.slotIndex, ex, -1)}
                            disabled={
                              planTarget <= targetStep(ex.metric).min
                            }
                            className={stepBtnClass}
                            aria-label={`Уменьшить цель: ${ex.name}`}
                          >
                            <Minus className="h-4 w-4" />
                          </button>
                        )}
                        <div className="flex items-baseline gap-1.5">
                          <p className="font-mono-num text-2xl font-bold leading-none text-[#111827] dark:text-[#F3F4F6] landscape:text-xl">
                            {formatMetricTarget(plannedTarget, ex.metric)}
                          </p>
                          {ex.isPaired && (
                            <span className="hidden text-[11px] font-medium text-gray-500 dark:text-gray-400 landscape:inline">
                              на сторону
                            </span>
                          )}
                        </div>
                        {canTune && (
                          <button
                            type="button"
                            onClick={() => handleChangeTarget(item.slotIndex, ex, 1)}
                            className={stepBtnClass}
                            aria-label={`Увеличить цель: ${ex.name}`}
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="mt-2.5 border-t border-gray-100 pt-2.5 text-[13px] leading-relaxed text-gray-700 dark:border-[#1E293B] dark:text-gray-300 landscape:mt-0 landscape:border-t-0 landscape:pt-0 landscape:text-xs landscape:leading-snug">
                    {ex.details ?? ex.cue}
                  </p>
                </article>
              );
            })}
          </div>
        </section>

        {/* 3) Cool-Down Cards */}
        <section className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div>
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">
                Этап 3 · Восстановление
              </p>
              <h2 className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6] sm:text-base">
                Cool-Down (Заминка)
              </h2>
            </div>
            <div className="flex items-center gap-1.5 font-mono-num text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">
              <Clock className="h-4 w-4 text-[#DC2626] dark:text-[#F87171]" />
              05:00
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2.5 landscape:gap-2">
            {COOLDOWN_STEPS.map((step, idx) => (
              <article
                key={step.id}
                className="min-w-0 rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26] landscape:flow-root landscape:p-3"
              >
                <div className="landscape:float-left landscape:mr-3.5 landscape:mb-0.5 landscape:w-[46%] landscape:max-w-[50%] lg:landscape:w-[340px]">
                  <div className="flex items-baseline gap-2">
                    <span className="font-mono-num shrink-0 text-sm font-bold text-[#DC2626] dark:text-[#F87171] landscape:text-xs">
                      0{idx + 1}
                    </span>
                    <h3 className="min-w-0 break-words text-lg font-bold leading-snug text-[#111827] dark:text-[#F3F4F6] landscape:text-base landscape:leading-tight">
                      {step.name}
                    </h3>
                  </div>

                  {step.subtitle && (
                    <p className="mt-1 break-words text-xs text-gray-500 dark:text-gray-400 landscape:hidden">
                      {step.subtitle}
                    </p>
                  )}

                  <div className="mt-2.5 flex items-center justify-between gap-3 landscape:mt-1.5 landscape:justify-start landscape:gap-3">
                    <ExerciseSvg
                      svgKey={step.svgKey}
                      className="h-16 w-24 shrink-0 landscape:h-11 landscape:w-16"
                    />
                    <div className="flex items-baseline gap-1.5 text-right landscape:text-left">
                      <p className="font-mono-num text-2xl font-bold leading-none text-[#111827] dark:text-[#F3F4F6] landscape:text-xl">
                        {step.durationHint}
                      </p>
                    </div>
                  </div>
                </div>

                <p className="mt-2.5 border-t border-gray-100 pt-2.5 text-[13px] leading-relaxed text-gray-700 dark:border-[#1E293B] dark:text-gray-300 landscape:mt-0 landscape:border-t-0 landscape:pt-0 landscape:text-xs landscape:leading-snug">
                  {step.cue}
                </p>
              </article>
            ))}
          </div>
        </section>

        {/* Quick Scroll Back Up to Workout / Readiness Selection */}
        <div className="flex justify-center pt-1">
          <button
            type="button"
            onClick={scrollToTop}
            className="tap-scale flex min-h-[44px] items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 px-4 text-xs font-semibold text-gray-700 hover:bg-gray-100 dark:border-[#263248] dark:bg-[#131A26] dark:text-gray-200 dark:hover:bg-[#1A2333]"
          >
            <ArrowUp className="h-3.5 w-3.5 text-[#DC2626] dark:text-[#F87171]" />
            Наверх к выбору тренировки и состояния
          </button>
        </div>
      </div>
    </div>
  );
};