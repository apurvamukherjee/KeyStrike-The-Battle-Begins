import { CHARACTERS } from '../data/characters';
import { SWORDS } from '../data/swords';
import { createJsonStore } from './jsonStore';
import { isCharacterUnlocked, isSwordUnlocked } from './loadoutProgress';
import { sanitizeNickname } from './nickname';

export interface Profile {
  name: string;
  characterId: string;
  swordId: string;
}

const store = createJsonStore<Profile>(
  'keystrike:profile:v1',
  () => ({ name: '', characterId: CHARACTERS[0].id, swordId: SWORDS[0].id }),
  { merge: true },
);

export function getProfile(): Profile {
  return store.read();
}

export function setProfileName(name: string): void {
  store.write({ ...store.read(), name: sanitizeNickname(name).trim() });
}

/** No-ops if the character isn't unlocked yet. */
export function setProfileCharacter(characterId: string): void {
  if (!isCharacterUnlocked(characterId)) return;
  store.write({ ...store.read(), characterId });
}

/** No-ops if the sword isn't unlocked yet. */
export function setProfileSword(swordId: string): void {
  if (!isSwordUnlocked(swordId)) return;
  store.write({ ...store.read(), swordId });
}
