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
] as const;

export type SceneKey = (typeof SCENE_KEYS)[number];
