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

export { DEFAULT_PROFILE } from './defaults';
export { runGenerator, toWorkoutPlans, replaceGenerated, DEFAULT_REQUEST, LEVEL_TO_HEALTH } from './app';
export type { GenPeriod, GenLevel, GenRequest, GenResult } from './app';
export { dayPlan, dayTimes, DEFAULT_ACCENT_MINUTES, ACCENT_MINUTES } from './day';
export type { DayPlan, DayOptions } from './day';
export {
  changeTarget, changeRounds, stepRank, swapExercise, alternatives,
  zoneCandidates, antagonistOptions, ownItem, buildOwnPlan, basketIssues, fixFor, OWN_CHOICES,
} from './edit';
export type { OwnZone } from './edit';
export { COMPONENT } from './rules';
