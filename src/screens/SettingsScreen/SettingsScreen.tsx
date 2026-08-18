import { useState } from 'react';
import Slider from '../../components/Slider/Slider';
import {
  applyAppearanceSettings,
  getGameSpeed,
  getInputOffsetMs,
  getPalette,
  getReduceMotion,
  getTextScale,
  getVolume,
  setGameSpeed,
  setInputOffsetMs,
  setPalette,
  setReduceMotion,
  setTextScale,
  setVolume,
  type Palette,
} from '../../utils/settings';
import './SettingsScreen.css';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [volume, setVolumeState] = useState(getVolume);
  const [offset, setOffsetState] = useState(getInputOffsetMs);
  const [speed, setSpeedState] = useState(getGameSpeed);
  const [textScale, setTextScaleState] = useState(getTextScale);
  const [palette, setPaletteState] = useState<Palette>(getPalette);
  const [reduceMotion, setReduceMotionState] = useState(getReduceMotion);

  return (
    <div className="screen">
      <h1 className="wordmark wordmark--small">Settings</h1>

      <div className="panel settings__panel">
        <Slider
          label="Volume"
          value={volume}
          min={0}
          max={1}
          step={0.01}
          displayValue={`${Math.round(volume * 100)}%`}
          onChange={(v) => {
            setVolumeState(v);
            setVolume(v);
          }}
        />
        <Slider
          label="Input offset"
          value={offset}
          min={-150}
          max={150}
          step={5}
          displayValue={`${offset > 0 ? '+' : ''}${offset} ms`}
          onChange={(v) => {
            setOffsetState(v);
            setInputOffsetMs(v);
          }}
        />
        <p className="settings__hint">
          If your word completions consistently register early or late, nudge the offset until they feel locked
          to the beat.
        </p>

        <Slider
          label="Game speed"
          value={speed}
          min={0.6}
          max={1}
          step={0.05}
          displayValue={`${Math.round(speed * 100)}%`}
          onChange={(v) => {
            setSpeedState(v);
            setGameSpeed(v);
          }}
        />
        <p className="settings__hint">More time per word below 100%.</p>

        <Slider
          label="Text size"
          value={textScale}
          min={0.8}
          max={1.4}
          step={0.05}
          displayValue={`${Math.round(textScale * 100)}%`}
          onChange={(v) => {
            setTextScaleState(v);
            setTextScale(v);
            applyAppearanceSettings();
          }}
        />
      </div>

      <div className="panel settings__panel">
        <div className="settings__toggle-row">
          <span className="settings__toggle-label">Colorblind-safe accent</span>
          <div className="settings__toggle" role="radiogroup" aria-label="Accent palette">
            {(['default', 'alt'] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={palette === p}
                className={`settings__toggle-option${palette === p ? ' settings__toggle-option--active' : ''}`}
                onClick={() => {
                  setPaletteState(p);
                  setPalette(p);
                  applyAppearanceSettings();
                }}
              >
                {p === 'default' ? 'Red' : 'Amber'}
              </button>
            ))}
          </div>
        </div>

        <div className="settings__toggle-row">
          <span className="settings__toggle-label">Reduce motion</span>
          <div className="settings__toggle" role="radiogroup" aria-label="Reduce motion">
            {[false, true].map((on) => (
              <button
                key={String(on)}
                type="button"
                role="radio"
                aria-checked={reduceMotion === on}
                className={`settings__toggle-option${reduceMotion === on ? ' settings__toggle-option--active' : ''}`}
                onClick={() => {
                  setReduceMotionState(on);
                  setReduceMotion(on);
                  applyAppearanceSettings();
                }}
              >
                {on ? 'On' : 'Off'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
