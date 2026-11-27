import type { CatalogExercise, MovementPattern } from './types';

// How much an exercise loads each joint (care brief, v3.9): 1 light,
// 2 noticeable, 3 strong. Defaults come from the movement pattern; the
// exercises that differ from their pattern are listed below. A draft for
// the customer (and later the partner doctor) to check.

export type Joint = 'neck' | 'shoulder' | 'elbow_wrist' | 'thoracic' | 'lower_back' | 'hip' | 'knee' | 'ankle';
export type JointLoad = Partial<Record<Joint, 1 | 2 | 3>>;

export const JOINTS: Joint[] = ['neck', 'shoulder', 'elbow_wrist', 'thoracic', 'lower_back', 'hip', 'knee', 'ankle'];

const BY_PATTERN: Record<MovementPattern, JointLoad> = {
  push_h: { shoulder: 2, elbow_wrist: 2 },
  push_v: { shoulder: 3, elbow_wrist: 2 },
  pull_v: { shoulder: 3, elbow_wrist: 2 },
  pull_h: { shoulder: 2, elbow_wrist: 1, thoracic: 1 },
  squat: { knee: 3, hip: 2, ankle: 2, lower_back: 1 },
  lunge: { knee: 3, hip: 2, ankle: 2 },
  hinge: { lower_back: 3, hip: 3, knee: 1 },
  core: { lower_back: 2 },
};

const OVERRIDES: Record<string, JointLoad> = {
  'parallel-bar-dips': { shoulder: 3, elbow_wrist: 3 },
  'floor-push-ups': { shoulder: 2, elbow_wrist: 2, lower_back: 1 },
  'knee-push-ups': { shoulder: 2, elbow_wrist: 2, knee: 1 },
  'incline-push-ups': { shoulder: 1, elbow_wrist: 1 },
  'archer-push-ups': { shoulder: 3, elbow_wrist: 3 },
  'suspension-push-ups': { shoulder: 3, elbow_wrist: 2 },
  'scapular-wall-slides': { shoulder: 1, thoracic: 1 },
  'band-overhead-press': { shoulder: 2, elbow_wrist: 1 },
  'wall-handstand-hold': { shoulder: 3, elbow_wrist: 3, neck: 2 },
  'elevated-pike-push-ups': { shoulder: 3, elbow_wrist: 3, neck: 1 },
  'prone-ywt-raises': { shoulder: 1, thoracic: 1, lower_back: 1 },
  'band-face-pull': { shoulder: 1, thoracic: 1 },
  'band-row': { shoulder: 1, elbow_wrist: 1, thoracic: 1 },
  'seated-band-row': { shoulder: 1, elbow_wrist: 1, lower_back: 1 },
  'single-arm-db-row': { shoulder: 2, elbow_wrist: 1, lower_back: 1 },
  'incline-australian-pull-ups': { shoulder: 1, elbow_wrist: 1, thoracic: 1 },
  'scapular-pull-ups': { shoulder: 2, elbow_wrist: 2 },
  'band-assisted-pull-ups': { shoulder: 2, elbow_wrist: 2 },
  'archer-pull-ups': { shoulder: 3, elbow_wrist: 3 },
  'box-squats': { knee: 2, hip: 2, ankle: 1 },
  'goblet-squat': { knee: 3, hip: 2, ankle: 2, lower_back: 2, elbow_wrist: 1 },
  'cossack-squat': { knee: 3, hip: 3, ankle: 2 },
  'single-leg-bench-squat': { knee: 3, hip: 2, ankle: 2 },
  'bench-step-ups': { knee: 2, hip: 2, ankle: 1 },
  'nordic-curl-negatives': { knee: 3, lower_back: 1 },
  'glute-bridge': { hip: 2, lower_back: 1 },
  'single-leg-glute-bridge': { hip: 2, lower_back: 1, knee: 1 },
  'band-good-morning': { lower_back: 2, hip: 2 },
  'side-plank': { shoulder: 2, elbow_wrist: 1, lower_back: 1 },
  'dead-hang': { shoulder: 2, elbow_wrist: 2 },
  'pallof-press': { lower_back: 1, shoulder: 1 },
  'split-stance-band-anti-rotation': { lower_back: 1, shoulder: 1 },
  'dead-bug': { lower_back: 1 },
  'bird-dog': { lower_back: 1, shoulder: 1, knee: 1 },
  'high-plank': { shoulder: 2, elbow_wrist: 2, lower_back: 1 },
  'plank-shoulder-taps': { shoulder: 2, elbow_wrist: 2, lower_back: 1 },
  'hanging-knee-raises': { shoulder: 2, elbow_wrist: 2, lower_back: 1 },
  'hanging-leg-raises': { shoulder: 2, elbow_wrist: 2, lower_back: 2, hip: 1 },
  'l-sit-hold': { shoulder: 2, elbow_wrist: 3, hip: 1 },
  'hollow-body-hold': { lower_back: 2, neck: 1 },
  'suspension-fallout': { shoulder: 3, lower_back: 2 },
  'suitcase-march': { lower_back: 1, elbow_wrist: 1, hip: 1 },
  'copenhagen-plank-short': { hip: 2, knee: 1, shoulder: 1 },
  'swedish-wall-side-hold': { shoulder: 2, elbow_wrist: 2, lower_back: 1 },
};

export function jointLoad(c: Pick<CatalogExercise, 'id' | 'pattern'> & { rehab?: CatalogExercise['rehab'] }): JointLoad {
  if (c.rehab) return { [c.rehab.joint]: 1 };
  return OVERRIDES[c.id] ?? BY_PATTERN[c.pattern] ?? {};
}

/** Joints this exercise loads noticeably (2–3), strongest first — pre-selected in «Где болит?». */
export function mainJoints(c: Pick<CatalogExercise, 'id' | 'pattern'>): Joint[] {
  const load = jointLoad(c);
  return (Object.entries(load) as [Joint, number][])
    .filter(([, v]) => v >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([j]) => j);
}
