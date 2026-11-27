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
  // Own exercises with the generic picture take the picture of the catalog
  // exercise with the same name (v3.11: imported «Air Squats» etc.).
  const own = customExercises.map((e) =>
    e.svgKey === 'generic_strength' ? { ...e, svgKey: catalogPictureFor(e.name, catalog, texts) ?? e.svgKey } : e
  );
  return [...own, ...fromCatalog];
}

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9]+/g, ' ')
    .trim();

/**
 * The catalog picture for an own exercise by its name: the same name (in
 * the current language or as the catalog id), else the longest catalog name
 * contained in it (or containing it), at least 6 letters.
 */
export function catalogPictureFor(
  name: string,
  catalog: CatalogExercise[],
  texts: Record<string, CatalogText>
): Exercise['svgKey'] | undefined {
  const n = norm(name);
  if (!n) return undefined;
  let best: { key: Exercise['svgKey']; len: number } | undefined;
  for (const c of catalog) {
    for (const raw of [texts[c.id]?.name, c.id.replace(/-/g, ' ')]) {
      if (!raw) continue;
      const m = norm(raw);
      if (m === n) return c.svgKey;
      if (n.length >= 6 && m.length >= 6 && (m.includes(n) || n.includes(m)) && (!best || m.length > best.len)) {
        best = { key: c.svgKey, len: m.length };
      }
    }
  }
  return best?.key;
}
