import {
  Exercise,
  FitnoteData,
  MobilityStep,
  WorkoutPlan,
} from '../types';

export const INITIAL_EXERCISES: Exercise[] = [
  {
    id: 'strict-pull-ups',
    name: 'Strict Pull-Ups',
    metric: 'reps',
    checkup_max: 9,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['lats', 'biceps'],
    antagonist_muscles: ['chest', 'triceps'],
    cue: 'Лопатки вниз и назад, подбородок выше перекладины без рывка.',
    details:
      'Хват чуть шире плеч, корпус прямой, ноги слегка выведены вперёд («лодочка»), пресс и ягодицы напряжены. На выдохе сначала опусти лопатки вниз, затем подтяни грудь к перекладине без раскачки, выводя подбородок выше турника. На вдохе плавно опустись за 2 секунды до почти полного выпрямления рук.',
    svgKey: 'pullups',
  },
  {
    id: 'parallel-bar-dips',
    name: 'Parallel Bar Dips',
    metric: 'reps',
    checkup_max: 23,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['chest', 'triceps', 'front_delts'],
    antagonist_muscles: ['lats', 'biceps', 'rear_delts'],
    cue: 'Корпус чуть вперёд, локти вдоль тела, опускайся до угла 90°.',
    details:
      'В упоре на брусьях опусти плечи вниз от ушей, слегка наклони корпус вперёд и удерживай пресс жёстким. На вдохе сгибай локти строго назад вдоль тела, опускайся подконтрольно до угла 90° в локтевом суставе (плечо параллельно земле). На выдохе мощно выжми себя вверх, не заваливая плечи вперёд.',
    svgKey: 'dips',
  },
  {
    id: 'australian-pull-ups',
    name: 'Australian Pull-Ups',
    metric: 'reps',
    checkup_max: 25,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['upper_back', 'rear_delts', 'biceps'],
    antagonist_muscles: ['chest', 'front_delts'],
    cue: 'Тело в одну прямую линию, тяни грудь к перекладине со сведением лопаток.',
    details:
      'Возьмись за низкую перекладину прямым хватом на ширине плеч и вытяни тело в прямую линию от пяток до макушки (таз не провисает). На выдохе тяни нижнюю часть груди к перекладине, сводя лопатки и направляя локти назад под 45°. Зафиксируй верхнюю точку на секунду и плавно вернись в исходный вис.',
    svgKey: 'australian_pullups',
  },
  {
    id: 'floor-push-ups',
    name: 'Floor Push-Ups',
    metric: 'reps',
    checkup_max: 35,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['chest', 'triceps'],
    antagonist_muscles: ['upper_back', 'rear_delts'],
    cue: 'Корпус жёсткий, локти под 45° к телу, касание грудью пола.',
    details:
      'Ладони на полу под плечами или чуть шире, тело натянуто в жёсткую планку без прогиба в пояснице. На вдохе опускайся вниз единым блоком до лёгкого касания грудью пола, направляя локти под углом около 45° к корпусу (не разводи широко в стороны). На выдохе выжми пол от себя.',
    svgKey: 'pushups',
  },
  {
    id: 'bulgarian-split-squat',
    name: 'Bulgarian Split Squat',
    metric: 'reps',
    checkup_max: 30,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['quads', 'glutes'],
    antagonist_muscles: ['hamstrings'],
    cue: 'Задняя нога на опоре, вес на пятке передней ноги, колено стабильно.',
    details:
      'Положи подъём стопы задней ноги на опору, шаг передней ногой достаточно длинный, корпус слегка наклонён вперёд, вес на пятке и середине стопы передней ноги. На вдохе опустись вниз, направляя переднее колено чётко по линии носка (не заваливая внутрь) до параллели бедра с полом. На выдохе вытолкни себя вверх пяткой передней ноги. Сначала выполни подход на одну ногу, затем на другую.',
    svgKey: 'bulgarian_split_squat',
    isPaired: true,
  },
  {
    id: 'single-leg-glute-bridge',
    name: 'Single-Leg Glute Bridge',
    metric: 'reps',
    checkup_max: 30,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['glutes', 'hamstrings'],
    antagonist_muscles: ['quads', 'hip_flexors'],
    cue: 'Пауза 1 сек в верхней точке, таз без перекоса, толкай пяткой.',
    details:
      'Ляг на спину, опорную стопу поставь на пол ближе к тазу, вторую ногу выпрями или подтяни колено к груди, поясница прижата к полу. На выдохе надави пяткой опорной ноги и подними таз до прямой линии от колена до плеча без прогиба в пояснице и перекоса таза. Сделай паузу 1 секунду вверху и плавно опусти таз. Повтори на обе ноги.',
    svgKey: 'glute_bridge',
    isPaired: true,
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    metric: 'seconds',
    checkup_max: 120,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['obliques', 'core'],
    antagonist_muscles: ['obliques'],
    cue: 'Локоть строго под плечом, таз высоко, шея на линии позвоночника.',
    details:
      'Встань в боковой упор на предплечье: локоть строго под плечевым суставом, предплечье перпендикулярно телу, стопы вместе или в ножницах. Вытолкни таз вверх так, чтобы тело образовало ровную линию без провисания и завала вперёд, шея на одной линии с позвоночником. Дыши ровно, удерживая напряжение бокового кора на каждую сторону.',
    svgKey: 'side_plank',
    isPaired: true,
  },
  {
    id: 'dead-hang',
    name: 'Dead Hang',
    metric: 'seconds',
    checkup_max: 45,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['forearms', 'spine_decompression'],
    antagonist_muscles: ['shoulder_press'],
    cue: 'Плечи мягко оттяни от ушей, дыши ровно в рёбра, хват плотный.',
    details:
      'Возьмись за перекладину полным закрытым хватом на ширине плеч, полностью расслабь поясницу и ноги, позволяя весу тела мягко вытягивать позвоночник. Плечи при этом чуть подконтрольны и не зажаты к ушам. Дыши глубоко и спокойно в нижние рёбра до окончания таймера.',
    svgKey: 'dead_hang',
  },
  {
    id: 'pallof-press',
    name: 'Pallof Press',
    metric: 'reps',
    checkup_max: 20,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['core', 'obliques'],
    antagonist_muscles: ['lower_back'],
    cue: 'Сопротивляйся скручиванию резинки, выпрямляй руки строго по центру.',
    details:
      'Закрепи резинку на уровне груди и встань боком к опоре так, чтобы лента была натянута; ноги на ширине плеч, колени мягкие, руки с резинкой прижаты к центру груди. На выдохе выжми руки строго вперёд по центральной оси тела, сопротивляясь скручиванию корпуса к креплению. Удержи прямые руки 1–2 секунды и плавно верни к груди. Выполни на обе стороны.',
    svgKey: 'pallof_press',
    isPaired: true,
  },
  {
    id: 'romanian-deadlift',
    name: 'Romanian Deadlift',
    metric: 'reps',
    checkup_max: 25,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['hamstrings', 'glutes'],
    antagonist_muscles: ['quads', 'hip_flexors'],
    cue: 'Спина нейтральная, отводи таз назад до натяжения задней поверхности.',
    details:
      'Стопы на ширине таза, колени слегка согнуты и зафиксированы в этом угле на всё движение, грудь раскрыта, лопатки собраны. На вдохе начинай движение с отведения таза строго назад, наклоняя ровный корпус вперёд и ведя снаряд или резинку вплотную к ногам до середины голени — пока чувствуешь чёткое натяжение задней поверхности бедра без округления поясницы. На выдохе за счёт сжатия ягодиц верни таз вперёд.',
    svgKey: 'romanian_deadlift',
  },
  {
    id: 'band-row',
    name: 'Band Row',
    metric: 'reps',
    checkup_max: 30,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['upper_back', 'lats', 'rear_delts'],
    antagonist_muscles: ['chest', 'front_delts'],
    cue: 'Тяни рукояти к нижним рёбрам, своди лопатки без подъёма плеч.',
    details:
      'Закрепи резинку спереди на уровне пояса или груди, отойди до рабочего натяжения, корпус ровный, плечи опущены. На выдохе сначала сведи лопатки и потяни локти строго назад вдоль корпуса, приводя кисти к нижним рёбрам без подъёма плеч к ушам и рывка спиной. Зафиксируй паузу на 1 секунду и плавно верни руки вперёд.',
    svgKey: 'band_row',
  },
  {
    id: 'reverse-lunges',
    name: 'Reverse Lunges',
    metric: 'reps',
    checkup_max: 30,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['quads', 'glutes'],
    antagonist_muscles: ['hamstrings'],
    cue: 'Длинный шаг назад, голень передней ноги вертикальна, корпус ровный.',
    details:
      'Встань прямо, стопы на ширине таза, пресс подтянут. На вдохе сделай контролируемый длинный шаг назад на носок и опусти заднее колено почти до пола (угол около 90° в обоих коленях); голень передней ноги остаётся вертикальной, вес распределён на пятку и всю стопу передней ноги. На выдохе оттолкнись передней ногой и вернись в стойку. Сделай на обе ноги.',
    svgKey: 'reverse_lunges',
    isPaired: true,
  },
  {
    id: 'pike-push-ups',
    name: 'Pike Push-Ups',
    metric: 'reps',
    checkup_max: 15,
    lastCheckupDate: '2026-11-01',
    target_muscles: ['front_delts', 'shoulder_press', 'triceps'],
    antagonist_muscles: ['lats', 'forearms'],
    cue: 'Таз высоко «домиком», опускай макушку вперёд перед линией ладоней.',
    details:
      'Прими положение «домиком»: таз поднят максимально высоко вверх, ладони на ширине плеч, ноги прямые или чуть согнуты. На вдохе сгибай локти назад под 45° и опускай голову вперёд перед линией ладоней (чтобы ладони и точка опускания головы образовывали треугольник). На выдохе выжми себя вверх по обратной дуге.',
    svgKey: 'pike_pushups',
  },
];

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
  const is8 = minutes <= 8;
  const is12 = minutes >= 12 && minutes < 15;
  const isFull = minutes >= 12;

  const durations = is8
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
  exercises: INITIAL_EXERCISES,
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
