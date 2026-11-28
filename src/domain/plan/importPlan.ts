import { Exercise, WorkoutPlan } from '../../types';
import { MaxEntry } from '../catalog/types';

export interface ImportPayload {
  /** v3.19: a name for the set (the AI coach gives one) and how many weeks a series runs. */
  title?: string;
  weeks?: number;
  workouts?: WorkoutPlan[];
  exercises?: Exercise[];
}

/** The ids the import gives the plans (the same rule as applyImport). */
export function importedIds(payload: ImportPayload, idSeed: number): string[] {
  return (payload.workouts ?? [])
    .filter((w) => w.title && Array.isArray(w.items))
    .map((w, i) => w.id || `plan-${idSeed}-${i}`);
}

export interface ImportState {
  maxes: Record<string, MaxEntry>;
  customExercises: Exercise[];
  workouts: WorkoutPlan[];
}

export interface ImportResult extends ImportState {
  addedWorkouts: number;
  addedExercises: number;
}

/**
 * Merges an imported coach / AI plan into the user's data.
 * - Catalog exercises: only a provided `checkup_max` is taken (into maxes);
 *   names and texts come from the catalog.
 * - Other exercises: added or updated as custom exercises with safe defaults.
 * - Plans with an existing id are replaced, new ones appended.
 * Logs, cardio and check-up history are never touched.
 * `idSeed` makes generated plan ids deterministic (defaults to Date.now()).
 */
export function applyImport(
  current: ImportState,
  payload: ImportPayload,
  catalogIds: ReadonlySet<string>,
  idSeed: number = Date.now()
): ImportResult {
  let addedWorkouts = 0;
  let addedExercises = 0;

  const maxes = { ...current.maxes };
  const customExercises = [...current.customExercises];
  for (const incoming of payload.exercises ?? []) {
    if (!incoming.id || !incoming.name) continue;
    if (catalogIds.has(incoming.id)) {
      if (typeof incoming.checkup_max === 'number') {
        maxes[incoming.id] = {
          value: incoming.checkup_max,
          date: incoming.lastCheckupDate ?? maxes[incoming.id]?.date,
        };
      }
    } else {
      const idx = customExercises.findIndex((e) => e.id === incoming.id);
      if (idx >= 0) {
        customExercises[idx] = { ...customExercises[idx], ...incoming, isCustom: true };
      } else {
        customExercises.push({
          ...incoming,
          svgKey: incoming.svgKey ?? 'generic_strength',
          target_muscles: incoming.target_muscles ?? ['core'],
          antagonist_muscles: incoming.antagonist_muscles ?? ['core'],
          cue: incoming.cue ?? 'Плавный контроль техники на каждом повторении.',
          checkup_max: incoming.checkup_max ?? 10,
          metric: incoming.metric ?? 'reps',
          isCustom: true,
        });
      }
    }
    addedExercises += 1;
  }

  const workouts = [...current.workouts];
  for (const incoming of payload.workouts ?? []) {
    if (!incoming.title || !Array.isArray(incoming.items)) continue;
    const planId = incoming.id || `plan-${idSeed}-${addedWorkouts}`;
    const normalized: WorkoutPlan = {
      id: planId,
      title: incoming.title,
      subtitle: incoming.subtitle ?? 'Импортированный план',
      formatLabel: incoming.formatLabel ?? 'Custom Plan',
      rounds: Math.max(1, incoming.rounds ?? 3),
      restBetweenExercises: incoming.restBetweenExercises ?? 45,
      restBetweenRounds: incoming.restBetweenRounds ?? 90,
      useAgt30: Boolean(incoming.useAgt30),
      items: incoming.items,
    };
    const idx = workouts.findIndex((w) => w.id === planId);
    if (idx >= 0) {
      workouts[idx] = normalized;
    } else {
      workouts.push(normalized);
    }
    addedWorkouts += 1;
  }

  return { maxes, customExercises, workouts, addedWorkouts, addedExercises };
}
