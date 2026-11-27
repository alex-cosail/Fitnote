import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { SCENE_KEYS } from '../../data/sceneKeys';
import { REHAB_KEYS } from '../../data/rehabKeys';
import { catalogPictureFor, resolveExercises } from './resolve';

// The check-up showed several exercises with the same picture (28.11). The
// catalog itself must never do that: every exercise — its own scene.

describe('pictures', () => {
  it('every catalog exercise has its own picture, and the picture exists', () => {
    const fallback = readFileSync('src/components/ExerciseSvg.tsx', 'utf8');
    const keys = CATALOG.map((c) => c.svgKey);
    expect(new Set(keys).size).toBe(keys.length);
    for (const k of keys) {
      const drawn = (SCENE_KEYS as readonly string[]).includes(k) || (REHAB_KEYS as readonly string[]).includes(k) || fallback.includes(`case '${k}'`);
      expect(drawn, k).toBe(true);
      expect(k).not.toBe('generic_strength');
    }
  });

  it('an own exercise takes the catalog picture by its name', () => {
    const texts = catalogTextsFor('ru');
    expect(catalogPictureFor('Air Squats', CATALOG, texts)).toBe('air_squats');
    expect(catalogPictureFor('air-squats', CATALOG, texts)).toBe('air_squats');
    expect(catalogPictureFor('Мой собственный финт', CATALOG, texts)).toBeUndefined();
  });

  it('resolved own exercises with the generic picture get the matching one', () => {
    const own = { id: 'custom-1', name: 'Australian Pull-Ups', metric: 'reps' as const, checkup_max: 10, target_muscles: [], antagonist_muscles: [], cue: '', svgKey: 'generic_strength' as const, isCustom: true };
    const [first] = resolveExercises(CATALOG, catalogTextsFor('ru'), {}, [own]);
    expect(first.svgKey).toBe('australian_pullups');
  });
});
