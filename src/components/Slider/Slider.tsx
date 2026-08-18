import './Slider.css';

interface SliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  displayValue: string;
  onChange: (value: number) => void;
}

export default function Slider({ label, value, min, max, step = 1, displayValue, onChange }: SliderProps) {
  return (
    <label className="slider">
      <span className="slider__row">
        <span className="slider__label">{label}</span>
        <span className="slider__value">{displayValue}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </label>
  );
}
