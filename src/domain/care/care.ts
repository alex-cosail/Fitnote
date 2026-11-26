import type { CatalogExercise } from '../catalog/types';
import { Joint, jointLoad } from '../catalog/joints';

// «Берегу» (care brief §0, v3.10): each joint has a level 0–4, or is free
// (not in the list). The person chooses the state — we do not diagnose:
// «Боль, травма — сначала врач». The app asks «Как колено?» after a week
// and never lifts a level by itself.

export type JointLevel = 0 | 1 | 2 | 3 | 4;
export const JOINT_LEVELS: JointLevel[] = [0, 1, 2, 3, 4];

export interface Care {
  joint: Joint;
  level: JointLevel;
  since: string; // YYYY-MM-DD
  reviewAt?: string; // when to ask «Как …?»
  source: 'self' | 'doctor' | 'wizard';
  rehabIds?: string[];
  note?: string;
}

/** What the filters need: joint and level. */
export type CareRule = Pick<Care, 'joint' | 'level'>;

export const REVIEW_DAYS = 7;

export const LEVEL_INFO: Record<JointLevel, { name: string; hint: string; fill: string; ring: string; text: string }> = {
  0: { name: 'Не двигаем', hint: 'Не нагружаем совсем', fill: '#E24B4A', ring: '#A32D2D', text: '#FFFFFF' },
  1: { name: 'Нервная система', hint: 'Напряжение без движения, микроамплитуда', fill: '#D85A30', ring: '#993C1D', text: '#FFFFFF' },
  2: { name: 'Движения из жизни', hint: 'Встать со стула, поднять руку', fill: '#EF9F27', ring: '#854F0B', text: '#412402' },
  3: { name: 'Восстановление', hint: 'Лёгкие движения с амплитудой', fill: '#97C459', ring: '#3B6D11', text: '#173404' },
  4: { name: 'Бережно', hint: 'Лёгкие ступени, большой запас сил', fill: '#639922', ring: '#27500A', text: '#FFFFFF' },
};

const addDays = (iso: string, n: number) => {
  const d = new Date(`${iso}T12:00:00`);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Older data (v3.9) stored 'stop' / 'gentle'. */
export function normalizeCare(list: unknown): Care[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((c) => {
      const lv = (c as { level: unknown }).level;
      const level: JointLevel | undefined =
        lv === 'stop' ? 0 : lv === 'gentle' ? 4 : typeof lv === 'number' && lv >= 0 && lv <= 4 ? (lv as JointLevel) : undefined;
      return level === undefined ? undefined : ({ ...(c as Care), level } as Care);
    })
    .filter((c): c is Care => Boolean(c));
}

/**
 * Level 0: nothing that loads the joint; 1–3: no noticeable load (2–3);
 * 4: no strong load (3). With step-0 movements, 1–3 will pick from the matrix.
 */
export function blockedByCare(c: Pick<CatalogExercise, 'id' | 'pattern'>, care: CareRule[] = []): CareRule | undefined {
  if (care.length === 0) return undefined;
  const load = jointLoad(c);
  return care.find((r) => {
    const v = load[r.joint] ?? 0;
    if (r.level === 0) return v >= 1;
    if (r.level <= 3) return v >= 2;
    return v >= 3;
  });
}

/** Sets the level of a joint (the person's explicit choice); review in a week. */
export function setCare(list: Care[] = [], next: { joint: Joint; level: JointLevel; since: string; source: Care['source'] }): Care[] {
  const reviewAt = addDays(next.since, REVIEW_DAYS);
  const old = list.find((c) => c.joint === next.joint);
  if (!old) return [...list, { ...next, reviewAt }];
  return list.map((c) => (c.joint === next.joint ? { ...c, ...next, reviewAt } : c));
}

/** The weekly question is due for these. */
export function careToReview(list: Care[] = [], today: string): Care[] {
  return list.filter((c) => c.source !== 'doctor' && c.reviewAt && c.reviewAt <= today);
}

/**
 * «Как колено?»: passed → two levels up, better → one up (past 4 — free),
 * same → one more week at the same level.
 */
export function answerReview(list: Care[], joint: Joint, answer: 'passed' | 'better' | 'same', today: string): Care[] {
  const week = addDays(today, REVIEW_DAYS);
  const next: Care[] = [];
  for (const c of list) {
    if (c.joint !== joint) {
      next.push(c);
      continue;
    }
    const level = c.level + (answer === 'passed' ? 2 : answer === 'better' ? 1 : 0);
    if (level <= 4) next.push({ ...c, level: level as JointLevel, reviewAt: week });
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
