import { useEffect, useState } from 'react';
import { CHARACTERS } from '../../data/characters';
import { SWORDS } from '../../data/swords';
import { getFightingLevel, isCharacterUnlocked, isSwordUnlocked } from '../../utils/loadoutProgress';
import { getProfile, setProfileCharacter, setProfileName, setProfileSword } from '../../utils/profile';
import Swordsman from '../../components/Swordsman/Swordsman';
import './CustomizeScreen.css';

interface CustomizeScreenProps {
  onBack: () => void;
}

export default function CustomizeScreen({ onBack }: CustomizeScreenProps) {
  const [profile, setProfile] = useState(getProfile);
  // Fighting level only ever changes by winning a Duel, which unmounts this
  // screen entirely (App.tsx routes away and back) — reading once per mount
  // is enough, same convention as DuelSelectScreen's own progress read.
  const fightingLevel = getFightingLevel();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onBack();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onBack]);

  const character = CHARACTERS.find((c) => c.id === profile.characterId) ?? CHARACTERS[0];
  const sword = SWORDS.find((s) => s.id === profile.swordId) ?? SWORDS[0];

  function handleNameChange(name: string) {
    setProfileName(name);
    setProfile(getProfile());
  }

  function handlePickCharacter(id: string) {
    if (!isCharacterUnlocked(id)) return;
    setProfileCharacter(id);
    setProfile(getProfile());
  }

  function handlePickSword(id: string) {
    if (!isSwordUnlocked(id)) return;
    setProfileSword(id);
    setProfile(getProfile());
  }

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Customize</h1>
      <p className="tagline">Fighting Level {fightingLevel} — win Duels to unlock more.</p>

      <div className="customize__preview">
        <Swordsman index={character.swordsmanIndex} swordSkin={{ blade: sword.blade, glow: sword.glow }} />
      </div>

      <div className="panel customize__panel">
        <label className="customize__name-label" htmlFor="customize-name">
          Name
        </label>
        <input
          id="customize-name"
          className="customize__name-input"
          type="text"
          value={profile.name}
          placeholder="Player"
          maxLength={16}
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>

      <div className="panel customize__panel">
        <h2 className="customize__section-title">Character</h2>
        <div className="customize__grid" role="listbox" aria-label="Character">
          {CHARACTERS.map((c) => {
            const unlocked = isCharacterUnlocked(c.id);
            const selected = c.id === profile.characterId;
            return (
              <button
                key={c.id}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={!unlocked}
                className={`customize__tile${selected ? ' customize__tile--selected' : ''}${!unlocked ? ' customize__tile--locked' : ''}`}
                onClick={() => handlePickCharacter(c.id)}
              >
                <Swordsman index={c.swordsmanIndex} className="swordsman--thumb" />
                <span className="customize__tile-name">{unlocked ? c.name : '???'}</span>
                <span className="customize__tile-meta">{unlocked ? '' : `Lv ${c.unlockLevel}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="panel customize__panel">
        <h2 className="customize__section-title">Sword</h2>
        <div className="customize__grid" role="listbox" aria-label="Sword">
          {SWORDS.map((s) => {
            const unlocked = isSwordUnlocked(s.id);
            const selected = s.id === profile.swordId;
            return (
              <button
                key={s.id}
                type="button"
                role="option"
                aria-selected={selected}
                aria-disabled={!unlocked}
                className={`customize__tile${selected ? ' customize__tile--selected' : ''}${!unlocked ? ' customize__tile--locked' : ''}`}
                onClick={() => handlePickSword(s.id)}
              >
                <span
                  className="customize__sword-swatch"
                  style={{ background: s.blade, boxShadow: `0 0 12px ${s.glow}` }}
                  aria-hidden="true"
                />
                <span className="customize__tile-name">{unlocked ? s.name : '???'}</span>
                <span className="customize__tile-meta">{unlocked ? '' : `Lv ${s.unlockLevel}`}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={onBack} autoFocus>
          Back
        </button>
      </div>
    </div>
  );
}
