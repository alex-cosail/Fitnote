import React from 'react';
import type { RehabKey } from '../data/rehabKeys';
import { Dashed, Floor, Frames, Head, Line, Turn } from './warmupScenes';

// Step-0 scenes (v3.14): small, slow movements with support — the same
// style as the warm-up (black figure, red working part, frames or a joint
// that turns). With reduced motion only the key frame is shown.

const RED = '#DC2626';
const GEAR = '#9CA3AF';

const Bench = ({ x = 96, w = 44, y = 80 }: { x?: number; w?: number; y?: number }) => (
  <g stroke={GEAR} strokeWidth="2.4" strokeLinecap="round" fill="none">
    <line x1={x} y1={y} x2={x + w} y2={y} />
    <line x1={x + 4} y1={y} x2={x + 4} y2={104} />
    <line x1={x + w - 4} y1={y} x2={x + w - 4} y2={104} />
  </g>
);
const Post = ({ x = 120 }: { x?: number }) => <line x1={x} y1="34" x2={x} y2="104" stroke={GEAR} strokeWidth="3" strokeLinecap="round" />;
const Wall = ({ x = 126 }: { x?: number }) => <line x1={x} y1="10" x2={x} y2="104" stroke={GEAR} strokeWidth="3" strokeLinecap="round" />;
const Arrow = ({ d }: { d: string }) => <path d={d} fill="none" stroke={RED} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />;

// standing, front view
const FrontBody = () => (
  <>
    <Line p={[[80, 29], [80, 66]]} w={3.4} />
    <Line p={[[80, 66], [76, 85], [74, 104]]} />
    <Line p={[[80, 66], [84, 85], [86, 104]]} />
  </>
);
// standing, side view facing right, holding a post at x=112
const SideHoldingPost = ({ legs }: { legs?: React.ReactNode }) => (
  <>
    <Post x={112} />
    <Head x={80} y={20} />
    <Line p={[[80, 27], [80, 64]]} w={3.4} />
    <Line p={[[80, 34], [96, 44], [112, 50]]} />
    {legs ?? (
      <>
        <Line p={[[80, 64], [81, 84], [80, 104]]} />
        <Line p={[[80, 104], [90, 104]]} w={2.6} />
      </>
    )}
  </>
);
// seated on a bench (side view facing right)
const Seated = ({ arms }: { arms?: React.ReactNode }) => (
  <>
    <Bench x={52} w={40} y={78} />
    <Head x={66} y={30} />
    <Line p={[[66, 37], [66, 76]]} w={3.4} />
    <Line p={[[66, 76], [88, 76], [90, 104]]} />
    {arms}
  </>
);

export const REHAB_SCENES: Record<RehabKey, () => React.ReactElement> = {
  // ——— neck ———
  rh_neck_iso: () => (
    <g>
      <Floor />
      <FrontBody />
      <Line p={[[66, 40], [94, 40]]} w={2.8} />
      <Line p={[[94, 40], [96, 54], [96, 66]]} />
      <circle cx="80" cy="22" r="6.5" fill="none" stroke={RED} strokeWidth="2.8" />
      <Frames
        t={3}
        frames={[
          <>
            <Line p={[[66, 40], [60, 28], [74, 18]]} />
            <Arrow d="M86 16 L82 19" />
          </>,
          <>
            <Line p={[[66, 40], [58, 30], [70, 24]]} />
            <Arrow d="M64 28 L70 25" />
          </>,
        ]}
      />
    </g>
  ),
  rh_neck_turns: () => (
    <g>
      <Floor />
      <FrontBody />
      <Line p={[[66, 40], [94, 40]]} w={2.8} />
      <Line p={[[66, 40], [64, 54], [64, 66]]} />
      <Line p={[[94, 40], [96, 54], [96, 66]]} />
      <circle cx="80" cy="22" r="6.5" fill="none" stroke="#111827" strokeWidth="2.6" />
      <Dashed d="M66 8 Q80 2 94 8" />
      <Frames t={2.4} keyIndex={1} frames={[<Line p={[[80, 22], [72, 22]]} c={RED} w={2.6} />, <Line p={[[80, 22], [80, 22.5]]} c={RED} w={3} />, <Line p={[[80, 22], [88, 22]]} c={RED} w={2.6} />, <Line p={[[80, 22], [80, 22.5]]} c={RED} w={3} />]} />
    </g>
  ),
  rh_neck_tilts: () => (
    <g>
      <Floor />
      <Line p={[[80, 33], [80, 66]]} w={3.4} />
      <Line p={[[68, 40], [92, 40]]} w={2.8} />
      <Line p={[[68, 40], [66, 54], [66, 66]]} />
      <Line p={[[92, 40], [94, 54], [94, 66]]} />
      <Line p={[[80, 66], [76, 85], [74, 104]]} />
      <Line p={[[80, 66], [84, 85], [86, 104]]} />
      <Dashed d="M64 14 A18 18 0 0 0 96 14" />
      <Turn o={[80, 33]} swing={[-20, 20]} t={2}>
        <circle cx="80" cy="22" r="6.5" fill="none" stroke={RED} strokeWidth="2.8" />
        <Line p={[[80, 28.5], [80, 33]]} c={RED} w={2.6} />
      </Turn>
    </g>
  ),

  // ——— shoulder ———
  rh_shoulder_iso: () => (
    <g>
      <Floor />
      <Wall x={112} />
      <Head x={80} y={20} />
      <Line p={[[80, 27], [80, 64]]} w={3.4} />
      <Line p={[[80, 64], [81, 84], [80, 104]]} />
      <Line p={[[80, 34], [84, 52], [108, 52]]} c={RED} />
      <Frames t={2.4} frames={[<Arrow d="M100 46 L108 46 M104 42 L108 46 L104 50" />, <g />]} />
    </g>
  ),
  rh_pendulum: () => (
    <g>
      <Floor />
      <Bench x={92} w={44} y={70} />
      <Head x={108} y={40} />
      <Line p={[[60, 58], [100, 46]]} w={3.4} />
      <Line p={[[60, 58], [62, 80], [58, 104]]} />
      <Line p={[[60, 58], [70, 80], [72, 104]]} />
      <Line p={[[100, 46], [104, 58], [106, 70]]} />
      <Dashed d="M84 94 Q92 100 100 94" />
      <Turn o={[92, 49]} swing={[-18, 18]} t={1.8}>
        <Line p={[[92, 49], [92, 70], [92, 86]]} c={RED} />
      </Turn>
    </g>
  ),
  rh_wall_crawl: () => (
    <g>
      <Floor />
      <Wall x={112} />
      <Head x={92} y={22} />
      <Line p={[[90, 29], [88, 64]]} w={3.4} />
      <Line p={[[88, 64], [89, 84], [88, 104]]} />
      <Frames
        t={2.7}
        keyIndex={2}
        frames={[
          <Line p={[[90, 36], [102, 50], [110, 50]]} c={RED} />,
          <Line p={[[90, 36], [104, 34], [110, 28]]} c={RED} />,
          <Line p={[[90, 36], [102, 20], [110, 12]]} c={RED} />,
        ]}
      />
    </g>
  ),

  // ——— elbow, wrist ———
  rh_fist: () => (
    <g>
      <Bench x={30} w={100} y={74} />
      <Line p={[[40, 70], [96, 70]]} w={4} />
      <Frames t={2} frames={[<circle cx="106" cy="68" r="9" fill="none" stroke={RED} strokeWidth="2.8" />, <circle cx="104" cy="68" r="6" fill="none" stroke={RED} strokeWidth="3.2" />]} />
      <Arrow d="M122 56 L114 62 M122 80 L114 74" />
    </g>
  ),
  rh_wrist_circles: () => (
    <g>
      <Line p={[[36, 70], [96, 70]]} w={4} />
      <Dashed d="M96 52 A18 18 0 1 1 95.9 52" />
      <Turn o={[96, 70]} t={2.4}>
        <Line p={[[96, 70], [114, 70]]} c={RED} w={3.4} />
        <circle cx="116" cy="70" r="3" fill={RED} />
      </Turn>
    </g>
  ),
  rh_wall_pushup: () => (
    <g>
      <Floor />
      <Wall x={118} />
      <Frames
        t={2}
        keyIndex={1}
        frames={[
          <>
            <Line p={[[66, 104], [94, 34]]} w={3.4} />
            <Head x={98} y={26} />
            <Line p={[[94, 40], [104, 44], [116, 44]]} c={RED} />
          </>,
          <>
            <Line p={[[66, 104], [100, 36]]} w={3.4} />
            <Head x={105} y={29} />
            <Line p={[[100, 42], [100, 54], [116, 46]]} c={RED} />
          </>,
        ]}
      />
    </g>
  ),

  // ——— thoracic ———
  rh_breathing: () => (
    <g>
      <Seated arms={<Line p={[[66, 44], [76, 54], [70, 60]]} />} />
      <Frames t={4} frames={[<ellipse cx="66" cy="56" rx="9" ry="10" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="4 3" />, <ellipse cx="66" cy="56" rx="14" ry="12" fill="none" stroke={RED} strokeWidth="2" strokeDasharray="4 3" />]} />
    </g>
  ),
  rh_seated_twist: () => (
    <g>
      <Bench x={58} w={44} y={80} />
      <Head x={80} y={26} />
      <Line p={[[80, 33], [80, 76]]} w={3.4} />
      <Line p={[[80, 76], [70, 80], [70, 104]]} />
      <Line p={[[80, 76], [90, 80], [90, 104]]} />
      <Dashed d="M58 36 Q80 28 102 36" />
      <Frames
        t={2.4}
        frames={[
          <Line p={[[72, 42], [88, 46], [80, 52], [72, 42]]} c={RED} />,
          <Line p={[[88, 42], [72, 46], [80, 52], [88, 42]]} c={RED} />,
        ]}
      />
    </g>
  ),
  rh_standing_cat: () => (
    <g>
      <Floor />
      <Bench x={100} w={40} y={66} />
      <Line p={[[56, 72], [58, 88], [56, 104]]} />
      <Line p={[[56, 72], [64, 88], [66, 104]]} />
      <Line p={[[96, 52], [104, 60], [106, 66]]} />
      <Head x={104} y={46} />
      <Frames
        t={3}
        frames={[
          <path d="M56 72 Q76 46 96 52" fill="none" stroke={RED} strokeWidth="3.4" strokeLinecap="round" />,
          <path d="M56 72 Q76 66 96 52" fill="none" stroke={RED} strokeWidth="3.4" strokeLinecap="round" />,
        ]}
      />
    </g>
  ),

  // ——— lower back ———
  rh_brace: () => (
    <g>
      <Floor />
      <Post x={112} />
      <Head x={80} y={20} />
      <Line p={[[80, 34], [96, 44], [112, 48]]} />
      <Line p={[[80, 64], [81, 84], [80, 104]]} />
      <Frames
        t={3}
        frames={[
          <path d="M80 27 Q88 46 80 64" fill="none" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />,
          <>
            <path d="M80 27 Q82 46 80 64" fill="none" stroke={RED} strokeWidth="3.4" strokeLinecap="round" />
            <Arrow d="M96 52 L86 52 M90 48 L86 52 L90 56" />
          </>,
        ]}
      />
    </g>
  ),
  rh_pelvic_tilt: () => (
    <g>
      <Floor />
      <Wall x={62} />
      <Head x={70} y={22} />
      <Line p={[[69, 29], [68, 62]]} w={3.4} />
      <Line p={[[68, 34], [76, 50], [78, 62]]} />
      <Line p={[[68, 66], [80, 84], [76, 104]]} />
      <Frames
        t={2.4}
        frames={[
          <Line p={[[62, 60], [74, 70]]} c={RED} w={3.4} />,
          <>
            <Line p={[[64, 66], [74, 62]]} c={RED} w={3.4} />
            <Arrow d="M76 48 Q70 54 66 56" />
          </>,
        ]}
      />
    </g>
  ),
  rh_supported_hinge: () => (
    <g>
      <Floor />
      <Bench x={104} w={36} y={64} />
      <Frames
        t={2.4}
        keyIndex={1}
        frames={[
          <>
            <Head x={82} y={22} />
            <Line p={[[80, 29], [76, 64]]} w={3.4} />
            <Line p={[[78, 36], [92, 50], [106, 64]]} />
            <Line p={[[76, 64], [78, 84], [78, 104]]} />
          </>,
          <>
            <Head x={96} y={38} />
            <Line p={[[66, 62], [90, 42]]} w={3.4} />
            <Line p={[[88, 46], [98, 56], [106, 64]]} />
            <Line p={[[66, 62], [72, 84], [72, 104]]} c={RED} />
          </>,
        ]}
      />
    </g>
  ),

  // ——— hip ———
  rh_glute_squeeze: () => (
    <g>
      <SideHoldingPost />
      <Frames t={2.4} frames={[<path d="M74 58 Q68 66 76 72" fill="none" stroke={RED} strokeWidth="3" strokeLinecap="round" />, <path d="M76 58 Q72 66 78 72" fill="none" stroke={RED} strokeWidth="3.4" strokeLinecap="round" />]} />
    </g>
  ),
  rh_side_leg: () => (
    <g>
      <Floor />
      <Post x={52} />
      <Head x={80} y={22} />
      <Line p={[[80, 29], [80, 66]]} w={3.4} />
      <Line p={[[80, 38], [66, 46], [52, 46]]} />
      <Line p={[[80, 38], [94, 50], [96, 62]]} />
      <Line p={[[80, 66], [78, 85], [76, 104]]} />
      <Dashed d="M88 104 Q98 98 104 88" />
      <Turn o={[80, 66]} swing={[0, -26]} t={1.6}>
        <Line p={[[80, 66], [83, 85], [84, 104]]} c={RED} />
      </Turn>
    </g>
  ),
  rh_supported_split: () => (
    <g>
      <Floor />
      <Post x={112} />
      <Frames
        t={2.4}
        keyIndex={1}
        frames={[
          <>
            <Head x={80} y={20} />
            <Line p={[[80, 27], [80, 64]]} w={3.4} />
            <Line p={[[80, 34], [96, 44], [112, 50]]} />
            <Line p={[[80, 64], [90, 84], [92, 104]]} />
            <Line p={[[80, 64], [66, 84], [58, 102]]} />
          </>,
          <>
            <Head x={80} y={28} />
            <Line p={[[80, 35], [80, 72]]} w={3.4} />
            <Line p={[[80, 42], [96, 50], [112, 54]]} />
            <Line p={[[80, 72], [94, 80], [94, 104]]} c={RED} />
            <Line p={[[80, 72], [66, 90], [56, 102]]} />
          </>,
        ]}
      />
    </g>
  ),

  // ——— knee ———
  rh_quad_set: () => (
    <g>
      <Bench x={40} w={100} y={78} />
      <Head x={50} y={32} />
      <Line p={[[50, 39], [52, 74]]} w={3.4} />
      <Line p={[[50, 46], [62, 60], [70, 72]]} />
      <Frames
        t={2.4}
        keyIndex={1}
        frames={[
          <Line p={[[52, 74], [86, 70], [118, 74]]} c={RED} />,
          <>
            <Line p={[[52, 74], [86, 74], [118, 74]]} c={RED} w={3.6} />
            <Arrow d="M86 60 L86 68 M82 64 L86 68 L90 64" />
          </>,
        ]}
      />
    </g>
  ),
  rh_sit_to_stand: () => (
    <g>
      <Floor />
      <Bench x={40} w={40} y={76} />
      <Frames
        t={3}
        keyIndex={1}
        frames={[
          <>
            <Head x={66} y={30} />
            <Line p={[[64, 37], [62, 74]]} w={3.4} />
            <Line p={[[62, 74], [86, 74], [86, 104]]} />
            <Line p={[[64, 44], [78, 60], [84, 70]]} />
          </>,
          <>
            <Head x={84} y={18} />
            <Line p={[[83, 25], [82, 62]]} w={3.4} />
            <Line p={[[82, 62], [86, 84], [86, 104]]} c={RED} />
            <Line p={[[83, 32], [88, 48], [90, 60]]} />
          </>,
        ]}
      />
    </g>
  ),
  rh_mini_squat: () => (
    <g>
      <Floor />
      <Post x={116} />
      <Frames
        t={2.4}
        keyIndex={1}
        frames={[
          <>
            <Head x={80} y={18} />
            <Line p={[[80, 25], [80, 62]]} w={3.4} />
            <Line p={[[80, 32], [98, 42], [116, 46]]} />
            <Line p={[[80, 62], [82, 83], [80, 104]]} />
          </>,
          <>
            <Head x={82} y={28} />
            <Line p={[[78, 70], [82, 35]]} w={3.4} />
            <Line p={[[82, 42], [100, 50], [116, 52]]} />
            <Line p={[[78, 70], [94, 84], [86, 104]]} c={RED} />
          </>,
        ]}
      />
    </g>
  ),

  // ——— ankle ———
  rh_ankle_pumps: () => (
    <g>
      <Bench x={30} w={56} y={64} />
      <Head x={46} y={20} />
      <Line p={[[46, 27], [48, 60]]} w={3.4} />
      <Line p={[[48, 60], [80, 60], [96, 70]]} />
      <Dashed d="M104 56 Q114 68 104 80" />
      <Turn o={[96, 70]} swing={[-24, 24]} t={1.8}>
        <Line p={[[96, 70], [100, 56]]} c={RED} w={3} />
      </Turn>
    </g>
  ),
  rh_calf_raise: () => (
    <g>
      <Floor />
      <Post x={110} />
      <Frames
        t={2.4}
        keyIndex={1}
        frames={[
          <>
            <Head x={80} y={20} />
            <Line p={[[80, 27], [80, 64]]} w={3.4} />
            <Line p={[[80, 34], [96, 42], [110, 46]]} />
            <Line p={[[80, 64], [81, 84], [80, 104]]} />
            <Line p={[[80, 104], [92, 104]]} w={2.6} />
          </>,
          <>
            <Head x={80} y={14} />
            <Line p={[[80, 21], [80, 58]]} w={3.4} />
            <Line p={[[80, 28], [96, 38], [110, 42]]} />
            <Line p={[[80, 58], [81, 78], [82, 96]]} c={RED} />
            <Line p={[[82, 96], [90, 104]]} c={RED} w={2.6} />
          </>,
        ]}
      />
    </g>
  ),
  rh_balance: () => (
    <g>
      <Floor />
      <Post x={110} />
      <Head x={80} y={20} />
      <Line p={[[80, 27], [80, 64]]} w={3.4} />
      <Line p={[[80, 64], [80, 84], [80, 104]]} c={RED} />
      <Line p={[[80, 64], [94, 70], [94, 86]]} />
      <Line p={[[80, 34], [70, 50], [66, 60]]} />
      <Frames t={2} frames={[<Line p={[[80, 34], [96, 44], [109, 48]]} />, <Line p={[[80, 34], [96, 42], [109, 44]]} />]} />
    </g>
  ),
};
