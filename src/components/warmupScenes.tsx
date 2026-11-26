import React from 'react';
import type { WarmupKey } from '../data/warmupKeys';

// Animated warm-up scenes (v3.7, «минута = движение»). Same style as the
// exercise pictures (viewBox 160 × 120, black figure, red working part),
// moving by frames or by a rotation around a joint (docs/ANIMATION_TEMPLATE.md).
// With reduced motion only the key frame is shown (index.css, .wu-anim).

const INK = '#111827';
const RED = '#DC2626';
const FLOOR = '#E5E7EB';
const GEAR = '#9CA3AF';

type Pt = [number, number];
const pts = (p: Pt[]) => p.map((q) => q.join(',')).join(' ');

const Line = ({ p, c = INK, w = 3 }: { p: Pt[]; c?: string; w?: number }) => (
  <polyline points={pts(p)} fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
);
const Head = ({ x, y }: { x: number; y: number }) => <circle cx={x} cy={y} r="6.5" fill="none" stroke={INK} strokeWidth="2.6" />;
const Floor = () => <line x1="16" y1="104" x2="144" y2="104" stroke={FLOOR} strokeWidth="2" />;
const Dashed = ({ d }: { d: string }) => <path d={d} fill="none" stroke={RED} strokeWidth="2" strokeDasharray="4 3" strokeLinecap="round" />;

/** Frames shown one after another, a sharp change (steps). */
const Frames = ({ frames, t = 1.6, keyIndex = 0 }: { frames: React.ReactNode[]; t?: number; keyIndex?: number }) => {
  const n = frames.length;
  return (
    <>
      {frames.map((f, i) => (
        <g
          key={i}
          className={`fr${i === keyIndex ? ' key' : ''}`}
          style={{ animation: `wu-f${n} ${t}s steps(1, end) ${i === 0 ? 0 : (-(n - i) * t) / n}s infinite` }}
        >
          {f}
        </g>
      ))}
    </>
  );
};

/** A segment rotating around a joint: full circles or a swing between two angles. */
const Turn = ({ o, children, swing, t = 2 }: { o: Pt; children: React.ReactNode; swing?: [number, number]; t?: number }) => (
  <g
    className="spin"
    style={
      {
        transformBox: 'view-box',
        transformOrigin: `${o[0]}px ${o[1]}px`,
        animation: swing ? `wu-swing ${t}s ease-in-out infinite alternate` : `wu-spin ${t}s linear infinite`,
        '--a0': swing ? `${swing[0]}deg` : undefined,
        '--a1': swing ? `${swing[1]}deg` : undefined,
      } as React.CSSProperties
    }
  >
    {children}
  </g>
);

// Front view, standing, arms down.
const FrontLegs = () => (
  <>
    <Line p={[[80, 66], [76, 85], [74, 104]]} />
    <Line p={[[80, 66], [84, 85], [86, 104]]} />
  </>
);
const FrontTorso = () => (
  <>
    <Head x={80} y={22} />
    <Line p={[[80, 29], [80, 66]]} w={3.4} />
  </>
);
// Side view, standing, facing right.
const SideStand = ({ arms = true }: { arms?: boolean }) => (
  <>
    <Head x={80} y={18} />
    <Line p={[[80, 25], [80, 62]]} w={3.4} />
    <Line p={[[80, 62], [82, 83], [80, 104]]} />
    <Line p={[[80, 104], [91, 104]]} w={2.6} />
    {arms && <Line p={[[80, 32], [81, 47], [82, 60]]} />}
  </>
);

export const WARMUP_SCENES: Record<WarmupKey, () => React.ReactElement> = {
  wu_arm_circles: () => (
    <g>
      <Floor />
      <FrontTorso />
      <FrontLegs />
      <Line p={[[64, 40], [96, 40]]} w={2.8} />
      <circle cx="64" cy="40" r="22" fill="none" stroke={RED} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      <circle cx="96" cy="40" r="22" fill="none" stroke={RED} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.4" />
      <Turn o={[64, 40]}>
        <Line p={[[64, 40], [64, 18]]} c={RED} />
      </Turn>
      <Turn o={[96, 40]}>
        <Line p={[[96, 40], [96, 18]]} c={RED} />
      </Turn>
    </g>
  ),

  wu_hip_circles: () => {
    const frame = (hx: number, hy: number) => {
      const sx = 80 + (80 - hx) * 0.4;
      return (
        <>
          <Head x={sx} y={22} />
          <Line p={[[sx, 29], [hx, hy]]} w={3.4} />
          <Line p={[[sx - 10, 37], [sx + 10, 37]]} w={2.6} />
          <Line p={[[sx - 10, 37], [hx - 18, 50], [hx - 7, hy - 2]]} />
          <Line p={[[sx + 10, 37], [hx + 18, 50], [hx + 7, hy - 2]]} />
          <Line p={[[hx - 6, hy], [hx + 6, hy]]} c={RED} w={3.4} />
          <Line p={[[hx - 4, hy], [(hx + 66) / 2 - 2, 85], [68, 104]]} />
          <Line p={[[hx + 4, hy], [(hx + 92) / 2 + 2, 85], [92, 104]]} />
        </>
      );
    };
    return (
      <g>
        <Floor />
        <ellipse cx="80" cy="66" rx="16" ry="5" fill="none" stroke={RED} strokeWidth="1.8" strokeDasharray="4 3" opacity="0.7" />
        <Frames t={2.4} keyIndex={1} frames={[frame(72, 66), frame(80, 63), frame(88, 66), frame(80, 69)]} />
      </g>
    );
  },

  wu_knee_ankle: () => {
    const frame = (kx: number) => (
      <>
        <Head x={96} y={36} />
        <Line p={[[72, 68], [89, 43]]} w={3.4} />
        <Line p={[[72, 68], [kx, 84], [79, 103]]} />
        <Line p={[[kx, 84], [79, 103]]} c={RED} />
        <Line p={[[79, 103], [90, 104]]} w={2.6} />
        <Line p={[[89, 45], [(89 + kx) / 2 + 3, 64], [kx + 1, 80]]} />
      </>
    );
    return (
      <g>
        <Floor />
        <ellipse cx="90" cy="85" rx="8" ry="3" fill="none" stroke={RED} strokeWidth="1.8" strokeDasharray="3 3" />
        <Frames t={2.4} frames={[frame(90), frame(95), frame(90), frame(85)]} />
      </g>
    );
  },

  wu_neck: () => (
    <g>
      <Floor />
      <Line p={[[80, 33], [80, 66]]} w={3.4} />
      <Line p={[[68, 40], [92, 40]]} w={2.8} />
      <Line p={[[68, 40], [66, 54], [66, 66]]} />
      <Line p={[[92, 40], [94, 54], [94, 66]]} />
      <FrontLegs />
      <Dashed d="M64,12 A18,18 0 0,1 96,12" />
      <Turn o={[80, 33]} swing={[-24, 24]} t={1.4}>
        <circle cx="80" cy="22" r="6.5" fill="none" stroke={RED} strokeWidth="2.8" />
        <Line p={[[80, 28.5], [80, 33]]} c={RED} w={2.6} />
      </Turn>
    </g>
  ),

  wu_torso_twist: () => {
    const frame = (s: 1 | -1) => (
      <>
        <Line p={[[80 - 6 * s, 38], [80 + 6 * s, 38]]} w={2.8} />
        <Line p={[[80 + 6 * s, 38], [80 + 20 * s, 46], [80 + 34 * s, 44]]} c={RED} />
        <Line p={[[80 - 6 * s, 38], [80 + 6 * s, 50], [80 + 26 * s, 52]]} c={RED} />
      </>
    );
    return (
      <g>
        <Floor />
        <FrontTorso />
        <FrontLegs />
        <Dashed d="M52,30 Q80,20 108,30" />
        <Frames t={1.8} frames={[frame(1), frame(-1)]} />
      </g>
    );
  },

  wu_jacks: () => (
    <g>
      <Floor />
      <FrontTorso />
      <Frames
        keyIndex={1}
        t={1.2}
        frames={[
          <>
            <Line p={[[80, 36], [72, 51], [70, 65]]} />
            <Line p={[[80, 36], [88, 51], [90, 65]]} />
            <FrontLegs />
          </>,
          <>
            <Line p={[[80, 36], [64, 24], [56, 10]]} c={RED} />
            <Line p={[[80, 36], [96, 24], [104, 10]]} c={RED} />
            <Line p={[[80, 66], [68, 85], [58, 103]]} />
            <Line p={[[80, 66], [92, 85], [102, 103]]} />
          </>,
        ]}
      />
    </g>
  ),

  wu_high_knees: () => {
    const frame = (near: boolean) => (
      <>
        <Head x={80} y={20} />
        <Line p={[[80, 27], [79, 64]]} w={3.4} />
        <Line p={[[79, 64], [99, 63], [99, 83]]} c={RED} />
        <Line p={[[79, 64], [77, 84], [77, 104]]} />
        <Line p={[[77, 104], [88, 104]]} w={2.6} />
        <Line p={near ? [[80, 34], [72, 46], [76, 56]] : [[80, 34], [90, 44], [98, 38]]} />
        <Line p={near ? [[80, 34], [90, 44], [98, 38]] : [[80, 34], [72, 46], [76, 56]]} />
      </>
    );
    return (
      <g>
        <Floor />
        <Frames t={1} frames={[frame(true), frame(false)]} />
      </g>
    );
  },

  wu_squat_reach: () => (
    <g>
      <Floor />
      <Frames
        t={2.4}
        keyIndex={1}
        frames={[
          <SideStand />,
          <>
            <Head x={88} y={44} />
            <Line p={[[66, 80], [82, 51]]} w={3.4} />
            <Line p={[[66, 80], [88, 79]]} c={RED} />
            <Line p={[[88, 79], [82, 104]]} />
            <Line p={[[82, 104], [93, 104]]} w={2.6} />
            <Line p={[[82, 56], [98, 56], [112, 54]]} />
          </>,
          <>
            <SideStand arms={false} />
            <Line p={[[80, 31], [83, 17], [85, 4]]} c={RED} />
          </>,
        ]}
      />
    </g>
  ),

  wu_lunge_reach: () => (
    <g>
      <Floor />
      <Frames
        t={2}
        keyIndex={1}
        frames={[
          <SideStand />,
          <>
            <Head x={77} y={30} />
            <Line p={[[74, 72], [76, 37]]} w={3.4} />
            <Line p={[[74, 72], [96, 74]]} c={RED} />
            <Line p={[[96, 74], [98, 104]]} />
            <Line p={[[98, 104], [108, 104]]} w={2.6} />
            <Line p={[[74, 72], [62, 90], [45, 101]]} />
            <Line p={[[76, 42], [73, 25], [71, 9]]} c={RED} />
          </>,
        ]}
      />
    </g>
  ),

  wu_hinge: () => (
    <g>
      <Floor />
      <Frames
        t={2.4}
        keyIndex={1}
        frames={[
          <SideStand />,
          <>
            <Head x={108} y={49} />
            <Line p={[[64, 62], [100, 52]]} w={3.4} />
            <Line p={[[64, 62], [72, 83], [72, 104]]} c={RED} />
            <Line p={[[72, 104], [83, 104]]} w={2.6} />
            <Line p={[[98, 54], [98, 68], [98, 80]]} />
          </>,
        ]}
      />
    </g>
  ),

  wu_leg_swing: () => (
    <g>
      <Floor />
      <line x1="52" y1="22" x2="52" y2="104" stroke={GEAR} strokeWidth="3" strokeLinecap="round" />
      <Head x={76} y={20} />
      <Line p={[[76, 27], [76, 64]]} w={3.4} />
      <Line p={[[76, 64], [75, 84], [74, 104]]} />
      <Line p={[[74, 104], [85, 104]]} w={2.6} />
      <Line p={[[76, 34], [64, 42], [54, 40]]} />
      <Line p={[[76, 34], [86, 46], [88, 58]]} />
      <Dashed d="M58,92 A30,30 0 0,0 108,84" />
      <Turn o={[76, 64]} swing={[28, -50]} t={1.2}>
        <Line p={[[76, 64], [77, 84], [76, 103]]} c={RED} />
      </Turn>
    </g>
  ),

  wu_incline_pushup: () => (
    <g>
      <Floor />
      <rect x="114" y="70" width="30" height="34" rx="2" fill="none" stroke={GEAR} strokeWidth="2" />
      <Frames
        t={2}
        keyIndex={1}
        frames={[
          <>
            <Line p={[[28, 104], [104, 55]]} w={3.4} />
            <Head x={110} y={49} />
            <Line p={[[104, 56], [111, 63], [118, 70]]} c={RED} />
          </>,
          <>
            <Line p={[[28, 104], [107, 63]]} w={3.4} />
            <Head x={114} y={57} />
            <Line p={[[107, 64], [105, 73], [118, 70]]} c={RED} />
          </>,
        ]}
      />
    </g>
  ),

  wu_pull_apart: () => (
    <g>
      <Floor />
      <FrontTorso />
      <FrontLegs />
      <Line p={[[70, 38], [90, 38]]} w={2.8} />
      <Frames
        t={1.6}
        keyIndex={1}
        frames={[
          <>
            <Line p={[[70, 38], [76, 46]]} />
            <Line p={[[90, 38], [84, 46]]} />
            <Line p={[[76, 46], [84, 46]]} c={RED} w={2.4} />
          </>,
          <>
            <Line p={[[70, 38], [46, 40]]} c={RED} />
            <Line p={[[90, 38], [114, 40]]} c={RED} />
            <line x1="46" y1="40" x2="114" y2="40" stroke={RED} strokeWidth="1.6" strokeDasharray="3 3" />
            <Line p={[[38, 52], [28, 52]]} c={RED} w={2} />
            <Line p={[[122, 52], [132, 52]]} c={RED} w={2} />
          </>,
        ]}
      />
    </g>
  ),

  wu_cross_crunch: () => {
    const frame = (s: 1 | -1) => {
      const x = (v: number) => 80 + (v - 80) * s;
      return (
        <>
          <Head x={80} y={24} />
          <Line p={[[80, 31], [80, 66]]} w={3.4} />
          <Line p={[[x(72), 38], [x(88), 38]]} w={2.6} />
          <Line p={[[80, 66], [x(84), 85], [x(84), 104]]} />
          <Line p={[[80, 66], [x(70), 58], [x(72), 80]]} c={RED} />
          <Line p={[[x(88), 38], [x(82), 50], [x(73), 55]]} c={RED} />
          <Line p={[[x(72), 38], [x(62), 30], [x(66), 20]]} />
        </>
      );
    };
    return (
      <g>
        <Floor />
        <Frames t={1.6} frames={[frame(1), frame(-1)]} />
      </g>
    );
  },

  wu_inchworm: () => (
    <g>
      <Floor />
      <Frames
        t={2.7}
        keyIndex={2}
        frames={[
          <SideStand />,
          <>
            <Line p={[[76, 60], [80, 82], [80, 104]]} />
            <Line p={[[80, 104], [90, 104]]} w={2.6} />
            <Line p={[[76, 60], [90, 86]]} w={3.4} />
            <Head x={95} y={93} />
            <Line p={[[89, 84], [96, 94], [100, 104]]} />
          </>,
          <>
            <Line p={[[36, 104], [110, 84]]} c={RED} w={3.4} />
            <Head x={118} y={80} />
            <Line p={[[110, 84], [110, 94], [110, 104]]} />
          </>,
        ]}
      />
    </g>
  ),
};
