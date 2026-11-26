import type { CareRule } from '../care/care';
import { blockedByCare } from '../care/care';
import { CatalogExercise, EnvironmentTag, EquipmentTag } from './types';

export type AgeGroup = 'teen' | 'adult' | 'masters';

/**
 * Training conditions. Every field is optional: an unset field does not
 * filter, so "no conditions" means "everything available" (as in v2).
 */
export interface Conditions {
  environment?: EnvironmentTag;
  equipment?: EquipmentTag[]; // bodyweight is always available
  cleanFloor?: boolean; // false = NO TOUCH: no exercises with body on the ground
  ageGroup?: AgeGroup;
  /** «Берегу» (v3.9): joints not loaded now or loaded gently. */
  care?: CareRule[];
}

export function isAvailable(c: CatalogExercise, cond: Conditions = {}): boolean {
  if (cond.environment && !c.environments.includes(cond.environment)) return false;
  if (cond.equipment) {
    const have = new Set<EquipmentTag>([...cond.equipment, 'bodyweight']);
    if (!c.equipment.some((e) => have.has(e))) return false;
  }
  if (cond.cleanFloor === false && c.posture.includes('floor_contact')) return false;
  if (cond.ageGroup === 'teen' && (c.teenAllowed === false || c.rank === 5)) return false;
  if (blockedByCare(c, cond.care)) return false;
  return true;
}
