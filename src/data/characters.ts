export interface Character {
  id: string;
  name: string;
  /** Picks a Swordsman color recipe (src/components/Swordsman) for this character's look. */
  swordsmanIndex: number;
  /** Fighting level (distinct Duel enemies defeated — see utils/loadoutProgress) needed to unlock. 0 is free from the start. */
  unlockLevel: number;
}

// One character per existing Swordsman recipe — the first three are free so
// there's real choice from a fresh profile, the rest unlock as the player
// climbs the Duel ladder.
export const CHARACTERS: Character[] = [
  { id: 'crimson-ronin', name: 'Crimson Ronin', swordsmanIndex: 0, unlockLevel: 0 },
  { id: 'gilded-wanderer', name: 'Gilded Wanderer', swordsmanIndex: 1, unlockLevel: 0 },
  { id: 'azure-blade', name: 'Azure Blade', swordsmanIndex: 2, unlockLevel: 0 },
  { id: 'violet-specter', name: 'Violet Specter', swordsmanIndex: 3, unlockLevel: 2 },
  { id: 'jade-sentinel', name: 'Jade Sentinel', swordsmanIndex: 4, unlockLevel: 3 },
  { id: 'amber-warden', name: 'Amber Warden', swordsmanIndex: 5, unlockLevel: 4 },
  { id: 'sakura-reaper', name: 'Sakura Reaper', swordsmanIndex: 6, unlockLevel: 6 },
  { id: 'steel-oni', name: 'Steel Oni', swordsmanIndex: 7, unlockLevel: 8 },
];

export function getCharacterById(id: string): Character | undefined {
  return CHARACTERS.find((c) => c.id === id);
}
