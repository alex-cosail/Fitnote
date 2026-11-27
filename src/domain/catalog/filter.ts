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
  /**
   * «Здоровье и восстановление» (Addendum №5): only the gentle steps (1–2),
   * nothing on the ground, no hanging on the bar with the feet off.
   */
  longevity?: boolean;
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
  if (cond.longevity && !c.rehab) {
    // standing core (a band press) is gentle even at step 3
    const standingCore = c.pattern === 'core' && c.posture.includes('standing') && !c.equipment.includes('pullup_bars');
    if (c.rank > (standingCore ? 3 : 2)) return false;
    if (c.posture.includes('floor_contact')) return false;
    // every vertical pull is a hang (feet off): the horizontal pull takes the slot
    if (c.pattern === 'pull_v') return false;
    // core on the bar (hanging raises) or in a plank on the hands (hands on the ground)
    if (c.pattern === 'core' && (c.equipment.includes('pullup_bars') || c.posture.includes('hands_only'))) return false;
  }
  // Step 0 (v3.14) is never picked for a free joint: only for its joint at
  // levels 1–3, and not above that level.
  if (c.rehab && !cond.care?.some((r) => r.joint === c.rehab!.joint && r.level >= c.rehab!.level && r.level <= 3)) return false;
  return true;
}
