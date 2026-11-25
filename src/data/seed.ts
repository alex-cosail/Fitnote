import { resolveExercises } from '../domain/catalog/resolve';
import {
  Exercise,
  FitnoteData,
  MobilityStep,
  WorkoutPlan,
} from '../types';
import { CATALOG, SEED_MAXES } from './catalog';
import { CATALOG_TEXT_RU } from './catalogText.ru';

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

export function getWarmupPlan(
  minutes: number,
  firstExerciseName?: string
): { label: string; steps: MobilityStep[] } {
  // 5 min: the short warm-up of the short and accent modes (GENERATOR_RULES §3.3).
  const is5 = minutes <= 5;
  const is8 = minutes <= 8;
  const is12 = minutes >= 12 && minutes < 15;
  const isFull = minutes >= 12;

  const durations = is5
    ? {
        joint: { label: '2 мин', sec: 120 },
        pulse: { label: '1.5 мин', sec: 90 },
        lunge: { label: '1.5 мин', sec: 90 },
        primer: { label: '1.5 мин', sec: 90 },
      }
    : is8
    ? {
        joint: { label: '3 мин', sec: 180 },
        pulse: { label: '2 мин', sec: 120 },
        lunge: { label: '1.5 мин', sec: 90 },
        primer: { label: '1.5 мин', sec: 90 },
      }
    : is12
      ? {
          joint: { label: '2.5 мин', sec: 150 },
          pulse: { label: '1.5 мин', sec: 90 },
          lunge: { label: '1.5 мин', sec: 90 },
          primer: { label: '1.5 мин', sec: 90 },
        }
      : {
          joint: { label: '4 мин', sec: 240 },
          pulse: { label: '2.5 мин', sec: 150 },
          lunge: { label: '2 мин', sec: 120 },
          primer: { label: '1.5 мин', sec: 90 },
        };

  const primerHint = firstExerciseName ? ` (${firstExerciseName})` : '';

  const baseSteps: MobilityStep[] = [
    {
      id: 'wu-joint-rotations',
      name: 'Joint Rotations',
      subtitle: 'Суставная разминка: плечи, грудной отдел, таз',
      cue: 'Выполняй плавные вращения по максимальной комфортной амплитуде сверху вниз: мягкие полукруги и наклоны головы, круги плечами вперёд и назад, раскрытие грудного отдела в стороны и вращения тазом по 8–10 раз. Двигайся без рывков и боли, дыши спокойно через нос.',
      durationHint: durations.joint.label,
      durationSeconds: durations.joint.sec,
      svgKey: 'warmup_neck_thoracic',
    },
    {
      id: 'wu-pulse-jacks',
      name: 'Light Pulse & Jumping Jacks',
      subtitle: 'Лёгкий пульсовой разогрев',
      cue: 'Выполняй прыжки «ноги врозь — руки вверх» или бодрый шаг с высоким подниманием коленей в лёгком разговорном темпе для плавного подъёма пульса и температуры тела. Приземляйся мягко на переднюю часть стопы, плечи расслаблены и опущены от ушей.',
      durationHint: durations.pulse.label,
      durationSeconds: durations.pulse.sec,
      svgKey: 'warmup_jumping_jacks',
    },
    {
      id: 'wu-lunge-reach',
      name: 'Dynamic Lunge & Reach',
      subtitle: 'Выпады с вытяжением · Сгибатели бедра, грудь',
      cue: 'Сделай плавный шаг вперёд в выпад, одновременно подавая таз вперёд и вытягивая обе руки вверх над головой для мягкого раскрытия сгибателей бедра и грудной клетки. Не прогибайся в пояснице — держи пресс слегка подтянутым и чередуй ноги без спешки.',
      durationHint: durations.lunge.label,
      durationSeconds: durations.lunge.sec,
      svgKey: 'warmup_lunge_reach',
    },
    {
      id: 'wu-primer-set',
      name: 'Primer Set',
      subtitle: `Подводящий подход 30% к первому упражнению${primerHint}`,
      cue: 'Сделай 1–2 спокойных технических подхода первого упражнения основной тренировки примерно на 30% от рабочего объёма. Сфокусируйся на чёткой траектории, контроле лопаток или колена и ровном дыхании без утомления.',
      durationHint: durations.primer.label,
      durationSeconds: durations.primer.sec,
      svgKey: 'warmup_primer',
    },
  ];

  if (is5) {
    return {
      label: 'Короткая · 3 блока',
      steps: baseSteps.filter((s) => s.id !== 'wu-lunge-reach'),
    };
  }

  if (!isFull) {
    return {
      label: is8 ? 'Экспресс · 4 блока' : 'Стандарт · 4 блока',
      steps: baseSteps,
    };
  }

  return {
    label: 'Полная подготовка · 6 блоков',
    steps: [
      ...baseSteps,
      {
        id: 'wu-scapula-dislocates',
        name: 'Scapular Pulls & Band Dislocates',
        subtitle: 'Лопатки · Ротаторы плеча',
        cue: 'В висе на прямых руках плавно опускай и своди лопатки вниз от ушей, поднимая корпус всего на несколько сантиметров без сгибания локтей. Затем возьми резинку или палку широким хватом и сделай 10–12 медленных прокрутов над головой за спину, не сгибая руки.',
        durationHint: '2.5 мин',
        durationSeconds: 150,
        svgKey: 'warmup_scapula',
      },
      {
        id: 'wu-worlds-greatest-stretch',
        name: "World's Greatest Stretch",
        subtitle: 'Тазобедренные · Грудной отдел · Бицепс бедра',
        cue: 'Сделай глубокий выпад вперёд и поставь противоположную ладонь на пол рядом с передней стопой. Сначала потянись одноимённым локтем к внутренней стороне стопы, затем разверни грудную клетку к переднему колену и вытяни руку вертикально вверх, провожая её взглядом.',
        durationHint: '2.5 мин',
        durationSeconds: 150,
        svgKey: 'warmup_worlds_greatest_stretch',
      },
    ],
  };
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
  maxes: SEED_MAXES,
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
