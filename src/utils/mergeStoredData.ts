import { Exercise, FitnoteData } from '../types';

/**
 * Builds a full FitnoteData from a (possibly old or partial) stored object:
 * defaults for missing fields, seed `isPaired` / `details` back-filled into
 * stored seed exercises, empty arrays for missing logs.
 * Pure: no window / localStorage access.
 */
export function mergeStoredData(
  parsed: Partial<FitnoteData>,
  defaults: FitnoteData,
  seedExercises: Exercise[]
): FitnoteData {
  const exercises =
    Array.isArray(parsed.exercises) && parsed.exercises.length > 0
      ? parsed.exercises.map((ex) => {
          const seedMatch = seedExercises.find((s) => s.id === ex.id);
          if (!seedMatch) return ex;
          return {
            ...ex,
            isPaired: ex.isPaired ?? seedMatch.isPaired,
            details: ex.details ?? seedMatch.details,
          };
        })
      : defaults.exercises;

  return {
    ...defaults,
    ...parsed,
    theme: parsed.theme === 'dark' ? 'dark' : 'light',
    exercises,
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
