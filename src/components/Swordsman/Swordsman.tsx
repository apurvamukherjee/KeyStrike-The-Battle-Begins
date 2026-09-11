import type { CSSProperties, Ref } from 'react';
import './Swordsman.css';

interface SwordsmanRecipe {
  body: string;
  shade: string;
  face: string;
  hair: string;
  glow: string;
  sash: string;
}

// 8 original recipes — a silhouette shared with every fighter, varied by a
// glowing eye/blade-guard color and a chest-sash accent, the same small-table
// approach Avatar.tsx uses for its own generative variety.
const RECIPES: SwordsmanRecipe[] = [
  { body: '#161222', shade: '#1d1830', face: '#241f38', hair: '#0e0c18', glow: '#ff4d63', sash: '#e0263f' }, // crimson
  { body: '#1a1420', shade: '#231a2c', face: '#2a1f2f', hair: '#120e17', glow: '#cf9f4f', sash: '#cf9f4f' }, // gold
  { body: '#121822', shade: '#182230', face: '#1c2836', hair: '#0c1218', glow: '#4dd0e1', sash: '#3fa7e0' }, // azure
  { body: '#181222', shade: '#20182e', face: '#261c34', hair: '#100c18', glow: '#c471ed', sash: '#9b5de5' }, // violet
  { body: '#0f1a14', shade: '#16241c', face: '#1c2e22', hair: '#0a140f', glow: '#7fe07f', sash: '#4caf60' }, // jade
  { body: '#22160f', shade: '#2c1e15', face: '#33251a', hair: '#180f0a', glow: '#ffb64d', sash: '#e0951a' }, // amber
  { body: '#1c1018', shade: '#26161f', face: '#2e1a26', hair: '#140b12', glow: '#ff6b9d', sash: '#d94f7c' }, // sakura
  { body: '#10161c', shade: '#182028', face: '#1e2830', hair: '#0c1216', glow: '#8ecae6', sash: '#5fa8d3' }, // steel-blue
];

export interface SwordsmanProps {
  /** Picks a color recipe, same wraparound-index convention as Avatar. */
  index: number;
  /**
   * The whole figure — DuelArena animates idle sway, the attack lunge, hit
   * recoil, and the victory/defeat pose on this element. Mirroring (for a
   * fighter facing the other way) is also applied here, by the animation
   * owner, so this component stays purely presentational.
   */
  bodyRef?: Ref<SVGSVGElement>;
  /** The blade's rotating group, already pivoted at the hilt (0,0 in its own local space) — DuelArena swings this on a strike. */
  swordRef?: Ref<SVGGElement>;
  className?: string;
  /** Optional cosmetic sword skin (src/data/swords.ts) overriding the blade's fill/glow — falls back to the classic cream blade when omitted. */
  swordSkin?: { blade: string; glow: string };
}

export default function Swordsman({ index, bodyRef, swordRef, className, swordSkin }: SwordsmanProps) {
  const r = RECIPES[((index % RECIPES.length) + RECIPES.length) % RECIPES.length];
  const glowStyle = { '--glow': r.glow } as CSSProperties;
  const bladeColor = swordSkin?.blade ?? '#f3f0e4';
  const bladeGlowStyle = { '--sword-glow': swordSkin?.glow ?? 'rgba(243, 240, 228, 0.55)' } as CSSProperties;

  return (
    <svg
      ref={bodyRef}
      className={`swordsman${className ? ` ${className}` : ''}`}
      viewBox="0 0 120 170"
      role="img"
      aria-label="Swordsman"
    >
      <ellipse cx="60" cy="160" rx="34" ry="7" fill="#000" opacity="0.35" />
      <path d="M40 168 L36 100 Q34 70 60 66 Q86 70 84 100 L80 168 Z" fill={r.body} />
      <path
        d="M60 66 Q40 74 34 96 L46 100 Q52 82 60 78 Q68 82 74 100 L86 96 Q80 74 60 66 Z"
        fill={r.shade}
      />
      <circle cx="60" cy="46" r="20" fill={r.face} />
      <path d="M40 40 Q60 14 80 40 Q78 24 60 20 Q42 24 40 40Z" fill={r.hair} />
      <circle cx="60" cy="16" r="6" fill={r.hair} />
      <circle cx="53" cy="48" r="2.6" fill={r.glow} className="swordsman__eye-glow" style={glowStyle} />
      <circle cx="67" cy="48" r="2.6" fill={r.glow} className="swordsman__eye-glow" style={glowStyle} />
      <path d="M60 66 L60 96" stroke={r.sash} strokeWidth="10" strokeLinecap="round" opacity="0.9" />
      <g className="swordsman__sword-anchor" transform="translate(30 30)">
        <g ref={swordRef} className="swordsman__sword-swing">
          <rect x="0" y="0" width="7" height="34" rx="2" fill="#3a3448" />
          <rect x="-4" y="30" width="15" height="5" rx="1.5" fill={r.glow} />
          <rect
            x="1.5"
            y="34"
            width="4"
            height="78"
            rx="2"
            fill={bladeColor}
            className="swordsman__blade-glow"
            style={bladeGlowStyle}
          />
        </g>
      </g>
    </svg>
  );
}
