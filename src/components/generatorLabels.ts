import { GeneratedWorkout } from '../domain/generator';
import { MovementPattern } from '../domain/catalog/types';
import { TFunction } from '../i18n';
import type { TranslationKey } from '../i18n/ru';

// One naming for generated workouts: the Generator screen and the start wizard.

export const patternList = (t: TFunction, ps: MovementPattern[]) =>
  ps.map((p) => t(`pattern.${p}` as TranslationKey)).join(', ');

export function planLabel(t: TFunction, gw: GeneratedWorkout, week?: number) {
  const kind = t(`gen.kind.${gw.kind}` as TranslationKey);
  return {
    title: week ? `${t('gen.week', { n: week })} · ${kind}` : kind,
    subtitle: gw.focus.length ? t('gen.focus', { list: patternList(t, gw.focus) }) : '',
    formatLabel: t(`gen.format.${gw.component}` as TranslationKey),
  };
}
