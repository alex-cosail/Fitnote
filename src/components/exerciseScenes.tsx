import React from 'react';
import { SceneKey } from '../data/sceneKeys';

// Per-exercise scenes in the style of ExerciseSvg (viewBox 160 × 120, black
// #111827 body, red #DC2626 for the working part and the motion arrow,
// grey floor and equipment). Keys are SvgKey values; ExerciseSvg looks here
// first and falls back to its own scenes.

const INK = '#111827';
const RED = '#DC2626';
const FLOOR = '#E5E7EB';
const GEAR = '#9CA3AF';

const Floor = ({ y = 98 }: { y?: number }) => <line x1="18" y1={y} x2="142" y2={y} stroke={FLOOR} strokeWidth="2" />;
const Head = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r="6" fill="none" stroke={INK} strokeWidth="2.6" />;
const Body = ({ points, color = INK, width = 3.4 }: { points: string; color?: string; width?: number }) => (
  <polyline points={points} fill="none" stroke={color} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" />
);
const Limb = ({ points, color = INK }: { points: string; color?: string }) => (
  <polyline points={points} fill="none" stroke={color} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
);
/** Straight arrow with a head at (x2, y2). */
const Arrow = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => {
  const a = Math.atan2(y2 - y1, x2 - x1);
  const h = 5;
  const p1 = `${x2 - h * Math.cos(a - 0.6)},${y2 - h * Math.sin(a - 0.6)}`;
  const p2 = `${x2 - h * Math.cos(a + 0.6)},${y2 - h * Math.sin(a + 0.6)}`;
  return (
    <g stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <line x1={x1} y1={y1} x2={x2} y2={y2} />
      <polyline points={`${p1} ${x2},${y2} ${p2}`} />
    </g>
  );
};
const Box = ({ x, y, w, h }: { x: number; y: number; w: number; h: number }) => (
  <rect x={x} y={y} width={w} height={h} rx="2" fill="none" stroke={GEAR} strokeWidth="2" />
);
/** Suspension straps from an anchor to the handles. */
const Straps = ({ ax, ay, hx, hy }: { ax: number; ay: number; hx: number; hy: number }) => (
  <g>
    <line x1={ax - 10} y1={ay} x2={ax + 10} y2={ay} stroke={INK} strokeWidth="3" strokeLinecap="round" />
    <line x1={ax} y1={ay} x2={hx} y2={hy} stroke={GEAR} strokeWidth="1.8" />
    <rect x={hx - 3} y={hy - 2} width="6" height="4" rx="1" fill={GEAR} />
  </g>
);

export const EXERCISE_SCENES: Record<SceneKey, () => React.ReactElement> = {
  // ——— push-ups ———
  knee_pushups: () => (
    <g>
      <Floor />
      {/* shins on the floor, body from the knee */}
      <Limb points="56,96 34,95" />
      <circle cx="56" cy="96" r="2.2" fill={INK} />
      <Body points="56,96 106,68" />
      <Head x={113} y={62} />
      <Limb points="104,69 108,84 106,98" color={RED} />
      <Arrow x1={128} y1={86} x2={128} y2={68} />
    </g>
  ),
  incline_pushups: () => (
    <g>
      <Floor />
      <Box x={98} y={76} w={30} h={22} />
      <Body points="28,96 102,60" />
      <Head x={109} y={54} />
      <Limb points="100,61 106,68 108,76" color={RED} />
      <Arrow x1={138} y1={66} x2={138} y2={48} />
    </g>
  ),
  feet_elevated_pushups: () => (
    <g>
      <Floor />
      <Box x={18} y={72} w={26} h={26} />
      <Body points="36,72 108,80" />
      <Head x={116} y={78} />
      <Limb points="106,80 110,89 106,98" color={RED} />
      <Arrow x1={134} y1={92} x2={134} y2={74} />
    </g>
  ),
  banded_pushups: () => (
    <g>
      <Floor />
      <Body points="30,95 112,66" />
      <Head x={118} y={60} />
      <Limb points="104,69 108,84 106,98" color={RED} />
      {/* band: from under the hand, over the upper back, held taut */}
      <path d="M106,98 Q102,58 86,62 Q70,66 74,78" fill="none" stroke={RED} strokeWidth="1.8" strokeDasharray="3.5 2.5" strokeLinecap="round" />
      <Arrow x1={130} y1={86} x2={130} y2={68} />
    </g>
  ),
  suspension_pushups: () => (
    <g>
      <Floor />
      <Straps ax={120} ay={10} hx={118} hy={70} />
      <Body points="30,98 104,64" />
      <Head x={110} y={57} />
      <Limb points="102,65 108,76 118,70" color={RED} />
      <Arrow x1={140} y1={86} x2={140} y2={66} />
    </g>
  ),
  archer_pushups: () => (
    <g>
      <Floor />
      {/* front view: the working arm bent, the other one straight to the side */}
      <Head x={78} y={46} />
      <Body points="62,58 94,58" />
      <Limb points="62,58 52,76 58,98" color={RED} />
      <Limb points="94,58 116,78 134,98" />
      <Arrow x1={36} y1={90} x2={36} y2={68} />
    </g>
  ),
  suspension_fallout: () => (
    <g>
      <Floor />
      <Straps ax={128} ay={8} hx={130} hy={44} />
      {/* straight body leaning forward, arms overhead to the handles */}
      <Body points="42,98 98,52" />
      <Body points="62,82 82,65" color={RED} />
      <Head x={104} y={45} />
      <Limb points="96,54 114,48 130,44" />
      <path d="M58,40 Q74,30 92,30" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" />
      <polyline points="87,26 93,30 87,34" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
};
