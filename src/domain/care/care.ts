import type { CatalogExercise } from '../catalog/types';
import { Joint, jointLoad } from '../catalog/joints';

// «Берегу» (care brief, v3.9): what is not loaded now or loaded gently.
// Set by the person (a swipe past the easiest step, or in «Я»), later by a
// doctor's link or the 60+ wizard. Never lifted by itself: the app asks
// «Как плечо?» after a week.

export type CareLevel = 'stop' | 'gentle';
export type CareReason = 'pain' | 'injury' | 'discomfort' | 'doctor' | 'longevity';

export interface Care {
  joint: Joint;
  level: CareLevel;
  reason: CareReason;
  since: string; // YYYY-MM-DD
  reviewAt?: string; // when to ask «Как …?»
  source: 'self' | 'doctor' | 'wizard';
  rehabIds?: string[];
  note?: string;
}

/** What the filters need: joint and level. */
export type CareRule = Pick<Care, 'joint' | 'level'>;

export const REVIEW_DAYS = 7;

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/**
 * stop: no exercise that loads the joint noticeably (2–3);
 * gentle: no strong load (3).
 */
export function blockedByCare(c: Pick<CatalogExercise, 'id' | 'pattern'>, care: CareRule[] = []): CareRule | undefined {
  if (care.length === 0) return undefined;
  const load = jointLoad(c);
  return care.find((r) => {
    const v = load[r.joint] ?? 0;
    return r.level === 'stop' ? v >= 2 : v >= 3;
  });
}

/** Adds or tightens the care for a joint (a stop never becomes gentle here). */
export function setCare(list: Care[] = [], next: Omit<Care, 'reviewAt'> & { reviewAt?: string }): Care[] {
  const reviewAt = next.reviewAt ?? addDays(next.since, REVIEW_DAYS);
  const old = list.find((c) => c.joint === next.joint);
  if (!old) return [...list, { ...next, reviewAt }];
  const level: CareLevel = old.level === 'stop' || next.level === 'stop' ? 'stop' : 'gentle';
  return list.map((c) => (c.joint === next.joint ? { ...c, ...next, level, reviewAt } : c));
}

/** The weekly question is due for these. */
export function careToReview(list: Care[] = [], today: string): Care[] {
  return list.filter((c) => c.source !== 'doctor' && c.reviewAt && c.reviewAt <= today);
}

/**
 * «Как плечо?»: passed → gentle for a week, then off; better → stop becomes
 * gentle; same → one more week.
 */
export function answerReview(list: Care[], joint: Joint, answer: 'passed' | 'better' | 'same', today: string): Care[] {
  const next: Care[] = [];
  for (const c of list) {
    if (c.joint !== joint) {
      next.push(c);
      continue;
    }
    const week = addDays(today, REVIEW_DAYS);
    if (answer === 'same') next.push({ ...c, reviewAt: week });
    else if (answer === 'better') next.push({ ...c, level: 'gentle', reviewAt: week });
    else if (c.level === 'stop') next.push({ ...c, level: 'gentle', reason: 'discomfort', reviewAt: week });
    // passed while gentle → off
  }
  return next;
}

export function removeCare(list: Care[] = [], joint: Joint): Care[] {
  return list.filter((c) => c.joint !== joint);
}

export const JOINT_NAMES: Record<Joint, { name: string; acc: string }> = {
  neck: { name: 'Шея', acc: 'шею' },
  shoulder: { name: 'Плечо', acc: 'плечо' },
  elbow_wrist: { name: 'Локоть, запястье', acc: 'локоть и запястье' },
  thoracic: { name: 'Грудной отдел', acc: 'грудной отдел' },
  lower_back: { name: 'Поясница', acc: 'поясницу' },
  hip: { name: 'Таз, бедро', acc: 'таз и бедро' },
  knee: { name: 'Колено', acc: 'колено' },
  ankle: { name: 'Голеностоп', acc: 'голеностоп' },
};
