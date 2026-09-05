import type { CSSProperties } from 'react';
import type { KeyHeat } from '../../utils/keyHeat';
import './KeyHeatmap.css';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface KeyHeatmapProps {
  heat: Record<string, KeyHeat>;
}

export default function KeyHeatmap({ heat }: KeyHeatmapProps) {
  return (
    <div className="key-heatmap">
      {ROWS.map((row, r) => (
        <div className="key-heatmap__row" key={r}>
          {row.map((key) => {
            const h = heat[key];
            const hasData = h?.intensity != null;
            return (
              <span
                key={key}
                className={`key-heatmap__key${hasData ? ' key-heatmap__key--hot' : ''}`}
                style={hasData ? ({ '--heat': h!.intensity } as CSSProperties) : undefined}
                title={h?.label}
              >
                {key}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}
