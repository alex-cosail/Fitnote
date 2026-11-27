import React from 'react';
import { SvgKey } from '../types';
import { EXERCISE_SCENES } from './exerciseScenes';
import { WARMUP_SCENES } from './warmupScenes';
import { REHAB_SCENES } from './rehabScenes';

interface ExerciseSvgProps {
  svgKey: SvgKey;
  className?: string;
}

/**
 * Minimalist black-and-red architectural vector diagrams (#111827 + #DC2626)
 * Designed for high-contrast outdoor sunlight legibility.
 */
export const ExerciseSvg: React.FC<ExerciseSvgProps> = ({
  svgKey,
  className = 'w-32 h-24',
}) => {
  const renderScene = () => {
    const scene = (EXERCISE_SCENES as Record<string, () => React.ReactElement>)[svgKey];
    if (scene) return scene();
    const warm = (WARMUP_SCENES as Record<string, () => React.ReactElement>)[svgKey];
    if (warm) return warm();
    const rehab = (REHAB_SCENES as Record<string, () => React.ReactElement>)[svgKey];
    if (rehab) return rehab();
    switch (svgKey) {
      case 'pullups':
        return (
          <g>
            {/* Pull-up bar */}
            <line x1="25" y1="18" x2="135" y2="18" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="35" y1="18" x2="35" y2="108" stroke="#E5E7EB" strokeWidth="2" />
            <line x1="125" y1="18" x2="125" y2="108" stroke="#E5E7EB" strokeWidth="2" />
            {/* Hands on bar */}
            <circle cx="62" cy="18" r="3" fill="#DC2626" />
            <circle cx="98" cy="18" r="3" fill="#DC2626" />
            {/* Arms */}
            <polyline points="62,18 58,36 70,40" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="98,18 102,36 90,40" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Head */}
            <circle cx="80" cy="27" r="7" fill="none" stroke="#111827" strokeWidth="2.8" />
            {/* Torso */}
            <line x1="80" y1="34" x2="80" y2="68" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
            {/* Lats accent */}
            <path d="M70,40 Q74,52 80,58 M90,40 Q86,52 80,58" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
            {/* Legs */}
            <polyline points="80,68 74,88 76,104" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="80,68 86,88 84,104" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Upward motion arrow */}
            <line x1="115" y1="58" x2="115" y2="34" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
            <polyline points="110,40 115,33 120,40" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'dips':
        return (
          <g>
            {/* Parallel bars */}
            <line x1="30" y1="58" x2="130" y2="58" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
            <line x1="45" y1="58" x2="45" y2="108" stroke="#D1D5DB" strokeWidth="2.5" />
            <line x1="115" y1="58" x2="115" y2="108" stroke="#D1D5DB" strokeWidth="2.5" />
            {/* Hands on bar */}
            <circle cx="72" cy="58" r="3" fill="#DC2626" />
            {/* Bent arms in dip */}
            <polyline points="72,58 64,46 76,34" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Head */}
            <circle cx="84" cy="24" r="6.5" fill="none" stroke="#111827" strokeWidth="2.8" />
            {/* Torso angled slightly forward */}
            <line x1="79" y1="30" x2="74" y2="66" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
            {/* Chest/Triceps highlight */}
            <line x1="76" y1="34" x2="64" y2="46" stroke="#DC2626" strokeWidth="2.4" strokeLinecap="round" />
            {/* Legs tucked */}
            <polyline points="74,66 78,86 70,100" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Vertical travel arrow */}
            <line x1="106" y1="48" x2="106" y2="24" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
            <polyline points="101,30 106,23 111,30" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'australian_pullups':
        return (
          <g>
            {/* Low bar */}
            <line x1="25" y1="36" x2="105" y2="36" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="35" y1="36" x2="35" y2="105" stroke="#D1D5DB" strokeWidth="2.2" />
            {/* Ground */}
            <line x1="20" y1="105" x2="145" y2="105" stroke="#E5E7EB" strokeWidth="2" />
            {/* Body inclined */}
            <circle cx="48" cy="56" r="6" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="53" y1="60" x2="128" y2="103" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            {/* Arms pulling to bar */}
            <line x1="64" y1="66" x2="64" y2="36" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="64" cy="36" r="3" fill="#DC2626" />
            {/* Pull direction arrow */}
            <line x1="82" y1="58" x2="72" y2="43" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="70,49 71,42 78,44" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'pushups':
        return (
          <g>
            {/* Floor */}
            <line x1="18" y1="98" x2="142" y2="98" stroke="#E5E7EB" strokeWidth="2" />
            {/* Head */}
            <circle cx="118" cy="60" r="6" fill="none" stroke="#111827" strokeWidth="2.6" />
            {/* Plank line */}
            <line x1="30" y1="95" x2="112" y2="66" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            {/* Arms */}
            <polyline points="104,69 108,84 106,98" fill="none" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Vertical press arrow */}
            <line x1="128" y1="86" x2="128" y2="68" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="124,73 128,67 132,73" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'bulgarian_split_squat':
        return (
          <g>
            {/* Floor + Bench */}
            <line x1="18" y1="104" x2="142" y2="104" stroke="#E5E7EB" strokeWidth="2" />
            <rect x="24" y="76" width="26" height="28" rx="2" fill="none" stroke="#9CA3AF" strokeWidth="2" />
            {/* Head & torso */}
            <circle cx="88" cy="24" r="6.5" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="88" y1="31" x2="84" y2="64" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            {/* Front leg (red quad accent) */}
            <polyline points="84,64 110,74 106,104" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Back leg on bench */}
            <polyline points="84,64 62,80 44,76" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Down/Up arrow */}
            <line x1="126" y1="45" x2="126" y2="70" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="122,65 126,71 130,65" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'glute_bridge':
        return (
          <g>
            {/* Floor */}
            <line x1="16" y1="98" x2="144" y2="98" stroke="#E5E7EB" strokeWidth="2" />
            {/* Head on floor */}
            <circle cx="34" cy="90" r="5.5" fill="none" stroke="#111827" strokeWidth="2.6" />
            {/* Shoulders to hips bridge */}
            <line x1="42" y1="94" x2="86" y2="62" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            {/* Glute hinge accent */}
            <circle cx="86" cy="62" r="4" fill="#DC2626" />
            {/* Support leg */}
            <polyline points="86,62 104,70 108,98" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Raised single leg */}
            <line x1="86" y1="62" x2="124" y2="34" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
            {/* Hip drive arrow */}
            <line x1="86" y1="50" x2="86" y2="32" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="82,37 86,31 90,37" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'side_plank':
        return (
          <g>
            {/* Floor */}
            <line x1="16" y1="96" x2="144" y2="96" stroke="#E5E7EB" strokeWidth="2" />
            {/* Support forearm */}
            <polyline points="48,66 44,94 60,94" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Head */}
            <circle cx="38" cy="54" r="6" fill="none" stroke="#111827" strokeWidth="2.6" />
            {/* Straight body diagonal */}
            <line x1="44" y1="60" x2="126" y2="95" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            {/* Oblique highlight */}
            <line x1="66" y1="70" x2="96" y2="83" stroke="#DC2626" strokeWidth="3.4" strokeLinecap="round" />
            {/* Top arm up */}
            <line x1="54" y1="63" x2="54" y2="34" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );

      case 'dead_hang':
        return (
          <g>
            {/* High bar */}
            <line x1="30" y1="16" x2="130" y2="16" stroke="#111827" strokeWidth="3.5" strokeLinecap="round" />
            {/* Straight arms */}
            <line x1="66" y1="16" x2="72" y2="42" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="94" y1="16" x2="88" y2="42" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="66" cy="16" r="3" fill="#DC2626" />
            <circle cx="94" cy="16" r="3" fill="#DC2626" />
            {/* Head */}
            <circle cx="80" cy="36" r="6" fill="none" stroke="#111827" strokeWidth="2.6" />
            {/* Relaxed spine / decompression line */}
            <line x1="80" y1="43" x2="80" y2="76" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
            {/* Legs */}
            <line x1="77" y1="76" x2="77" y2="108" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="83" y1="76" x2="83" y2="108" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            {/* Decompression downward arrow */}
            <line x1="112" y1="54" x2="112" y2="80" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="108,75 112,81 116,75" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'pallof_press':
        return (
          <g>
            {/* Anchor post + band */}
            <line x1="26" y1="20" x2="26" y2="104" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
            <line x1="26" y1="54" x2="108" y2="54" stroke="#DC2626" strokeWidth="2.2" strokeDasharray="4 3" />
            {/* Standing athlete */}
            <circle cx="78" cy="26" r="6.5" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="78" y1="33" x2="78" y2="68" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            {/* Extended arms */}
            <line x1="78" y1="46" x2="112" y2="54" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <circle cx="112" cy="54" r="3" fill="#DC2626" />
            {/* Legs athletic stance */}
            <polyline points="78,68 68,86 66,104" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="78,68 88,86 90,104" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Press arrow */}
            <line x1="118" y1="54" x2="136" y2="54" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="131,50 137,54 131,58" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'romanian_deadlift':
        return (
          <g>
            {/* Floor */}
            <line x1="20" y1="104" x2="140" y2="104" stroke="#E5E7EB" strokeWidth="2" />
            {/* Legs slightly bent */}
            <polyline points="62,64 68,84 66,104" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Hip hinge */}
            <circle cx="62" cy="64" r="3.5" fill="#DC2626" />
            {/* Flat hinged torso */}
            <line x1="62" y1="64" x2="102" y2="48" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="110" cy="44" r="6" fill="none" stroke="#111827" strokeWidth="2.6" />
            {/* Arms + weight */}
            <line x1="94" y1="51" x2="94" y2="84" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="86" y="84" width="16" height="6" rx="2" fill="#DC2626" />
            {/* Hamstring hinge arc */}
            <path d="M52,58 Q46,66 52,74" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
          </g>
        );

      case 'band_row':
        return (
          <g>
            {/* Anchor */}
            <line x1="24" y1="28" x2="24" y2="104" stroke="#9CA3AF" strokeWidth="3" strokeLinecap="round" />
            <line x1="24" y1="52" x2="88" y2="54" stroke="#DC2626" strokeWidth="2.2" />
            {/* Athlete standing */}
            <circle cx="104" cy="26" r="6.5" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="104" y1="33" x2="104" y2="68" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            <polyline points="104,42 94,54 88,54" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="104,68 96,86 94,104" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="104,68 112,86 114,104" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Pull back arrow */}
            <line x1="78" y1="40" x2="96" y2="40" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="91,36 97,40 91,44" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'reverse_lunges':
        return (
          <g>
            <line x1="18" y1="104" x2="142" y2="104" stroke="#E5E7EB" strokeWidth="2" />
            <circle cx="84" cy="24" r="6.5" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="84" y1="31" x2="84" y2="66" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            {/* Front leg */}
            <polyline points="84,66 108,74 108,104" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Back lunge leg */}
            <polyline points="84,66 64,92 44,104" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Step back arrow */}
            <line x1="68" y1="76" x2="50" y2="76" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="55,72 49,76 55,80" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'pike_pushups':
        return (
          <g>
            <line x1="16" y1="102" x2="144" y2="102" stroke="#E5E7EB" strokeWidth="2" />
            {/* Pike V-shape */}
            <line x1="42" y1="102" x2="78" y2="34" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="78" y1="34" x2="106" y2="72" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            {/* Arms + shoulders */}
            <polyline points="106,72 114,88 112,102" fill="none" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="116" cy="72" r="5.5" fill="none" stroke="#111827" strokeWidth="2.5" />
            {/* Press arrow */}
            <line x1="128" y1="88" x2="128" y2="66" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="124,71 128,65 132,71" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'warmup_neck_thoracic':
        return (
          <g>
            {/* Joint Rotations: shoulders, thoracic & hip circles */}
            <circle cx="80" cy="24" r="6.5" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="80" y1="31" x2="80" y2="68" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="54" y1="44" x2="106" y2="44" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" />
            <polyline points="80,68 70,100" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <polyline points="80,68 90,100" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            {/* Thoracic / shoulder rotation arc */}
            <path d="M56,28 A26,12 0 0,1 104,28" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
            <polyline points="100,23 105,28 99,32" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            {/* Hip circle arc */}
            <ellipse cx="80" cy="68" rx="18" ry="6" fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="4 3" />
          </g>
        );

      case 'warmup_jumping_jacks':
        return (
          <g>
            <line x1="22" y1="104" x2="138" y2="104" stroke="#E5E7EB" strokeWidth="2" />
            <circle cx="80" cy="26" r="6.5" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="80" y1="33" x2="80" y2="68" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            {/* Raised arms */}
            <line x1="80" y1="42" x2="54" y2="22" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="80" y1="42" x2="106" y2="22" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            {/* Wide legs */}
            <line x1="80" y1="68" x2="58" y2="102" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="80" y1="68" x2="102" y2="102" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            {/* Dynamic motion arcs */}
            <path d="M44,44 Q42,30 50,20" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M116,44 Q118,30 110,20" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
            <circle cx="54" cy="22" r="2.8" fill="#DC2626" />
            <circle cx="106" cy="22" r="2.8" fill="#DC2626" />
          </g>
        );

      case 'warmup_lunge_reach':
        return (
          <g>
            <line x1="16" y1="104" x2="144" y2="104" stroke="#E5E7EB" strokeWidth="2" />
            {/* Front bent leg */}
            <polyline points="74,70 104,74 106,104" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Back lunge leg */}
            <polyline points="74,70 48,88 38,104" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Torso + head */}
            <line x1="74" y1="70" x2="78" y2="38" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="80" cy="30" r="6" fill="none" stroke="#111827" strokeWidth="2.5" />
            {/* Overhead reach arms */}
            <line x1="78" y1="42" x2="68" y2="14" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="78" y1="42" x2="84" y2="16" stroke="#DC2626" strokeWidth="2.6" strokeLinecap="round" />
            {/* Upward arrow */}
            <line x1="112" y1="46" x2="112" y2="20" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="108,25 112,19 116,25" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'warmup_primer':
        return (
          <g>
            <line x1="20" y1="102" x2="140" y2="102" stroke="#E5E7EB" strokeWidth="2" />
            {/* Light athletic stance + activation */}
            <circle cx="64" cy="28" r="6.5" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="64" y1="35" x2="64" y2="70" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <polyline points="64,70 54,102" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <polyline points="64,70 76,102" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <polyline points="64,46 86,52 94,40" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            {/* Activation ramp / primer gauge */}
            <path d="M98,84 L112,68 L122,74 L136,42" fill="none" stroke="#DC2626" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="129,44 137,40 138,49" fill="none" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="94" cy="40" r="3" fill="#DC2626" />
          </g>
        );

      case 'warmup_shoulders':
        return (
          <g>
            <circle cx="80" cy="34" r="7" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="80" y1="41" x2="80" y2="88" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="48" y1="54" x2="112" y2="54" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" />
            <circle cx="48" cy="54" r="14" fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="4 3" />
            <circle cx="112" cy="54" r="14" fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="4 3" />
          </g>
        );

      case 'warmup_hips':
        return (
          <g>
            <line x1="20" y1="98" x2="140" y2="98" stroke="#E5E7EB" strokeWidth="2" />
            <polyline points="42,96 72,72 96,96" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="72,72 114,72 118,96" fill="none" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="72" cy="72" r="4" fill="#DC2626" />
            <line x1="72" y1="72" x2="72" y2="42" stroke="#111827" strokeWidth="3" strokeLinecap="round" />
            <circle cx="72" cy="34" r="6" fill="none" stroke="#111827" strokeWidth="2.5" />
          </g>
        );

      case 'warmup_scapula':
        return (
          <g>
            {/* Bar */}
            <line x1="26" y1="18" x2="134" y2="18" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <line x1="58" y1="18" x2="62" y2="52" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <line x1="102" y1="18" x2="98" y2="52" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            {/* Head */}
            <circle cx="80" cy="36" r="5.5" fill="none" stroke="#111827" strokeWidth="2.4" />
            {/* Scapula highlight box */}
            <rect x="64" y="48" width="32" height="22" rx="4" fill="none" stroke="#DC2626" strokeWidth="2.4" />
            {/* Band dislocate arc behind */}
            <path d="M40,60 A44,36 0 0,1 120,60" fill="none" stroke="#DC2626" strokeWidth="2" strokeDasharray="4 3" />
            {/* Scapula upward activation arrow */}
            <line x1="80" y1="64" x2="80" y2="52" stroke="#DC2626" strokeWidth="2.2" strokeLinecap="round" />
            <polyline points="76,56 80,51 84,56" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'warmup_worlds_greatest_stretch':
        return (
          <g>
            <line x1="14" y1="102" x2="146" y2="102" stroke="#E5E7EB" strokeWidth="2" />
            {/* Back extended leg */}
            <line x1="54" y1="74" x2="22" y2="100" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            {/* Front deep lunge leg */}
            <polyline points="54,74 96,74 98,102" fill="none" stroke="#111827" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {/* Forward torso */}
            <line x1="54" y1="74" x2="90" y2="58" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <circle cx="100" cy="54" r="5.5" fill="none" stroke="#111827" strokeWidth="2.5" />
            {/* Planted hand on floor */}
            <line x1="82" y1="62" x2="82" y2="102" stroke="#111827" strokeWidth="2.6" strokeLinecap="round" />
            {/* Thoracic twist reaching arm up */}
            <line x1="82" y1="62" x2="92" y2="20" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
            <circle cx="92" cy="20" r="3" fill="#DC2626" />
            {/* Rotation arc */}
            <path d="M104,40 A18,18 0 0,0 96,24" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" />
            <polyline points="100,22 95,23 97,28" fill="none" stroke="#DC2626" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        );

      case 'cooldown_stretch':
        return (
          <g>
            <line x1="20" y1="98" x2="140" y2="98" stroke="#E5E7EB" strokeWidth="2" />
            <line x1="44" y1="96" x2="88" y2="96" stroke="#111827" strokeWidth="3.2" strokeLinecap="round" />
            <path d="M44,96 Q58,64 88,68" fill="none" stroke="#DC2626" strokeWidth="3" strokeLinecap="round" />
            <circle cx="96" cy="68" r="5.5" fill="none" stroke="#111827" strokeWidth="2.5" />
            <line x1="88" y1="68" x2="108" y2="90" stroke="#111827" strokeWidth="2.4" strokeLinecap="round" />
          </g>
        );

      default:
        return (
          <g>
            <circle cx="80" cy="30" r="7" fill="none" stroke="#111827" strokeWidth="2.6" />
            <line x1="80" y1="37" x2="80" y2="72" stroke="#111827" strokeWidth="3.4" strokeLinecap="round" />
            <polyline points="54,48 80,44 106,48" fill="none" stroke="#DC2626" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="80,72 68,100" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
            <polyline points="80,72 92,100" fill="none" stroke="#111827" strokeWidth="2.8" strokeLinecap="round" />
          </g>
        );
    }
  };

  return (
    <svg
      viewBox="0 0 160 120"
      className={`fitnote-svg ${svgKey in WARMUP_SCENES || svgKey in REHAB_SCENES ? 'wu-anim ' : ''}${className}`}
      aria-hidden="true"
      fill="none"
    >
      {renderScene()}
    </svg>
  );
};
