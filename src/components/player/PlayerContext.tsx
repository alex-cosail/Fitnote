import { createContext, useContext } from 'react';
import { usePlayerController } from './usePlayerController';

export type PlayerContextValue = ReturnType<typeof usePlayerController>;

export const PlayerContext = createContext<PlayerContextValue | null>(null);

export function usePlayer(): PlayerContextValue {
  const ctx = useContext(PlayerContext);
  if (!ctx) throw new Error('usePlayer must be used inside WorkoutPlayer');
  return ctx;
}
