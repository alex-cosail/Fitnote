import { resolveExercises } from '../domain/catalog/resolve';
import {
  Exercise,
  FitnoteData,
  MobilityStep,
  WorkoutPlan,
} from '../types';
import { CATALOG, SEED_MAXES } from './catalog';
import { CATALOG_TEXT_RU } from './catalogText.ru';
import { WarmupOptions, buildWarmup } from '../domain/warmup/warmup';

export const CATALOG_IDS: ReadonlySet<string> = new Set(CATALOG.map((c) => c.id));

// The catalog resolved with the shipped maxima (what a fresh install sees).
export const INITIAL_EXERCISES: Exercise[] = resolveExercises(
  CATALOG,
  CATALOG_TEXT_RU,
  SEED_MAXES,
  []
);

export const INITIAL_WORKOUTS: WorkoutPlan[] = [
  {
    id: 'workout-a',
    title: 'Workout A',
    subtitle: 'Силовая база: пары низ/кор + горизонталь + вертикаль',
    formatLabel: 'Strength Full Body',
    rounds: 3,
    restBetweenExercises: 45,
    restBetweenRounds: 90,
    items: [
      { exerciseId: 'bulgarian-split-squat', target: 18 },
      { exerciseId: 'pallof-press', target: 15 },
      { exerciseId: 'australian-pull-ups', target: 20 },
      { exerciseId: 'floor-push-ups', target: 25 },
      { exerciseId: 'single-leg-glute-bridge', target: 20 },
      { exerciseId: 'strict-pull-ups', target: 6 },
    ],
  },
  {
    id: 'workout-b',
    title: 'Workout B',
    subtitle: 'Силовая: задняя цепь + брусья/тяга + жим в угле',
    formatLabel: 'Strength & Posterior',
    rounds: 3,
    restBetweenExercises: 45,
    restBetweenRounds: 90,
    items: [
      { exerciseId: 'romanian-deadlift', target: 16 },
      { exerciseId: 'side-plank', target: 45 },
      { exerciseId: 'parallel-bar-dips', target: 15 },
      { exerciseId: 'band-row', target: 20 },
      { exerciseId: 'reverse-lunges', target: 20 },
      { exerciseId: 'pike-push-ups', target: 10 },
    ],
  },
  {
    id: 'workout-c-agt',
    title: 'Workout C (AGT 30%)',
    subtitle: 'Антигликолитическая круговая · 30% от Check-Up максимума',
    formatLabel: 'Full Body AGT 30%',
    rounds: 15,
    restBetweenExercises: 15,
    restBetweenRounds: 40,
    useAgt30: true,
    items: [
      { exerciseId: 'strict-pull-ups', target: 3 },
      { exerciseId: 'parallel-bar-dips', target: 7 },
      { exerciseId: 'bulgarian-split-squat', target: 9 },
      { exerciseId: 'side-plank', target: 35 },
    ],
  },
];

/** The warm-up for N minutes: one movement per minute (v3.7, src/domain/warmup). */
export function getWarmupPlan(
  minutes: number,
  firstExerciseName?: string,
  opts: WarmupOptions = {}
): { label: string; steps: MobilityStep[] } {
  return buildWarmup(minutes, { ...opts, firstExerciseName: firstExerciseName ?? opts.firstExerciseName });
}

export const COOLDOWN_STEPS: MobilityStep[] = [
  {
    id: 'cd-dead-hang',
    name: 'Dead Hang',
    subtitle: 'Предплечья · Декомпрессия позвоночника',
    cue: 'Возьмись за перекладину полным хватом на ширине плеч, полностью расслабь поясницу, корпус и ноги, позволяя весу тела мягко вытягивать позвоночник и широчайшие. Плечи отпусти от ушей, дыши глубоко и медленно через нос, удлиняя каждый выдох.',
    durationHint: '2×45 сек',
    svgKey: 'dead_hang',
  },
  {
    id: 'cd-stretch',
    name: 'Thoracic & Hamstring Stretch',
    subtitle: 'Грудь · Грудной отдел · Бицепс бедра',
    cue: 'Упрись предплечьем в стойку или косяк под углом 90° и мягко разверни корпус в сторону до комфортного вытяжения грудной мышцы (по 45 секунд на сторону). Затем сделай спокойный наклон вперёд с ровной спиной к почти прямым ногам, расслабляя заднюю поверхность бедра на каждом выдохе.',
    durationHint: '3 мин',
    svgKey: 'cooldown_stretch',
  },
];

export const RED_MOBILITY_EXERCISES: { exerciseId: string; target: number }[] = [
  { exerciseId: 'dead-hang', target: 35 },
  { exerciseId: 'side-plank', target: 40 },
  { exerciseId: 'single-leg-glute-bridge', target: 12 },
];

export const DEFAULT_FITNOTE_DATA: FitnoteData = {
  // A fresh install starts without anyone's maxima: defaults by the level from
  // the start wizard, estimates after the first check-up (field test 26.11).
  // The author's own maxima stay in SEED_MAXES (tests, examples).
  maxes: {},
  customExercises: [],
  workouts: INITIAL_WORKOUTS,
  selectedWorkoutId: 'workout-a',
  readiness: 'green',
  warmupMinutes: 10,
  isMuted: false,
  theme: 'light',
  workoutLogs: [],
  cardioLogs: [],
  checkUpHistory: [
    {
      id: 'cu-init-1',
      date: '2026-11-01T09:00:00.000Z',
      exerciseId: 'strict-pull-ups',
      exerciseName: 'Strict Pull-Ups',
      metric: 'reps',
      value: 9,
      agt30: 3,
    },
    {
      id: 'cu-init-2',
      date: '2026-11-01T09:05:00.000Z',
      exerciseId: 'parallel-bar-dips',
      exerciseName: 'Parallel Bar Dips',
      metric: 'reps',
      value: 23,
      agt30: 7,
    },
    {
      id: 'cu-init-3',
      date: '2026-11-01T09:10:00.000Z',
      exerciseId: 'bulgarian-split-squat',
      exerciseName: 'Bulgarian Split Squat',
      metric: 'reps',
      value: 30,
      agt30: 9,
    },
    {
      id: 'cu-init-4',
      date: '2026-11-01T09:15:00.000Z',
      exerciseId: 'side-plank',
      exerciseName: 'Side Plank',
      metric: 'seconds',
      value: 120,
      agt30: 35,
    },
  ],
  activeSession: null,
};
