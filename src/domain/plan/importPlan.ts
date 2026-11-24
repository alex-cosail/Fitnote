import { Exercise, WorkoutPlan } from '../../types';

export interface ImportPayload {
  workouts?: WorkoutPlan[];
  exercises?: Exercise[];
}

export interface ImportResult {
  exercises: Exercise[];
  workouts: WorkoutPlan[];
  addedWorkouts: number;
  addedExercises: number;
}

/**
 * Merges an imported coach / AI plan into the current catalog and plans.
 * Existing ids are updated, new ones appended with safe defaults.
 * Logs, cardio and check-up history are never touched.
 * `idSeed` makes generated plan ids deterministic (defaults to Date.now()).
 */
export function applyImport(
  current: { exercises: Exercise[]; workouts: WorkoutPlan[] },
  payload: ImportPayload,
  idSeed: number = Date.now()
): ImportResult {
  let addedWorkouts = 0;
  let addedExercises = 0;

  const exercises = [...current.exercises];
  for (const incoming of payload.exercises ?? []) {
    if (!incoming.id || !incoming.name) continue;
    const idx = exercises.findIndex((e) => e.id === incoming.id);
    if (idx >= 0) {
      exercises[idx] = { ...exercises[idx], ...incoming };
    } else {
      exercises.push({
        ...incoming,
        svgKey: incoming.svgKey ?? 'generic_strength',
        target_muscles: incoming.target_muscles ?? ['core'],
        antagonist_muscles: incoming.antagonist_muscles ?? ['core'],
        cue: incoming.cue ?? 'Плавный контроль техники на каждом повторении.',
        checkup_max: incoming.checkup_max ?? 10,
        metric: incoming.metric ?? 'reps',
      });
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

  return { exercises, workouts, addedWorkouts, addedExercises };
}
