import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { catalogTextsFor } from '../../data/catalogTexts';
import { INITIAL_WORKOUTS } from '../../data/seed';
import { resolveExercises } from '../catalog/resolve';
import { DEFAULT_PROFILE, buildWeek } from '../generator';
import { resolveWorkout } from '../plan/resolveWorkout';
import { buildPayload, decodePayload, encodePayload, plansFromPayload, shareUrl } from './share';

const exercises = resolveExercises(CATALOG, catalogTextsFor('ru'), {}, [], 'medium');
const ctx = { catalog: CATALOG, exercises, history: { lastDone: {}, swappedAway: {} }, date: '2026-11-26' };
const week = buildWeek(DEFAULT_PROFILE, ctx).map((g) => g.plan);

describe('share payload', () => {
  it('a generated week round-trips: patterns, steps, exercises, shares of the max', async () => {
    const p = buildPayload(week, CATALOG, { audience: 'form', author: 'Тренер Алексей', days: [0, 2, 4] });
    const back = await decodePayload(await encodePayload(p));
    expect(back).toEqual(p);
    const plans = plansFromPayload(back!, CATALOG, 'x');
    expect(plans.map((pl) => pl.items.map((it) => it.exerciseId))).toEqual(week.map((pl) => pl.items.map((it) => it.exerciseId)));
    expect(plans[0].items[0].spec).toEqual(week[0].items[0].spec);
    expect(plans[0].subtitle).toBe('от Тренер Алексей');
  });

  it('a coach plan with fixed targets keeps them', async () => {
    const a = INITIAL_WORKOUTS.find((w) => w.id === 'workout-a')!;
    const back = await decodePayload(await encodePayload(buildPayload([a], CATALOG)));
    expect(back!.k).toBe('w');
    const [plan] = plansFromPayload(back!, CATALOG, 'x');
    expect(plan.items.map((it) => it.target)).toEqual(a.items.map((it) => it.target));
  });

  it('nothing personal travels: no maxima, no journal, only the author typed by the sender', async () => {
    const json = JSON.stringify(buildPayload(week, CATALOG));
    expect(json).not.toMatch(/checkup|max|log|date/i);
  });

  it('a week of 3 workouts fits in a QR-friendly link', async () => {
    const url = shareUrl('https://fitnote.example', await encodePayload(buildPayload(week, CATALOG, { days: [0, 2, 4] })));
    expect(url.length).toBeLessThan(800);
  });

  it('the receiver adapts it: at home the bar exercises are replaced by the pattern', async () => {
    const back = await decodePayload(await encodePayload(buildPayload([week[0]], CATALOG)));
    const [plan] = plansFromPayload(back!, CATALOG, 'x');
    const home = resolveWorkout(plan, { catalog: CATALOG, exercises, conditions: { environment: 'home', equipment: ['bands'] } });
    const byId = new Map(CATALOG.map((c) => [c.id, c]));
    for (const r of home) expect(byId.get(r.exerciseId)!.environments).toContain('home');
  });

  it('broken links are refused, not crashing', async () => {
    expect(await decodePayload('zzzz')).toBeUndefined();
    expect(await decodePayload('xabc')).toBeUndefined();
    expect(await decodePayload('')).toBeUndefined();
  });
});
