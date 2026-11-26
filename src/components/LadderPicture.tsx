import React, { useRef, useState } from 'react';
import { ArrowLeftRight, ChevronLeft, ChevronRight } from 'lucide-react';
import { LadderPosition } from '../domain/generator';
import { SvgKey } from '../types';
import { ExerciseSvg } from './ExerciseSvg';

interface LadderPictureProps {
  svgKey: SvgKey;
  name: string;
  ladder?: LadderPosition;
  onStep: (dir: 1 | -1) => void;
  onJump: (rank: number) => void;
  onSwap?: () => void;
  swapLabel?: string;
  className?: string; // picture size
}

const SWIPE = 40; // px to commit a step
const SLIDE_MS = 160;

/**
 * The exercise picture as a strip of slides (customer, 26.11): swipe left —
 * a harder step, swipe right — an easier one; at the ends the picture springs
 * back. Dots under it are the ladder steps (tap = jump), thin ‹ › inside the
 * picture do the same as a swipe. Vertical page scroll is left to the browser.
 */
export const LadderPicture: React.FC<LadderPictureProps> = ({
  svgKey, name, ladder, onStep, onJump, onSwap, swapLabel = 'Другое', className = 'h-20 w-full',
}) => {
  const [x, setX] = useState(0);
  const [animate, setAnimate] = useState(false);
  const start = useRef<{ x: number; y: number; horizontal: boolean | null } | null>(null);
  const canHarder = Boolean(ladder?.canHarder);
  const canEasier = Boolean(ladder?.canEasier);

  const commit = (dir: 1 | -1) => {
    // slide out, change the exercise, slide the new picture in from the other side
    setAnimate(true);
    setX(dir === 1 ? -120 : 120);
    window.setTimeout(() => {
      onStep(dir);
      setAnimate(false);
      setX(dir === 1 ? 120 : -120);
      requestAnimationFrame(() =>
        requestAnimationFrame(() => {
          setAnimate(true);
          setX(0);
        })
      );
    }, SLIDE_MS);
  };
  const springBack = () => {
    setAnimate(true);
    setX(0);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, horizontal: null };
    setAnimate(false);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s) return;
    const dx = e.clientX - s.x;
    const dy = e.clientY - s.y;
    if (s.horizontal === null && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      s.horizontal = Math.abs(dx) > Math.abs(dy);
      if (s.horizontal) (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
    }
    if (!s.horizontal) return;
    const blocked = (dx < 0 && !canHarder) || (dx > 0 && !canEasier);
    setX(blocked ? dx * 0.25 : dx); // rubber band at the ends
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.horizontal) {
      springBack();
      return;
    }
    const dx = e.clientX - s.x;
    if (dx <= -SWIPE && canHarder) commit(1);
    else if (dx >= SWIPE && canEasier) commit(-1);
    else springBack();
  };

  const chevron =
    'absolute top-1/2 z-10 flex h-8 w-6 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-[#111827] dark:text-gray-500 dark:hover:text-[#F3F4F6]';

  return (
    <div className="min-w-0 flex-1">
      <div
        className="relative overflow-hidden rounded-xl bg-gray-50/70 select-none dark:bg-[#1A2333]/60"
        style={{ touchAction: 'pan-y' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={springBack}
        role="group"
        aria-label={name}
      >
        <div
          style={{
            transform: `translateX(${x}px)`,
            opacity: Math.abs(x) >= 120 ? 0 : 1,
            transition: animate ? `transform ${SLIDE_MS}ms ease-out, opacity ${SLIDE_MS}ms ease-out` : 'none',
          }}
        >
          <ExerciseSvg svgKey={svgKey} className={className} />
        </div>
        {canEasier && (
          <button type="button" className={`${chevron} left-0`} onClick={() => commit(-1)} aria-label={`Ступень легче: ${name}`}>
            <ChevronLeft className="h-5 w-5" />
          </button>
        )}
        {canHarder && (
          <button type="button" className={`${chevron} right-0`} onClick={() => commit(1)} aria-label={`Ступень тяжелее: ${name}`}>
            <ChevronRight className="h-5 w-5" />
          </button>
        )}
      </div>
      {(ladder || onSwap) && (
        <div className="mt-1 flex items-center justify-center gap-0.5">
          {ladder?.ranks.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => r !== ladder.current && onJump(r)}
              className="tap-scale flex h-7 w-6 items-center justify-center"
              aria-label={`Ступень ${r}`}
              aria-current={r === ladder.current}
            >
              <span
                className={`block rounded-full ${
                  r === ladder.current ? 'h-2.5 w-2.5 bg-[#DC2626]' : 'h-2 w-2 bg-gray-300 dark:bg-[#475569]'
                }`}
              />
            </button>
          ))}
          {onSwap && (
            <button
              type="button"
              onClick={onSwap}
              className="tap-scale ml-2 flex min-h-[28px] items-center gap-1 text-[11px] font-semibold text-gray-500 dark:text-gray-400"
            >
              <ArrowLeftRight className="h-3 w-3" />
              {swapLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};
