import React, { useMemo, useState } from 'react';
import { Check, Heart, Minus, Plus, ShieldAlert, X } from 'lucide-react';
import { CATALOG } from '../data/catalog';
import { formatMetricTarget } from '../domain/format';
import {
  COMPONENT, Component, GeneratorProfile, OwnZone, antagonistOptions, basketIssues, buildOwnPlan,
  changeTarget, estimateSeconds, fixFor, ladderPosition, ownItem, stepRank, stepToRank, zoneCandidates,
} from '../domain/generator';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/ru';
import { Exercise, WorkoutItem, WorkoutPlan } from '../types';
import { ExerciseStepCard } from './ExerciseStepCard';
import { ExerciseSvg } from './ExerciseSvg';

interface CreateOwnPanelProps {
  exercises: Exercise[];
  profile: GeneratorProfile;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  component: Component;
  onSave: (plan: WorkoutPlan) => void;
}

const ZONES: OwnZone[] = ['upper', 'lower', 'core', 'balance', 'favorites'];
const DEFAULT_ROUNDS: Record<Component, number> = { S: 3, F: 8, M: 2 };

const chip = (active: boolean) =>
  `tap-scale min-h-[44px] shrink-0 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
    active
      ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
      : 'bg-gray-100 text-gray-600 hover:text-[#111827] dark:bg-[#131A26] dark:text-gray-300 dark:hover:text-[#F3F4F6]'
  }`;
const iconBtn =
  'tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-[#111827] disabled:opacity-35 dark:border-[#2A3548] dark:bg-[#1A2333] dark:text-[#F3F4F6]';

/**
 * «Создать свою» (PRODUCT_MAP_V3 §3.3): click 1 — zone, click 2 — one of
 * 5–6 exercises, click 3 — into the basket, with an antagonist offer. The
 * basket counts time as it grows; «Готово» checks the coverage first.
 */
export const CreateOwnPanel: React.FC<CreateOwnPanelProps> = ({
  exercises, profile, favorites, onToggleFavorite, component, onSave,
}) => {
  const { t, locale } = useT();
  const [zone, setZone] = useState<OwnZone | null>(null);
  const [items, setItems] = useState<WorkoutItem[]>([]);
  const [rounds, setRounds] = useState(DEFAULT_ROUNDS[component]);
  const [antagonistFor, setAntagonistFor] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const cond = profile.usualConditions;
  const level = profile.level;
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const catalogById = useMemo(() => new Map(CATALOG.map((c) => [c.id, c])), []);
  const inBasket = items.map((it) => it.exerciseId!) as string[];

  const choices = zone ? zoneCandidates(zone, CATALOG, favorites, level, inBasket, cond) : [];
  const antagonists = antagonistFor ? antagonistOptions(antagonistFor, CATALOG, inBasket, cond) : [];
  const issues = basketIssues(items, CATALOG);

  const add = (id: string, offerAntagonist: boolean) => {
    const c = catalogById.get(id);
    if (!c) return;
    // A fast double tap must not add the same exercise twice.
    setItems((xs) => (xs.some((x) => x.exerciseId === id) ? xs : [...xs, ownItem(c, component, exercises)]));
    setAntagonistFor(offerAntagonist ? id : null);
    setChecking(false);
  };
  const remove = (i: number) => {
    setItems((xs) => xs.filter((_, j) => j !== i));
    setChecking(false);
  };
  const asPlan = (xs: WorkoutItem[]): WorkoutPlan => ({ id: '', title: '', subtitle: '', formatLabel: '', rounds, restBetweenExercises: 0, restBetweenRounds: 0, items: xs });
  const step = (i: number, dir: 1 | -1) => {
    setItems((xs) => stepRank(asPlan(xs), i, dir, CATALOG, exercises, cond).items);
    setChecking(false);
  };
  const jump = (i: number, rank: number) => {
    setItems((xs) => stepToRank(asPlan(xs), i, rank, CATALOG, exercises, cond).items);
    setChecking(false);
  };
  const tune = (i: number, dir: 1 | -1) => {
    const ex = exById.get(items[i].exerciseId!);
    if (!ex) return;
    setItems((xs) => changeTarget({ id: '', title: '', subtitle: '', formatLabel: '', rounds, restBetweenExercises: 0, restBetweenRounds: 0, items: xs }, i, dir, ex.metric).items);
  };

  const plan = (): WorkoutPlan =>
    buildOwnPlan(
      items,
      rounds,
      component,
      `own-${Date.now()}`,
      t('own.title', { date: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'numeric' }) }),
      t(`gen.format.${component}` as TranslationKey)
    );
  const minutes = Math.round(
    estimateSeconds(
      { items, rounds, restBetweenExercises: COMPONENT[component].restEx, restBetweenRounds: COMPONENT[component].restRound },
      catalogById
    ) / 60
  );

  const done = () => {
    if (items.length === 0) return;
    if (issues.length > 0 && !checking) {
      setChecking(true);
      return;
    }
    onSave(plan());
  };
  const fixHere = () => {
    let next = items;
    for (const issue of basketIssues(next, CATALOG)) {
      const c = fixFor(issue, next, CATALOG, level, favorites, cond);
      if (c) next = [...next, ownItem(c, component, exercises)];
    }
    setItems(next);
    setChecking(false);
  };

  return (
    <div className="mt-4 space-y-4">
      {/* click 1: zone */}
      <div>
        <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('own.zone')}</p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {ZONES.map((z) => (
            <button key={z} type="button" className={chip(zone === z)} onClick={() => { setZone(z); setAntagonistFor(null); }}>
              {z === 'favorites' && <Heart className="mr-1 inline h-3.5 w-3.5" />}
              {t(`own.zone.${z}` as TranslationKey)}
            </button>
          ))}
        </div>
      </div>

      {/* antagonist offer */}
      {antagonistFor && antagonists.length > 0 && (
        <div className="rounded-2xl border border-[#0B5F73]/30 bg-[#ECFAFC] p-3 dark:border-[#5EC4D8]/30 dark:bg-[#0B2E36]/60">
          <p className="text-sm font-semibold text-[#0B5F73] dark:text-[#5EC4D8]">
            {t('own.antagonist', { name: exById.get(antagonistFor)?.name ?? '' })}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {antagonists.map((c) => (
              <button key={c.id} type="button" className={chip(false)} onClick={() => add(c.id, false)}>
                + {exById.get(c.id)?.name ?? c.id}
              </button>
            ))}
            <button type="button" className={chip(false)} onClick={() => setAntagonistFor(null)}>
              {t('own.no')}
            </button>
          </div>
        </div>
      )}

      {/* click 2–3: choose an exercise */}
      {zone && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {choices.length === 0 && (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t(zone === 'favorites' ? 'own.noFavorites' : 'own.empty')}</p>
          )}
          {choices.map((c) => {
            const ex = exById.get(c.id);
            const fav = favorites.includes(c.id);
            return (
              <div
                key={c.id}
                className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white p-2 pl-3 dark:border-[#232E42] dark:bg-[#131A26]"
              >
                {ex && <ExerciseSvg svgKey={ex.svgKey} className="h-14 w-20 shrink-0" />}
                <button type="button" onClick={() => add(c.id, true)} className="tap-scale min-h-[44px] min-w-0 flex-1 text-left">
                  <span className="block text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">{ex?.name ?? c.id}</span>
                  <span className="block text-xs text-gray-500 dark:text-gray-400">
                    {t(`pattern.${c.pattern}` as TranslationKey)} · {t('own.step', { n: c.rank })}
                  </span>
                </button>
                <button type="button" className={iconBtn} onClick={() => onToggleFavorite(c.id)} aria-pressed={fav} aria-label={t('gen.edit.favorite')}>
                  <Heart className={`h-4 w-4 ${fav ? 'fill-[#DC2626] text-[#DC2626]' : ''}`} />
                </button>
                <button type="button" className={iconBtn} onClick={() => add(c.id, true)} aria-label={t('own.add')}>
                  <Plus className="h-4 w-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* basket */}
      <div className="rounded-2xl border-2 border-[#111827] p-4 dark:border-[#475569]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
            {t('own.basket', { count: items.length })}
          </h3>
          <p className="font-mono-num text-sm font-semibold text-[#DC2626] dark:text-[#F87171]">
            {items.length > 0 ? t('gen.meta', { rounds, min: minutes }) : ''}
          </p>
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{t('gen.edit.rounds')}</span>
          <button type="button" className={iconBtn} onClick={() => setRounds((r) => Math.max(1, r - 1))} disabled={rounds <= 1} aria-label={t('gen.edit.roundsLess')}>
            <Minus className="h-4 w-4" />
          </button>
          <span className="font-mono-num w-6 text-center text-sm font-bold">{rounds}</span>
          <button type="button" className={iconBtn} onClick={() => setRounds((r) => Math.min(20, r + 1))} disabled={rounds >= 20} aria-label={t('gen.edit.roundsMore')}>
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{t('own.basketEmpty')}</p>
        ) : (
          <div className="mt-3 space-y-2 border-t border-gray-100 pt-3 dark:border-[#1E293B]">
            {items.map((it, i) => {
              const ex = exById.get(it.exerciseId!);
              if (!ex) return null;
              return (
                <ExerciseStepCard
                  key={`${it.exerciseId}-${i}`}
                  exercise={ex}
                  target={it.target}
                  ladder={ladderPosition(ex.id, CATALOG, cond)}
                  favorite={favorites.includes(ex.id)}
                  onTarget={(dir) => tune(i, dir)}
                  onStep={(dir) => step(i, dir)}
                  onJump={(rank) => jump(i, rank)}
                  onToggleFavorite={() => onToggleFavorite(ex.id)}
                  onRemove={() => remove(i)}
                />
              );
            })}
          </div>
        )}

        {checking && issues.length > 0 && (
          <div className="mt-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
            <p className="flex items-start gap-2 font-semibold">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              {issues.map((code) => t(`own.issue.${code}` as TranslationKey)).join(' ')}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <button type="button" className={chip(true)} onClick={fixHere}>
                {t('own.fixHere')}
              </button>
              <button type="button" className={chip(false)} onClick={() => onSave(plan())}>
                {t('own.keep')}
              </button>
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={done}
          disabled={items.length === 0}
          className="tap-scale mt-4 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-[#DC2626] px-5 text-sm font-bold text-white hover:bg-[#B91C1C] disabled:opacity-40"
        >
          <Check className="h-4 w-4" />
          {t('gen.add')}
        </button>
      </div>
    </div>
  );
};
