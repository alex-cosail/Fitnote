import type { MobilityStep, SvgKey } from '../../types';
import type { JointLoad } from '../catalog/joints';
import type { MovementPattern } from '../catalog/types';
import { blockedByLoad, CareRule } from '../care/care';

// Cool-down flow (customer's Addendum №7, docs/specs/addendum-07-cooldown.md,
// v3.16): one flow of 7 standing positions by a post or bench, 4:30 — breath
// reset, chest, lats, back of the thigh, glutes, front of the thigh, calves.
// No rest between steps, a side-change signal at `splitCueAt`, breathing
// 4 s in / 6 s out on screen. The steps for what today's workout loaded are
// highlighted: pulls → step 3, squats / lunges / hinges → steps 4–6.

export interface CooldownMove {
  id: string;
  name: string;
  cue: string;
  svgKey: SvgKey;
  seconds: number;
  splitCueAt?: number;
  joints: JointLoad;
  /** Highlighted after a workout with these patterns. */
  after?: MovementPattern[];
}

export const COOLDOWN_FLOW: CooldownMove[] = [
  { id: 'cd-overhead-breath-reset', name: 'Сброс пульса и вытяжение вверх', seconds: 30, svgKey: 'cd_breath', joints: {}, cue: 'На плавном вдохе (4 с) тянемся руками вверх, на длинном выдохе (6 с) мягко опускаем плечи и выравниваем пульс.' },
  { id: 'cd-post-chest-stretch', name: 'Грудные и передняя дельта у стойки', seconds: 40, splitCueAt: 20, svgKey: 'cd_chest', joints: { shoulder: 1 }, after: ['push_h', 'push_v'], cue: 'Предплечье и ладонь на стойке, локоть чуть выше плеча; мягко разворачиваем корпус в сторону — 20 секунд правая, 20 левая.' },
  { id: 'cd-lat-thoracic-hang', name: 'Широчайшие и грудной отдел в наклоне', seconds: 40, svgKey: 'cd_lat', joints: { shoulder: 1, thoracic: 1 }, after: ['pull_v', 'pull_h'], cue: 'Обеими руками за брусья или стойку на уровне пояса, отшагиваем назад и мягко опускаем грудь вниз с прямой спиной.' },
  { id: 'cd-elevated-hamstring-hinge', name: 'Задняя поверхность бедра: наклон к опоре', seconds: 40, splitCueAt: 20, svgKey: 'cd_hamstring', joints: { hip: 1, lower_back: 1 }, after: ['squat', 'lunge', 'hinge'], cue: 'Пятка на скамье или низкой перекладине, колено чуть мягкое; таз назад с прямой спиной, без рывков — 20 секунд правая, 20 левая.' },
  { id: 'cd-standing-figure-four', name: 'Ягодичные: «четвёрка» у стойки', seconds: 50, splitCueAt: 25, svgKey: 'cd_figure_four', joints: { hip: 1, knee: 1 }, after: ['squat', 'lunge', 'hinge'], cue: 'Рука на стойке; щиколотку на колено опорной ноги и мягко таз назад, как на стул — 25 секунд правая, 25 левая.' },
  { id: 'cd-standing-quad-hip-flexor', name: 'Передняя поверхность бедра и сгибатели таза', seconds: 40, splitCueAt: 20, svgKey: 'cd_quad', joints: { knee: 1, hip: 1 }, after: ['squat', 'lunge', 'hinge'], cue: 'Рукой за стойку, стопа за спиной в руке; таз подкручен вперёд, мягко сжимаем ягодицу — 20 секунд правая, 20 левая.' },
  { id: 'cd-calf-achilles-stretch', name: 'Икроножные и ахилл у стойки', seconds: 30, splitCueAt: 15, svgKey: 'cd_calf', joints: { ankle: 1 }, cue: 'Руки на стойке, одна нога отшагивает назад, пятка прижата к земле, колено прямое — 15 секунд правая, 15 левая.' },
];

export const COOLDOWN_SECONDS = COOLDOWN_FLOW.reduce((s, m) => s + m.seconds, 0);

/** The flow for today: steps of a joint at level 0 are left out; today's steps are highlighted. */
export function buildCooldown(patterns: MovementPattern[] = [], care?: CareRule[]): MobilityStep[] {
  const done = new Set(patterns);
  return COOLDOWN_FLOW.filter((m) => !blockedByLoad(m.joints, care)).map((m) => ({
    id: m.id,
    name: m.name,
    cue: m.cue,
    durationHint: `${m.seconds} с`,
    durationSeconds: m.seconds,
    svgKey: m.svgKey,
    ...(m.splitCueAt ? { splitCueAt: m.splitCueAt } : {}),
    ...(m.after?.some((p) => done.has(p)) ? { highlight: true } : {}),
  }));
}

/** Breathing 4–6: where in the 10-second cycle we are. */
export function breathPhase(elapsedSec: number): { phase: 'in' | 'out'; left: number } {
  const t = ((elapsedSec % 10) + 10) % 10;
  return t < 4 ? { phase: 'in', left: 4 - Math.floor(t) } : { phase: 'out', left: 10 - Math.floor(t) };
}
