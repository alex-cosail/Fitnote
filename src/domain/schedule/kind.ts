import { WorkoutPlan } from '../../types';

/** Type of a workout for the week strip: strength · form (circuits) · mobility. */
export type PlanKind = 'S' | 'F' | 'M';

export function planKind(plan: Pick<WorkoutPlan, 'id' | 'items' | 'rounds' | 'useAgt30'>): PlanKind {
  const fromId = /-(S|F|M)(-|$)/.exec(plan.id)?.[1] as PlanKind | undefined;
  if (fromId) return fromId;
  if (/-(ACC|TOPUP)/.test(plan.id)) return 'S';
  const pcts = plan.items.map((it) => (it.spec?.kind === 'pctMax' ? it.spec.pct : undefined)).filter((p): p is number => p !== undefined);
  if (pcts.length) {
    const avg = pcts.reduce((a, b) => a + b, 0) / pcts.length;
    if (avg >= 0.6) return 'S';
    if (avg <= 0.32) return 'F';
    return 'M';
  }
  if (plan.useAgt30 || plan.rounds >= 8) return 'F';
  return 'S';
}
