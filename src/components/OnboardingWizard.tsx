import React, { useState } from 'react';
import { ArrowLeft, Check, Sparkles } from 'lucide-react';
import {
  DeskPreset, ProfileEquipment, RunPreset, StepsPreset, UserProfile, ZONES, clampZones, draftProfile, hasAutoAccents,
  nextMark, recommendZones,
} from '../domain/profile/profile';
import { HealthLevel, Zone, ZoneMark } from '../domain/generator';
import { useT } from '../i18n';
import { Weekday, defaultDays } from '../domain/schedule/schedule';
import type { TranslationKey } from '../i18n/ru';

interface OnboardingWizardProps {
  initial?: UserProfile;
  onComplete: (profile: UserProfile) => void;
  onCancel?: () => void;
}

const chip = (active: boolean) =>
  `tap-scale min-h-[46px] flex-1 rounded-xl px-2 text-sm font-semibold transition-colors ${
    active
      ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
      : 'bg-gray-100 text-gray-600 hover:text-[#111827] dark:bg-[#131A26] dark:text-gray-300 dark:hover:text-[#F3F4F6]'
  }`;

/** Intensity scale for the health levels: calm green → deep teal, never red (§ goal screen). */
const LEVEL_TONE: Record<HealthLevel, string> = {
  mobility: 'border-[#86EFAC] bg-[#F0FDF4] dark:border-[#166534] dark:bg-[#052E16]/50',
  form: 'border-[#34D399] bg-[#ECFDF5] dark:border-[#047857] dark:bg-[#022C22]/60',
  strength: 'border-[#0B5F73] bg-[#E6F6F9] dark:border-[#5EC4D8] dark:bg-[#0B2E36]/70',
};
const LEVEL_DOTS: Record<HealthLevel, number> = { mobility: 1, form: 2, strength: 3 };

const MARK_LABEL: Record<ZoneMark, string> = { base: 'Base', plus: '+', plusplus: '++' };

/** Badge positions on the figure (viewBox 160 × 220), in zone order. */
const ZONE_SPOT: Record<Zone, { x: number; y: number }> = {
  upper_v: { x: 80, y: 40 },
  upper_h: { x: 116, y: 70 },
  core: { x: 80, y: 100 },
  hinge: { x: 44, y: 122 },
  squat: { x: 112, y: 150 },
  lunge: { x: 54, y: 196 },
};

function Figure({ zones, onTap }: { zones: Partial<Record<Zone, ZoneMark>>; onTap: (z: Zone) => void }) {
  const tone = (m?: ZoneMark) =>
    m === 'plusplus' ? { fill: '#111827', text: '#FFFFFF' } : m === 'plus' ? { fill: '#DC2626', text: '#FFFFFF' } : { fill: '#FFFFFF', text: '#111827' };
  return (
    <svg viewBox="0 0 160 220" className="mx-auto h-64 w-auto" role="img" aria-label="figure">
      <g fill="none" stroke="#9CA3AF" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="80" cy="22" r="13" />
        <line x1="80" y1="36" x2="80" y2="118" />
        <polyline points="44,92 56,52 80,46 104,52 116,92" />
        <polyline points="62,206 68,160 80,118 92,160 98,206" />
      </g>
      {ZONES.map((z, i) => {
        const s = ZONE_SPOT[z];
        const c = tone(zones[z]);
        return (
          <g key={z} onClick={() => onTap(z)} style={{ cursor: 'pointer' }}>
            <circle cx={s.x} cy={s.y} r="13" fill={c.fill} stroke="#111827" strokeWidth="2" />
            <text x={s.x} y={s.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={c.text} fontFamily="Arial, sans-serif">
              {i + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * Start wizard (docs/4_fitnote_v3_0.md, SPEC_WIZARD_GOAL_SCREEN.md): four
 * short screens, every answer has a default so «Далее» just works.
 * 1 who I am and my lifestyle → 2 accents on the figure (pre-set from the
 * lifestyle) → 3 goal: health level, own goal, frequency → 4 equipment.
 */
export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ initial, onComplete, onCancel }) => {
  const { t } = useT();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<UserProfile>(() => initial ?? draftProfile());
  const [zonesTouched, setZonesTouched] = useState(Boolean(initial));
  const [autoNote, setAutoNote] = useState(false);
  const [daysTouched, setDaysTouched] = useState(Boolean(initial?.days));
  const days: Weekday[] = p.days ?? defaultDays(p.perWeek);
  const setPerWeek = (n: number) => set({ perWeek: n, ...(daysTouched ? {} : { days: defaultDays(n) }) });
  const toggleDay = (d: Weekday) => {
    setDaysTouched(true);
    const next = (days.includes(d) ? days.filter((x) => x !== d) : [...days, d]).sort((a, b) => a - b) as Weekday[];
    if (next.length === 0) return;
    set({ days: next, perWeek: Math.min(4, next.length) });
  };
  const set = (patch: Partial<UserProfile>) => setP((x) => ({ ...x, ...patch }));
  const setLife = (patch: Partial<UserProfile['lifestyle']>) => setP((x) => ({ ...x, lifestyle: { ...x.lifestyle, ...patch } }));
  const setEq = (patch: Partial<ProfileEquipment>) => setP((x) => ({ ...x, equipment: { ...x.equipment, ...patch } }));

  const next = () => {
    if (step === 0) {
      // Screen 1 → 2: accents picked for the lifestyle unless the person already
      // set them; a teen never keeps ++.
      const zones = zonesTouched ? p.zones : recommendZones(p.lifestyle);
      set({ zones: clampZones(zones, p.ageGroup) });
      setAutoNote(!zonesTouched && hasAutoAccents(p.lifestyle));
    }
    if (step < 3) setStep(step + 1);
    else onComplete({ ...p, completedAt: new Date().toISOString() });
  };
  const tapZone = (z: Zone) => {
    setZonesTouched(true);
    setP((x) => ({ ...x, zones: { ...x.zones, [z]: nextMark(x.zones[z], x.ageGroup) } }));
  };
  const setZone = (z: Zone, m: ZoneMark) => {
    setZonesTouched(true);
    setP((x) => ({ ...x, zones: { ...x.zones, [z]: m } }));
  };

  const row = (label: string, children: React.ReactNode) => (
    <div>
      <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</p>
      <div className="flex gap-1.5">{children}</div>
    </div>
  );
  const pick = <T extends string>(value: T, options: T[], onPick: (v: T) => void, key: string) =>
    options.map((o) => (
      <button key={o} type="button" className={chip(value === o)} onClick={() => onPick(o)}>
        {t(`${key}.${o}` as TranslationKey)}
      </button>
    ));

  const marks: ZoneMark[] = p.ageGroup === 'teen' ? ['base', 'plus'] : ['base', 'plus', 'plusplus'];
  const equipment: { key: keyof ProfileEquipment; label: TranslationKey }[] = [
    { key: 'bars', label: 'wiz.eq.bars' },
    { key: 'suspension', label: 'wiz.eq.suspension' },
    { key: 'bands', label: 'wiz.eq.bands' },
    { key: 'mat', label: 'wiz.eq.mat' },
    { key: 'weights', label: 'wiz.eq.weights' },
  ];

  return (
    <section className="mx-auto max-w-xl px-5 pt-4 pb-32">
      <div className="flex items-center gap-2">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} className="tap-scale flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 dark:border-[#2A3548]" aria-label={t('wiz.back')}>
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : onCancel ? (
          <button type="button" onClick={onCancel} className="tap-scale min-h-[40px] rounded-xl px-2 text-sm font-semibold text-gray-500">
            {t('wiz.later')}
          </button>
        ) : null}
        <div className="flex flex-1 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? 'bg-[#DC2626]' : 'bg-gray-200 dark:bg-[#263248]'}`} />
          ))}
        </div>
        <span className="font-mono-num text-xs font-semibold text-gray-500">{step + 1}/4</span>
      </div>

      <h1 className="font-display mt-4 text-2xl font-bold text-[#111827] dark:text-[#F3F4F6]">
        {t(`wiz.title.${step}` as TranslationKey)}
      </h1>
      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{t(`wiz.sub.${step}` as TranslationKey)}</p>

      <div className="mt-5 space-y-4">
        {step === 0 && (
          <>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('wiz.name')}</p>
              <input
                value={p.name ?? ''}
                onChange={(e) => set({ name: e.target.value || undefined })}
                placeholder={t('wiz.namePlaceholder')}
                className="min-h-[46px] w-full rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6]"
              />
            </div>
            {row(t('wiz.age'), pick(p.ageGroup, ['teen', 'adult', 'masters'], (v) => set({ ageGroup: v, ...(v === 'masters' && !p.trainingMode ? { trainingMode: 'longevity' as const } : {}) }), 'wiz.age'))}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">Режим</p>
              <div className="grid grid-cols-2 gap-1.5">
                {([
                  ['athletic', 'Спорт и форма'],
                  ['longevity', 'Здоровье и восстановление'],
                ] as const).map(([mode, label]) => (
                  <button key={mode} type="button" className={chip((p.trainingMode ?? 'athletic') === mode)} onClick={() => set({ trainingMode: mode })}>
                    {label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">«Здоровье» — лёгкие ступени стоя, 2 круга, без тестов до отказа. Подходит от 55 лет и после травмы или перерыва в любом возрасте.</p>
            </div>
            {row(t('wiz.level'), pick(p.level, ['low', 'medium', 'high'], (v) => set({ level: v }), 'wiz.level'))}
            {row(t('wiz.steps'), pick<StepsPreset>(p.lifestyle.steps, ['lt5k', '5to8k', '10k'], (v) => setLife({ steps: v }), 'wiz.steps'))}
            {row(t('wiz.desk'), pick<DeskPreset>(p.lifestyle.desk, ['lt4', '4to6', '6plus'], (v) => setLife({ desk: v }), 'wiz.desk'))}
            {row(t('wiz.run'), pick<RunPreset>(p.lifestyle.run, ['none', 'some', 'lots'], (v) => setLife({ run: v }), 'wiz.run'))}
          </>
        )}

        {step === 1 && (
          <>
            {autoNote && (
              <p className="flex items-start gap-2 rounded-xl border border-[#0B5F73]/30 bg-[#ECFAFC] p-3 text-sm text-[#0B5F73] dark:border-[#5EC4D8]/30 dark:bg-[#0B2E36]/60 dark:text-[#5EC4D8]">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                {t('wiz.autoNote')}
              </p>
            )}
            <Figure zones={p.zones} onTap={tapZone} />
            <div className="space-y-2">
              {ZONES.map((z, i) => (
                <div key={z} className="flex items-center gap-2">
                  <span className="font-mono-num flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-[#111827] text-xs font-bold dark:border-[#F3F4F6]">
                    {i + 1}
                  </span>
                  <span className="min-w-0 flex-1 text-sm leading-tight text-[#111827] dark:text-[#F3F4F6]">
                    {t(`wiz.zone.${z}` as TranslationKey)}
                  </span>
                  <div className="flex shrink-0 gap-1">
                    {marks.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setZone(z, m)}
                        className={`tap-scale min-h-[36px] min-w-[44px] rounded-lg px-2 text-xs font-bold ${
                          (p.zones[z] ?? 'base') === m
                            ? m === 'base'
                              ? 'bg-gray-300 text-[#111827] dark:bg-[#475569] dark:text-white'
                              : m === 'plus'
                                ? 'bg-[#DC2626] text-white'
                                : 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                            : 'bg-gray-100 text-gray-500 dark:bg-[#131A26] dark:text-gray-400'
                        }`}
                      >
                        {MARK_LABEL[m]}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('wiz.marksHint')}</p>
            {p.ageGroup === 'masters' && ZONES.some((z) => p.zones[z] === 'plusplus') && (
              <p className="rounded-xl bg-[#FFFBEB] p-2.5 text-xs font-semibold text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FBBF24]">
                «++» — выше рекомендованного для 55+. Можно оставить, если вы к этому готовы.
              </p>
            )}
            <p className="text-xs text-gray-500 dark:text-gray-400">Суставы («как двигается?») отмечаются на скелете во вкладке «Я».</p>
          </>
        )}

        {step === 2 && (
          <>
            <div className="space-y-2">
              {(['mobility', 'form', 'strength'] as HealthLevel[]).map((h) => {
                const active = p.healthLevel === h;
                return (
                  <button
                    key={h}
                    type="button"
                    onClick={() => set({ healthLevel: h })}
                    className={`tap-scale flex w-full items-center gap-3 rounded-2xl border-2 p-3 text-left ${
                      active ? LEVEL_TONE[h] : 'border-gray-200 bg-white dark:border-[#263248] dark:bg-[#131A26]'
                    }`}
                  >
                    <span className="flex gap-0.5" aria-hidden="true">
                      {[1, 2, 3].map((d) => (
                        <span key={d} className={`h-4 w-1.5 rounded-full ${d <= LEVEL_DOTS[h] ? 'bg-[#0B5F73] dark:bg-[#5EC4D8]' : 'bg-gray-200 dark:bg-[#263248]'}`} />
                      ))}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-base font-bold text-[#111827] dark:text-[#F3F4F6]">{t(`wiz.health.${h}` as TranslationKey)}</span>
                      {active && h !== 'mobility' && (
                        <span className="block text-xs text-gray-600 dark:text-gray-300">{t(`wiz.health.${h}.includes` as TranslationKey)}</span>
                      )}
                    </span>
                    {active && <Check className="h-5 w-5 shrink-0 text-[#0B5F73] dark:text-[#5EC4D8]" />}
                  </button>
                );
              })}
            </div>
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('wiz.goal')}</p>
              <textarea
                value={p.personalGoal ?? ''}
                onChange={(e) => set({ personalGoal: e.target.value || undefined })}
                placeholder={t('wiz.goalPlaceholder')}
                rows={2}
                className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6]"
              />
            </div>
            {p.healthLevel !== 'mobility' && (
              <div>
                <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('wiz.body')}</p>
                <div className="flex gap-2">
                  <input
                    inputMode="decimal"
                    value={p.waistCm ?? ''}
                    onChange={(e) => set({ waistCm: Number(e.target.value.replace(',', '.')) || undefined })}
                    placeholder={t('wiz.waist')}
                    className="min-h-[46px] w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6]"
                  />
                  <input
                    inputMode="decimal"
                    value={p.weightKg ?? ''}
                    onChange={(e) => set({ weightKg: Number(e.target.value.replace(',', '.')) || undefined })}
                    placeholder={t('wiz.weight')}
                    className="min-h-[46px] w-1/2 rounded-xl border border-gray-200 bg-gray-50 px-3 text-sm dark:border-[#263248] dark:bg-[#131A26] dark:text-[#F3F4F6]"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{t('wiz.bodyHint')}</p>
              </div>
            )}
            {row(
              t('wiz.perWeek'),
              [1, 2, 3, 4].map((n) => (
                <button key={n} type="button" className={chip(p.perWeek === n)} onClick={() => setPerWeek(n)}>
                  {n === 4 ? '4+' : n}
                </button>
              ))
            )}
            <div>
              <p className="mb-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('wiz.days')}</p>
              <div className="grid grid-cols-7 gap-1">
                {([0, 1, 2, 3, 4, 5, 6] as Weekday[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    role="checkbox"
                    aria-checked={days.includes(d)}
                    onClick={() => toggleDay(d)}
                    className={`tap-scale min-h-[44px] rounded-xl text-sm font-semibold ${
                      days.includes(d)
                        ? 'bg-[#111827] text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]'
                        : 'bg-gray-100 text-gray-500 dark:bg-[#131A26] dark:text-gray-400'
                    }`}
                  >
                    {t(`week.day.${d}` as TranslationKey)}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div className="grid grid-cols-1 gap-1.5">
              {equipment.map(({ key, label }) => {
                const on = Boolean(p.equipment[key]);
                return (
                  <button
                    key={key}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    onClick={() => setEq({ [key]: !on } as Partial<ProfileEquipment>)}
                    className={`tap-scale flex min-h-[50px] items-center gap-3 rounded-xl border px-3 text-left text-sm font-semibold ${
                      on ? 'border-[#111827] text-[#111827] dark:border-[#F3F4F6] dark:text-[#F3F4F6]' : 'border-gray-300 text-gray-500 dark:border-[#334155] dark:text-gray-400'
                    }`}
                  >
                    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${on ? 'border-[#111827] bg-[#111827] text-white dark:border-[#F3F4F6] dark:bg-[#F3F4F6] dark:text-[#0B0F17]' : 'border-gray-300 dark:border-[#475569]'}`} aria-hidden="true">
                      {on && <Check className="h-4 w-4" strokeWidth={3} />}
                    </span>
                    {t(label)}
                  </button>
                );
              })}
            </div>
            <button
              type="button"
              role="checkbox"
              aria-checked={p.equipment.dirtyFloor}
              onClick={() => setEq({ dirtyFloor: !p.equipment.dirtyFloor })}
              className={`tap-scale flex min-h-[56px] w-full items-center gap-3 rounded-xl border px-3 text-left text-sm ${
                p.equipment.dirtyFloor ? 'border-[#D97706] bg-[#FFFBEB] text-[#78350F] dark:bg-[#451A03]/50 dark:text-amber-200' : 'border-gray-300 text-gray-600 dark:border-[#334155] dark:text-gray-300'
              }`}
            >
              <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border-2 ${p.equipment.dirtyFloor ? 'border-[#D97706] bg-[#D97706] text-white' : 'border-gray-300 dark:border-[#475569]'}`} aria-hidden="true">
                {p.equipment.dirtyFloor && <Check className="h-4 w-4" strokeWidth={3} />}
              </span>
              <span>
                <span className="block font-semibold">{t('wiz.noTouch')}</span>
                <span className="block text-xs">{t('wiz.noTouchHint')}</span>
              </span>
            </button>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={next}
        className="tap-scale mt-6 flex min-h-[54px] w-full items-center justify-center gap-2 rounded-2xl bg-[#DC2626] px-5 text-base font-bold text-white hover:bg-[#B91C1C]"
      >
        {step < 3 ? t('wiz.next') : t('wiz.finish')}
      </button>
    </section>
  );
};
