import { DEFAULT_FITNOTE_DATA, INITIAL_EXERCISES } from '../data/seed';
import { FitnoteData } from '../types';

const STORAGE_KEY = 'fitnote_offline_store_v1';

export function loadFitnoteData(): FitnoteData {
  if (typeof window === 'undefined') return DEFAULT_FITNOTE_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FITNOTE_DATA;
    const parsed = JSON.parse(raw) as Partial<FitnoteData>;
    const mergedExercises =
      Array.isArray(parsed.exercises) && parsed.exercises.length > 0
        ? parsed.exercises.map((ex) => {
            const seedMatch = INITIAL_EXERCISES.find((s) => s.id === ex.id);
            if (!seedMatch) return ex;
            return {
              ...ex,
              isPaired: ex.isPaired ?? seedMatch.isPaired,
              details: ex.details ?? seedMatch.details,
            };
          })
        : DEFAULT_FITNOTE_DATA.exercises;

    return {
      ...DEFAULT_FITNOTE_DATA,
      ...parsed,
      theme: parsed.theme === 'dark' ? 'dark' : 'light',
      exercises: mergedExercises,
      workouts:
        Array.isArray(parsed.workouts) && parsed.workouts.length > 0
          ? parsed.workouts
          : DEFAULT_FITNOTE_DATA.workouts,
      workoutLogs: Array.isArray(parsed.workoutLogs) ? parsed.workoutLogs : [],
      cardioLogs: Array.isArray(parsed.cardioLogs) ? parsed.cardioLogs : [],
      checkUpHistory: Array.isArray(parsed.checkUpHistory)
        ? parsed.checkUpHistory
        : DEFAULT_FITNOTE_DATA.checkUpHistory,
      activeSession: parsed.activeSession ?? null,
    };
  } catch {
    return DEFAULT_FITNOTE_DATA;
  }
}

export function saveFitnoteData(data: FitnoteData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors silently
  }
}
