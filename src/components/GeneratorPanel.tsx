import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Sparkles } from 'lucide-react';
import { CATALOG } from '../data/catalog';
import { formatMetricTarget } from '../domain/format';
import {
  DEFAULT_REQUEST, GenLevel, GenPeriod, GenRequest, GeneratedWorkout, runGenerator, toWorkoutPlans,
} from '../domain/generator';
import { MovementPattern } from '../domain/catalog/types';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/ru';
import { Exercise, WorkoutLog, WorkoutPlan } from '../types';

interface GeneratorPanelProps {
  exercises: Exercise[];
  logs: WorkoutLog[];
  onAdd: (plans: WorkoutPlan[]) => void;
}

const PERIODS: GenPeriod[] = ['single', 'week', 'month'];
const LEVELS: GenLevel[] = ['warmup', 'agt', 'full'];
const PER_WEEK = [1, 2, 3, 4, 5];

const todayIso = () => new Date().toISOString().slice(0, 10);

const chip = (active: boolean) =>
  `tap-scale min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold transition-colors ${
    active
      ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
      : 'bg-gray-100 text-gray-600 hover:text-[#111827] dark:bg-[#131A26] dark:text-gray-300 dark:hover:text-[#F3F4F6]'
  }`;

/**
 * Generator screen (PRODUCT_MAP_V3 §3.3, step 1): the period and level
 * questions, the engine's base right away, "Done — add to Workouts".
 */
export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({ exercises, logs, onAdd }) => {
  const { t } = useT();
  const [req, setReq] = useState<GenRequest>(DEFAULT_REQUEST);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([0]));
  const date = todayIso();

  const result = useMemo(
    () => runGenerator(req, { catalog: CATALOG, exercises, logs, date }),
    [req, exercises, logs, date]
  );
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const patternList = (ps: MovementPattern[]) => ps.map((p) => t(`pattern.${p}` as TranslationKey)).join(', ');

  const label = (gw: GeneratedWorkout, week?: number) => {
    const kind = t(`gen.kind.${gw.kind}` as TranslationKey);
    return {
      title: week ? `${t('gen.week', { n: week })} · ${kind}` : kind,
      subtitle: gw.focus.length ? t('gen.focus', { list: patternList(gw.focus) }) : '',
      formatLabel: t(`gen.format.${gw.component}` as TranslationKey),
    };
  };

  const set = (patch: Partial<GenRequest>) => setReq((r) => ({ ...r, ...patch }));
  const showPerWeek = req.period !== 'single';
  const many = result.weeks.length > 1;

  const card = (gw: GeneratedWorkout) => (
    <article
      key={gw.plan.id}
      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
          {t(`gen.kind.${gw.kind}` as TranslationKey)}
        </h3>
        <p className="font-mono-num shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
          {t('gen.meta', { rounds: gw.plan.rounds, min: Math.round(gw.estimateSec / 60) })}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {t(`gen.format.${gw.component}` as TranslationKey)}
        {gw.focus.length > 0 && ` · ${t('gen.focus', { list: patternList(gw.focus) })}`}
        {gw.deload && ` · ${t('gen.deload')}`}
        {gw.checkpoint && ` · ${t('gen.checkpoint')}`}
      </p>
      <ol className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 dark:border-[#1E293B]">
        {gw.plan.items.map((it, i) => {
          const ex = exById.get(it.exerciseId!);
          return (
            <li key={`${it.exerciseId}-${i}`} className="flex items-baseline justify-between gap-3 text-sm">
              <span className="min-w-0 text-[#111827] dark:text-[#F3F4F6]">
                <span className="font-mono-num mr-2 text-xs text-gray-400">{i + 1}</span>
                {ex?.name ?? it.exerciseId}
              </span>
              <span className="font-mono-num shrink-0 font-semibold text-[#DC2626] dark:text-[#F87171]">
                {ex ? formatMetricTarget(it.target, ex.metric) : it.target}
                {ex?.isPaired ? ' ×2' : ''}
              </span>
            </li>
          );
        })}
      </ol>
    </article>
  );

  return (
    <section className="mx-auto max-w-6xl px-5 pt-5">
      <div className="border-b border-gray-200 pb-4 dark:border-[#1E293B]">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('gen.eyebrow')}</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
          {t('gen.title')}
        </h1>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('gen.period')}</p>
          <div className="flex gap-1.5">
            {PERIODS.map((p) => (
              <button key={p} type="button" className={chip(req.period === p)} onClick={() => set({ period: p })}>
                {t(`gen.period.${p}` as TranslationKey)}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('gen.level')}</p>
          <div className="flex gap-1.5">
            {LEVELS.map((l) => (
              <button key={l} type="button" className={chip(req.level === l)} onClick={() => set({ level: l })}>
                {t(`gen.level.${l}` as TranslationKey)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t(`gen.level.hint.${req.level}` as TranslationKey)}
          </p>
        </div>
        {showPerWeek && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('gen.perWeek')}</p>
            <div className="flex gap-1.5">
              {PER_WEEK.map((n) => (
                <button key={n} type="button" className={chip(req.perWeek === n)} onClick={() => set({ perWeek: n })}>
                  {n === 5 ? '5+' : n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {showPerWeek && req.level !== 'warmup' && (
        <p
          className={`mt-4 flex items-start gap-2 text-sm ${
            result.covered ? 'text-[#0B5F73] dark:text-[#5EC4D8]' : 'text-amber-700 dark:text-amber-400'
          }`}
        >
          {result.covered ? <Check className="mt-0.5 h-4 w-4 shrink-0" /> : <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />}
          {result.covered ? t('gen.covered') : t('gen.debt', { list: patternList(result.debt) })}
        </p>
      )}

      <div className="mt-4 space-y-4">
        {result.weeks.map((week, wi) => {
          const open = !many || openWeeks.has(wi);
          return (
            <div key={wi}>
              {many && (
                <button
                  type="button"
                  onClick={() =>
                    setOpenWeeks((s) => {
                      const n = new Set(s);
                      if (n.has(wi)) n.delete(wi);
                      else n.add(wi);
                      return n;
                    })
                  }
                  className="tap-scale mb-2 flex min-h-[44px] w-full items-center justify-between rounded-xl bg-gray-50 px-3 text-left text-sm font-bold text-[#111827] dark:bg-[#131A26] dark:text-[#F3F4F6]"
                >
                  <span>
                    {t('gen.week', { n: wi + 1 })}
                    <span className="ml-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      {week[0]?.deload ? t('gen.deload') : wi > 0 ? t('gen.weekSame') : ''}
                    </span>
                  </span>
                  <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
                </button>
              )}
              {open && <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">{week.map(card)}</div>}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
        <button
          type="button"
          onClick={() => onAdd(toWorkoutPlans(result, label))}
          className="tap-scale flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-5 text-sm font-bold text-white hover:bg-[#B91C1C]"
        >
          <Check className="h-4 w-4" />
          {t('gen.add')}
        </button>
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('gen.replaceNote')}</p>
      </div>

      <h2 className="font-display mt-10 border-t border-gray-200 pt-6 text-xl font-bold text-[#111827] dark:border-[#1E293B] dark:text-[#F3F4F6]">
        {t('gen.catalogTitle')}
      </h2>
    </section>
  );
};
