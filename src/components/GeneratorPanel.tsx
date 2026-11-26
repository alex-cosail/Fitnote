import React, { useMemo, useState } from 'react';
import { Check, ChevronDown, Heart, Minus, Pencil, Plus, Sparkles } from 'lucide-react';
import { CATALOG } from '../data/catalog';
import { formatMetricTarget } from '../domain/format';
import {
  Component, DEFAULT_PROFILE, DEFAULT_REQUEST, GenLevel, GenPeriod, GenRequest, GeneratedWorkout,
  changeRounds, changeTarget, estimateSeconds, ladderPosition, runGenerator, stepRank, stepToRank, swapExercise, toWorkoutPlans,
} from '../domain/generator';
import { MovementPattern } from '../domain/catalog/types';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/ru';
import { Exercise, WorkoutLog, WorkoutPlan } from '../types';
import { CreateOwnPanel } from './CreateOwnPanel';
import { UserProfile, requestFor, toGeneratorProfile } from '../domain/profile/profile';
import { ExerciseStepCard } from './ExerciseStepCard';

interface GeneratorPanelProps {
  exercises: Exercise[];
  profile?: UserProfile;
  logs: WorkoutLog[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onAdd: (plans: WorkoutPlan[]) => void;
  onSaveOwn: (plan: WorkoutPlan) => void;
}

const PERIODS: GenPeriod[] = ['single', 'week', 'month'];
const LEVELS: GenLevel[] = ['warmup', 'agt', 'full'];
const PER_WEEK = [1, 2, 3, 4, 5];
export const LEVEL_COMPONENT: Record<GenLevel, Component> = { warmup: 'M', agt: 'F', full: 'S' };

const todayIso = () => new Date().toISOString().slice(0, 10);

export const chipClass = (active: boolean) =>
  `tap-scale min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold transition-colors ${
    active
      ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
      : 'bg-gray-100 text-gray-600 hover:text-[#111827] dark:bg-[#131A26] dark:text-gray-300 dark:hover:text-[#F3F4F6]'
  }`;

export const iconBtn =
  'tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#111827] disabled:opacity-35 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-[#F3F4F6]';

/**
 * Generator screen (PRODUCT_MAP_V3 §3.3): the period and level questions,
 * the engine's base right away; «Редактировать» it or «Создать свою»;
 * "Done — add to Workouts".
 */
export const GeneratorPanel: React.FC<GeneratorPanelProps> = ({
  exercises, profile, logs, favorites, onToggleFavorite, onAdd, onSaveOwn,
}) => {
  const { t } = useT();
  const [tab, setTab] = useState<'base' | 'own'>('base');
  // The questions' defaults come from the person's profile.
  const [req, setReq] = useState<GenRequest>(() => requestFor(profile));
  const genProfile = useMemo(() => toGeneratorProfile(profile, favorites), [profile, favorites]);
  const [openWeeks, setOpenWeeks] = useState<Set<number>>(new Set([0]));
  const [draft, setDraft] = useState<WorkoutPlan[] | null>(null); // editing the base
  const date = todayIso();

  const result = useMemo(
    () => runGenerator(req, { catalog: CATALOG, exercises, logs, date, profile: genProfile }),
    [req, exercises, logs, date, genProfile]
  );
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const catalogById = useMemo(() => new Map(CATALOG.map((c) => [c.id, c])), []);
  const patternList = (ps: MovementPattern[]) => ps.map((p) => t(`pattern.${p}` as TranslationKey)).join(', ');

  const label = (gw: GeneratedWorkout, week?: number) => {
    const kind = t(`gen.kind.${gw.kind}` as TranslationKey);
    return {
      title: week ? `${t('gen.week', { n: week })} · ${kind}` : kind,
      subtitle: gw.focus.length ? t('gen.focus', { list: patternList(gw.focus) }) : '',
      formatLabel: t(`gen.format.${gw.component}` as TranslationKey),
    };
  };

  const generated = useMemo(() => toWorkoutPlans(result, label), [result, t]); // eslint-disable-line react-hooks/exhaustive-deps
  const plans = draft ?? generated;
  const metas = result.weeks.flat();

  const set = (patch: Partial<GenRequest>) => {
    setDraft(null);
    setReq((r) => ({ ...r, ...patch }));
  };
  const edit = (i: number, fn: (p: WorkoutPlan) => WorkoutPlan) =>
    setDraft((d) => (d ?? generated).map((p, j) => (j === i ? fn(p) : p)));
  const cond = genProfile.usualConditions;

  const showPerWeek = req.period !== 'single';
  const many = result.weeks.length > 1;
  const editing = draft !== null;

  const card = (plan: WorkoutPlan, gw: GeneratedWorkout, index: number) => (
    <article
      key={plan.id}
      className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-[#232E42] dark:bg-[#131A26]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
          {t(`gen.kind.${gw.kind}` as TranslationKey)}
        </h3>
        <p className="font-mono-num shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
          {t('gen.meta', { rounds: plan.rounds, min: Math.round(estimateSeconds(plan, catalogById) / 60) })}
        </p>
      </div>
      <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
        {t(`gen.format.${gw.component}` as TranslationKey)}
        {gw.focus.length > 0 && ` · ${t('gen.focus', { list: patternList(gw.focus) })}`}
        {gw.deload && ` · ${t('gen.deload')}`}
        {gw.checkpoint && ` · ${t('gen.checkpoint')}`}
      </p>
      {editing && (
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('gen.edit.rounds')}</span>
          <button type="button" className={iconBtn} onClick={() => edit(index, (p) => changeRounds(p, -1))} disabled={plan.rounds <= 1} aria-label={t('gen.edit.roundsLess')}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="font-mono-num w-6 text-center text-sm font-bold">{plan.rounds}</span>
          <button type="button" className={iconBtn} onClick={() => edit(index, (p) => changeRounds(p, 1))} disabled={plan.rounds >= 20} aria-label={t('gen.edit.roundsMore')}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
      )}
      {editing ? (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-[#1E293B]">
          {plan.items.map((it, i) => {
            const ex = exById.get(it.exerciseId!);
            if (!ex) return null;
            return (
              <ExerciseStepCard
                key={`${it.exerciseId}-${i}`}
                exercise={ex}
                target={it.target}
                ladder={ladderPosition(ex.id, CATALOG, cond)}
                favorite={favorites.includes(ex.id)}
                onTarget={(dir) => edit(index, (p) => changeTarget(p, i, dir, ex.metric))}
                onStep={(dir) => edit(index, (p) => stepRank(p, i, dir, CATALOG, exercises, cond))}
                onJump={(rank) => edit(index, (p) => stepToRank(p, i, rank, CATALOG, exercises, cond))}
                onToggleFavorite={() => onToggleFavorite(ex.id)}
                onSwap={() => edit(index, (p) => swapExercise(p, i, CATALOG, exercises, cond))}
              />
            );
          })}
        </div>
      ) : (
      <ol className="mt-3 space-y-1.5 border-t border-gray-100 pt-3 dark:border-[#1E293B]">
        {plan.items.map((it, i) => {
          const ex = exById.get(it.exerciseId!);
          const fav = Boolean(it.exerciseId && favorites.includes(it.exerciseId));
          return (
            <li key={`${it.exerciseId}-${i}`} className="text-sm">
              <div className="flex items-baseline justify-between gap-3">
                <span className="min-w-0 text-[#111827] dark:text-[#F3F4F6]">
                  <span className="font-mono-num mr-2 text-xs text-gray-400">{i + 1}</span>
                  {ex?.name ?? it.exerciseId}
                  {fav && <Heart className="ml-1 inline h-3 w-3 fill-[#DC2626] text-[#DC2626]" aria-hidden="true" />}
                </span>
                <span className="font-mono-num shrink-0 font-semibold text-[#DC2626] dark:text-[#F87171]">
                  {ex ? formatMetricTarget(it.target, ex.metric) : it.target}
                  {ex?.isPaired ? ' ×2' : ''}
                </span>
              </div>
                          </li>
          );
        })}
      </ol>
      )}
    </article>
  );

  let flatIndex = 0;

  return (
    <section className="mx-auto max-w-6xl px-5 pt-5">
      <div className="border-b border-gray-200 pb-4 dark:border-[#1E293B]">
        <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('gen.eyebrow')}</p>
        <h1 className="font-display mt-1 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
          {t('gen.title')}
        </h1>
      </div>

      <div className="mt-4 flex gap-1.5">
        <button type="button" className={chipClass(tab === 'base')} onClick={() => setTab('base')}>
          {t('gen.tab.base')}
        </button>
        <button type="button" className={chipClass(tab === 'own')} onClick={() => setTab('own')}>
          {t('gen.tab.own')}
        </button>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        {tab === 'base' && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('gen.period')}</p>
            <div className="flex gap-1.5">
              {PERIODS.map((p) => (
                <button key={p} type="button" className={chipClass(req.period === p)} onClick={() => set({ period: p })}>
                  {t(`gen.period.${p}` as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
        )}
        <div>
          <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('gen.level')}</p>
          <div className="flex gap-1.5">
            {LEVELS.map((l) => (
              <button key={l} type="button" className={chipClass(req.level === l)} onClick={() => set({ level: l })}>
                {t(`gen.level.${l}` as TranslationKey)}
              </button>
            ))}
          </div>
          <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">
            {t(`gen.level.hint.${req.level}` as TranslationKey)}
          </p>
        </div>
        {tab === 'base' && showPerWeek && (
          <div>
            <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('gen.perWeek')}</p>
            <div className="flex gap-1.5">
              {PER_WEEK.map((n) => (
                <button key={n} type="button" className={chipClass(req.perWeek === n)} onClick={() => set({ perWeek: n })}>
                  {n === 5 ? '5+' : n}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {tab === 'own' ? (
        <CreateOwnPanel
          exercises={exercises}
          profile={genProfile}
          favorites={favorites}
          onToggleFavorite={onToggleFavorite}
          component={LEVEL_COMPONENT[req.level]}
          onSave={onSaveOwn}
        />
      ) : (
        <>
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

          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={() => setDraft(editing ? null : generated)}
              className="tap-scale flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-200 px-3 text-xs font-semibold text-[#111827] dark:border-[#2A3548] dark:text-[#F3F4F6]"
            >
              <Pencil className="h-3.5 w-3.5" />
              {editing ? t('gen.edit.reset') : t('gen.edit')}
            </button>
          </div>

          <div className="mt-3 space-y-4">
            {result.weeks.map((week, wi) => {
              const open = !many || openWeeks.has(wi);
              const start = flatIndex;
              flatIndex += week.length;
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
                  {open && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                      {week.map((_, k) => card(plans[start + k], metas[start + k], start + k))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-center">
            <button
              type="button"
              onClick={() => onAdd(plans)}
              className="tap-scale flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-5 text-sm font-bold text-white hover:bg-[#B91C1C]"
            >
              <Check className="h-4 w-4" />
              {t('gen.add')}
            </button>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('gen.replaceNote')}</p>
          </div>
        </>
      )}

      <h2 className="font-display mt-10 border-t border-gray-200 pt-6 text-xl font-bold text-[#111827] dark:border-[#1E293B] dark:text-[#F3F4F6]">
        {t('gen.catalogTitle')}
      </h2>
    </section>
  );
};
