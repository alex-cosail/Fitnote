import React from 'react';
import { JOINT_NAMES } from '../domain/care/care';
import { Heart, Pencil, UserRound } from 'lucide-react';
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
  care?: import('../domain/care/care').Care[];
  onRemoveCare?: (joint: import('../domain/catalog/joints').Joint) => void;
}

const MARK: Record<string, string> = { plus: '+', plusplus: '++' };

/**
 * «Я» (PRODUCT_MAP_V3 §3.2): the person from the start wizard — profile,
 * goal, accents, equipment, favorites; «Изменить ответы» reopens the wizard.
 * The check-up stays below as its own section.
 */
export const MePanel: React.FC<MePanelProps> = ({ profile, exercises, favorites, onToggleFavorite, onEdit, care = [], onRemoveCare }) => {
  const { t } = useT();
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

      {/* «Берегу» (v3.9): set by «Пауза: болит» in the player */}
      {care.length > 0 && (
        <div className="mt-4 rounded-2xl border border-[#F59E0B]/50 bg-[#FFFBEB] p-3 dark:border-[#FBBF24]/40 dark:bg-[#451A03]/40">
          <p className="text-sm font-bold text-[#92400E] dark:text-[#FBBF24]">Берегу</p>
          <ul className="mt-1.5 space-y-1.5">
            {care.map((c) => (
              <li key={c.joint} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 text-[#111827] dark:text-[#F3F4F6]">
                  <b>{JOINT_NAMES[c.joint].name}</b> · {c.level === 'stop' ? 'не нагружаем' : 'бережно'}
                  <span className="text-xs text-gray-500 dark:text-gray-400"> · с {c.since.split('-').reverse().slice(0, 2).join('.')}</span>
                </span>
                {onRemoveCare && (
                  <button
                    type="button"
                    onClick={() => onRemoveCare(c.joint)}
                    className="tap-scale min-h-[36px] shrink-0 rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-semibold text-[#111827] dark:border-[#334155] dark:bg-[#1A2333] dark:text-[#F3F4F6]"
                  >
                    Снять
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-[#92400E]/80 dark:text-[#FBBF24]/80">Пока место здесь, нагружающие его упражнения не предлагаются.</p>
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
