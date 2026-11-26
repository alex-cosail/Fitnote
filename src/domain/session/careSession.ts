import type { ActiveSession, Exercise } from '../../types';
import { CareRule, blockedByCare } from '../care/care';
import { Conditions } from '../catalog/filter';
import { pickForPattern } from '../catalog/ladder';
import type { CatalogExercise } from '../catalog/types';
import { swapTarget } from './change';
import { startCooldown } from './transitions';

// «Пауза: болит» during a workout (v3.9): the exercises of this session that
// load the protected joint are replaced by the nearest safe one of the same
// pattern, or dropped when there is none. Done sets stay in the log.

export interface CareChange {
  session: ActiveSession;
  replaced: { from: string; to: string }[];
  dropped: string[];
}

export function applyCareToSession(
  session: ActiveSession,
  care: CareRule[],
  ctx: { catalog: CatalogExercise[]; exercises: Exercise[]; conditions?: Conditions },
  now: number,
  /** The exercise the person paused: replaced even if the care alone would allow it. */
  forceIds: string[] = []
): CareChange {
  const force = new Set(forceIds);
  const catById = new Map(ctx.catalog.map((c) => [c.id, c]));
  const exById = new Map(ctx.exercises.map((e) => [e.id, e]));
  const cond: Conditions = { ...(ctx.conditions ?? {}), care };
  const replaced: CareChange['replaced'] = [];
  const dropped: string[] = [];

  const kept: ActiveSession['items'] = [];
  let currentIndex = session.currentItemIndex;
  session.items.forEach((it, idx) => {
    const cat = catById.get(it.exerciseId);
    if (!cat || !(force.has(it.exerciseId) || blockedByCare(cat, care))) {
      kept.push(it);
      return;
    }
    const used = new Set(kept.map((k) => k.exerciseId));
    const pool = ctx.catalog.filter((c) => !force.has(c.id) && !used.has(c.id));
    const alt = pickForPattern(pool, cat.pattern, cat.rank, cond, cat.family);
    const from = exById.get(it.exerciseId);
    const to = alt ? exById.get(alt.id) : undefined;
    if (alt && from && to) {
      const target = swapTarget(it.target, from, to);
      kept.push({ exerciseId: to.id, target, plannedTarget: target, swappedFromId: it.swappedFromId ?? it.exerciseId });
      replaced.push({ from: from.id, to: to.id });
    } else {
      dropped.push(it.exerciseId);
      if (idx < session.currentItemIndex) currentIndex -= 1;
    }
  });

  if (kept.length === 0) return { session: startCooldown({ ...session, items: session.items }, now), replaced, dropped };

  let next: ActiveSession = { ...session, items: kept, currentItemIndex: Math.max(0, currentIndex) };
  // The current slot was dropped and it was the last one of the round.
  if (next.currentItemIndex >= kept.length) {
    if (session.currentRound < session.totalRounds && !session.isRoundFlow) {
      next = { ...next, currentItemIndex: 0, currentRound: session.currentRound + 1 };
    } else {
      next = startCooldown(next, now);
    }
  }
  return { session: next, replaced, dropped };
}
