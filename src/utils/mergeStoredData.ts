import { FitnoteData } from '../types';

const isPlainObject = (x: unknown): x is Record<string, unknown> =>
  typeof x === 'object' && x !== null && !Array.isArray(x);

/**
 * Builds a full FitnoteData from a (possibly partial) current-schema object:
 * defaults for missing fields, empty arrays for missing logs.
 * Pure: no window / localStorage access.
 */
export function mergeStoredData(
  parsed: Partial<FitnoteData>,
  defaults: FitnoteData
): FitnoteData {
  return {
    ...defaults,
    ...parsed,
    theme: parsed.theme === 'dark' ? 'dark' : 'light',
    maxes: isPlainObject(parsed.maxes)
      ? (parsed.maxes as FitnoteData['maxes'])
      : defaults.maxes,
    customExercises: Array.isArray(parsed.customExercises)
      ? parsed.customExercises
      : [],
    workouts:
      Array.isArray(parsed.workouts) && parsed.workouts.length > 0
        ? parsed.workouts
        : defaults.workouts,
    workoutLogs: Array.isArray(parsed.workoutLogs) ? parsed.workoutLogs : [],
    cardioLogs: Array.isArray(parsed.cardioLogs) ? parsed.cardioLogs : [],
    checkUpHistory: Array.isArray(parsed.checkUpHistory)
      ? parsed.checkUpHistory
      : defaults.checkUpHistory,
    activeSession: parsed.activeSession ?? null,
  };
}
