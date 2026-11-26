import { describe, expect, it } from 'vitest';
import { CATALOG } from '../../data/catalog';
import { WARMUP_KEYS } from '../../data/warmupKeys';
import { WARMUP_MOVES, buildWarmup, warmupOptionsFor } from './warmup';

const ids = (minutes: number, opts = {}) => buildWarmup(minutes, opts).steps.map((s) => s.id);
const move = (id: string) => WARMUP_MOVES.find((m) => m.id === id)!;

describe('warm-up «минута = движение»', () => {
  it('N minutes = N different movements of one minute', () => {
    for (const n of [5, 8, 10, 12, 15]) {
      const steps = buildWarmup(n).steps;
      expect(steps).toHaveLength(n);
      expect(new Set(steps.map((s) => s.id)).size).toBe(n);
      expect(steps.every((s) => s.durationSeconds === 60)).toBe(true);
    }
  });

  it('joints → pulse → dynamic → the primer set last', () => {
    const order = { joint: 0, pulse: 1, dynamic: 2 } as const;
    const s = ids(10);
    expect(s[s.length - 1]).toBe('wu-primer');
    const phases = s.slice(0, -1).map((id) => order[move(id).phase as keyof typeof order]);
    expect([...phases].sort((a, b) => a - b)).toEqual(phases);
  });

  it('follows the workout: its patterns get a movement each', () => {
    const s = ids(8, { patterns: ['hinge', 'pull_h'] });
    expect(s.some((id) => move(id)?.patterns.includes('hinge') && move(id).phase === 'dynamic')).toBe(true);
    expect(s).toContain('wu-pull-apart');
  });

  it('in the accent mode the dropped patterns come first and are marked', () => {
    const plan = buildWarmup(5, { patterns: ['squat'], dropped: ['pull_h'] });
    const dyn = plan.steps.filter((st) => st.id !== 'wu-primer' && move(st.id).phase === 'dynamic');
    expect(dyn[0].id).toBe('wu-pull-apart');
    expect(dyn[0].subtitle).toMatch(/акцент/);
  });

  it('55+: no jumps and no deep floor movements; no bar — no hang', () => {
    const masters = ids(15, { ageGroup: 'masters' });
    expect(masters).not.toContain('wu-jacks');
    expect(masters).not.toContain('wu-inchworm');
    expect(masters).toHaveLength(15);
    expect(ids(15, { patterns: ['pull_v'], hasBar: false })).not.toContain('wu-scapula');
    expect(ids(8, { patterns: ['pull_v'], hasBar: true })).toContain('wu-scapula');
  });

  it('options from today: patterns of the exercises, bars from the equipment', () => {
    const o = warmupOptionsFor(['strict-pull-ups', 'air-squats', 'unknown'], CATALOG, {
      conditions: { equipment: ['bands'], ageGroup: 'masters' },
      firstExerciseName: 'Подтягивания',
    });
    expect(o.patterns).toEqual(['pull_v', 'squat']);
    expect(o.hasBar).toBe(false);
    expect(buildWarmup(8, o).steps.at(-1)!.subtitle).toContain('Подтягивания');
  });

  it('every new warm-up picture is used by a movement', () => {
    const used = new Set(WARMUP_MOVES.map((m) => m.svgKey));
    for (const k of WARMUP_KEYS) expect(used.has(k)).toBe(true);
  });
});
