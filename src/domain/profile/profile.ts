import { AgeGroup, Conditions } from '../catalog/filter';
import { EquipmentTag, FitnessLevel } from '../catalog/types';
import { DEFAULT_PROFILE } from '../generator/defaults';
import { GeneratorProfile, HealthLevel, Zone, ZoneMark } from '../generator/types';
import { GenLevel, GenRequest, DEFAULT_REQUEST } from '../generator/app';

// The person (start wizard, «Я» tab): docs/4_fitnote_v3_0.md,
// SPEC_WIZARD_GOAL_SCREEN.md, PRODUCT_MAP_V3 §3.2. Stored only on the phone.

export type StepsPreset = 'lt5k' | '5to8k' | '10k';
export type DeskPreset = 'lt4' | '4to6' | '6plus';
export type RunPreset = 'none' | 'some' | 'lots';

export interface Lifestyle {
  steps: StepsPreset;
  desk: DeskPreset;
  run: RunPreset;
}

export interface ProfileEquipment {
  bars: boolean; // pull-up bar and dips (playground)
  suspension: boolean;
  bands: boolean;
  mat: boolean; // floor work at home or on a clean floor
  weights: boolean; // kettlebell / dumbbells
  dirtyFloor: boolean; // NO TOUCH: no exercises lying or kneeling
}

export interface UserProfile {
  name?: string;
  ageGroup: AgeGroup;
  level: FitnessLevel;
  lifestyle: Lifestyle;
  zones: Partial<Record<Zone, ZoneMark>>;
  healthLevel: HealthLevel;
  personalGoal?: string; // own words; measurable goals come with block 3
  waistCm?: number;
  weightKg?: number;
  perWeek: number; // 1, 2, 3, 4 (4 = 4+)
  days?: import('../schedule/schedule').Weekday[]; // training days (absent = default by perWeek)
  equipment: ProfileEquipment;
  completedAt: string; // ISO
  /** «Здоровье и восстановление» (Addendum №5, v3.17): gentle steps, no tests to failure. */
  trainingMode?: 'athletic' | 'longevity';
}

export const ZONES: Zone[] = ['upper_v', 'upper_h', 'core', 'hinge', 'squat', 'lunge'];

export const DEFAULT_LIFESTYLE: Lifestyle = { steps: '5to8k', desk: '4to6', run: 'none' };
export const DEFAULT_EQUIPMENT: ProfileEquipment = {
  bars: true, suspension: false, bands: true, mat: false, weights: false, dirtyFloor: false,
};

/**
 * Start accents from the lifestyle (wizard screen 1 → 2):
 * desk ≥ 6 h → + on the horizontal upper body (pulls against slouching) and
 * the hip hinge; few steps and no running → + on single-leg balance (lunge).
 * Teens never get ++ (the zone stays at most +).
 */
export function recommendZones(lifestyle: Lifestyle): Partial<Record<Zone, ZoneMark>> {
  const zones: Partial<Record<Zone, ZoneMark>> = {};
  if (lifestyle.desk === '6plus') {
    zones.upper_h = 'plus';
    zones.hinge = 'plus';
  }
  if (lifestyle.steps === 'lt5k' && lifestyle.run === 'none') zones.lunge = 'plus';
  return zones;
}

/** Teens: ++ is not available (growth zones and ligaments). */
export function clampZones(zones: Partial<Record<Zone, ZoneMark>>, ageGroup: AgeGroup): Partial<Record<Zone, ZoneMark>> {
  if (ageGroup !== 'teen') return zones;
  return Object.fromEntries(Object.entries(zones).map(([z, m]) => [z, m === 'plusplus' ? 'plus' : m])) as Partial<Record<Zone, ZoneMark>>;
}

/** Next mark when a zone is tapped: Base → + → ++ → Base (teens: Base ↔ +). */
export function nextMark(mark: ZoneMark | undefined, ageGroup: AgeGroup): ZoneMark {
  const cur = mark ?? 'base';
  if (cur === 'base') return 'plus';
  if (cur === 'plus') return ageGroup === 'teen' ? 'base' : 'plusplus';
  return 'base';
}

/** Training conditions from the equipment: bars mean the playground, a mat means home. */
export function conditionsOf(eq: ProfileEquipment, ageGroup: AgeGroup): Conditions {
  const equipment: EquipmentTag[] = [];
  if (eq.bars) equipment.push('pullup_bars');
  if (eq.suspension) equipment.push('suspension');
  if (eq.bands) equipment.push('bands');
  if (eq.weights) equipment.push('weights');
  const environment = eq.bars && !eq.mat ? 'outdoor' : eq.mat && !eq.bars ? 'home' : undefined;
  return {
    ...(environment ? { environment } : {}),
    equipment,
    cleanFloor: !eq.dirtyFloor,
    ageGroup,
  };
}

/** What the generator gets from the person. */
export function toGeneratorProfile(p: UserProfile | undefined, favorites: string[] = []): GeneratorProfile {
  if (!p) return { ...DEFAULT_PROFILE, favorites };
  return {
    ...DEFAULT_PROFILE,
    healthLevel: p.healthLevel,
    perWeek: p.perWeek,
    zones: clampZones(p.zones, p.ageGroup),
    ageGroup: p.ageGroup,
    level: p.level,
    favorites,
    usualConditions: { ...conditionsOf(p.equipment, p.ageGroup), ...(p.trainingMode === 'longevity' ? { longevity: true } : {}) },
  };
}

const HEALTH_TO_LEVEL: Record<HealthLevel, GenLevel> = { mobility: 'warmup', form: 'agt', strength: 'full' };

/** The generator's default answers come from the profile (≤ 3 questions, defaults first). */
export function requestFor(p: UserProfile | undefined): GenRequest {
  if (!p) return DEFAULT_REQUEST;
  return { ...DEFAULT_REQUEST, level: HEALTH_TO_LEVEL[p.healthLevel], perWeek: p.perWeek };
}

/** A blank profile for the wizard, with defaults that let «Далее» just work. */
export function draftProfile(): UserProfile {
  return {
    ageGroup: 'adult',
    level: 'medium',
    lifestyle: DEFAULT_LIFESTYLE,
    zones: {},
    healthLevel: 'strength',
    perWeek: 3,
    equipment: DEFAULT_EQUIPMENT,
    completedAt: '',
  };
}

/** Wizard can show the "we picked accents for you" note when any was set. */
export function hasAutoAccents(lifestyle: Lifestyle): boolean {
  return Object.keys(recommendZones(lifestyle)).length > 0;
}
