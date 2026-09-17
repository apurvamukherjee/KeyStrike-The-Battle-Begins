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

// 9 recipes — a silhouette shared with every fighter, varied by a glowing
// eye/blade-guard color and a chest-sash accent, the same small-table approach
// Avatar.tsx uses for its own generative variety. Index order is load-bearing:
// characters.ts and enemies.ts address these by number.
const RECIPES: SwordsmanRecipe[] = [
  { body: '#161222', shade: '#1d1830', face: '#241f38', hair: '#0e0c18', glow: '#ff4d63', sash: '#e0263f' }, // crimson
  { body: '#1a1420', shade: '#231a2c', face: '#2a1f2f', hair: '#120e17', glow: '#cf9f4f', sash: '#cf9f4f' }, // gold
  { body: '#121822', shade: '#182230', face: '#1c2836', hair: '#0c1218', glow: '#4dd0e1', sash: '#3fa7e0' }, // azure
  { body: '#181222', shade: '#20182e', face: '#261c34', hair: '#100c18', glow: '#c471ed', sash: '#9b5de5' }, // violet
  { body: '#0f1a14', shade: '#16241c', face: '#1c2e22', hair: '#0a140f', glow: '#7fe07f', sash: '#4caf60' }, // jade
  { body: '#22160f', shade: '#2c1e15', face: '#33251a', hair: '#180f0a', glow: '#ffb64d', sash: '#e0951a' }, // amber
  { body: '#1c1018', shade: '#26161f', face: '#2e1a26', hair: '#140b12', glow: '#ff6b9d', sash: '#d94f7c' }, // sakura
  { body: '#10161c', shade: '#182028', face: '#1e2830', hair: '#0c1216', glow: '#8ecae6', sash: '#5fa8d3' }, // steel-blue
  // Prestige recipe (index 8) — reserved for Story Mode's campaign-completion
  // reward, so it never shows up on a CPU opponent or an ordinary unlock.
  { body: '#141414', shade: '#1e1e1e', face: '#242424', hair: '#0a0a0a', glow: '#ffffff', sash: '#d8d8d8' }, // sword-saint
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

/**
 * Parts the arena animates individually. Each is addressed by class name
 * inside the figure's own SVG, so DuelArena can drive a shoulder or the
 * trailing sash without this component knowing which attack is playing.
 */
export const SWORDSMAN_PART = {
  swordArm: 'swordsman__sword-arm',
  offArm: 'swordsman__off-arm',
  torso: 'swordsman__torso',
  head: 'swordsman__head',
  hair: 'swordsman__hair-tail',
  sash: 'swordsman__sash-tail',
  frontLeg: 'swordsman__leg-front',
  backLeg: 'swordsman__leg-back',
  trail: 'swordsman__blade-trail',
} as const;

export default function Swordsman({ index, bodyRef, swordRef, className, swordSkin }: SwordsmanProps) {
  const r = RECIPES[((index % RECIPES.length) + RECIPES.length) % RECIPES.length];
  const glowStyle = { '--glow': r.glow } as CSSProperties;
  const bladeColor = swordSkin?.blade ?? '#f3f0e4';
  const bladeGlow = swordSkin?.glow ?? 'rgba(243, 240, 228, 0.55)';
  const bladeStyle = { '--sword-glow': bladeGlow } as CSSProperties;

  return (
    <svg
      ref={bodyRef}
      className={`swordsman${className ? ` ${className}` : ''}`}
      viewBox="0 0 120 170"
      role="img"
      aria-label="Swordsman"
    >
      <defs>
        {/* Rim light along the figure's leading edge — what separates the
            fighter from the near-black dojo without flattening the silhouette. */}
        <linearGradient id={`rim-${r.glow.slice(1)}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={r.glow} stopOpacity="0.55" />
          <stop offset="38%" stopColor={r.glow} stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`blade-${bladeColor.slice(1)}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={bladeColor} stopOpacity="0.72" />
          <stop offset="55%" stopColor={bladeColor} stopOpacity="1" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0.95" />
        </linearGradient>
      </defs>

      <ellipse className="swordsman__shadow" cx="60" cy="161" rx="30" ry="6" fill="#000" opacity="0.4" />

      {/* Back leg first: DOM order is the depth order for the whole figure. */}
      <g className="swordsman__leg-back" style={{ transformOrigin: '56px 112px' }}>
        <path d="M50 108 L44 140 L40 158 L52 158 L55 140 L60 112 Z" fill={r.shade} />
        <path d="M38 156 L54 156 L54 162 L36 162 Z" fill={r.hair} />
      </g>

      <g className="swordsman__leg-front" style={{ transformOrigin: '66px 112px' }}>
        <path d="M62 110 L70 140 L74 158 L86 158 L80 138 L74 110 Z" fill={r.body} />
        <path d="M72 156 L88 156 L88 162 L70 162 Z" fill={r.hair} />
      </g>

      {/* Trailing sash — GSAP sweeps this on every attack so cloth lags the body. */}
      <path
        className="swordsman__sash-tail"
        d="M60 74 Q44 88 38 108 Q50 98 58 92 Z"
        fill={r.sash}
        opacity="0.75"
        style={{ transformOrigin: '60px 76px' }}
      />

      <g className="swordsman__torso" style={{ transformOrigin: '60px 106px' }}>
        <path d="M44 112 L42 82 Q42 64 60 60 Q78 64 78 82 L76 112 Z" fill={r.body} />
        <path d="M60 60 Q46 66 43 84 L53 88 Q56 72 60 70 Z" fill={r.shade} />
        <path d="M60 62 L60 104" stroke={r.sash} strokeWidth="9" strokeLinecap="round" opacity="0.9" />
        <path d="M44 112 L42 82 Q42 64 60 60 L60 70 Q56 72 53 88 L52 112 Z" fill={`url(#rim-${r.glow.slice(1)})`} />
      </g>

      {/* Off hand — counterweights the swing. */}
      <g className="swordsman__off-arm" style={{ transformOrigin: '50px 76px' }}>
        <path d="M50 72 Q38 82 36 98 L44 100 Q46 86 54 78 Z" fill={r.shade} />
        <circle cx="40" cy="99" r="5" fill={r.face} />
      </g>

      <g className="swordsman__head" style={{ transformOrigin: '60px 52px' }}>
        <circle cx="60" cy="44" r="18" fill={r.face} />
        <path d="M42 38 Q60 14 78 38 Q76 22 60 18 Q44 22 42 38Z" fill={r.hair} />
        {/* Topknot + tail, swept by the arena on heavy attacks. */}
        <circle cx="60" cy="15" r="5.5" fill={r.hair} />
        <path
          className="swordsman__hair-tail"
          d="M60 12 Q74 6 84 12 Q74 16 60 18 Z"
          fill={r.hair}
          style={{ transformOrigin: '60px 14px' }}
        />
        <circle cx="53" cy="46" r="2.6" fill={r.glow} className="swordsman__eye-glow" style={glowStyle} />
        <circle cx="67" cy="46" r="2.6" fill={r.glow} className="swordsman__eye-glow" style={glowStyle} />
      </g>

      {/* Sword arm + blade. The arm rotates at the shoulder, the blade at the
          hilt, so an attack can combine a shoulder drive with a wrist cut. */}
      <g className="swordsman__sword-arm" style={{ transformOrigin: '70px 76px' }}>
        <path d="M70 70 Q82 78 84 92 L76 96 Q74 82 66 76 Z" fill={r.body} />
        <g className="swordsman__sword-anchor" transform="translate(78 92)">
          <g ref={swordRef} className="swordsman__sword-swing">
            {/* Motion trail: invisible at rest, revealed by the arena mid-swing. */}
            <path
              className="swordsman__blade-trail"
              d="M3 34 L3 112 Q22 74 3 34 Z"
              fill={bladeGlow}
              opacity="0"
            />
            <circle cx="3.5" cy="-2" r="4" fill={r.glow} opacity="0.9" />
            <rect x="0" y="0" width="7" height="34" rx="2" fill="#3a3448" />
            <rect x="-5" y="30" width="17" height="5" rx="1.5" fill={r.glow} />
            <rect
              x="1.5"
              y="34"
              width="4"
              height="78"
              rx="2"
              fill={`url(#blade-${bladeColor.slice(1)})`}
              className="swordsman__blade-glow"
              style={bladeStyle}
            />
          </g>
        </g>
      </g>
    </svg>
  );
}
