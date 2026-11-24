import { Exercise } from '../../types';
import { CatalogExercise, CatalogText, FitnessLevel, MaxEntry } from './types';

/**
 * Builds the exercise list the screens work with from the catalog (code),
 * its texts and the user's own data (maxima, custom exercises).
 * Custom exercises come first, as they did when they were added.
 * A catalog exercise without a user max uses its default for `level`.
 */
export function resolveExercises(
  catalog: CatalogExercise[],
  texts: Record<string, CatalogText>,
  maxes: Record<string, MaxEntry>,
  customExercises: Exercise[],
  level: FitnessLevel = 'medium'
): Exercise[] {
  const fromCatalog = catalog.map((c): Exercise => {
    const text = texts[c.id];
    const max = maxes[c.id];
    return {
      id: c.id,
      name: text?.name ?? c.id,
      metric: c.metric,
      checkup_max: max?.value ?? c.defaultMax[level],
      lastCheckupDate: max?.date,
      target_muscles: c.targetMuscles,
      antagonist_muscles: c.antagonistMuscles,
      cue: text?.cue ?? '',
      details: text?.details,
      svgKey: c.svgKey,
      isPaired: c.isPaired,
    };
  });
  return [...customExercises, ...fromCatalog];
}
