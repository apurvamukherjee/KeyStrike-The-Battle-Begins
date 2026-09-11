import { CHARACTERS } from '../data/characters';
import { SWORDS } from '../data/swords';
import { isCharacterUnlocked, isSwordUnlocked } from './loadoutProgress';
import { sanitizeNickname } from './nickname';

const STORAGE_KEY = 'keystrike:profile:v1';

export interface Profile {
  name: string;
  characterId: string;
  swordId: string;
}

const DEFAULT_PROFILE: Profile = {
  name: '',
  characterId: CHARACTERS[0].id,
  swordId: SWORDS[0].id,
};

function readProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...(JSON.parse(raw) as Partial<Profile>) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

function writeProfile(profile: Profile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  } catch {
    /* private mode / quota exceeded — profile just won't persist this session */
  }
}

export function getProfile(): Profile {
  return readProfile();
}

export function setProfileName(name: string): void {
  writeProfile({ ...readProfile(), name: sanitizeNickname(name).trim() });
}

/** No-ops if the character isn't unlocked yet. */
export function setProfileCharacter(characterId: string): void {
  if (!isCharacterUnlocked(characterId)) return;
  writeProfile({ ...readProfile(), characterId });
}

/** No-ops if the sword isn't unlocked yet. */
export function setProfileSword(swordId: string): void {
  if (!isSwordUnlocked(swordId)) return;
  writeProfile({ ...readProfile(), swordId });
}
