// Keys of the animated warm-up scenes (src/components/warmupScenes.tsx).
export const WARMUP_KEYS = [
  'wu_arm_circles',
  'wu_hip_circles',
  'wu_knee_ankle',
  'wu_neck',
  'wu_torso_twist',
  'wu_jacks',
  'wu_high_knees',
  'wu_squat_reach',
  'wu_lunge_reach',
  'wu_hinge',
  'wu_leg_swing',
  'wu_incline_pushup',
  'wu_pull_apart',
  'wu_cross_crunch',
  'wu_inchworm',
  // v3.15: the warm-up flows
  'wu_wrist_rot',
  'wu_elbow_rot',
  'wu_shoulder_bent',
  'wu_hip_abduct',
  'wu_ankle_toe',
  'wu_leg_swing_lat',
  'wu_scap_yw',
] as const;

export type WarmupKey = (typeof WARMUP_KEYS)[number];
