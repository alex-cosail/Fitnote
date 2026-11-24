import React from 'react';
import { PlayerContext } from './player/PlayerContext';
import { CooldownPhase } from './player/phases/CooldownPhase';
import { ExercisePhase } from './player/phases/ExercisePhase';
import { FinishPhase } from './player/phases/FinishPhase';
import { RestPhase } from './player/phases/RestPhase';
import { RoundBannerPhase } from './player/phases/RoundBannerPhase';
import { RoundFlowPhase } from './player/phases/RoundFlowPhase';
import { WarmupPhase } from './player/phases/WarmupPhase';
import {
  usePlayerController,
  WorkoutPlayerProps,
} from './player/usePlayerController';

// Fullscreen linear workout player: state and handlers live in
// usePlayerController; each phase is its own component.
export const WorkoutPlayer: React.FC<WorkoutPlayerProps> = (props) => {
  const ctx = usePlayerController(props);
  const { session } = props;

  let content: React.ReactNode;
  if (session.phase === 'round_banner') content = <RoundBannerPhase />;
  else if (session.phase === 'warmup') content = <WarmupPhase />;
  else if (session.phase === 'cooldown') content = <CooldownPhase />;
  else if (session.phase === 'finish') content = <FinishPhase />;
  else if (session.phase === 'rest') content = <RestPhase />;
  else if (session.isRoundFlow) content = <RoundFlowPhase />;
  else content = <ExercisePhase />;

  return <PlayerContext.Provider value={ctx}>{content}</PlayerContext.Provider>;
};
