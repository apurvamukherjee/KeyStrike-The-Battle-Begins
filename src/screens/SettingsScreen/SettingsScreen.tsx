import { useState } from 'react';
import Slider from '../../components/Slider/Slider';
import { getInputOffsetMs, getVolume, setInputOffsetMs, setVolume } from '../../utils/settings';
import './SettingsScreen.css';

interface SettingsScreenProps {
  onBack: () => void;
}

export default function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [volume, setVolumeState] = useState(getVolume);
  const [offset, setOffsetState] = useState(getInputOffsetMs);

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
          If your hits consistently register early or late, nudge the offset until <kbd>D</kbd> <kbd>F</kbd>{' '}
          <kbd>J</kbd> <kbd>K</kbd> feel locked to the beat.
        </p>
      </div>

      <div className="cap-row">
        <button type="button" className="cap cap--primary" onClick={onBack}>
          Back
        </button>
      </div>
    </div>
  );
}
