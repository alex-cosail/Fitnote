import { Exercise, WorkoutPlan } from '../../types';
import { AgeGroup, Conditions } from '../catalog/filter';
import { CatalogExercise, FitnessLevel, MovementPattern } from '../catalog/types';

// Generator model (docs/GENERATOR_RULES.md). Pure data, no UI texts.

/** Health level (ARCHITECTURE §14): each next one includes the previous. */
export type HealthLevel = 'mobility' | 'form' | 'strength';

/** Workout component (GENERATOR_RULES §2): mobility, form (AGT), strength. */
export type Component = 'M' | 'F' | 'S';

/** The six zones of the person figure in the start wizard. */
export type Zone = 'upper_v' | 'upper_h' | 'core' | 'hinge' | 'squat' | 'lunge';
export type ZoneMark = 'base' | 'plus' | 'plusplus';

export interface GeneratorProfile {
  healthLevel: HealthLevel;
  perWeek: number; // 1, 2, 3, 4, 5+
  zones: Partial<Record<Zone, ZoneMark>>;
  ageGroup: AgeGroup;
  level: FitnessLevel;
  favorites: string[]; // ♥ exercise ids
  goalExerciseIds: string[]; // personal goals: the goal exercise (or the current step towards it)
  painful: string[]; // excluded exercise ids
  /** Where the person usually trains; the day's place is resolved at start. */
  usualConditions?: Conditions;
}

/** What the generator knows from the journal. */
export interface GeneratorHistory {
  lastDone: Record<string, string>; // exercise id → ISO date of the last time
  swappedAway: Record<string, number>; // exercise id → times swapped away in its last 5 sessions
}

export interface GeneratorContext {
  catalog: CatalogExercise[];
  exercises: Exercise[]; // resolved list: user maxima or defaults by level
  history: GeneratorHistory;
  date: string; // ISO date the plan is built for (determinism)
}

/** A slot before an exercise is picked. */
export interface SlotSpec {
  pattern: MovementPattern;
  rank: number;
  priority: number; // 3 focus (goal / ++), 2 plus, 1 base
  families?: string[]; // preferred ladder families (core sub-type)
  unilateral?: boolean; // prefer a unilateral / unstable variant
}

export type SessionKind =
  | 'S-A' | 'S-B' | 'S-ALL'
  | 'F-A' | 'F-B' | 'F' | 'F-ALL'
  | 'M'
  | 'ACC-A' | 'ACC-B' | 'TOPUP';

export interface GeneratedWorkout {
  kind: SessionKind;
  component: Component;
  plan: WorkoutPlan;
  /** Patterns of the focus (goal, ++ zone or the default big movements). */
  focus: MovementPattern[];
  estimateSec: number;
  /** Week 3 of a month with a personal goal: a short control test. */
  checkpoint?: boolean;
  deload?: boolean;
}

export type DayMode = 'standard' | 'short' | 'accent' | 'off';

export interface DayResult {
  plan: WorkoutPlan;
  mode: DayMode;
  warmupMinutes: number;
  cooldownMinutes: number;
  estimateSec: number;
  /** Patterns dropped by "accent": done as mobility in warm-up / cool-down
   *  and carried into the week's debt; the hint after the workout names them. */
  dropped: MovementPattern[];
}
