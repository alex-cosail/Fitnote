import { MetricType, SvgKey } from '../../types';

// Catalog model (docs/ARCHITECTURE_V3_STEP0.md, sections 2 and 12).

export type MovementPattern =
  | 'push_h' // horizontal push
  | 'pull_h' // horizontal pull
  | 'push_v' // vertical push
  | 'pull_v' // vertical pull
  | 'squat'
  | 'hinge'
  | 'lunge'
  | 'core'; // core in 3 anti-vectors + grip / hang

export type EquipmentTag = 'bodyweight' | 'pullup_bars' | 'suspension' | 'bands' | 'weights';
export type EnvironmentTag = 'outdoor' | 'home';
export type PostureTag = 'standing' | 'hands_only' | 'floor_contact';
export type StabilityType = 'bilateral' | 'unilateral' | 'unstable';
export type DifficultyRank = 1 | 2 | 3 | 4 | 5; // -- / - / Base / + / ++
export type FitnessLevel = 'low' | 'medium' | 'high';

export const MOVEMENT_PATTERNS: MovementPattern[] = [
  'push_h', 'pull_h', 'push_v', 'pull_v', 'squat', 'hinge', 'lunge', 'core',
];

/** A catalog exercise: structure only; texts live in catalog text dictionaries. */
export interface CatalogExercise {
  id: string; // permanent, never reused
  pattern: MovementPattern;
  // Ladder family: may span patterns (Bulgarian split squat −1 = air squat).
  family: string;
  rank: DifficultyRank;
  metric: MetricType;
  isPaired?: boolean;
  environments: EnvironmentTag[];
  equipment: EquipmentTag[]; // any one of them is enough
  posture: PostureTag[];
  stability: StabilityType;
  targetMuscles: string[];
  antagonistMuscles: string[];
  svgKey: SvgKey;
  // Starting max without a check-up, by self-assessed level.
  defaultMax: Record<FitnessLevel, number>;
  teenAllowed?: boolean; // false for ++ with high axial / joint load
  ladder?: { minus1?: string; plus1?: string }; // preferred neighbours
}

export interface CatalogText {
  name: string;
  cue: string;
  details?: string;
}

/** User's check-up maximum for an exercise. */
export interface MaxEntry {
  value: number;
  date?: string;
}
