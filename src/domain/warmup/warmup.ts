import type { MobilityStep, SvgKey } from '../../types';
import type { AgeGroup, Conditions } from '../catalog/filter';
import type { JointLoad } from '../catalog/joints';
import { blockedByLoad, CareRule } from '../care/care';
import type { MovementPattern } from '../catalog/types';

// Warm-up «минута = движение» (field test 26.11, v3.7): N minutes = N
// movements of one minute each. Joints first, then the pulse, then dynamic
// movements for the patterns of today's workout (in the accent mode — first
// for the patterns the accent left out), and the last minute is a light
// set of the first exercise.

type Phase = 'joint' | 'pulse' | 'dynamic' | 'primer';

export interface WarmupMove {
  id: string;
  phase: Phase;
  name: string;
  cue: string;
  svgKey: SvgKey;
  /** Patterns this movement prepares. */
  patterns: MovementPattern[];
  /** Needs a pull-up bar. */
  bar?: boolean;
  /** Jumps or a deep floor position: not for 55+. */
  hard?: boolean;
  /** Joint load, filtered by «Как двигается?» like the exercises (v3.11). */
  joints: JointLoad;
}

export const WARMUP_MOVES: WarmupMove[] = [
  // ——— joints ———
  {
    id: 'wu-arm-circles',
    joints: { shoulder: 1 },
    phase: 'joint',
    name: 'Круги руками',
    cue: 'Прямые руки, большие спокойные круги: полминуты вперёд, полминуты назад. Плечи опущены.',
    svgKey: 'wu_arm_circles',
    patterns: ['push_v', 'pull_v'],
  },
  {
    id: 'wu-hip-circles',
    joints: { hip: 1, lower_back: 1 },
    phase: 'joint',
    name: 'Круги тазом',
    cue: 'Руки на поясе, стопы на ширине плеч. Широкие круги тазом, полминуты в каждую сторону.',
    svgKey: 'wu_hip_circles',
    patterns: ['hinge', 'core'],
  },
  {
    id: 'wu-knee-ankle',
    joints: { knee: 1, ankle: 1 },
    phase: 'joint',
    name: 'Колени и стопы',
    cue: 'Ноги вместе, ладони на коленях — мягкие круги коленями. Затем круги каждой стопой на носке.',
    svgKey: 'wu_knee_ankle',
    patterns: ['squat', 'lunge'],
  },
  {
    id: 'wu-neck',
    joints: { neck: 1 },
    phase: 'joint',
    name: 'Голова и шея',
    cue: 'Медленные наклоны головы к плечам и полукруги через грудь. Назад не запрокидывай.',
    svgKey: 'wu_neck',
    patterns: [],
  },
  {
    id: 'wu-torso-twist',
    joints: { thoracic: 1, lower_back: 1 },
    phase: 'joint',
    name: 'Повороты корпуса',
    cue: 'Стопы на месте, руки свободно. Поворачивай грудную клетку вправо и влево, руки догоняют сами.',
    svgKey: 'wu_torso_twist',
    patterns: ['core'],
  },
  // ——— pulse ———
  {
    id: 'wu-jacks',
    joints: { knee: 2, ankle: 2, shoulder: 1 },
    phase: 'pulse',
    name: 'Прыжки «звёздочка»',
    cue: 'Ноги врозь — руки вверх, ноги вместе — руки вниз. Лёгкий темп, приземляйся мягко на носки.',
    svgKey: 'wu_jacks',
    patterns: [],
    hard: true,
  },
  {
    id: 'wu-high-knees',
    joints: { hip: 1, knee: 1 },
    phase: 'pulse',
    name: 'Шаг с высоким коленом',
    cue: 'Бодрый шаг на месте, колено до уровня таза, руки работают. Без прыжков, дыхание ровное.',
    svgKey: 'wu_high_knees',
    patterns: ['core'],
  },
  // ——— dynamic ———
  {
    id: 'wu-squat-reach',
    joints: { knee: 2, hip: 1, shoulder: 1 },
    phase: 'dynamic',
    name: 'Присед с руками вверх',
    cue: 'Медленный присед на удобную глубину, пятки на земле. На подъёме тянись руками вверх.',
    svgKey: 'wu_squat_reach',
    patterns: ['squat'],
  },
  {
    id: 'wu-lunge-reach',
    joints: { knee: 2, hip: 2, ankle: 1 },
    phase: 'dynamic',
    name: 'Выпад с руками вверх',
    cue: 'Шаг вперёд в выпад, руки вверх, таз чуть вперёд. Вернись и смени ногу. Без спешки.',
    svgKey: 'wu_lunge_reach',
    patterns: ['lunge', 'squat'],
  },
  {
    id: 'wu-hinge',
    joints: { lower_back: 2, hip: 2 },
    phase: 'dynamic',
    name: 'Наклон с ровной спиной',
    cue: 'Колени мягкие, таз уходит назад, спина ровная. Наклон до натяжения сзади бедра — и вверх.',
    svgKey: 'wu_hinge',
    patterns: ['hinge'],
  },
  {
    id: 'wu-leg-swing',
    joints: { hip: 2 },
    phase: 'dynamic',
    name: 'Махи ногами',
    cue: 'Держись за опору. Свободные махи прямой ногой вперёд-назад, полминуты на каждую ногу.',
    svgKey: 'wu_leg_swing',
    patterns: ['hinge', 'lunge'],
  },
  {
    id: 'wu-incline-pushup',
    joints: { shoulder: 2, elbow_wrist: 2 },
    phase: 'dynamic',
    name: 'Лёгкие отжимания от опоры',
    cue: 'Руки на перекладину, скамейку или стену. 8–10 медленных повторов вполсилы, корпус прямой.',
    svgKey: 'wu_incline_pushup',
    patterns: ['push_h', 'push_v'],
  },
  {
    id: 'wu-pull-apart',
    joints: { shoulder: 1 },
    phase: 'dynamic',
    name: 'Разведение рук назад',
    cue: 'Прямые руки перед собой, своди лопатки и разводи руки назад. С резинкой — растягивай её.',
    svgKey: 'wu_pull_apart',
    patterns: ['pull_h', 'push_v'],
  },
  {
    id: 'wu-scapula',
    joints: { shoulder: 2, elbow_wrist: 2 },
    phase: 'dynamic',
    name: 'Лопатки в висе',
    cue: 'Вис на прямых руках. Опускай плечи от ушей и снова расслабляй, 8–10 раз, локти прямые.',
    svgKey: 'warmup_scapula',
    patterns: ['pull_v'],
    bar: true,
  },
  {
    id: 'wu-wall-slide',
    joints: { shoulder: 1, thoracic: 1 },
    phase: 'dynamic',
    name: 'Руки вверх у стены',
    cue: 'Спиной к стене, локти и кисти касаются стены. Скользи руками вверх и вниз, поясница прижата.',
    svgKey: 'scapular_wall_slides',
    patterns: ['push_v', 'pull_v'],
  },
  {
    id: 'wu-cross-crunch',
    joints: { lower_back: 1, hip: 1 },
    phase: 'dynamic',
    name: 'Локоть к колену',
    cue: 'Стоя, поднимай колено и тянись к нему противоположным локтем. Медленно, попеременно.',
    svgKey: 'wu_cross_crunch',
    patterns: ['core'],
  },
  {
    id: 'wu-inchworm',
    joints: { shoulder: 2, elbow_wrist: 2, lower_back: 2 },
    phase: 'dynamic',
    name: 'Гусеница',
    cue: 'Наклонись, поставь ладони на землю и пройди руками в упор лёжа. Затем шагами ног к рукам — и встань.',
    svgKey: 'wu_inchworm',
    patterns: ['push_h', 'core', 'hinge'],
    hard: true,
  },
  {
    id: 'wu-worlds-greatest',
    joints: { hip: 2, lower_back: 2, knee: 1 },
    phase: 'dynamic',
    name: 'Выпад с поворотом',
    cue: 'Глубокий выпад, ладонь на землю у передней стопы. Разверни грудь к колену и вытяни руку вверх.',
    svgKey: 'warmup_worlds_greatest_stretch',
    patterns: ['lunge', 'hinge', 'core'],
    hard: true,
  },
];

/** After the workout patterns: what fills the remaining minutes. */
const GENERAL_ORDER = [
  'wu-lunge-reach',
  'wu-squat-reach',
  'wu-hinge',
  'wu-pull-apart',
  'wu-worlds-greatest',
  'wu-leg-swing',
  'wu-cross-crunch',
  'wu-incline-pushup',
  'wu-wall-slide',
  'wu-inchworm',
];
const JOINT_ORDER = ['wu-arm-circles', 'wu-hip-circles', 'wu-knee-ankle', 'wu-neck', 'wu-torso-twist'];

export interface WarmupOptions {
  /** Patterns of today's workout in their order. */
  patterns?: MovementPattern[];
  /** Patterns the accent left out: they come first. */
  dropped?: MovementPattern[];
  hasBar?: boolean;
  ageGroup?: AgeGroup;
  firstExerciseName?: string;
  /** Joint levels: movements that load a protected joint are left out. */
  care?: CareRule[];
}

export interface WarmupPlan {
  label: string;
  steps: MobilityStep[];
}

function movementsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return 'движение';
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return 'движения';
  return 'движений';
}

const byId = new Map(WARMUP_MOVES.map((m) => [m.id, m]));

export function buildWarmup(minutes: number, opts: WarmupOptions = {}): WarmupPlan {
  const n = Math.max(3, Math.min(20, Math.round(minutes)));
  const ok = (m: WarmupMove) =>
    (!m.bar || opts.hasBar !== false) && !(opts.ageGroup === 'masters' && m.hard) && !blockedByLoad(m.joints, opts.care);
  const chosen = new Set<string>();
  const take = (m: WarmupMove | undefined) => {
    if (!m || chosen.has(m.id) || !ok(m)) return undefined;
    chosen.add(m.id);
    return m;
  };

  const nJoint = n <= 5 ? 1 : n <= 10 ? 2 : 3;
  const nPulse = n >= 12 ? 2 : 1;

  const joints = JOINT_ORDER.map((id) => byId.get(id)).filter((m): m is WarmupMove => Boolean(m && ok(m))).slice(0, nJoint);
  joints.forEach((m) => chosen.add(m.id));

  const pulseOrder = opts.ageGroup === 'masters' ? ['wu-high-knees', 'wu-jacks'] : ['wu-jacks', 'wu-high-knees'];
  const pulse = pulseOrder.map((id) => byId.get(id)).filter((m): m is WarmupMove => Boolean(m && ok(m))).slice(0, nPulse);
  pulse.forEach((m) => chosen.add(m.id));
  const nDyn = n - joints.length - pulse.length - 1;

  // Dynamic: one movement per pattern, dropped ones first, round by round.
  const dropped = new Set(opts.dropped ?? []);
  const wanted = [...new Set([...(opts.dropped ?? []), ...(opts.patterns ?? [])])];
  const dynamic: { move: WarmupMove; forDropped: boolean; again?: boolean }[] = [];
  const dynMoves = WARMUP_MOVES.filter((m) => m.phase === 'dynamic');
  for (const p of wanted) {
    if (dynamic.length >= nDyn) break;
    const m = take(dynMoves.find((d) => d.patterns.includes(p) && !chosen.has(d.id) && ok(d)));
    if (m) dynamic.push({ move: m, forDropped: dropped.has(p) });
  }
  for (const id of GENERAL_ORDER) {
    if (dynamic.length >= nDyn) break;
    const m = take(byId.get(id));
    if (m) dynamic.push({ move: m, forDropped: false });
  }
  // Very long warm-ups: the remaining joints, then the second pulse movement.
  for (const id of [...JOINT_ORDER, ...pulseOrder, ...WARMUP_MOVES.map((w) => w.id)]) {
    if (dynamic.length >= nDyn) break;
    const m = take(byId.get(id));
    if (m) dynamic.push({ move: m, forDropped: false });
  }
  // Still short (a 20-minute warm-up for 55+ without a bar): a second round.
  const firstRound = dynamic.length;
  for (let i = 0; dynamic.length < nDyn && firstRound > 0; i++) dynamic.push({ ...dynamic[i % firstRound], forDropped: false, again: true });

  const step = (m: WarmupMove, subtitle?: string): MobilityStep => ({
    id: m.id,
    name: m.name,
    subtitle,
    cue: m.cue,
    durationHint: '1 мин',
    durationSeconds: 60,
    svgKey: m.svgKey,
  });

  const primer: MobilityStep = {
    id: 'wu-primer',
    name: 'Подводящий подход',
    subtitle: opts.firstExerciseName ? `Первое упражнение вполсилы: ${opts.firstExerciseName}` : 'Первое упражнение вполсилы',
    cue: 'Один-два спокойных подхода первого упражнения — примерно треть рабочего объёма. Чёткая техника, ровное дыхание, без усталости.',
    durationHint: '1 мин',
    durationSeconds: 60,
    svgKey: 'warmup_primer',
  };

  const steps: MobilityStep[] = [
    ...joints.map((m) => step(m, 'Суставы')),
    ...pulse.map((m) => step(m, 'Пульс')),
    ...dynamic.map(({ move, forDropped, again }, i) =>
      again
        ? { ...step(move, 'Второй круг'), id: `${move.id}-${i}` }
        : step(move, forDropped ? 'Выпало из акцента — подвигаемся здесь' : undefined)
    ),
    primer,
  ];
  return { label: `${steps.length} ${movementsWord(steps.length)} по минуте`, steps };
}

/** Options for today's workout: its exercises' patterns, the accent's dropped ones, the person. */
export function warmupOptionsFor(
  exerciseIds: string[],
  catalog: { id: string; pattern: MovementPattern }[],
  extra: { dropped?: MovementPattern[]; conditions?: Conditions; firstExerciseName?: string } = {}
): WarmupOptions {
  const byCat = new Map(catalog.map((c) => [c.id, c.pattern]));
  const patterns = exerciseIds.map((id) => byCat.get(id)).filter((p): p is MovementPattern => Boolean(p));
  const eq = extra.conditions?.equipment;
  return {
    patterns,
    dropped: extra.dropped,
    hasBar: !eq || eq.includes('pullup_bars'),
    ageGroup: extra.conditions?.ageGroup,
    firstExerciseName: extra.firstExerciseName,
    care: extra.conditions?.care,
  };
}
