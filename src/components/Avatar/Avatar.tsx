interface AvatarRecipe {
  hair: string;
  face: string;
  spikes: number;
  accessory: 'none' | 'star' | 'band';
}

// 10 original recipes — a spiky hair silhouette (point count + color varies),
// a simple two-dot anime eye style, and an optional small accessory, all
// generated from this small table rather than hand-traced from any character.
const RECIPES: AvatarRecipe[] = [
  { hair: '#e0263f', face: '#2a2530', spikes: 5, accessory: 'none' },
  { hair: '#3fa7e0', face: '#241f2b', spikes: 3, accessory: 'star' },
  { hair: '#f5a623', face: '#2a2226', spikes: 7, accessory: 'none' },
  { hair: '#7fe07f', face: '#20272a', spikes: 4, accessory: 'band' },
  { hair: '#c471ed', face: '#2a2030', spikes: 6, accessory: 'none' },
  { hair: '#ff6b9d', face: '#2b2228', spikes: 3, accessory: 'band' },
  { hair: '#4dd0e1', face: '#1f272b', spikes: 5, accessory: 'star' },
  { hair: '#ffd166', face: '#2b2620', spikes: 4, accessory: 'none' },
  { hair: '#ef476f', face: '#2b2026', spikes: 6, accessory: 'star' },
  { hair: '#8ecae6', face: '#20252b', spikes: 7, accessory: 'band' },
];

function spikeHairPath(spikes: number): string {
  const cx = 32;
  const cy = 30;
  const outerR = 27;
  const innerR = 17;
  const steps = spikes * 2;
  const pts: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = Math.PI + (Math.PI * i) / steps;
    const r = i % 2 === 0 ? outerR : innerR;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${pts.join(' L')} Z`;
}

interface AvatarProps {
  index: number;
  size?: number;
  className?: string;
}

export default function Avatar({ index, size = 40, className }: AvatarProps) {
  const recipe = RECIPES[((index % RECIPES.length) + RECIPES.length) % RECIPES.length];

  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label="Player avatar"
    >
      <circle cx="32" cy="32" r="31" fill="#0a0a0c" stroke="var(--line-strong, rgba(255,255,255,0.16))" />
      <path d={spikeHairPath(recipe.spikes)} fill={recipe.hair} />
      <circle cx="32" cy="36" r="18" fill={recipe.face} />

      {/* eyes */}
      <ellipse cx="25" cy="36" rx="3.4" ry="4.2" fill="#fff" />
      <ellipse cx="39" cy="36" rx="3.4" ry="4.2" fill="#fff" />
      <circle cx="25.5" cy="37.2" r="1.6" fill="#111" />
      <circle cx="39.5" cy="37.2" r="1.6" fill="#111" />

      {/* mouth */}
      <path d="M27 45q5 3 10 0" stroke="#111" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {recipe.accessory === 'star' && (
        <path
          d="M46 16l1.6 3.4 3.7.5-2.7 2.6.6 3.7-3.2-1.7-3.2 1.7.6-3.7-2.7-2.6 3.7-.5z"
          fill="#ffe066"
        />
      )}
      {recipe.accessory === 'band' && <rect x="14" y="27" width="36" height="4" rx="2" fill="#0a0a0c" opacity="0.65" />}
    </svg>
  );
}
