import { Exercise } from '../../types';
import { MaxEntry } from './types';

export interface UserExerciseData {
  maxes: Record<string, MaxEntry>;
  customExercises: Exercise[];
}

/**
 * Records a new check-up max: catalog exercises store it in `maxes`,
 * custom exercises keep it on the exercise itself.
 */
export function recordMax(
  user: UserExerciseData,
  catalogIds: ReadonlySet<string>,
  exerciseId: string,
  value: number,
  dateIso: string
): UserExerciseData {
  if (catalogIds.has(exerciseId)) {
    return {
      ...user,
      maxes: { ...user.maxes, [exerciseId]: { value, date: dateIso } },
    };
  }
  return {
    ...user,
    customExercises: user.customExercises.map((e) =>
      e.id === exerciseId ? { ...e, checkup_max: value, lastCheckupDate: dateIso } : e
    ),
  };
}

/**
 * Splits an old-style exercise list (catalog copies + custom exercises,
 * schema ≤ 2) into user maxima and custom exercises. Texts of catalog
 * exercises are dropped: the catalog in code is authoritative.
 */
export function splitLegacyExercises(
  exercises: Exercise[],
  catalogIds: ReadonlySet<string>,
  existingMaxes: Record<string, MaxEntry> = {}
): UserExerciseData {
  const maxes = { ...existingMaxes };
  const customExercises: Exercise[] = [];
  for (const e of exercises) {
    if (!e || typeof e.id !== 'string') continue;
    if (catalogIds.has(e.id)) {
      if (typeof e.checkup_max === 'number') {
        maxes[e.id] = { value: e.checkup_max, date: e.lastCheckupDate };
      }
    } else {
      customExercises.push({ ...e, isCustom: true });
    }
  }
  return { maxes, customExercises };
}
