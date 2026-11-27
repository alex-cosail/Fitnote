import { describe, expect, it } from 'vitest';
import { WARMUP_KEYS } from '../../data/warmupKeys';
import type { ActiveSession } from '../../types';
import { startCooldown } from '../session/transitions';
import { COOLDOWN_FLOW, COOLDOWN_SECONDS, breathPhase, buildCooldown } from './cooldown';

describe('cool-down flow (Addendum №7)', () => {
  it('7 standing positions, 4:30', () => {
    expect(COOLDOWN_FLOW).toHaveLength(7);
    expect(COOLDOWN_SECONDS).toBe(270);
    expect(buildCooldown()[0].id).toBe('cd-overhead-breath-reset');
  });

  it('side changes on the one-sided stretches', () => {
    const withSplit = buildCooldown().filter((s) => s.splitCueAt).map((s) => s.id);
    expect(withSplit).toEqual([
      'cd-post-chest-stretch',
      'cd-elevated-hamstring-hinge',
      'cd-standing-figure-four',
      'cd-standing-quad-hip-flexor',
      'cd-calf-achilles-stretch',
    ]);
  });

  it('pulls highlight step 3, legs highlight steps 4–6', () => {
    const pulls = buildCooldown(['pull_v']).map((s, i) => (s.highlight ? i + 1 : 0)).filter(Boolean);
    expect(pulls).toEqual([3]);
    const legs = buildCooldown(['squat', 'hinge']).map((s, i) => (s.highlight ? i + 1 : 0)).filter(Boolean);
    expect(legs).toEqual([4, 5, 6]);
  });

  it('a joint at level 0 leaves its stretch out', () => {
    expect(buildCooldown([], [{ joint: 'ankle', level: 0 }]).map((s) => s.id)).not.toContain('cd-calf-achilles-stretch');
    expect(buildCooldown([], [{ joint: 'ankle', level: 2 }]).map((s) => s.id)).toContain('cd-calf-achilles-stretch');
  });

  it('breathing 4–6: 4 seconds in, 6 out', () => {
    expect(breathPhase(0)).toEqual({ phase: 'in', left: 4 });
    expect(breathPhase(3)).toEqual({ phase: 'in', left: 1 });
    expect(breathPhase(4)).toEqual({ phase: 'out', left: 6 });
    expect(breathPhase(9)).toEqual({ phase: 'out', left: 1 });
    expect(breathPhase(10).phase).toBe('in');
  });

  it('the cool-down starts with the flow length and its first step', () => {
    const steps = buildCooldown();
    const s = startCooldown({ cooldownMinutes: 5, cooldownSteps: steps } as ActiveSession, 0);
    expect(s).toMatchObject({ phase: 'cooldown', phaseRemainingSec: 270, cooldownStepIndex: 0, cooldownStepRemainingSec: 30 });
  });

  it('every position has a picture', () => {
    for (const m of COOLDOWN_FLOW) expect((WARMUP_KEYS as readonly string[]).includes(m.svgKey), m.svgKey).toBe(true);
  });
});
