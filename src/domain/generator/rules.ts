import { FitnessLevel, MovementPattern } from '../catalog/types';
import { Component, HealthLevel, SlotSpec, Zone, ZoneMark } from './types';

// Every number of docs/GENERATOR_RULES.md lives here, so it can be tuned
// after field tests without touching the algorithm.

export interface ComponentRule {
  pct: number; // share of the max (§2)
  restEx: number; // seconds between exercises
  restRound: number; // seconds between rounds
  rounds: number; // standard rounds (F: upper bound, fitted to the cap)
}

export const COMPONENT: Record<Component, ComponentRule> = {
  M: { pct: 0.4, restEx: 20, restRound: 45, rounds: 2 },
  F: { pct: 0.3, restEx: 15, restRound: 40, rounds: 20 },
  S: { pct: 0.75, restEx: 45, restRound: 90, rounds: 3 },
};

export const STRENGTH_PCT_CEILING = 0.8;
/** teen and masters: share of the max not above this (§6). */
export const AGE_PCT_CAP = 0.7;
export const S_ROUNDS_HIGH = 4;
export const F_MIN_ROUNDS = 4;

/** Target windows (§2). */
export const S_WINDOW = { reps: { min: 5, max: 15 }, seconds: { min: 20, max: 60 } };
export const S_STEP_DOWN_BELOW_REPS = 3;
export const F_STEP_DOWN_BELOW_REPS = 2;

/** Standard cap, minutes (§3.1). */
export const CAP_MINUTES = { normal: 45, advanced: 60 };
/** The estimate is rough: rounds are cut only above the cap + 10%. */
export const CAP_TOLERANCE = 1.1;
export const MIN_ROUNDS_AFTER_CUT = 2;
export const SHORT_ROUNDS_SHARE = 2 / 3;
/** Accent keeps as many pairs as fit in this many rounds before cutting rounds. */
export const ACCENT_MIN_ROUNDS = 3;
/** Accent pairs go as supersets: short rest inside the round, 45 s between rounds. */
export const ACCENT_REST = { restEx: 15, restRound: 45 };

/** Duration estimate (§3.3). */
export const SEC_PER_REP = 3;
export const TRANSITION_SEC = 10;
export const WARMUP_MIN = { full: 8, short: 5 };
export const COOLDOWN_MIN = { full: 5, short: 3 };
export const TEMPO_FACTOR = { min: 0.6, max: 1.4, minSamples: 3 };

/** Base rank by self-assessed level. */
export const LEVEL_RANK: Record<FitnessLevel, number> = { low: 2, medium: 3, high: 4 };
export const ZONE_RANK_STEP: Record<ZoneMark, number> = { base: 0, plus: 0, plusplus: 1 };
export const ZONE_PRIORITY: Record<ZoneMark, number> = { base: 1, plus: 2, plusplus: 3 };
export const MAX_PLUSPLUS_ZONES = 2;

export const ZONE_PATTERNS: Record<Zone, MovementPattern[]> = {
  upper_v: ['push_v', 'pull_v'],
  upper_h: ['push_h', 'pull_h'],
  core: ['core'],
  hinge: ['hinge'],
  squat: ['squat'],
  lunge: ['lunge'],
};

/** Exercise pick score (§7). */
export const PICK = {
  favorite: 3,
  goal: 2,
  recencyPerWeek: 1, // + days since last time / 7 …
  recencyCap: 2, // … up to this
  disliked: -2,
  dislikedSwaps: 3, // swapped away in 3 of the last 5 sessions
  rankDistance: -1,
  family: 1,
  unilateral: 1.5,
  usedThisWeek: -1.5, // A and B use different variants
  usedThisSession: -100,
};

/** Progression (§9). */
export const PROGRESS = {
  easyStep: 0.1,
  okStepAfterTwo: 0.05,
  hardStep: -0.1,
  easyMaxFactor: 1.1,
  hardMaxFactor: 0.9,
  maxGrowthPerWeek: 0.1,
};

/** Month (§9.2). */
export const DELOAD = { roundsShare: 0.7, pctShare: 0.9 };
export const CHECKPOINT_WEEK = 3;

// Session templates (§4.2), before accents.
const s = (pattern: MovementPattern, extra: Partial<SlotSpec> = {}) => ({ pattern, ...extra });
export type TemplateSlot = Omit<SlotSpec, 'rank' | 'priority'>;

export const TEMPLATE_A: TemplateSlot[] = [
  s('squat'), s('push_h'), s('pull_v'), s('hinge'),
  s('core', { families: ['core_antiextension'] }), s('pull_h'),
];
export const TEMPLATE_B: TemplateSlot[] = [
  s('lunge'), s('push_v'), s('pull_h'), s('hinge', { unilateral: true }),
  s('core', { families: ['core_antirotation', 'core_lateral'] }), s('pull_v'),
];
export const TEMPLATE_ALL: TemplateSlot[] = [
  s('squat'), s('push_h'), s('pull_v'), s('hinge'), s('lunge'), s('push_v'), s('pull_h'), s('core'),
];
export const TEMPLATE_F_A: TemplateSlot[] = [
  s('squat'), s('push_h'), s('pull_v'), s('hinge'), s('core', { families: ['core_antiextension'] }),
];
export const TEMPLATE_F_B: TemplateSlot[] = [
  s('lunge'), s('push_v'), s('pull_h'), s('hinge', { unilateral: true }),
  s('core', { families: ['core_antirotation', 'core_lateral'] }),
];
/** Mobility: horizontal pull, hang, thoracic / shoulder blades, hips (§2). */
export const TEMPLATE_M: TemplateSlot[] = [
  s('pull_h'), s('core', { families: ['hang'] }), s('push_v'), s('hinge'), s('lunge'),
  s('core', { families: ['core_antiextension'] }),
];
export const M_RANK = 1; // mobility uses the easiest steps
export const F_SLOTS = 5;

/** Week layout (§4.1). */
export const WEEK: Record<HealthLevel, Record<1 | 2 | 3 | 4, string[]>> = {
  mobility: { 1: ['M'], 2: ['M', 'M'], 3: ['M', 'M', 'M'], 4: ['M', 'M', 'M', 'M'] },
  form: { 1: ['F-ALL'], 2: ['F-A', 'F-B'], 3: ['F-A', 'F-B', 'F'], 4: ['F-A', 'F-B', 'F', 'M'] },
  strength: { 1: ['S-ALL'], 2: ['S-A', 'S-B'], 3: ['S-A', 'S-B', 'F'], 4: ['S-A', 'F', 'S-B', 'M'] },
};
/** Fifth and further sessions repeat this cycle (decision 25.11). */
export const WEEK_EXTRA_CYCLE = ['ACC-A', 'TOPUP', 'ACC-B', 'TOPUP'];

/** Patterns that cannot be done here are replaced (§11). */
export const SUBSTITUTE: Partial<Record<MovementPattern, MovementPattern>> = {
  pull_v: 'pull_h',
  push_v: 'push_h',
};
