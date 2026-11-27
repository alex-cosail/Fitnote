import { describe, expect, it } from 'vitest';
import {
  CATALOG_IDS,
  DEFAULT_FITNOTE_DATA,
  INITIAL_EXERCISES,
  INITIAL_WORKOUTS,
  getWarmupPlan,
} from '../data/seed';
import { Exercise, FitnoteData } from '../types';
import { mergeStoredData } from '../utils/mergeStoredData';
import { findAntagonistMatches } from './catalog/antagonists';
import { getMuscleLabel } from './catalog/muscles';
import { formatClock, formatMetricTarget } from './format';
import { applyImport } from './plan/importPlan';
import { calcAgt30, getEffectiveRounds, targetStep } from './plan/targets';
import { carryoverTarget } from './session/carryover';

const byId = (id: string) => {
  const ex = INITIAL_EXERCISES.find((e) => e.id === id);
  if (!ex) throw new Error(`no seed exercise ${id}`);
  return ex;
};

describe('format', () => {
  it('formats seconds as mm:ss and clamps negatives', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(5)).toBe('00:05');
    expect(formatClock(45)).toBe('00:45');
    expect(formatClock(125)).toBe('02:05');
    expect(formatClock(-3)).toBe('00:00');
    expect(formatClock(9.9)).toBe('00:09');
  });

  it('formats targets by metric', () => {
    expect(formatMetricTarget(18, 'reps')).toBe('18');
    expect(formatMetricTarget(45, 'seconds')).toBe('00:45');
  });

  it('labels known muscles and passes unknown tags through', () => {
    expect(getMuscleLabel('lats')).toBe('Широчайшие');
    expect(getMuscleLabel('unknown_tag')).toBe('unknown_tag');
  });
});

describe('targets', () => {
  it('AGT 30% for reps: rounded, min 1', () => {
    expect(calcAgt30({ checkup_max: 9, metric: 'reps' })).toBe(3);
    expect(calcAgt30({ checkup_max: 23, metric: 'reps' })).toBe(7);
    expect(calcAgt30({ checkup_max: 30, metric: 'reps' })).toBe(9);
    expect(calcAgt30({ checkup_max: 1, metric: 'reps' })).toBe(1);
  });

  it('AGT 30% for seconds: rounded to 5, min 5', () => {
    expect(calcAgt30({ checkup_max: 120, metric: 'seconds' })).toBe(35);
    expect(calcAgt30({ checkup_max: 45, metric: 'seconds' })).toBe(15);
    expect(calcAgt30({ checkup_max: 10, metric: 'seconds' })).toBe(5);
  });

  it('matches the seeded check-up history values', () => {
    for (const entry of DEFAULT_FITNOTE_DATA.checkUpHistory) {
      expect(calcAgt30({ checkup_max: entry.value, metric: entry.metric })).toBe(
        entry.agt30
      );
    }
  });

  it('effective rounds by readiness', () => {
    expect(getEffectiveRounds(3, 'green')).toBe(3);
    expect(getEffectiveRounds(3, 'yellow')).toBe(2);
    expect(getEffectiveRounds(15, 'yellow')).toBe(10);
    expect(getEffectiveRounds(1, 'yellow')).toBe(1);
    expect(getEffectiveRounds(15, 'red')).toBe(2);
  });

  it('tuning step: reps by 1 (min 1), seconds by 5 (min 5)', () => {
    expect(targetStep('reps')).toEqual({ step: 1, min: 1 });
    expect(targetStep('seconds')).toEqual({ step: 5, min: 5 });
  });
});

describe('carryover between rounds', () => {
  it('reps copy the actual result both ways', () => {
    expect(carryoverTarget('reps', 12, 14)).toBe(14);
    expect(carryoverTarget('reps', 12, 10)).toBe(10);
    expect(carryoverTarget('reps', 12, 12)).toBe(12);
  });

  it('timed holds only carry upwards', () => {
    expect(carryoverTarget('seconds', 20, 9)).toBe(20);
    expect(carryoverTarget('seconds', 20, 20)).toBe(20);
    expect(carryoverTarget('seconds', 20, 30)).toBe(30);
  });

  it('a zero (skipped) result never changes the target', () => {
    expect(carryoverTarget('reps', 12, 0)).toBe(12);
    expect(carryoverTarget('seconds', 20, 0)).toBe(20);
  });
});

describe('antagonist matches', () => {
  it('pull-ups pair with pushing exercises, best match first', () => {
    const matches = findAntagonistMatches(byId('strict-pull-ups'), INITIAL_EXERCISES);
    const ids = matches.map((m) => m.id);
    expect(ids[0]).toBe('parallel-bar-dips');
    expect(ids).toContain('floor-push-ups');
    expect(ids).not.toContain('strict-pull-ups');
    expect(ids).not.toContain('bulgarian-split-squat');
  });

  it('returns nothing when no muscles overlap', () => {
    const lonely: Exercise = {
      ...byId('dead-hang'),
      id: 'lonely',
      target_muscles: ['nothing'],
      antagonist_muscles: ['nobody'],
    };
    expect(findAntagonistMatches(lonely, [lonely])).toEqual([]);
  });
});

describe('warm-up plans', () => {
  const total = (minutes: number) =>
    getWarmupPlan(minutes).steps.reduce((s, st) => s + (st.durationSeconds ?? 0), 0);

  it('two flows (v3.15): 5:40 for short settings, 9:40 for the rest', () => {
    expect(total(5)).toBe(340);
    for (const minutes of [8, 10, 12, 15]) expect(total(minutes)).toBe(580);
  });
});

describe('plan import', () => {
  const current = {
    maxes: DEFAULT_FITNOTE_DATA.maxes,
    customExercises: [] as Exercise[],
    workouts: INITIAL_WORKOUTS,
  };

  it('adds a new plan with defaults and reports the count', () => {
    const res = applyImport(
      current,
      {
        workouts: [
          {
            title: 'Street D',
            items: [{ exerciseId: 'strict-pull-ups', target: 7 }],
          } as never,
        ],
      },
      CATALOG_IDS,
      123
    );
    expect(res.addedWorkouts).toBe(1);
    expect(res.addedExercises).toBe(0);
    const added = res.workouts.at(-1)!;
    expect(added).toMatchObject({
      id: 'plan-123-0',
      title: 'Street D',
      rounds: 3,
      restBetweenExercises: 45,
      restBetweenRounds: 90,
      useAgt30: false,
    });
    expect(res.workouts).toHaveLength(INITIAL_WORKOUTS.length + 1);
  });

  it('replaces a plan with the same id instead of duplicating it', () => {
    const res = applyImport(
      current,
      { workouts: [{ ...INITIAL_WORKOUTS[0], title: 'A v2' }] },
      CATALOG_IDS
    );
    expect(res.workouts).toHaveLength(INITIAL_WORKOUTS.length);
    expect(res.workouts[0].title).toBe('A v2');
  });

  it('catalog exercises only take a provided max; texts stay from the catalog', () => {
    const res = applyImport(
      current,
      {
        exercises: [
          { id: 'strict-pull-ups', name: 'Renamed', checkup_max: 12 } as never,
          { id: 'dead-hang', name: 'Dead Hang' } as never,
        ],
      },
      CATALOG_IDS
    );
    expect(res.maxes['strict-pull-ups'].value).toBe(12);
    expect(res.maxes['dead-hang']).toEqual(current.maxes['dead-hang']);
    expect(res.customExercises).toEqual([]);
    expect(res.addedExercises).toBe(2);
  });

  it('skips invalid entries and adds unknown exercises as custom with defaults', () => {
    const res = applyImport(
      current,
      {
        workouts: [{ title: '' } as never, { title: 'No items' } as never],
        exercises: [
          { id: 'air-squat', name: 'Air Squat' } as never,
          { name: 'No id' } as never,
        ],
      },
      CATALOG_IDS
    );
    expect(res.addedWorkouts).toBe(0);
    expect(res.addedExercises).toBe(1);
    expect(res.customExercises).toHaveLength(1);
    expect(res.customExercises[0]).toMatchObject({
      id: 'air-squat',
      metric: 'reps',
      checkup_max: 10,
      svgKey: 'generic_strength',
      isCustom: true,
    });
  });

  it('does not mutate the input', () => {
    const before = JSON.stringify(current);
    applyImport(current, { exercises: [{ id: 'x', name: 'X' } as never] }, CATALOG_IDS);
    expect(JSON.stringify(current)).toBe(before);
  });
});

describe('stored data merge', () => {
  it('empty storage object gives the defaults', () => {
    const merged = mergeStoredData({}, DEFAULT_FITNOTE_DATA);
    expect(merged.maxes).toBe(DEFAULT_FITNOTE_DATA.maxes);
    expect(merged.customExercises).toEqual([]);
    expect(merged.workouts).toBe(DEFAULT_FITNOTE_DATA.workouts);
    expect(merged.workoutLogs).toEqual([]);
    expect(merged.activeSession).toBeNull();
    expect(merged.theme).toBe('light');
  });

  it('keeps user data and custom exercises, sanitises theme', () => {
    const custom: Exercise = { ...byId('dead-hang'), id: 'custom-1', isCustom: true };
    const stored: Partial<FitnoteData> = {
      maxes: { 'strict-pull-ups': { value: 12 } },
      customExercises: [custom],
      workoutLogs: [{ id: 'w1' } as never],
      theme: 'neon' as never,
    };
    const merged = mergeStoredData(stored, DEFAULT_FITNOTE_DATA);
    expect(merged.maxes).toEqual({ 'strict-pull-ups': { value: 12 } });
    expect(merged.customExercises).toEqual([custom]);
    expect(merged.workoutLogs).toHaveLength(1);
    expect(merged.theme).toBe('light');
  });
});
