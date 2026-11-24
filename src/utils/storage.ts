import { DEFAULT_FITNOTE_DATA } from '../data/seed';
import {
  LEGACY_STORAGE_KEY_V1,
  readAnyStore,
  STORAGE_KEY,
  wrapEnvelope,
} from '../storage/schema';
import { FitnoteData } from '../types';
import { mergeStoredData } from './mergeStoredData';

/**
 * Loads the current store; on first run after the update, migrates the old
 * v1 store. The v1 key is left untouched as a safety net for one release.
 */
export function loadFitnoteData(): FitnoteData {
  if (typeof window === 'undefined') return DEFAULT_FITNOTE_DATA;
  let raw: string | null = null;
  try {
    raw =
      window.localStorage.getItem(STORAGE_KEY) ??
      window.localStorage.getItem(LEGACY_STORAGE_KEY_V1);
    if (!raw) return DEFAULT_FITNOTE_DATA;
    const data = readAnyStore(JSON.parse(raw));
    return mergeStoredData(data, DEFAULT_FITNOTE_DATA);
  } catch {
    // Unreadable or written by a newer version: keep the raw text aside
    // before the app starts saving defaults over it.
    if (raw) {
      try {
        window.localStorage.setItem(`${STORAGE_KEY}_unreadable_${Date.now()}`, raw);
      } catch {
        // nothing more we can do
      }
    }
    return DEFAULT_FITNOTE_DATA;
  }
}

/** Saves the store; returns false when the browser refused (e.g. quota). */
export function saveFitnoteData(data: FitnoteData): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(wrapEnvelope(data)));
    return true;
  } catch {
    return false;
  }
}
