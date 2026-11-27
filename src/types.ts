export type MetricType = 'reps' | 'seconds';

// The day's mode chosen before a workout (GENERATOR_RULES §3.2); the old
// traffic-light values stay so older logs read the same:
// green = standard · yellow = short (⅔ rounds) · accent = focus pairs under
// the minutes given · red = no energy (mobility only).
export type ReadinessLevel = 'green' | 'yellow' | 'accent' | 'red';

export type RirValue = '2+' | '1' | '0';

export type ThemeMode = 'light' | 'dark';

export type AppTab = 'workout' | 'checkup' | 'catalog' | 'sync';

export type SvgKey =
  | import('./data/sceneKeys').SceneKey
  | import('./data/warmupKeys').WarmupKey
  | import('./data/rehabKeys').RehabKey
  | 'pullups'
  | 'dips'
  | 'australian_pullups'
  | 'pushups'
  | 'bulgarian_split_squat'
  | 'glute_bridge'
  | 'side_plank'
  | 'dead_hang'
  | 'pallof_press'
  | 'romanian_deadlift'
  | 'band_row'
  | 'reverse_lunges'
  | 'pike_pushups'
  | 'warmup_neck_thoracic'
  | 'warmup_shoulders'
  | 'warmup_hips'
  | 'warmup_scapula'
  | 'warmup_jumping_jacks'
  | 'warmup_lunge_reach'
  | 'warmup_primer'
  | 'warmup_worlds_greatest_stretch'
  | 'cooldown_stretch'
  | 'generic_strength';

export interface Exercise {
  id: string;
  name: string;
  metric: MetricType;
  checkup_max: number;
  lastCheckupDate?: string;
  target_muscles: string[];
  antagonist_muscles: string[];
  cue: string;
  details?: string;
  svgKey: SvgKey;
  isPaired?: boolean;
  isCustom?: boolean;
}

// How a slot's target is set (docs/ARCHITECTURE_V3_STEP0.md, section 3).
export type TargetSpec =
  | { kind: 'fixed'; value: number } // exactly this many (coach plans, old data)
  | { kind: 'pctMax'; pct: number } // share of the user's max: 0.3 = AGT, 0.75 = strength
  | { kind: 'rir'; rir: 0 | 1 | 2 | 3 }; // "leave N in the tank", estimated from the max

/**
 * A plan slot. Old / coach plans pin an exercise with a fixed target
 * (`exerciseId` + `target`), which behaves exactly as before. Generated or
 * shared plans may describe the slot by pattern + rank + spec instead; the
 * engine then picks an exercise that fits the user's conditions.
 */
export interface WorkoutItem {
  exerciseId?: string;
  target: number; // baseline reps or seconds (ignored/overridden if plan.useAgt30 is true)
  pattern?: import('./domain/catalog/types').MovementPattern;
  rank?: import('./domain/catalog/types').DifficultyRank;
  spec?: TargetSpec;
}

export interface WorkoutPlan {
  id: string;
  title: string;
  subtitle: string;
  formatLabel: string;
  rounds: number;
  restBetweenExercises: number; // seconds
  restBetweenRounds: number; // seconds
  useAgt30?: boolean;
  items: WorkoutItem[];
  // Snapshot of the coach's values, taken on the first manual edit on the
  // Workout screen; used by "reset to coach plan". Absent = never edited.
  original?: {
    rounds: number;
    items: WorkoutItem[];
  };
}

export interface MobilityStep {
  id: string;
  name: string;
  subtitle?: string;
  cue: string;
  durationHint: string;
  durationSeconds?: number;
  svgKey: SvgKey;
  /** Second of the step when the side or direction changes (v3.15). */
  splitCueAt?: number;
}

export interface SetLog {
  round: number;
  exerciseId: string;
  exerciseName: string;
  swappedFromName?: string;
  metric: MetricType;
  target: number;
  // The coach's target before in-session carryover; absent in older logs
  // (then equal to `target`).
  plannedTarget?: number;
  actual: number;
  leftActual?: number;
  rightActual?: number;
  rir: RirValue;
  completedAt: string;
}

export type PlayerPhase =
  | 'warmup'
  | 'exercise'
  | 'rest'
  | 'round_banner'
  | 'cooldown'
  | 'finish';

export interface ActiveSession {
  id: string;
  workoutId: string;
  workoutTitle: string;
  readiness: ReadinessLevel;
  totalRounds: number;
  currentRound: number;
  currentItemIndex: number;
  phase: PlayerPhase;
  warmupMinutes: number;
  warmupStepIndex?: number;
  warmupStepRemainingSec?: number;
  /** The warm-up built at the start (v3.7: one movement per minute). */
  warmupSteps?: MobilityStep[];
  preCountdownSec?: number;
  cooldownMinutes: number;
  phaseRemainingSec: number;
  phaseEndTimestamp?: number; // epoch ms when timer runs
  isPaused: boolean;
  items: {
    exerciseId: string;
    // Current target; carries over the actual result from the previous round.
    target: number;
    // The coach's target at session start (absent in older saved sessions).
    plannedTarget?: number;
    swappedFromId?: string;
  }[];
  logs: SetLog[];
  startedAt: string;
  restBetweenExercises: number;
  restBetweenRounds: number;
  isMobilityOnly?: boolean;
  // Open-ended "15+" mode: the whole round on one screen, "+1 round" button,
  // no round cap; `totalRounds` is only the goal.
  isRoundFlow?: boolean;
}

export interface WorkoutLog {
  id: string;
  date: string;
  workoutTitle: string;
  // The plan this was (absent in logs before v3.5): the week strip marks the day done.
  workoutId?: string;
  // «Как зашло?» after the workout (absent = not answered).
  outcome?: 'easy' | 'ok' | 'hard';
  /** Exercises changed during the workout (v3.8) and whether they stay in the plan. */
  swaps?: { from: string; to: string }[];
  swapsKept?: boolean;
  readiness: ReadinessLevel;
  roundsCompleted: number;
  roundsPlanned: number;
  durationSeconds: number;
  sets: SetLog[];
  note?: string;
}

export type CardioType = 'Бег' | 'Плавание' | 'Вело' | 'Ходьба';

export interface CardioLog {
  id: string;
  date: string;
  type: CardioType;
  durationMinutes: number;
  distanceKm?: number;
  pte?: number;
  z4z5Minutes?: number;
  ascentMeters?: number;
  swolf?: number;
  note?: string;
}

export interface CheckUpEntry {
  id: string;
  date: string;
  exerciseId: string;
  exerciseName: string;
  metric: MetricType;
  value: number;
  agt30: number;
}

export interface FitnoteData {
  // Catalog exercises live in code (src/data/catalog.ts); the user keeps
  // only their check-up maxima and their own exercises (schema ≥ 3).
  maxes: Record<string, { value: number; date?: string }>;
  customExercises: Exercise[];
  workouts: WorkoutPlan[];
  selectedWorkoutId: string;
  readiness: ReadinessLevel;
  warmupMinutes: number;
  isMuted: boolean;
  theme: ThemeMode;
  workoutLogs: WorkoutLog[];
  cardioLogs: CardioLog[];
  checkUpHistory: CheckUpEntry[];
  activeSession: ActiveSession | null;
  // ISO time of the last saved backup file (absent = never).
  lastBackupAt?: string;
  // The week: cycles lay plans out on weekdays; moves are stored as overrides
  // (docs/BACKLOG.md, field test 26.11). Absent before v3.5.
  cycles?: import('./domain/schedule/schedule').Cycle[];
  dayOverrides?: import('./domain/schedule/schedule').DayOverrides;
  /** The constructor's archive (v3.12): singles and series the person keeps. */
  archive?: import('./domain/schedule/archive').ArchiveItem[];
  /** A second (third…) single workout on a date. */
  dayExtras?: Record<string, string[]>;
  /** Weekly repeats of singles (v3.13). */
  repeats?: import('./domain/schedule/archive').Repeat[];
  // «Не сейчас» on the compensation cards: '<monday>:topup' / '<monday>:monday'.
  compensationDismissed?: string[];
  // «Позже» on the start wizard: a new person is not sent there again on launch.
  onboardingDismissed?: boolean;
  // The person from the start wizard (absent = not met yet; generator uses defaults).
  profile?: import('./domain/profile/profile').UserProfile;
  // Favorite exercise ids (♥ in the generator); the engine prefers them.
  favorites?: string[];
  // Minutes for the accent mode (absent = 20).
  accentMinutes?: number;
  /** The person's own note per exercise (v3.8): «жёлтая + синяя». */
  exerciseNotes?: Record<string, string>;
  /** «Берегу» (v3.9): joints not loaded now or loaded gently. */
  care?: import('./domain/care/care').Care[];
  // Last answer to "When is the next workout?" (calendar reminder).
  reminder?: { daysAhead: 0 | 1 | 2 | 3; time: string };
  // Interface language (absent = Russian; the switcher arrives in step 4).
  locale?: 'ru' | 'en' | 'tr';
}
