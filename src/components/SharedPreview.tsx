import React, { useEffect, useMemo, useState } from 'react';
import { Check, Download, Play, Users } from 'lucide-react';
import { CATALOG } from '../data/catalog';
import { formatMetricTarget } from '../domain/format';
import { GeneratorProfile, estimateSeconds } from '../domain/generator';
import { resolveWorkout } from '../domain/plan/resolveWorkout';
import { CycleChoice } from '../domain/schedule/place';
import type { Weekday } from '../domain/schedule/schedule';
import { SharePayloadV1, decodePayload, plansFromPayload } from '../domain/share/share';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/ru';
import { Exercise, WorkoutPlan } from '../types';

interface SharedPreviewProps {
  encoded: string;
  exercises: Exercise[];
  profile: GeneratorProfile;
  hasProfile: boolean;
  hasActiveCycle: boolean;
  onTryToday: (plan: WorkoutPlan) => void;
  onStartCycle: (plans: WorkoutPlan[], choice: CycleChoice, days: Weekday[] | undefined) => void;
  onSaveLibrary: (plans: WorkoutPlan[]) => void;
  onMeet: () => void;
  onClose: () => void;
}

/**
 * Opening a shared link (#/s/…): what came, from whom and for whom, already
 * adapted to this person (their strength, equipment, age) — then save it.
 */
export const SharedPreview: React.FC<SharedPreviewProps> = ({
  encoded, exercises, profile, hasProfile, hasActiveCycle, onTryToday, onStartCycle, onSaveLibrary, onMeet, onClose,
}) => {
  const { t } = useT();
  const [payload, setPayload] = useState<SharePayloadV1 | null | undefined>(undefined);
  const [choice, setChoice] = useState<CycleChoice>(hasActiveCycle ? 'nextWeek' : 'today');
  useEffect(() => {
    let alive = true;
    decodePayload(encoded).then((p) => alive && setPayload(p ?? null));
    return () => {
      alive = false;
    };
  }, [encoded]);

  const stamp = useMemo(() => Date.now().toString(36), []);
  const plans = useMemo(() => (payload ? plansFromPayload(payload, CATALOG, stamp) : []), [payload, stamp]);
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const catalogById = useMemo(() => new Map(CATALOG.map((c) => [c.id, c])), []);

  if (payload === undefined) return <p className="mx-auto max-w-xl px-5 pt-8 text-sm text-gray-500">{t('share.opening')}</p>;
  if (payload === null) {
    return (
      <section className="mx-auto max-w-xl px-5 pt-8">
        <h1 className="font-display text-2xl font-bold">{t('share.broken')}</h1>
        <button type="button" onClick={onClose} className="tap-scale mt-4 min-h-[48px] rounded-xl bg-[#111827] px-4 text-sm font-bold text-white">
          {t('share.toApp')}
        </button>
      </section>
    );
  }

  const isCycle = payload.k === 'c';
  const chip = (active: boolean) =>
    `tap-scale min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold ${
      active ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]' : 'bg-gray-100 text-gray-600 dark:bg-[#131A26] dark:text-gray-300'
    }`;

  return (
    <section className="mx-auto max-w-xl px-5 pt-4 pb-32">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0B5F73] dark:text-[#5EC4D8]">
        {isCycle ? t('share.gotCycle') : t('share.gotWorkout')}
      </p>
      <h1 className="font-display mt-1 text-3xl font-bold text-[#111827] dark:text-[#F3F4F6]">
        {isCycle ? t('share.cycleTitle', { count: plans.length }) : plans[0].title}
      </h1>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
        {payload.by && <span className="font-semibold text-[#111827] dark:text-[#F3F4F6]">{t('share.from', { name: payload.by })}</span>}
        {payload.a && (
          <span className="flex items-center gap-1 rounded-full bg-[#ECFAFC] px-2.5 py-1 text-xs font-bold text-[#0B5F73] dark:bg-[#0B2E36]/60 dark:text-[#5EC4D8]">
            <Users className="h-3.5 w-3.5" />
            {t(`share.aud.${payload.a}` as TranslationKey)}
          </span>
        )}
      </div>

      <p className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700 dark:border-[#263248] dark:bg-[#131A26] dark:text-gray-300">
        {hasProfile ? t('share.adapted') : t('share.adaptedDefault')}
        {!hasProfile && (
          <button type="button" onClick={onMeet} className="ml-1 font-semibold text-[#0B5F73] underline dark:text-[#5EC4D8]">
            {t('wiz.bannerBtn')}
          </button>
        )}
      </p>

      <div className="mt-4 space-y-2.5">
        {plans.map((p) => {
          const resolved = resolveWorkout(p, { catalog: CATALOG, exercises, conditions: profile.usualConditions });
          const forEstimate = { ...p, items: resolved.map((r) => ({ exerciseId: r.exerciseId, target: r.target })) };
          return (
            <article key={p.id} className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">{p.title}</h2>
                <span className="font-mono-num shrink-0 text-xs font-semibold text-gray-500">
                  {t('gen.meta', { rounds: p.rounds, min: Math.round(estimateSeconds(forEstimate, catalogById) / 60) })}
                </span>
              </div>
              {p.formatLabel && <p className="text-xs text-gray-500 dark:text-gray-400">{p.formatLabel}</p>}
              <ol className="mt-2 space-y-1 text-sm">
                {resolved.map((r) => {
                  const ex = exById.get(r.exerciseId);
                  const from = r.substitutedFrom ? exById.get(r.substitutedFrom)?.name : undefined;
                  return (
                    <li key={`${p.id}-${r.slotIndex}`} className="flex items-baseline justify-between gap-3">
                      <span className="min-w-0 text-[#111827] dark:text-[#F3F4F6]">
                        {ex?.name ?? r.exerciseId}
                        {from && <span className="ml-1 text-xs text-gray-500">({t('share.insteadOf', { name: from })})</span>}
                      </span>
                      <span className="font-mono-num shrink-0 font-semibold text-[#DC2626] dark:text-[#F87171]">
                        {ex ? formatMetricTarget(r.target, ex.metric) : r.target}
                      </span>
                    </li>
                  );
                })}
              </ol>
            </article>
          );
        })}
      </div>

      {isCycle ? (
        <>
          <div className="mt-5">
            <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('start.when')}</p>
            <div className="flex flex-wrap gap-1.5">
              {(['today', 'nextWeek', ...(hasActiveCycle ? ['afterCurrent'] : [])] as CycleChoice[]).map((c) => (
                <button key={c} type="button" className={chip(choice === c)} onClick={() => setChoice(c)}>
                  {t(`start.${c}` as TranslationKey)}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onStartCycle(plans, choice, payload.d)}
            className="tap-scale mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-5 text-base font-bold text-white"
          >
            <Check className="h-5 w-5" />
            {t('share.startCycle')}
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => onTryToday(plans[0])}
          className="tap-scale mt-5 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-5 text-base font-bold text-white"
        >
          <Play className="h-5 w-5 fill-current" />
          {t('share.tryToday')}
        </button>
      )}
      <button
        type="button"
        onClick={() => onSaveLibrary(plans)}
        className="tap-scale mt-2 flex min-h-[50px] w-full items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 text-sm font-semibold text-[#111827] dark:border-[#2A3548] dark:text-[#F3F4F6]"
      >
        <Download className="h-4 w-4" />
        {t('share.saveLibrary')}
      </button>
      <p className="mt-3 text-xs text-gray-500 dark:text-gray-400">{t('share.privacy')}</p>
    </section>
  );
};
