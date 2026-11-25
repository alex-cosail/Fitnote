import { GeneratorProfile } from './types';

/** Defaults until the start wizard exists (GENERATOR_RULES §1.1). */
export const DEFAULT_PROFILE: GeneratorProfile = {
  healthLevel: 'strength',
  perWeek: 3,
  zones: {},
  ageGroup: 'adult',
  level: 'medium',
  favorites: [],
  goalExerciseIds: [],
  painful: [],
  // The playground the app was made for: bars and bands.
  usualConditions: { environment: 'outdoor', equipment: ['pullup_bars', 'bands'] },
};
