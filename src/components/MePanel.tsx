import React, { useState } from 'react';
import { Heart, Pencil, UserRound, X } from 'lucide-react';
import type { Care, JointLevel } from '../domain/care/care';
import { JOINT_NAMES } from '../domain/care/care';
import type { Joint } from '../domain/catalog/joints';
import type { Zone, ZoneMark } from '../domain/generator/types';
import { BodySkeleton } from './care/BodySkeleton';
import { JointLevelPicker } from './care/JointLevelPicker';
import { CATALOG } from '../data/catalog';
import { ExerciseSvg } from './ExerciseSvg';
import { UserProfile, ZONES } from '../domain/profile/profile';
import { useT } from '../i18n';
import type { TranslationKey } from '../i18n/ru';
import { Exercise } from '../types';

interface MePanelProps {
  profile?: UserProfile;
  exercises: Exercise[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onEdit: () => void;
  care?: Care[];
  /** A joint's level 0–4, or undefined = free. */
  onCareLevel?: (joint: Joint, level: JointLevel | undefined) => void;
  /** A movement goal: base · + · ++. */
  onZone?: (zone: Zone, mark: ZoneMark) => void;
}

const MARK: Record<string, string> = { plus: '+', plusplus: '++' };

/**
 * «Я» (PRODUCT_MAP_V3 §3.2): the person from the start wizard — profile,
 * goal, accents, equipment, favorites; «Изменить ответы» reopens the wizard.
 * The check-up stays below as its own section.
 */
export const MePanel: React.FC<MePanelProps> = ({ profile, exercises, favorites, onToggleFavorite, onEdit, care = [], onCareLevel, onZone }) => {
  const { t } = useT();
  const [joint, setJoint] = useState<Joint | null>(null);
  const [askPlusPlus, setAskPlusPlus] = useState<Zone | null>(null);
  const levelOf = new Map(care.map((c) => [c.joint, c.level]));
  // Goals: teens up to + (6), adults up to ++ (7); 55+ get a warning on ++.
  const nextMark = (m: ZoneMark | undefined): ZoneMark =>
    m === 'plusplus' ? 'base' : m === 'plus' ? (profile?.ageGroup === 'teen' ? 'base' : 'plusplus') : 'plus';
  const tapZone = (z: Zone) => {
    if (!profile || !onZone) return;
    const next = nextMark(profile.zones[z]);
    if (next === 'plusplus' && profile.ageGroup === 'masters') setAskPlusPlus(z);
    else onZone(z, next);
  };
  const exById = new Map(exercises.map((e) => [e.id, e]));

  const line = (label: string, value: React.ReactNode) => (
    <div className="flex items-baseline justify-between gap-3 border-b border-gray-100 py-2 last:border-0 dark:border-[#1E293B]">
      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-right text-sm font-semibold text-[#111827] dark:text-[#F3F4F6]">{value}</span>
    </div>
  );

  const accents = profile
    ? ZONES.filter((z) => profile.zones[z] && profile.zones[z] !== 'base')
    : [];
  const eq = profile?.equipment;
  const eqList = eq
    ? (['bars', 'suspension', 'bands', 'mat', 'weights'] as const).filter((k) => eq[k]).map((k) => t(`wiz.eq.${k}` as TranslationKey))
    : [];

  return (
    <section className="mx-auto max-w-6xl px-5 pt-5">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-gray-200 pb-4 dark:border-[#1E293B]">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400">{t('me.eyebrow')}</p>
          <h1 className="font-display mt-1 flex items-center gap-2 text-3xl font-bold tracking-tight text-[#111827] dark:text-[#F3F4F6]">
            <UserRound className="h-7 w-7" />
            {profile?.name || t('nav.checkup')}
          </h1>
        </div>
        <button
          type="button"
          onClick={onEdit}
          className="tap-scale flex min-h-[46px] items-center gap-1.5 rounded-xl bg-[#111827] px-4 text-sm font-bold text-white dark:bg-[#F3F4F6] dark:text-[#0B0F17]"
        >
          <Pencil className="h-4 w-4" />
          {profile ? t('me.edit') : t('wiz.bannerBtn')}
        </button>
      </div>

      {!profile ? (
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-300">{t('me.empty')}</p>
      ) : (
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2 dark:border-[#232E42] dark:bg-[#131A26]">
            {line(t('me.health'), t(`wiz.health.${profile.healthLevel}` as TranslationKey))}
            {profile.personalGoal && line(t('me.goal'), profile.personalGoal)}
            {line(t('wiz.perWeek'), profile.perWeek >= 4 ? '4+' : profile.perWeek)}
            {line(t('wiz.age'), t(`wiz.age.${profile.ageGroup}` as TranslationKey))}
            {line(t('wiz.level'), t(`wiz.level.${profile.level}` as TranslationKey))}
            {(profile.waistCm || profile.weightKg) &&
              line(
                t('me.body'),
                [profile.waistCm && `${profile.waistCm} ${t('me.cm')}`, profile.weightKg && `${profile.weightKg} ${t('me.kg')}`]
                  .filter(Boolean)
                  .join(' · ')
              )}
          </div>
          <div className="rounded-2xl border border-gray-200 bg-white px-4 py-2 dark:border-[#232E42] dark:bg-[#131A26]">
            {line(
              t('me.accents'),
              accents.length
                ? accents.map((z) => `${t(`wiz.zone.${z}` as TranslationKey).split(':')[0]} ${MARK[profile.zones[z]!]}`).join(' · ')
                : t('me.accentsNone')
            )}
            {line(t('me.equipment'), eqList.length ? eqList.join(', ') : t('me.equipmentNone'))}
            {eq?.dirtyFloor && line(t('wiz.noTouch'), '✓')}
          </div>
        </div>
      )}

      {/* Skeleton (care brief §0): joints 0–4 by tap, goals as labels below */}
      <div className="mt-4 rounded-2xl border border-gray-200 bg-white p-3 dark:border-[#232E42] dark:bg-[#131A26]">
        <p className="text-sm font-bold text-[#111827] dark:text-[#F3F4F6]">Тело</p>
        <p className="text-xs text-gray-500 dark:text-gray-400">Кружок — как двигается сустав (тап), подписи — чего хотите.</p>
        <BodySkeleton care={care} onJoint={(j) => onCareLevel && setJoint(j)} className="mx-auto mt-1 h-72 w-full max-w-xs" />
        {profile && (
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {ZONES.map((z) => {
              const m = profile.zones[z];
              return (
                <button
                  key={z}
                  type="button"
                  onClick={() => tapZone(z)}
                  disabled={!onZone}
                  className={`tap-scale min-h-[40px] rounded-xl px-3 text-sm font-semibold ${
                    m && m !== 'base' ? 'bg-[#EEEDFE] text-[#3C3489] dark:bg-[#26215C] dark:text-[#CECBF6]' : 'bg-gray-100 text-gray-600 dark:bg-[#1A2333] dark:text-gray-300'
                  }`}
                >
                  {t(`wiz.zone.${z}` as TranslationKey).split(':')[0]} {m && m !== 'base' ? MARK[m] : ''}
                </button>
              );
            })}
          </div>
        )}
        {askPlusPlus && (
          <div className="mt-2 rounded-xl bg-[#FFFBEB] p-2.5 text-sm text-[#92400E] dark:bg-[#451A03]/50 dark:text-[#FBBF24]">
            «++» — выше рекомендованного для 55+. Поставить?
            <div className="mt-1.5 flex gap-2">
              <button type="button" onClick={() => setAskPlusPlus(null)} className="tap-scale min-h-[40px] flex-1 rounded-lg bg-[#111827] text-sm font-bold text-white">Нет</button>
              <button type="button" onClick={() => { onZone?.(askPlusPlus, 'plusplus'); setAskPlusPlus(null); }} className="tap-scale min-h-[40px] flex-1 rounded-lg border border-[#F59E0B] text-sm font-semibold">Да</button>
            </div>
          </div>
        )}
      </div>

      {joint && onCareLevel && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/50 sm:items-center" onClick={() => setJoint(null)}>
          <div className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-4 sm:rounded-3xl dark:bg-[#0F1520]" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={JOINT_NAMES[joint].name}>
            <div className="mb-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400">Как двигается?</p>
                <h3 className="text-lg font-bold text-[#111827] dark:text-[#F3F4F6]">{JOINT_NAMES[joint].name}</h3>
              </div>
              <button type="button" onClick={() => setJoint(null)} className="tap-scale flex h-11 w-11 items-center justify-center rounded-xl text-gray-500" aria-label="Закрыть">
                <X className="h-5 w-5" />
              </button>
            </div>
            {(() => {
              const lv = levelOf.get(joint);
              const moves = lv !== undefined && lv >= 1 && lv <= 3 ? CATALOG.filter((c) => c.rehab?.joint === joint && c.rehab.level <= lv) : [];
              return moves.length ? (
                <div className="mb-3 rounded-xl bg-[#F0F7E6] p-2.5 dark:bg-[#173404]/50">
                  <p className="text-xs font-semibold text-[#3B6D11] dark:text-[#97C459]">Вместо упражнений на этот сустав — такие движения:</p>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {moves.map((c) => (
                      <div key={c.id} className="flex flex-col items-center rounded-lg bg-white p-1 text-center dark:bg-[#0F1520]">
                        <ExerciseSvg svgKey={c.svgKey} className="h-12 w-full" />
                        <span className="line-clamp-2 text-[10px] leading-tight text-gray-700 dark:text-gray-300">{exercises.find((e) => e.id === c.id)?.name ?? c.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null;
            })()}
            <JointLevelPicker
              value={levelOf.get(joint)}
              onPick={(lv) => {
                onCareLevel(joint, lv);
                setJoint(null);
              }}
            />
          </div>
        </div>
      )}

      <div className="mt-4">
        <p className="mb-2 text-xs font-semibold text-gray-500 dark:text-gray-400">{t('me.favorites')}</p>
        {favorites.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400">{t('me.favoritesEmpty')}</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {favorites.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => onToggleFavorite(id)}
                className="tap-scale flex min-h-[40px] items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-[#111827] dark:border-[#2A3548] dark:bg-[#131A26] dark:text-[#F3F4F6]"
                aria-label={t('me.unfavorite', { name: exById.get(id)?.name ?? id })}
              >
                <Heart className="h-4 w-4 fill-[#DC2626] text-[#DC2626]" />
                {exById.get(id)?.name ?? id}
              </button>
            ))}
          </div>
        )}
      </div>

      <h2 className="font-display mt-8 border-t border-gray-200 pt-6 text-xl font-bold text-[#111827] dark:border-[#1E293B] dark:text-[#F3F4F6]">
        {t('me.checkup')}
      </h2>
    </section>
  );
};
