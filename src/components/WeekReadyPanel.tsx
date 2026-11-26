import React, { useMemo, useState } from 'react';
import { CalendarDays, MessageCircle, Pencil, Play, UserRoundCheck } from 'lucide-react';
import { CATALOG } from '../data/catalog';
import { estimateSeconds } from '../domain/generator';
import { weekText } from '../domain/plan/shareText';
import { useT } from '../i18n';
import { Exercise, WorkoutPlan } from '../types';
import { CycleChoice } from '../domain/schedule/place';

interface WeekReadyPanelProps {
  plans: WorkoutPlan[];
  exercises: Exercise[];
  onStart: () => void;
  onEdit: () => void;
  choices: CycleChoice[];
  choice: CycleChoice;
  onChoice: (c: CycleChoice) => void;
  onCalendar: () => void;
}

/**
 * Right after the start wizard (field test 26.11): the week the engine built,
 * with what to do next — start, change it in the generator, send it to my
 * coach; the calendar comes with weekdays (v3.5), the personal coach is a
 * paid service for later.
 */
export const WeekReadyPanel: React.FC<WeekReadyPanelProps> = ({ plans, exercises, onStart, onEdit, choices, choice, onChoice, onCalendar }) => {
  const { t } = useT();
  const [sent, setSent] = useState<'' | 'shared' | 'copied'>('');
  const catalogById = useMemo(() => new Map(CATALOG.map((c) => [c.id, c])), []);
  const exById = useMemo(() => new Map(exercises.map((e) => [e.id, e])), [exercises]);
  const minutes = (p: WorkoutPlan) => Math.round(estimateSeconds(p, catalogById) / 60);

  const shareWithCoach = async () => {
    const text = weekText(plans, exercises, minutes, {
      header: t('ready.shareHeader'),
      meta: (rounds, min) => t('gen.meta', { rounds, min }),
      perSide: t('card.perSide'),
    });
    try {
      if (typeof navigator.share === 'function') {
        await navigator.share({ title: t('ready.shareHeader'), text });
        setSent('shared');
        return;
      }
    } catch {
      // closed the share sheet: fall back to copying
    }
    try {
      await navigator.clipboard.writeText(text);
      setSent('copied');
    } catch {
      setSent('');
    }
  };

  const secondary =
    'tap-scale flex min-h-[50px] w-full items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 text-left text-sm font-semibold text-[#111827] dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6]';

  return (
    <section className="mx-auto max-w-xl px-5 pt-4 pb-32">
      <p className="text-xs font-semibold uppercase tracking-wide text-[#0B5F73] dark:text-[#5EC4D8]">{t('ready.eyebrow')}</p>
      <h1 className="font-display mt-1 text-3xl font-bold text-[#111827] dark:text-[#F3F4F6]">{t('ready.title')}</h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t('ready.sub', { count: plans.length })}</p>

      <div className="mt-4 space-y-2.5">
        {plans.map((p, i) => (
          <article key={p.id} className="rounded-2xl border border-gray-200 bg-white p-3.5 dark:border-[#232E42] dark:bg-[#131A26]">
            <div className="flex items-baseline justify-between gap-3">
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F3F4F6]">
                <span className="font-mono-num mr-2 text-sm text-[#DC2626]">{i + 1}</span>
                {p.title}
              </h2>
              <span className="font-mono-num shrink-0 text-xs font-semibold text-gray-500 dark:text-gray-400">
                {t('gen.meta', { rounds: p.rounds, min: minutes(p) })}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
              {[p.formatLabel, p.subtitle].filter(Boolean).join(' · ')}
            </p>
            <p className="mt-2 text-sm leading-snug text-gray-700 dark:text-gray-300">
              {p.items.map((it) => exById.get(it.exerciseId!)?.name ?? it.exerciseId).join(' · ')}
            </p>
          </article>
        ))}
      </div>

      <div className="mt-5">
        <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('start.when')}</p>
        <div className="flex flex-wrap gap-1.5">
          {choices.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChoice(c)}
              className={`tap-scale min-h-[44px] flex-1 rounded-xl px-3 text-sm font-semibold ${
                choice === c
                  ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                  : 'bg-gray-100 text-gray-600 dark:bg-[#131A26] dark:text-gray-300'
              }`}
            >
              {t(`start.${c}` as never)}
            </button>
          ))}
        </div>
      </div>

      <button
        type="button"
        onClick={onStart}
        className="tap-scale mt-3 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-5 text-base font-bold text-white hover:bg-[#B91C1C]"
      >
        <Play className="h-5 w-5 fill-current" />
        {t('ready.start')}
      </button>

      <div className="mt-3 space-y-2">
        <button type="button" onClick={onEdit} className={secondary}>
          <Pencil className="h-4 w-4 shrink-0" />
          {t('ready.edit')}
        </button>
        <button type="button" onClick={shareWithCoach} className={secondary}>
          <MessageCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t('ready.coach')}</span>
          {sent && <span className="text-xs font-semibold text-[#0B5F73] dark:text-[#5EC4D8]">{t(sent === 'copied' ? 'ready.copied' : 'ready.shared')}</span>}
        </button>
        <button type="button" onClick={onCalendar} className={secondary}>
          <CalendarDays className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t('ready.calendar')}</span>
          <span className="text-xs font-semibold text-gray-500">{t('ready.calendarHint')}</span>
        </button>
        <div className={`${secondary} cursor-default opacity-60`}>
          <UserRoundCheck className="h-4 w-4 shrink-0" />
          <span className="flex-1">{t('ready.personal')}</span>
          <span className="text-xs font-semibold text-gray-500">{t('ready.soon')}</span>
        </div>
      </div>
    </section>
  );
};
