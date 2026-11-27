// Keys of the step-0 scenes (src/components/rehabScenes.tsx).
export const REHAB_KEYS = [
  'rh_neck_iso',
  'rh_neck_turns',
  'rh_neck_tilts',
  'rh_shoulder_iso',
  'rh_pendulum',
  'rh_wall_crawl',
  'rh_fist',
  'rh_wrist_circles',
  'rh_wall_pushup',
  'rh_breathing',
  'rh_seated_twist',
  'rh_standing_cat',
  'rh_brace',
  'rh_pelvic_tilt',
  'rh_supported_hinge',
  'rh_glute_squeeze',
  'rh_side_leg',
  'rh_supported_split',
  'rh_quad_set',
  'rh_sit_to_stand',
  'rh_mini_squat',
  'rh_ankle_pumps',
  'rh_calf_raise',
  'rh_balance',
] as const;

export type RehabKey = (typeof REHAB_KEYS)[number];
