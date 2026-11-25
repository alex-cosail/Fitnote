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
  // ——— pull-ups ———
  negative_pull_ups: () => (
    <g>
      <line x1="25" y1="30" x2="135" y2="30" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* start at the top, lower slowly */}
      <Head x={80} y={19} />
      <Limb points="64,30 60,46 74,42" color={RED} />
      <Limb points="96,30 100,46 86,42" color={RED} />
      <Body points="80,26 80,64" />
      <Limb points="80,64 76,98" />
      <Limb points="80,64 84,98" />
      <line x1="118" y1="38" x2="118" y2="70" stroke={RED} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
      <polyline points="113,65 118,71 123,65" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  band_assisted_pull_ups: () => (
    <g>
      <line x1="25" y1="18" x2="135" y2="18" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      <Limb points="62,18 58,36 70,40" />
      <Limb points="98,18 102,36 90,40" />
      <Head x={80} y={27} />
      <Body points="80,34 80,66" />
      {/* one foot in the band loop */}
      <Limb points="80,66 92,80 86,92" />
      <Limb points="80,66 78,100" />
      <path d="M74,18 Q62,70 86,94 Q96,60 86,18" fill="none" stroke={RED} strokeWidth="1.8" strokeDasharray="3.5 2.5" />
      <Arrow x1={118} y1={58} x2={118} y2={36} />
    </g>
  ),
  chin_ups: () => (
    <g>
      <line x1="25" y1="18" x2="135" y2="18" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* narrow underhand grip, biceps work */}
      <Limb points="72,18 64,32 74,40" color={RED} />
      <Limb points="88,18 96,32 86,40" color={RED} />
      <circle cx="72" cy="18" r="3" fill={RED} />
      <circle cx="88" cy="18" r="3" fill={RED} />
      <Head x={80} y={28} />
      <Body points="80,35 80,68" />
      <Limb points="80,68 76,102" />
      <Limb points="80,68 84,102" />
      <Arrow x1={116} y1={58} x2={116} y2={34} />
    </g>
  ),
  chest_to_bar_pull_ups: () => (
    <g>
      <line x1="25" y1="38" x2="135" y2="38" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* chest touches the bar, elbows drive down and back */}
      <Head x={82} y={24} />
      <Body points="80,31 80,66" />
      <circle cx="81" cy="38" r="3.2" fill={RED} />
      <Limb points="60,38 60,54 74,44" color={RED} />
      <Limb points="102,38 102,54 88,44" color={RED} />
      <Limb points="80,66 78,100" />
      <Limb points="80,66 86,100" />
      <Arrow x1={120} y1={74} x2={120} y2={50} />
    </g>
  ),
  archer_pull_ups: () => (
    <g>
      <line x1="25" y1="18" x2="135" y2="18" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />
      {/* pull to one hand, the other arm long along the bar */}
      <Limb points="108,18 112,34 98,40" color={RED} />
      <Limb points="88,38 44,18" />
      <Head x={96} y={30} />
      <Body points="93,37 90,70" />
      <Limb points="90,70 88,102" />
      <Arrow x1={128} y1={60} x2={128} y2={36} />
    </g>
  ),
  // ——— horizontal pulls ———
  prone_ywt_raises: () => (
    <g>
      <Floor />
      {/* face down, arms lift in a Y, then T, then W */}
      <Body points="36,94 100,94" />
      <Head x={108} y={91} />
      <Limb points="98,93 128,80" color={RED} />
      <Limb points="98,93 122,72" color={RED} />
      <text x="112" y="56" fontSize="13" fontWeight="700" fill={RED} fontFamily="Arial, sans-serif">Y·T·W</text>
    </g>
  ),
  suspension_row: () => (
    <g>
      <line x1="20" y1="105" x2="145" y2="105" stroke={FLOOR} strokeWidth="2" />
      <Straps ax={76} ay={8} hx={70} hy={40} />
      {/* leaning back, pull the chest to the handles */}
      <Head x={48} y={56} />
      <line x1="53" y1="60" x2="128" y2="103" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <Limb points="64,66 58,52 70,40" color={RED} />
      <Arrow x1={90} y1={62} x2={78} y2={46} />
    </g>
  ),
  feet_elevated_australian_pull_ups: () => (
    <g>
      <line x1="20" y1="105" x2="145" y2="105" stroke={FLOOR} strokeWidth="2" />
      <line x1="25" y1="36" x2="105" y2="36" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <line x1="35" y1="36" x2="35" y2="105" stroke="#D1D5DB" strokeWidth="2.2" />
      <Box x={114} y={68} w={28} h={37} />
      {/* body level, feet on the box */}
      <Head x={48} y={60} />
      <line x1="54" y1="63" x2="130" y2="68" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <Limb points="64,64 64,36" color={RED} />
      <circle cx="64" cy="36" r="3" fill={RED} />
      <Arrow x1={84} y1={58} x2={72} y2={44} />
    </g>
  ),
  suspension_single_arm_row: () => (
    <g>
      <line x1="20" y1="105" x2="145" y2="105" stroke={FLOOR} strokeWidth="2" />
      <Straps ax={76} ay={8} hx={70} hy={40} />
      {/* one hand on the handle, the other free; the trunk does not twist */}
      <Head x={48} y={56} />
      <line x1="53" y1="60" x2="128" y2="103" stroke={INK} strokeWidth="3.4" strokeLinecap="round" />
      <Limb points="64,66 58,52 70,40" color={RED} />
      <Limb points="62,66 74,84" />
      <Arrow x1={92} y1={62} x2={80} y2={46} />
    </g>
  ),
  seated_band_row: () => (
    <g>
      <Floor />
      {/* sitting, legs long, band around the feet, pull to the belly */}
      <Head x={98} y={52} />
      <Body points="98,59 98,94" />
      <Limb points="98,94 44,96" />
      <Limb points="98,66 112,74 92,76" color={RED} />
      <line x1="44" y1="92" x2="92" y2="76" stroke={RED} strokeWidth="1.8" strokeDasharray="3.5 2.5" />
      <Arrow x1={64} y1={60} x2={84} y2={60} />
    </g>
  ),
  single_arm_db_row: () => (
    <g>
      <Floor />
      <Box x={92} y={78} w={36} h={20} />
      {/* bent over, one hand on the bench, row the dumbbell to the hip */}
      <Head x={104} y={56} />
      <Body points="50,58 96,60" />
      <Limb points="94,60 102,78" />
      <Limb points="86,60 76,50 82,70" color={RED} />
      <rect x="76" y="70" width="12" height="6" rx="2" fill={GEAR} />
      <Limb points="50,58 46,98" />
      <Limb points="50,58 60,98" />
      <Arrow x1={66} y1={86} x2={66} y2={66} />
    </g>
  ),
  band_face_pull: () => (
    <g>
      <line x1="24" y1="18" x2="24" y2="104" stroke={GEAR} strokeWidth="3" strokeLinecap="round" />
      {/* band from high up, hands to the face, elbows high */}
      <line x1="24" y1="26" x2="94" y2="30" stroke={RED} strokeWidth="2" strokeDasharray="4 3" />
      <Head x={106} y={24} />
      <Body points="106,31 106,68" />
      <Limb points="106,38 118,28 96,30" color={RED} />
      <Limb points="106,68 98,86 96,104" />
      <Limb points="106,68 114,86 116,104" />
      <Arrow x1={72} y1={44} x2={90} y2={44} />
    </g>
  ),
  split_stance_explosive_band_row: () => (
    <g>
      <line x1="24" y1="28" x2="24" y2="104" stroke={GEAR} strokeWidth="3" strokeLinecap="round" />
      <line x1="24" y1="52" x2="90" y2="54" stroke={RED} strokeWidth="2.2" />
      {/* split stance, one arm, fast pull */}
      <Head x={102} y={26} />
      <Body points="102,33 102,68" />
      <Limb points="102,42 112,52 90,54" color={RED} />
      <Limb points="102,68 90,86 84,104" />
      <Limb points="102,68 116,86 124,104" />
      <Arrow x1={68} y1={38} x2={86} y2={38} />
      <Arrow x1={74} y1={30} x2={92} y2={30} />
    </g>
  ),
  // ——— legs: squat and lunge ———
  box_squats: () => (
    <g>
      <Floor y={104} />
      <Box x={98} y={78} w={30} h={26} />
      {/* sit back to the box, chest up */}
      <Limb points="72,104 72,76" />
      <Limb points="72,76 100,76" color={RED} />
      <Body points="100,76 88,44" />
      <Head x={85} y={36} />
      <Limb points="90,50 60,52" />
      <Arrow x1={52} y1={70} x2={52} y2={90} />
    </g>
  ),
  air_squats: () => (
    <g>
      <Floor y={104} />
      <Limb points="80,104 92,104" />
      <Limb points="80,104 91.6,90.2" />
      <Limb points="91.6,90.2 71.9,86.7" color={RED} />
      <Body points="71.9,86.7 91.4,58.8" />
      <Head x={96.6} y={51.5} />
      <Limb points="89.1,62.1 105.1,62.1 119.1,62.1" />
      <Arrow x1={138} y1={86} x2={138} y2={60} />
      <Arrow x1={138} y1={60} x2={138} y2={86} />
    </g>
  ),
  goblet_squat: () => (
    <g>
      <Floor y={104} />
      <Limb points="80,104 92,104" />
      <Limb points="80,104 91.6,90.2" />
      <Limb points="91.6,90.2 71.9,86.7" color={RED} />
      <Body points="71.9,86.7 91.4,58.8" />
      <Head x={96.6} y={51.5} />
      {/* the weight held at the chest */}
      <Limb points="89.1,62.1 100,70 103,62" />
      <rect x="99" y="52" width="10" height="12" rx="2" fill={GEAR} />
      <Arrow x1={138} y1={86} x2={138} y2={60} />
    </g>
  ),
  cossack_squat: () => (
    <g>
      <Floor y={104} />
      {/* front view: deep on one leg, the other long to the side, toes up */}
      <Limb points="70,82 54,84 52,104" color={RED} />
      <Limb points="70,82 124,100 126,94" />
      <Body points="70,82 66,50" />
      <Head x={65} y={42} />
      <Limb points="67,56 90,60" />
      <Arrow x1={112} y1={60} x2={88} y2={60} />
    </g>
  ),
  single_leg_bench_squat: () => (
    <g>
      <Floor y={104} />
      <Box x={22} y={80} w={30} h={24} />
      {/* one leg, sit down to the bench, the other leg straight forward */}
      <Limb points="56,78 82,78" color={RED} />
      <Limb points="82,78 80,104" />
      <Limb points="56,78 108,66" />
      <Body points="56,78 70,46" />
      <Head x={73} y={38} />
      <Limb points="68,52 98,50" />
      <Arrow x1={132} y1={92} x2={132} y2={70} />
    </g>
  ),
  bench_step_ups: () => (
    <g>
      <Floor y={104} />
      <Box x={84} y={76} w={40} h={28} />
      {/* step up on the box with the front leg */}
      <Head x={78} y={14} />
      <Body points="78,21 80,52" />
      <Limb points="80,52 96,62 98,76" color={RED} />
      <Limb points="80,52 70,78 64,104" />
      <Limb points="79,28 70,44" />
      <Arrow x1={136} y1={60} x2={136} y2={36} />
    </g>
  ),
  skater_squats: () => (
    <g>
      <Floor y={104} />
      {/* one leg, the back knee goes down behind, chest forward */}
      <Limb points="82,68 98,82 94,104" color={RED} />
      <Limb points="82,68 70,98 52,90" />
      <Body points="82,68 96,38" />
      <Head x={100} y={30} />
      <Limb points="94,44 124,48" />
      <Arrow x1={136} y1={70} x2={136} y2={92} />
    </g>
  ),
  suspension_pistol_squat: () => (
    <g>
      <Floor y={104} />
      <Straps ax={112} ay={8} hx={106} hy={50} />
      {/* pistol on one leg, hands on the straps for balance */}
      <Limb points="76,88 94,80 88,104" color={RED} />
      <Limb points="76,88 126,86" />
      <Body points="76,88 86,58" />
      <Head x={89} y={50} />
      <Limb points="85,62 106,50" />
      <Arrow x1={40} y1={92} x2={40} y2={66} />
    </g>
  ),
  split_squats: () => (
    <g>
      <Floor y={104} />
      {/* feet stay in place, the back knee goes straight down */}
      <Limb points="80,70 100,82 100,104" color={RED} />
      <Limb points="80,70 70,98 52,104" />
      <Body points="80,70 80,38" />
      <Head x={80} y={30} />
      <Limb points="80,44 92,58" />
      <Arrow x1={124} y1={60} x2={124} y2={84} />
      <Arrow x1={124} y1={84} x2={124} y2={60} />
    </g>
  ),
  side_lunges: () => (
    <g>
      <Floor y={104} />
      {/* front view: step to the side, sit on that leg, the other stays straight */}
      <Limb points="74,78 100,82 104,104" color={RED} />
      <Limb points="74,78 40,104" />
      <Body points="74,78 78,46" />
      <Head x={79} y={38} />
      <Limb points="77,54 92,62" />
      <Arrow x1={108} y1={60} x2={130} y2={60} />
    </g>
  ),
  // ——— hinge ———
  band_good_morning: () => (
    <g>
      <Floor y={104} />
      {/* band from under the feet to the back of the neck, hips back */}
      <Body points="70,58 110,58" />
      <Head x={118} y={55} />
      <Limb points="70,58 70,82" color={RED} />
      <Limb points="70,82 74,104" />
      <line x1="76" y1="104" x2="106" y2="58" stroke={RED} strokeWidth="1.8" strokeDasharray="3.5 2.5" />
      <path d="M126,84 Q134,70 124,44" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" />
      <polyline points="120,48 124,43 129,47" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  db_romanian_deadlift: () => (
    <g>
      <Floor y={104} />
      {/* hips back, back flat, dumbbells close to the legs */}
      <Body points="70,56 108,66" />
      <Head x={115} y={68} />
      <Limb points="70,56 72,80" color={RED} />
      <Limb points="72,80 74,104" />
      <Limb points="104,65 98,88" />
      <rect x="90" y="88" width="16" height="7" rx="2" fill={GEAR} />
      <Arrow x1={40} y1={92} x2={40} y2={64} />
    </g>
  ),
  single_leg_rdl: () => (
    <g>
      <Floor y={104} />
      {/* one leg: trunk and the free leg make one line */}
      <Body points="78,58 114,64" />
      <Head x={121} y={64} />
      <Limb points="78,58 80,82" color={RED} />
      <Limb points="80,82 82,104" />
      <Limb points="78,58 32,52" />
      <Limb points="110,63 110,84" />
      <Arrow x1={140} y1={94} x2={140} y2={72} />
    </g>
  ),
  nordic_curl_negatives: () => (
    <g>
      <Floor />
      {/* kneeling, ankles held, lean forward slowly; hamstrings brake */}
      <Limb points="40,98 18,98" />
      <line x1="12" y1="92" x2="26" y2="92" stroke={INK} strokeWidth="3.2" strokeLinecap="round" />
      <Body points="40,98 84,54" />
      <Body points="40,98 58,80" color={RED} />
      <Head x={89} y={48} />
      <Limb points="82,58 100,72" />
      <line x1="104" y1="40" x2="122" y2="62" stroke={RED} strokeWidth="2" strokeDasharray="3 3" strokeLinecap="round" />
      <polyline points="116,61 122,63 121,57" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
  // ——— vertical push ———
  scapular_wall_slides: () => (
    <g>
      <Floor y={104} />
      <line x1="40" y1="8" x2="40" y2="104" stroke={GEAR} strokeWidth="3" />
      {/* back to the wall, arms slide up the wall in a W → Y */}
      <Head x={50} y={22} />
      <Body points="50,29 50,68" />
      <Limb points="50,36 64,32 62,12" color={RED} />
      <Limb points="50,68 54,104" />
      <Arrow x1={80} y1={40} x2={80} y2={16} />
    </g>
  ),
  incline_pike_push_ups: () => (
    <g>
      <Floor y={104} />
      <Box x={96} y={78} w={32} h={26} />
      {/* hands on the box, hips high, head goes down between the hands */}
      <Limb points="40,104 70,44" />
      <Body points="70,44 98,66" />
      <Head x={106} y={70} />
      <Limb points="98,66 102,78" color={RED} />
      <Arrow x1={140} y1={62} x2={140} y2={40} />
    </g>
  ),
  band_overhead_press: () => (
    <g>
      <Floor y={104} />
      {/* standing on the band, press it overhead */}
      <Head x={80} y={24} />
      <Body points="80,31 80,66" />
      <Limb points="80,38 90,26 92,8" color={RED} />
      <Limb points="80,66 72,104" />
      <Limb points="80,66 88,104" />
      <line x1="84" y1="104" x2="92" y2="8" stroke={RED} strokeWidth="1.8" strokeDasharray="3.5 2.5" />
      <Arrow x1={118} y1={40} x2={118} y2={14} />
    </g>
  ),
  half_kneeling_db_press: () => (
    <g>
      <Floor />
      {/* half kneeling, one dumbbell pressed overhead, trunk tall */}
      <Limb points="76,70 98,72 98,98" />
      <Limb points="76,70 70,98 50,98" />
      <Head x={79} y={30} />
      <Body points="78,37 76,70" />
      <Limb points="78,44 86,30 88,14" color={RED} />
      <rect x="82" y="6" width="14" height="6" rx="2" fill={GEAR} />
      <Arrow x1={118} y1={40} x2={118} y2={16} />
    </g>
  ),
  elevated_pike_push_ups: () => (
    <g>
      <Floor y={104} />
      <Box x={18} y={70} w={28} h={34} />
      {/* feet on the box, hips high, head down towards the floor */}
      <Limb points="40,70 72,38" />
      <Body points="72,38 98,78" />
      <Head x={104} y={86} />
      <Limb points="98,78 100,104" color={RED} />
      <Arrow x1={136} y1={88} x2={136} y2={64} />
    </g>
  ),
  wall_handstand_hold: () => (
    <g>
      <Floor y={104} />
      <line x1="124" y1="8" x2="124" y2="104" stroke={GEAR} strokeWidth="3" />
      {/* handstand facing the wall, straight line from hands to feet */}
      <Limb points="100,104 102,80" color={RED} />
      <Head x={96} y={88} />
      <Body points="102,78 110,34" />
      <Limb points="110,34 118,12" />
      <circle cx="40" cy="30" r="9" fill="none" stroke={RED} strokeWidth="2" />
      <polyline points="40,24 40,30 44,33" fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>
  ),
};
