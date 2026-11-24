import { CATALOG } from '../data/catalog';
import { splitLegacyExercises } from '../domain/catalog/userMaxes';
import { Exercise, FitnoteData } from '../types';

/**
 * Versioned storage envelope and the migration chain.
 *
 * v1: the bare FitnoteData object under 'fitnote_offline_store_v1' (Fitnote ≤ v2).
 * v2: { schemaVersion: 2, data } under 'fitnote_store' (Fitnote v2.1).
 * v3: data.exercises (full catalog copies) replaced by data.maxes (user's
 *     check-up maxima by catalog id) and data.customExercises.
 *
 * Every later schema change adds `migrations[n]` (data of version n → n+1)
 * and bumps CURRENT_SCHEMA_VERSION. Old data is always walked up the chain.
 */

export const CURRENT_SCHEMA_VERSION = 3;

const CATALOG_IDS: ReadonlySet<string> = new Set(CATALOG.map((c) => c.id));

export const STORAGE_KEY = 'fitnote_store';
export const LEGACY_STORAGE_KEY_V1 = 'fitnote_offline_store_v1';

export interface StoreEnvelope {
  schemaVersion: number;
  savedAt: string;
  data: FitnoteData;
}

type Migration = (data: unknown) => unknown;

// migrations[n] turns version-n data into version-(n+1) data.
const migrations: Record<number, Migration> = {
  // v1 → v2: the payload is unchanged; v2 only adds the envelope.
  1: (data) => data,
  // v2 → v3: catalog copies → maxima; unknown ids → custom exercises.
  2: (data) => {
    if (!isObject(data)) return data;
    const { exercises, ...rest } = data;
    if (!Array.isArray(exercises) || exercises.length === 0) return rest;
    const user = splitLegacyExercises(
      exercises as Exercise[],
      CATALOG_IDS,
      isObject(rest.maxes) ? (rest.maxes as FitnoteData['maxes']) : {}
    );
    return {
      ...rest,
      maxes: user.maxes,
      customExercises: [
        ...(Array.isArray(rest.customExercises) ? (rest.customExercises as Exercise[]) : []),
        ...user.customExercises,
      ],
    };
  },
};

export class SchemaTooNewError extends Error {
  constructor(public version: number) {
    super(`Данные сохранены более новой версией приложения (схема ${version}).`);
  }
}

/** Walks `data` of `fromVersion` up to the current schema. */
export function migrateData(data: unknown, fromVersion: number): Partial<FitnoteData> {
  if (fromVersion > CURRENT_SCHEMA_VERSION) {
    throw new SchemaTooNewError(fromVersion);
  }
  let current = data;
  for (let v = fromVersion; v < CURRENT_SCHEMA_VERSION; v += 1) {
    const step = migrations[v];
    if (!step) throw new Error(`Нет миграции со схемы ${v}`);
    current = step(current);
  }
  return (current ?? {}) as Partial<FitnoteData>;
}

export function wrapEnvelope(data: FitnoteData, now: number = Date.now()): StoreEnvelope {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    savedAt: new Date(now).toISOString(),
    data,
  };
}

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null && !Array.isArray(x);
}

/**
 * Reads any stored or backed-up shape and returns current-schema data:
 * an envelope `{schemaVersion, data}` or a bare v1 FitnoteData object.
 */
export function readAnyStore(parsed: unknown): Partial<FitnoteData> {
  if (isObject(parsed) && typeof parsed.schemaVersion === 'number' && 'data' in parsed) {
    return migrateData(parsed.data, parsed.schemaVersion);
  }
  return migrateData(parsed, 1);
}
