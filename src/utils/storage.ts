import { DEFAULT_FITNOTE_DATA, INITIAL_EXERCISES } from '../data/seed';
import { FitnoteData } from '../types';
import { mergeStoredData } from './mergeStoredData';

const STORAGE_KEY = 'fitnote_offline_store_v1';

export function loadFitnoteData(): FitnoteData {
  if (typeof window === 'undefined') return DEFAULT_FITNOTE_DATA;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_FITNOTE_DATA;
    const parsed = JSON.parse(raw) as Partial<FitnoteData>;
    return mergeStoredData(parsed, DEFAULT_FITNOTE_DATA, INITIAL_EXERCISES);
  } catch {
    return DEFAULT_FITNOTE_DATA;
  }
}

export function saveFitnoteData(data: FitnoteData): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota errors silently
  }
}
