export interface Sword {
  id: string;
  name: string;
  /** Blade fill color — overrides the Swordsman recipe's default cream blade. */
  blade: string;
  /** Blade glow color, as an rgba() string for the drop-shadow filter. */
  glow: string;
  /**
   * Fighting level (distinct Duel enemies defeated — see utils/loadoutProgress) needed to unlock. 0 is
   * free from the start. `Infinity` means it's never unlocked this way — see `storyReward` instead.
   */
  unlockLevel: number;
  /** Story Mode level whose clear grants this sword, independent of `unlockLevel` — see utils/storyProgress. */
  storyReward?: true;
}

export const SWORDS: Sword[] = [
  { id: 'training-blade', name: 'Training Blade', blade: '#f3f0e4', glow: 'rgba(243, 240, 228, 0.55)', unlockLevel: 0 },
  { id: 'crimson-edge', name: 'Crimson Edge', blade: '#ff4d63', glow: 'rgba(255, 77, 99, 0.6)', unlockLevel: 1 },
  { id: 'azure-fang', name: 'Azure Fang', blade: '#4dd0e1', glow: 'rgba(77, 208, 225, 0.6)', unlockLevel: 2 },
  { id: 'gold-reaver', name: 'Gold Reaver', blade: '#cf9f4f', glow: 'rgba(207, 159, 79, 0.6)', unlockLevel: 3 },
  { id: 'violet-whisper', name: 'Violet Whisper', blade: '#c471ed', glow: 'rgba(196, 113, 237, 0.6)', unlockLevel: 4 },
  { id: 'jade-thorn', name: 'Jade Thorn', blade: '#7fe07f', glow: 'rgba(127, 224, 127, 0.6)', unlockLevel: 5 },
  { id: 'oni-fang', name: 'Oni Fang', blade: '#ffb64d', glow: 'rgba(255, 182, 77, 0.6)', unlockLevel: 7 },
  { id: 'void-splitter', name: 'Void Splitter', blade: '#ff6b9d', glow: 'rgba(255, 107, 157, 0.6)', unlockLevel: 9 },
  // Granted only by clearing Story Mode level 25, never by fighting level.
  { id: 'sun-forged-edge', name: 'Sun-Forged Edge', blade: '#ffe066', glow: 'rgba(255, 224, 102, 0.7)', unlockLevel: Infinity, storyReward: true },
];

export function getSwordById(id: string): Sword | undefined {
  return SWORDS.find((s) => s.id === id);
}
