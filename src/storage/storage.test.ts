import { describe, expect, it } from 'vitest';
import { DEFAULT_FITNOTE_DATA } from '../data/seed';
import { FitnoteData, WorkoutLog } from '../types';
import {
  backupFileName,
  buildBackup,
  entriesSinceBackup,
  parseBackup,
} from './backup';
import {
  CURRENT_SCHEMA_VERSION,
  migrateData,
  readAnyStore,
  SchemaTooNewError,
  wrapEnvelope,
} from './schema';

const NOW = Date.UTC(2026, 10, 24, 12, 0, 0);

const log = (id: string, date: string): WorkoutLog => ({
  id,
  date,
  workoutTitle: 'A',
  readiness: 'green',
  roundsCompleted: 3,
  roundsPlanned: 3,
  durationSeconds: 1800,
  sets: [],
});

// Current-shape user data with logs (catalog split is tested in catalog.test.ts).
const v1Store = (): FitnoteData => ({
  ...DEFAULT_FITNOTE_DATA,
  readiness: 'yellow',
  theme: 'dark',
  workoutLogs: [log('w1', '2026-11-10T08:00:00.000Z'), log('w2', '2026-11-20T08:00:00.000Z')],
  cardioLogs: [
    { id: 'c1', date: '2026-11-15T07:00:00.000Z', type: 'Бег', durationMinutes: 35 },
  ],
});

describe('schema migration', () => {
  it('current schema is 3', () => {
    expect(CURRENT_SCHEMA_VERSION).toBe(3);
  });

  it('a bare v1 store without exercises keeps all its data', () => {
    const v1 = v1Store();
    const data = readAnyStore(JSON.parse(JSON.stringify(v1)));
    expect(data).toEqual(v1);
  });

  it('the current envelope round-trips', () => {
    const v1 = v1Store();
    const env = JSON.parse(JSON.stringify(wrapEnvelope(v1, NOW)));
    expect(env.schemaVersion).toBe(3);
    expect(env.savedAt).toBe(new Date(NOW).toISOString());
    expect(readAnyStore(env)).toEqual(v1);
  });

  it('refuses data from a newer schema instead of guessing', () => {
    expect(() => migrateData({}, CURRENT_SCHEMA_VERSION + 1)).toThrow(SchemaTooNewError);
    expect(() => readAnyStore({ schemaVersion: 99, data: {} })).toThrow(SchemaTooNewError);
  });
});

describe('backup file', () => {
  it('contains everything except a running workout', () => {
    const data = { ...v1Store(), activeSession: { id: 'running' } as never };
    const file = buildBackup(data, NOW);
    expect(file).toMatchObject({ app: 'Fitnote', kind: 'backup', schemaVersion: 3 });
    expect(file.data.activeSession).toBeNull();
    expect(file.data.workoutLogs).toHaveLength(2);
    expect(backupFileName(NOW)).toBe('fitnote-backup-2026-11-24.json');
  });

  it('restores its own backup with a summary', () => {
    const text = JSON.stringify(buildBackup(v1Store(), NOW));
    const res = parseBackup(text);
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.data.workoutLogs.map((w) => w.id)).toEqual(['w1', 'w2']);
    expect(res.data.theme).toBe('dark');
    expect(res.summary).toEqual({
      workouts: 2,
      cardio: 1,
      checkUps: DEFAULT_FITNOTE_DATA.checkUpHistory.length,
      plans: DEFAULT_FITNOTE_DATA.workouts.length,
      lastWorkoutDate: '2026-11-20T08:00:00.000Z',
      exportedAt: new Date(NOW).toISOString(),
    });
  });

  it('restored data counts as backed up at the time the file was made', () => {
    const res = parseBackup(JSON.stringify(buildBackup(v1Store(), NOW)));
    expect(res.ok && res.data.lastBackupAt).toBe(new Date(NOW).toISOString());
    expect(res.ok && entriesSinceBackup(res.data)).toBe(0);
  });

  it('also accepts a raw copy of the old store', () => {
    const res = parseBackup(JSON.stringify(v1Store()));
    expect(res.ok).toBe(true);
  });

  it('rejects other files with a clear message', () => {
    expect(parseBackup('not json')).toMatchObject({ ok: false });
    expect(parseBackup('[1,2,3]')).toMatchObject({ ok: false });
    expect(parseBackup(JSON.stringify({ workouts: [] }))).toMatchObject({
      ok: false,
      error: 'Это не копия Fitnote.',
    });
  });

  it('rejects a backup from a newer app version', () => {
    const file = { ...buildBackup(v1Store(), NOW), schemaVersion: 99 };
    const res = parseBackup(JSON.stringify(file));
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.error).toContain('новой версией');
  });
});

describe('backup reminder', () => {
  it('counts entries since the last backup', () => {
    const data = v1Store();
    expect(entriesSinceBackup(data)).toBe(3);
    expect(entriesSinceBackup({ ...data, lastBackupAt: '2026-11-12T00:00:00.000Z' })).toBe(2);
    expect(entriesSinceBackup({ ...data, lastBackupAt: '2026-11-21T00:00:00.000Z' })).toBe(0);
  });
});
