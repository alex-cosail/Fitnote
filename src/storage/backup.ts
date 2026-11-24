import { CATALOG_IDS, DEFAULT_FITNOTE_DATA } from '../data/seed';
import { FitnoteData } from '../types';
import { mergeStoredData } from '../utils/mergeStoredData';
import {
  CURRENT_SCHEMA_VERSION,
  readAnyStore,
  SchemaTooNewError,
} from './schema';

/** Backup file: the full store plus a marker so we recognise our own files. */
export interface BackupFile {
  app: 'Fitnote';
  kind: 'backup';
  schemaVersion: number;
  exportedAt: string;
  data: FitnoteData;
}

export interface BackupSummary {
  workouts: number;
  cardio: number;
  checkUps: number;
  plans: number;
  lastWorkoutDate?: string;
  exportedAt?: string;
}

export function buildBackup(data: FitnoteData, now: number = Date.now()): BackupFile {
  return {
    app: 'Fitnote',
    kind: 'backup',
    schemaVersion: CURRENT_SCHEMA_VERSION,
    exportedAt: new Date(now).toISOString(),
    // A running workout is not part of the backup.
    data: { ...data, activeSession: null },
  };
}

export function backupFileName(now: number = Date.now()): string {
  return `fitnote-backup-${new Date(now).toISOString().slice(0, 10)}.json`;
}

export function summarize(data: FitnoteData, exportedAt?: string): BackupSummary {
  const dates = [...data.workoutLogs, ...data.cardioLogs]
    .map((l) => l.date)
    .sort();
  return {
    workouts: data.workoutLogs.length,
    cardio: data.cardioLogs.length,
    checkUps: data.checkUpHistory.length,
    plans: data.workouts.length,
    lastWorkoutDate: dates.at(-1),
    exportedAt,
  };
}

export type ParseBackupResult =
  | { ok: true; data: FitnoteData; summary: BackupSummary }
  | { ok: false; error: string };

/**
 * Reads a backup file (or an old raw store copy) and returns data ready to
 * replace the current store. Never throws.
 */
export function parseBackup(text: string): ParseBackupResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Файл повреждён или это не копия Fitnote.' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, error: 'Это не копия Fitnote.' };
  }

  const obj = parsed as Record<string, unknown>;
  const isBackup = obj.app === 'Fitnote' && obj.kind === 'backup';
  const looksLikeStore =
    Array.isArray(obj.workoutLogs) || Array.isArray(obj.exercises) ||
    (typeof obj.maxes === 'object' && obj.maxes !== null) ||
    (typeof obj.schemaVersion === 'number' && typeof obj.data === 'object');
  if (!isBackup && !looksLikeStore) {
    return { ok: false, error: 'Это не копия Fitnote.' };
  }

  try {
    const migrated = readAnyStore(
      isBackup ? { schemaVersion: obj.schemaVersion, data: obj.data } : parsed
    );
    const exportedAt = typeof obj.exportedAt === 'string' ? obj.exportedAt : undefined;
    const merged = mergeStoredData(migrated, DEFAULT_FITNOTE_DATA, CATALOG_IDS);
    const data: FitnoteData = {
      ...merged,
      activeSession: null,
      // Everything restored is already safe in this file.
      lastBackupAt: exportedAt ?? merged.lastBackupAt,
    };
    return { ok: true, data, summary: summarize(data, exportedAt) };
  } catch (e) {
    if (e instanceof SchemaTooNewError) {
      return {
        ok: false,
        error: 'Копия сделана более новой версией Fitnote. Обновите приложение и попробуйте снова.',
      };
    }
    return { ok: false, error: 'Не удалось прочитать копию.' };
  }
}

/** Workouts and cardio sessions logged after the last backup. */
export function entriesSinceBackup(data: FitnoteData): number {
  const since = data.lastBackupAt;
  const all = [...data.workoutLogs, ...data.cardioLogs];
  if (!since) return all.length;
  return all.filter((l) => l.date > since).length;
}
