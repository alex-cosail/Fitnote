import type { MobilityStep, SvgKey } from '../../types';
import type { AgeGroup, Conditions } from '../catalog/filter';
import type { JointLoad } from '../catalog/joints';
import type { MovementPattern } from '../catalog/types';
import { blockedByLoad, CareRule } from '../care/care';

// Warm-up flows (customer's Addendum №6, docs/specs/addendum-06-warmup.md,
// v3.15): two modes instead of 8 / 10 / 12 / 15 minutes —
//   «Базовая 5:40»: 10 joint links from the neck down, all standing;
//   «Расширенная 9:40»: the base + 6 movements that raise the pulse.
// Steps follow each other without rest (the player advances by itself); a
// side or direction change is signalled at `splitCueAt` seconds. 55+ get the
// short flow by default and a step jack instead of jumping. A joint at level
// 0 skips its link.

export type WarmupMode = 'default' | 'extended';

export interface WarmupMove {
  id: string;
  name: string;
  cue: string;
  svgKey: SvgKey;
  seconds: number;
  splitCueAt?: number;
  joints: JointLoad;
  /** 55+: the cue for the variant without impact. */
  cueMasters?: string;
}

export const BASE_FLOW: WarmupMove[] = [
  { id: 'wu-neck-half-circles', name: 'Шея: полукруги и повороты', seconds: 30, splitCueAt: 15, svgKey: 'wu_neck', joints: { neck: 1 }, cue: 'Плавные полукруги подбородком по груди от плеча к плечу и мягкие повороты: 15 секунд влево, 15 вправо. Без запрокидывания головы назад.' },
  { id: 'wu-wrist-rotations', name: 'Кисти: вращения', seconds: 30, splitCueAt: 15, svgKey: 'wu_wrist_rot', joints: { elbow_wrist: 1 }, cue: 'Локти прижаты к корпусу, полная амплитуда кистей: 15 секунд наружу, 15 внутрь.' },
  { id: 'wu-elbow-rotations', name: 'Локти: вращения предплечьями', seconds: 30, splitCueAt: 15, svgKey: 'wu_elbow_rot', joints: { elbow_wrist: 1 }, cue: 'Плечи параллельно земле, локти в одной точке: 15 секунд внутрь, 15 наружу.' },
  { id: 'wu-shoulder-bent-arm', name: 'Плечи: круги согнутыми руками', seconds: 30, splitCueAt: 15, svgKey: 'wu_shoulder_bent', joints: { shoulder: 1 }, cue: 'Кисти на плечах, широкие круги локтями со сведением лопаток сзади: 15 секунд вперёд, 15 назад.' },
  { id: 'wu-shoulder-straight-arm', name: 'Плечи: круги прямыми руками', seconds: 30, splitCueAt: 15, svgKey: 'wu_arm_circles', joints: { shoulder: 1 }, cue: 'Прямые руки скользят мимо ушей, без прогиба в пояснице: 15 секунд вперёд, 15 назад.' },
  { id: 'wu-thoracic-twists', name: 'Грудной отдел: скручивания', seconds: 40, svgKey: 'wu_torso_twist', joints: { thoracic: 1, lower_back: 1 }, cue: 'Таз смотрит строго вперёд, плавные повороты грудной клетки влево и вправо с разведёнными руками.' },
  { id: 'wu-pelvis-circles', name: 'Таз: круги', seconds: 40, splitCueAt: 20, svgKey: 'wu_hip_circles', joints: { hip: 1, lower_back: 1 }, cue: 'Руки на поясе, макушка на месте, таз описывает широкий круг: 20 секунд по часовой, 20 против.' },
  { id: 'wu-hip-abduction-circles', name: 'Тазобедренный: отведения согнутого бедра', seconds: 40, splitCueAt: 20, svgKey: 'wu_hip_abduct', joints: { hip: 1 }, cue: 'При необходимости держись рукой за стойку: колено вперёд и отведение в сторону — 20 секунд правая, 20 левая.' },
  { id: 'wu-knee-semi-squat-circles', name: 'Колени: круги в полуприседе', seconds: 30, splitCueAt: 15, svgKey: 'wu_knee_ankle', joints: { knee: 1 }, cue: 'Стопы вместе, ладони на коленях без давления сверху, мягкие круги: 15 секунд в одну сторону, 15 в другую.' },
  { id: 'wu-ankle-toe-circles', name: 'Голеностоп и стопа: круги на носке', seconds: 40, splitCueAt: 20, svgKey: 'wu_ankle_toe', joints: { ankle: 1 }, cue: 'Носок на земле, пятка описывает круг, плюс 2–3 переката с пятки на носок: 20 секунд правая, 20 левая.' },
];

export const PULSE_FLOW: WarmupMove[] = [
  { id: 'wu-marching-high-knees', name: 'Шаг с высоким коленом', seconds: 45, svgKey: 'wu_high_knees', joints: { hip: 1, knee: 1 }, cue: 'Бодрый шаг на месте: колено до уровня таза, противоположная рука вперёд. Плавно поднимаем пульс.' },
  { id: 'wu-leg-swings-sagittal', name: 'Махи вперёд-назад у опоры', seconds: 40, splitCueAt: 20, svgKey: 'wu_leg_swing', joints: { hip: 2 }, cue: 'Лёгкая опора рукой за стойку, свободный мах прямой ногой без округления поясницы: 20 секунд правая, 20 левая.' },
  { id: 'wu-leg-swings-lateral', name: 'Махи в сторону перед собой', seconds: 40, splitCueAt: 20, svgKey: 'wu_leg_swing_lat', joints: { hip: 2 }, cue: 'Лицом к стойке, контролируемый мах прямой ногой влево-вправо: 20 секунд правая, 20 левая.' },
  { id: 'wu-scapular-ywt-swimmer', name: 'Лопатки стоя: Y — W', seconds: 40, svgKey: 'wu_scap_yw', joints: { shoulder: 1 }, cue: 'Руки вверх по диагонали (Y), локти вниз к рёбрам (W) со сведением лопаток. Готовим плечи к турнику.' },
  { id: 'wu-squat-to-calf-raise', name: 'Присед с подъёмом на носки', seconds: 45, svgKey: 'wu_squat_reach', joints: { knee: 2, hip: 1, ankle: 1 }, cue: 'Неглубокий присед до параллели и энергичное вставание с выходом на носки и руками вверх.' },
  { id: 'wu-jumping-jacks-adaptive', name: 'Прыжки «звёздочка»', seconds: 30, svgKey: 'wu_jacks', joints: { knee: 2, ankle: 2 }, cue: 'Финишный разогрев: лёгкие прыжки — ноги врозь, руки вверх.', cueMasters: 'Без прыжка: быстрый приставной шаг в сторону с хлопком над головой.' },
];

/** All warm-up movements (both flows). */
export const WARMUP_MOVES: WarmupMove[] = [...BASE_FLOW, ...PULSE_FLOW];

export const FLOW_SECONDS: Record<WarmupMode, number> = {
  default: BASE_FLOW.reduce((s, m) => s + m.seconds, 0),
  extended: WARMUP_MOVES.reduce((s, m) => s + m.seconds, 0),
};

/** The stored minutes (old data: 8 / 10 / 12 / 15) → a mode: up to 6 is the short flow. */
export function warmupModeOf(minutes: number): WarmupMode {
  return minutes <= 6 ? 'default' : 'extended';
}
/** The minutes the setting stores for a mode (used by estimates). */
export const MODE_MINUTES: Record<WarmupMode, number> = { default: 5, extended: 10 };

export const MICRO_ROUND_SECONDS = 60;

export const formatFlow = (seconds: number) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export interface WarmupOptions {
  /** Kept for callers; the flows do not depend on the workout any more. */
  patterns?: MovementPattern[];
  dropped?: MovementPattern[];
  hasBar?: boolean;
  ageGroup?: AgeGroup;
  firstExerciseName?: string;
  /** Joint levels: a joint at 0 skips its link (levels 1–3 keep the light ones). */
  care?: CareRule[];
  /** Today's first exercises: the last minute is a micro round of them (customer, 28.11). */
  round?: { svgKey: SvgKey; name: string }[];
}

export interface WarmupPlan {
  label: string;
  steps: MobilityStep[];
  mode: WarmupMode;
}

export function buildWarmup(minutes: number, opts: WarmupOptions = {}): WarmupPlan {
  const mode = warmupModeOf(minutes);
  const moves = (mode === 'default' ? BASE_FLOW : WARMUP_MOVES).filter((m) => !blockedByLoad(m.joints, opts.care));
  const masters = opts.ageGroup === 'masters';
  const steps: MobilityStep[] = moves.map((m) => ({
    id: m.id,
    name: masters && m.cueMasters ? 'Приставной шаг с хлопком' : m.name,
    cue: masters && m.cueMasters ? m.cueMasters : m.cue,
    durationHint: `${m.seconds} с`,
    durationSeconds: m.seconds,
    svgKey: m.svgKey,
    ...(m.splitCueAt ? { splitCueAt: m.splitCueAt } : {}),
  }));
  // The last minute: a micro round of today's workout — 3–5 reps of each,
  // half effort (customer, 28.11: «хороший разогревающий круг»).
  const round = (opts.round ?? []).slice(0, 4);
  if (round.length) {
    steps.push({
      id: 'wu-micro-round',
      name: 'Пробный круг',
      subtitle: 'По 3–5 повторов каждого — вполсилы',
      cue: 'Один спокойный круг упражнений тренировки: 3–5 повторов каждого, чёткая техника и ровное дыхание, без усталости.',
      durationHint: '60 с',
      durationSeconds: MICRO_ROUND_SECONDS,
      svgKey: round[0].svgKey,
      collage: round,
    });
  }
  const total = steps.reduce((s, x) => s + (x.durationSeconds ?? 0), 0);
  return {
    label: `${mode === 'default' ? 'Базовая' : 'Расширенная + пульс'} · ${formatFlow(total)} · поток`,
    steps,
    mode,
  };
}

/** Options for today: only the person matters now (age, joint levels). */
export function warmupOptionsFor(
  _exerciseIds: string[],
  _catalog: { id: string; pattern: MovementPattern }[],
  extra: { dropped?: MovementPattern[]; conditions?: Conditions; firstExerciseName?: string; round?: { svgKey: SvgKey; name: string }[] } = {}
): WarmupOptions {
  return { ageGroup: extra.conditions?.ageGroup, care: extra.conditions?.care, firstExerciseName: extra.firstExerciseName, round: extra.round };
}
