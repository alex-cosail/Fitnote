// Keys of the per-exercise scenes (src/components/exerciseScenes.tsx).
// Every key here must have a scene; the compiler checks it.
export const SCENE_KEYS = [
  'knee_pushups',
  'incline_pushups',
  'feet_elevated_pushups',
  'banded_pushups',
  'suspension_pushups',
  'archer_pushups',
  'suspension_fallout',
  'dead_bug',
  'bird_dog',
  'high_plank',
  'hollow_body_hold',
  'suitcase_march',
  'copenhagen_plank_short',
  'swedish_wall_side_hold',
  'plank_shoulder_taps',
  'scapular_pull_ups',
  'hanging_knee_raises',
  'hanging_leg_raises',
  'l_sit_hold',
  'split_stance_anti_rotation',
  'glute_bridge_two_legs',
] as const;

export type SceneKey = (typeof SCENE_KEYS)[number];
