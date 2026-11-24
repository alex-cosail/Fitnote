import { Exercise } from '../../types';

/**
 * Antagonist swap candidates, best first.
 * Score: overlap of the candidate's target muscles with the current
 * exercise's antagonists (weight 2), plus the reverse overlap (weight 1),
 * so paired antagonists always match cleanly.
 */
export function findAntagonistMatches(
  current: Exercise,
  catalog: Exercise[]
): Exercise[] {
  return catalog
    .filter((ex) => ex.id !== current.id)
    .map((candidate) => {
      const forwardHits = candidate.target_muscles.filter((m) =>
        current.antagonist_muscles.includes(m)
      ).length;
      const reverseHits = current.target_muscles.filter((m) =>
        candidate.antagonist_muscles.includes(m)
      ).length;
      return { exercise: candidate, score: forwardHits * 2 + reverseHits };
    })
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.exercise);
}
