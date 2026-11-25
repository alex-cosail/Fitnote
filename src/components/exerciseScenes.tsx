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
  // ——— core ———
  dead_bug: () => (
    <g>
      <Floor />
      {/* on the back: one arm up, the opposite leg long, the other in table-top */}
      <Body points="62,92 98,92" color={RED} />
      <Head x={106} y={90} />
      <Limb points="94,92 94,64" />
      <Limb points="94,92 124,88" />
      <Limb points="62,92 62,72 46,72" />
      <Limb points="62,92 28,86" />
    </g>
  ),
  bird_dog: () => (
    <g>
      <Floor />
      {/* on hands and knees: opposite arm and leg reach long */}
      <Body points="56,72 100,72" color={RED} />
      <Head x={108} y={66} />
      <Limb points="100,72 100,98" />
      <Limb points="56,72 56,98 40,98" />
      <Limb points="100,72 132,64" />
      <Limb points="56,72 24,66" />
    </g>
  ),
  high_plank: () => (
    <g>
      <Floor />
      <Body points="30,95 108,68" />
      <Body points="54,87 86,76" color={RED} />
      <Head x={115} y={62} />
      <Limb points="104,69 106,84 104,98" />
      {/* hold: a small clock */}
      <circle cx="128" cy="30" r="9" fill="none" stroke={RED} strokeWidth="2" />
      <polyline points="128,24 128,30 132,33" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  hollow_body_hold: () => (
    <g>
      <Floor />
      {/* the "banana": legs and shoulders off the floor, low back pressed down */}
      <path d="M28,78 Q72,104 106,82" fill="none" stroke={RED} strokeWidth="3.4" strokeLinecap="round" />
      <Head x={112} y={77} />
      <Limb points="104,83 134,72" />
      <circle cx="128" cy="30" r="9" fill="none" stroke={RED} strokeWidth="2" />
      <polyline points="128,24 128,30 132,33" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  suitcase_march: () => (
    <g>
      <Floor />
      <Head x={78} y={20} />
      <Body points="78,27 78,62" />
      {/* the weight in one hand, the side of the trunk holds it */}
      <path d="M72,34 Q68,48 72,60" fill="none" stroke={RED} strokeWidth="2.2" strokeLinecap="round" />
      <Limb points="78,32 86,46 88,60" />
      <circle cx="89" cy="67" r="6" fill={GEAR} />
      <Limb points="78,32 70,44 68,56" />
      <Limb points="78,62 78,98" />
      <Limb points="78,62 96,66 94,84" />
      <Arrow x1={112} y1={84} x2={112} y2={64} />
    </g>
  ),
  copenhagen_plank_short: () => (
    <g>
      <Floor />
      <Box x={18} y={76} w={26} h={22} />
      {/* side plank on the forearm, top knee on the bench, inner thigh works */}
      <Body points="40,76 106,78" />
      <Body points="40,76 66,77" color={RED} />
      <Head x={114} y={72} />
      <Limb points="106,78 106,98 122,98" />
    </g>
  ),
  swedish_wall_side_hold: () => (
    <g>
      {/* wall bars */}
      <line x1="36" y1="12" x2="36" y2="104" stroke={GEAR} strokeWidth="2" />
      <line x1="48" y1="12" x2="48" y2="104" stroke={GEAR} strokeWidth="2" />
      {[24, 40, 56, 72, 88].map((y) => (
        <line key={y} x1="36" y1={y} x2="48" y2={y} stroke={GEAR} strokeWidth="1.6" />
      ))}
      {/* sideways tuck hold: top arm pulls, bottom arm pushes */}
      <Limb points="62,56 48,40" />
      <Limb points="62,64 48,88" />
      <Head x={60} y={46} />
      <Body points="64,60 98,60" color={RED} />
      <Limb points="98,60 112,48 104,64" />
    </g>
  ),
  plank_shoulder_taps: () => (
    <g>
      <Floor />
      <Body points="30,95 110,66" />
      <Body points="54,87 86,76" color={RED} />
      <Head x={117} y={60} />
      <Limb points="106,68 108,84 106,98" />
      {/* the other hand taps the opposite shoulder */}
      <Limb points="102,70 92,82 100,68" color={RED} />
    </g>
  ),
  // ——— hang, bars, bridge ———
  scapular_pull_ups: () => (
    <g>
      <line x1="25" y1="18" x2="135" y2="18" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* straight arms; only the shoulder blades pull down */}
      <Limb points="66,18 72,40" />
      <Limb points="94,18 88,40" />
      <Head x={80} y={31} />
      <Body points="80,38 80,72" />
      <Limb points="80,72 78,102" />
      <path d="M70,44 L76,52 M90,44 L84,52" fill="none" stroke={RED} strokeWidth="2.6" strokeLinecap="round" />
      <Arrow x1={114} y1={44} x2={114} y2={32} />
    </g>
  ),
  hanging_knee_raises: () => (
    <g>
      <line x1="25" y1="18" x2="135" y2="18" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <Limb points="66,18 72,40" />
      <Limb points="94,18 88,40" />
      <Head x={80} y={31} />
      <Body points="80,38 80,70" />
      <Limb points="80,70 102,68" color={RED} />
      <Limb points="102,68 102,88" />
      <path d="M118,94 Q126,80 118,66" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" />
      <polyline points="114,70 118,65 123,69" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  hanging_leg_raises: () => (
    <g>
      <line x1="25" y1="18" x2="135" y2="18" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <Limb points="66,18 72,40" />
      <Limb points="94,18 88,40" />
      <Head x={80} y={31} />
      <Body points="80,38 80,70" />
      <Limb points="80,70 122,68" color={RED} />
      <path d="M108,104 Q130,96 132,76" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" />
      <polyline points="128,80 132,75 136,80" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  l_sit_hold: () => (
    <g>
      {/* parallel bars */}
      <line x1="30" y1="62" x2="130" y2="62" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <line x1="44" y1="62" x2="44" y2="106" stroke="#D1D5DB" strokeWidth="2.5" />
      <line x1="116" y1="62" x2="116" y2="106" stroke="#D1D5DB" strokeWidth="2.5" />
      {/* straight arms, legs straight forward: the "L" */}
      <Limb points="76,42 76,62" />
      <Head x={80} y={28} />
      <Body points="80,35 80,72" />
      <Limb points="80,72 124,72" color={RED} />
      <circle cx="128" cy="30" r="9" fill="none" stroke={RED} strokeWidth="2" />
      <polyline points="128,24 128,30 132,33" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  split_stance_anti_rotation: () => (
    <g>
      <Floor y={100} />
      {/* band anchored to the side, arms pressed forward; trunk does not turn */}
      <line x1="28" y1="18" x2="28" y2="100" stroke={GEAR} strokeWidth="3" />
      <line x1="28" y1="52" x2="104" y2="52" stroke={RED} strokeWidth="2" strokeDasharray="4 3" />
      <Head x={84} y={22} />
      <Body points="84,29 84,64" color={RED} />
      <Limb points="84,40 96,48 104,52" />
      <Limb points="84,64 96,82 102,100" />
      <Limb points="84,64 70,82 60,100" />
      <circle cx="132" cy="30" r="9" fill="none" stroke={RED} strokeWidth="2" />
      <polyline points="132,24 132,30 136,33" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  glute_bridge_two_legs: () => (
    <g>
      <Floor />
      {/* both feet down, hips up: shoulders – hips – knees in one line */}
      <Head x={120} y={91} />
      <Body points="110,94 76,74" color={RED} />
      <Limb points="76,74 54,70 48,98" />
      <Limb points="108,96 132,97" />
      <Arrow x1={76} y1={96} x2={76} y2={82} />
    </g>
  ),
};
