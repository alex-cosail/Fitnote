import React from 'react';
import type { Care, JointLevel } from '../../domain/care/care';
import { JOINT_NAMES, LEVEL_INFO } from '../../domain/care/care';
import type { Joint } from '../../domain/catalog/joints';

// The body as a simple flat skeleton (care brief §0): joints are numbered
// colored circles (gray = free), movements are arrows. The drawing and the
// circle positions live only here, so a designer can redraw it later (for
// example in isometry) without touching the engine.

const SPOTS: { joint: Joint; x: number; y: number }[] = [
  { joint: 'neck', x: 100, y: 44 },
  { joint: 'shoulder', x: 72, y: 60 },
  { joint: 'shoulder', x: 128, y: 60 },
  { joint: 'thoracic', x: 100, y: 76 },
  { joint: 'elbow_wrist', x: 60, y: 100 },
  { joint: 'elbow_wrist', x: 140, y: 100 },
  { joint: 'lower_back', x: 100, y: 112 },
  { joint: 'hip', x: 85, y: 134 },
  { joint: 'hip', x: 115, y: 134 },
  { joint: 'knee', x: 88, y: 182 },
  { joint: 'knee', x: 112, y: 182 },
  { joint: 'ankle', x: 89, y: 228 },
  { joint: 'ankle', x: 111, y: 228 },
];

const BONE = '#B4B2A9';
const ARROW = '#534AB7';

export const BodySkeleton: React.FC<{
  care: Care[];
  onJoint: (joint: Joint) => void;
  className?: string;
}> = ({ care, onJoint, className = 'h-72 w-full' }) => {
  const levelOf = new Map<Joint, JointLevel>(care.map((c) => [c.joint, c.level]));
  return (
    <svg viewBox="0 0 200 250" className={className} role="group" aria-label="Скелет: суставы и движения">
      <defs>
        <marker id="sk-ar" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
          <path d="M2 1L8 5L2 9" fill="none" stroke={ARROW} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </marker>
      </defs>
      {/* bones */}
      <g fill="none" stroke={BONE} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="100" cy="22" r="13" />
        <path d="M100 35 L100 120" />
        <path d="M72 60 L128 60" />
        <path d="M72 60 L60 100 L54 132" />
        <path d="M128 60 L140 100 L146 132" />
        <path d="M85 128 L115 128" />
        <path d="M88 130 L88 182 L89 228 L80 236" />
        <path d="M112 130 L112 182 L111 228 L120 236" />
      </g>
      {/* movements */}
      <g fill="none" stroke={ARROW} strokeWidth="1.6" opacity="0.75">
        <path d="M36 66 L36 40" markerEnd="url(#sk-ar)" />
        <path d="M150 76 L176 76" markerStart="url(#sk-ar)" markerEnd="url(#sk-ar)" />
        <path d="M60 170 L60 200" markerStart="url(#sk-ar)" markerEnd="url(#sk-ar)" />
        <path d="M150 116 Q166 128 150 142" markerEnd="url(#sk-ar)" />
      </g>
      {/* joints */}
      {SPOTS.map((s, i) => {
        const lv = levelOf.get(s.joint);
        const info = lv === undefined ? undefined : LEVEL_INFO[lv];
        return (
          <g
            key={i}
            role="button"
            tabIndex={0}
            aria-label={`${JOINT_NAMES[s.joint].name}: ${info ? `уровень ${lv}, ${info.name}` : 'свободно'}`}
            onClick={() => onJoint(s.joint)}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onJoint(s.joint)}
            style={{ cursor: 'pointer' }}
          >
            <circle cx={s.x} cy={s.y} r="12" fill="transparent" />
            <circle cx={s.x} cy={s.y} r="8.5" fill={info ? info.fill : '#F1EFE8'} stroke={info ? info.ring : BONE} strokeWidth="1.5" />
            {info && (
              <text x={s.x} y={s.y} textAnchor="middle" dominantBaseline="central" fontSize="10" fontWeight="700" fill={info.text}>
                {lv}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};
