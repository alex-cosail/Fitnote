// Workout generator: the engine that builds workouts, weeks and months on
// the phone, without AI or network (docs/GENERATOR_RULES.md).
export * from './types';
export { buildSession, focusPatterns, sharePct, slotsFor, zoneMarks } from './session';
export { buildWeek, buildMonth, weekLayout, deficitTemplate } from './week';
export { applyMode, accentPlan, pairItems, shortRounds } from './modes';
export { checkSession, weekDebt, weekIsCovered, countPatterns } from './coverage';
export { estimateSeconds, capMinutes, fitRounds, calibrateTempo, setSeconds } from './duration';
export { nextTarget, calibrateMax, outcomeFromLog, historyFromLogs } from './progress';
export type { Outcome, NextTarget } from './progress';
export { orderRound, hasSameDirectionInRow, moveClass } from './order';
export { pickExercise, pickScore } from './pick';

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
