import { MovementPattern } from '../catalog/types';

// Order inside a round (GENERATOR_RULES §5.1): focus first; never two
// pushes or two pulls in a row; upper and lower alternate where possible;
// core last.

export type MoveClass = 'push' | 'pull' | 'lower' | 'core';

export function moveClass(p: MovementPattern): MoveClass {
  if (p === 'push_h' || p === 'push_v') return 'push';
  if (p === 'pull_h' || p === 'pull_v') return 'pull';
  if (p === 'core') return 'core';
  return 'lower';
}

const isUpper = (c: MoveClass) => c === 'push' || c === 'pull';

/** Two pushes or two pulls next to each other. */
export function hasSameDirectionInRow(patterns: MovementPattern[]): boolean {
  for (let i = 1; i < patterns.length; i++) {
    const a = moveClass(patterns[i - 1]);
    const b = moveClass(patterns[i]);
    if (a === b && (a === 'push' || a === 'pull')) return true;
  }
  return false;
}

/**
 * Returns the indices of `items` in round order. Depth-first search over
 * candidates sorted by priority, then upper/lower alternation, then the
 * original index; the first order without two pushes / pulls in a row and
 * with core at the end wins. Falls back to priority order if none exists.
 */
export function orderRound<T extends { pattern: MovementPattern; priority: number }>(items: T[]): number[] {
  const n = items.length;
  const classes = items.map((it) => moveClass(it.pattern));
  const coreIdx = items.map((_, i) => i).filter((i) => classes[i] === 'core');
  const rest = items.map((_, i) => i).filter((i) => classes[i] !== 'core');
  // Core goes last (in priority order among itself) unless it is a focus.
  const tail = coreIdx.filter((i) => items[i].priority < 3).sort((a, b) => items[b].priority - items[a].priority || a - b);
  const head = [...rest, ...coreIdx.filter((i) => items[i].priority >= 3)];

  const used = new Array<boolean>(n).fill(false);
  const seq: number[] = [];
  const valid = (prev: number | undefined, next: number) => {
    if (prev === undefined) return true;
    const a = classes[prev];
    const b = classes[next];
    return !(a === b && (a === 'push' || a === 'pull'));
  };

  const dfs = (): boolean => {
    if (seq.length === head.length) {
      // the tail (core) after the last head item is always valid
      return true;
    }
    const prev = seq[seq.length - 1];
    const cand = head
      .filter((i) => !used[i] && valid(prev, i))
      .sort((a, b) => {
        const pa = items[b].priority - items[a].priority;
        if (pa) return pa;
        if (prev !== undefined) {
          const alt = (i: number) => (isUpper(classes[i]) !== isUpper(classes[prev]) ? 0 : 1);
          const d = alt(a) - alt(b);
          if (d) return d;
        }
        return a - b;
      });
    for (const i of cand) {
      used[i] = true;
      seq.push(i);
      if (dfs()) return true;
      seq.pop();
      used[i] = false;
    }
    return false;
  };

  if (dfs()) return [...seq, ...tail];
  return items
    .map((_, i) => i)
    .sort((a, b) => items[b].priority - items[a].priority || a - b);
}
