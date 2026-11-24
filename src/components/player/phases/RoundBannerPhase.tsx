import React from 'react';
import { usePlayer } from '../PlayerContext';

export const RoundBannerPhase: React.FC = () => {
  const {
    onUpdateSession,
    session,
  } = usePlayer();

  return (
    <div
      onClick={() =>
        onUpdateSession({ ...session, phase: 'exercise' })
      }
      className="fixed inset-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-[#111827] px-6 text-center text-white dark:bg-[#06090F]"
    >
      <p className="font-mono-num text-sm font-semibold uppercase tracking-widest text-[#DC2626] dark:text-[#F87171]">
        {session.workoutTitle}
      </p>
      <h2 className="font-display mt-2 text-7xl font-bold tracking-tight sm:text-8xl">
        ROUND {session.currentRound}
      </h2>
      <p className="font-mono-num mt-3 text-base text-gray-300">
        {session.currentRound} из {session.totalRounds}
      </p>
    </div>
  );
};
