import { describe, expect, it } from 'vitest';
import { WARMUP_KEYS } from '../../data/warmupKeys';
import { BASE_FLOW, FLOW_SECONDS, PULSE_FLOW, WARMUP_MOVES, buildWarmup, warmupModeOf, warmupOptionsFor } from './warmup';

const ids = (minutes: number, opts = {}) => buildWarmup(minutes, opts).steps.map((s) => s.id);
const total = (minutes: number, opts = {}) => buildWarmup(minutes, opts).steps.reduce((s, x) => s + (x.durationSeconds ?? 0), 0);

describe('warm-up flows (Addendum №6)', () => {
  it('two modes: base 5:40 (10 joint links) and extended 9:40 (+6 pulse movements)', () => {
    expect(FLOW_SECONDS).toEqual({ default: 340, extended: 580 });
    expect(BASE_FLOW).toHaveLength(10);
    expect(PULSE_FLOW).toHaveLength(6);
    expect(total(5)).toBe(340);
    expect(total(10)).toBe(580);
  });

  it('old settings map to a mode: up to 6 minutes — base, 8 / 10 / 12 / 15 — extended', () => {
    expect(warmupModeOf(5)).toBe('default');
    for (const m of [8, 10, 12, 15]) expect(warmupModeOf(m)).toBe('extended');
  });

  it('from the neck down: neck first, ankle last of the base', () => {
    const s = ids(5);
    expect(s[0]).toBe('wu-neck-half-circles');
    expect(s[9]).toBe('wu-ankle-toe-circles');
    expect(ids(10).slice(0, 10)).toEqual(s);
  });

  it('side changes are marked inside the step', () => {
    const neck = buildWarmup(5).steps[0];
    expect(neck).toMatchObject({ durationSeconds: 30, splitCueAt: 15 });
    expect(buildWarmup(5).steps.find((x) => x.id === 'wu-thoracic-twists')!.splitCueAt).toBeUndefined();
  });

  it('55+: the jack becomes a step without a jump', () => {
    const jack = buildWarmup(10, { ageGroup: 'masters' }).steps.find((x) => x.id === 'wu-jumping-jacks-adaptive')!;
    expect(jack.cue).toMatch(/Без прыжка/);
    const young = buildWarmup(10).steps.find((x) => x.id === 'wu-jumping-jacks-adaptive')!;
    expect(young.cue).not.toMatch(/Без прыжка/);
  });

  it('a joint at level 0 skips its link; levels 1–3 keep the light links', () => {
    expect(ids(5, { care: [{ joint: 'neck', level: 0 }] })).not.toContain('wu-neck-half-circles');
    expect(ids(5, { care: [{ joint: 'neck', level: 2 }] })).toContain('wu-neck-half-circles');
    // the leg swings load the hip noticeably: out at levels 1–3
    expect(ids(10, { care: [{ joint: 'hip', level: 2 }] })).not.toContain('wu-leg-swings-sagittal');
  });

  it('options from today: only the person matters', () => {
    const o = warmupOptionsFor(['x'], [], { conditions: { ageGroup: 'masters', care: [{ joint: 'knee', level: 1 }] } });
    expect(o).toMatchObject({ ageGroup: 'masters', care: [{ joint: 'knee', level: 1 }] });
  });

  it('every flow movement has a picture', () => {
    for (const m of WARMUP_MOVES) {
      const known = (WARMUP_KEYS as readonly string[]).includes(m.svgKey) || m.svgKey.startsWith('rh_');
      expect(known, m.svgKey).toBe(true);
    }
  });

  it('the last minute is a micro round of the workout: 4 pictures, 3–5 reps each', () => {
    const round = ['a', 'b', 'c', 'd', 'e'].map((n) => ({ svgKey: 'pushups' as const, name: n }));
    const plan = buildWarmup(5, { round });
    const last = plan.steps.at(-1)!;
    expect(last).toMatchObject({ id: 'wu-micro-round', durationSeconds: 60 });
    expect(last.collage!.map((c) => c.name)).toEqual(['a', 'b', 'c', 'd']);
    expect(total(5, { round })).toBe(400); // 6:40
    expect(buildWarmup(5).steps.some((s) => s.id === 'wu-micro-round')).toBe(false);
  });
});
