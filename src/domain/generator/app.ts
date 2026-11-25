import { Exercise, WorkoutLog, WorkoutPlan } from '../../types';
import { CatalogExercise, MovementPattern } from '../catalog/types';
import { weekDebt, weekIsCovered } from './coverage';
import { historyFromLogs } from './progress';
import { buildMonth, buildWeek } from './week';
import { GeneratedWorkout, GeneratorProfile, HealthLevel } from './types';
import { DEFAULT_PROFILE } from './defaults';

// Glue between the generator and the app's data (Generator screen).

export type GenPeriod = 'single' | 'week' | 'month';
/** The generator's level question: warm-up · 30% · «100%» (GENERATOR_RULES §2). */
export type GenLevel = 'warmup' | 'agt' | 'full';

export interface GenRequest {
  period: GenPeriod;
  level: GenLevel;
  perWeek: number;
}

export const DEFAULT_REQUEST: GenRequest = { period: 'week', level: 'full', perWeek: 3 };

export const LEVEL_TO_HEALTH: Record<GenLevel, HealthLevel> = {
  warmup: 'mobility',
  agt: 'form',
  full: 'strength',
};

export interface GenResult {
  /** Weeks of workouts: one week for "single" and "week", four for "month". */
  weeks: GeneratedWorkout[][];
  covered: boolean;
  debt: MovementPattern[];
}

export interface GenInput {
  catalog: CatalogExercise[];
  exercises: Exercise[];
  logs: WorkoutLog[];
  date: string; // ISO date
  profile?: Partial<GeneratorProfile>;
}

const DAY = 86_400_000;

export function runGenerator(req: GenRequest, input: GenInput): GenResult {
  const profile: GeneratorProfile = {
    ...DEFAULT_PROFILE,
    ...input.profile,
    healthLevel: LEVEL_TO_HEALTH[req.level],
    perWeek: req.perWeek,
  };
  const ctx = {
    catalog: input.catalog,
    exercises: input.exercises,
    history: historyFromLogs(input.logs, input.exercises),
    date: input.date,
  };
  let weeks: GeneratedWorkout[][];
  if (req.period === 'month') {
    weeks = buildMonth(profile, ctx);
  } else {
    const week = buildWeek(profile, ctx);
    if (req.period === 'single') {
      // The next workout of the week: as many as were done in the last 7 days.
      const since = Date.parse(input.date) - 7 * DAY;
      const done = input.logs.filter((l) => Date.parse(l.date) >= since).length;
      weeks = [[week[done % week.length]]];
    } else {
      weeks = [week];
    }
  }
  const main = (weeks[0] ?? []).filter((g) => g.component !== 'M' && !['ACC-A', 'ACC-B', 'TOPUP'].includes(g.kind));
  const patterns = main.map((g) => g.plan.items.map((it) => it.pattern!) as MovementPattern[]);
  const fullWeek = req.period !== 'single' && req.level !== 'warmup';
  return {
    weeks,
    covered: fullWeek ? weekIsCovered(patterns, req.perWeek) : true,
    debt: fullWeek ? weekDebt(patterns, req.perWeek) : [],
  };
}

/** Plans for the Workout tab; titles come from the screen (localized). */
export function toWorkoutPlans(
  result: GenResult,
  label: (gw: GeneratedWorkout, week: number | undefined) => { title: string; subtitle: string; formatLabel: string }
): WorkoutPlan[] {
  const many = result.weeks.length > 1;
  return result.weeks.flatMap((week, wi) =>
    week.map((gw) => ({ ...gw.plan, ...label(gw, many ? wi + 1 : undefined) }))
  );
}

/** Generated plans replace the previous generated ones; coach and own plans stay. */
export function replaceGenerated(workouts: WorkoutPlan[], plans: WorkoutPlan[]): WorkoutPlan[] {
  return [...plans, ...workouts.filter((w) => !w.id.startsWith('gen-'))];
}
