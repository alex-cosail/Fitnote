export type MetricType = 'reps' | 'seconds';

export type ReadinessLevel = 'green' | 'yellow' | 'red';

export type RirValue = '2+' | '1' | '0';

export type ThemeMode = 'light' | 'dark';

export type AppTab = 'workout' | 'checkup' | 'catalog' | 'sync';

export type SvgKey =
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

export interface WorkoutItem {
  exerciseId: string;
  target: number; // baseline reps or seconds (ignored/overridden if plan.useAgt30 is true)
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
}

export interface MobilityStep {
  id: string;
  name: string;
  subtitle?: string;
  cue: string;
  durationHint: string;
  durationSeconds?: number;
  svgKey: SvgKey;
}

export interface SetLog {
  round: number;
  exerciseId: string;
  exerciseName: string;
  swappedFromName?: string;
  metric: MetricType;
  target: number;
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
  preCountdownSec?: number;
  cooldownMinutes: number;
  phaseRemainingSec: number;
  phaseEndTimestamp?: number; // epoch ms when timer runs
  isPaused: boolean;
  items: {
    exerciseId: string;
    target: number;
    swappedFromId?: string;
  }[];
  logs: SetLog[];
  startedAt: string;
  restBetweenExercises: number;
  restBetweenRounds: number;
  isMobilityOnly?: boolean;
}

export interface WorkoutLog {
  id: string;
  date: string;
  workoutTitle: string;
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
  exercises: Exercise[];
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
}
