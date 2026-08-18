import type { CSSProperties } from 'react';
import './AnimatedKeyboard.css';

const ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

interface AnimatedKeyboardProps {
  /** 'idle' plays a decorative wave across the keys; 'live' highlights `activeKey` only. */
  mode: 'idle' | 'live';
  activeKey?: string | null;
  size?: 'sm' | 'lg';
}

export default function AnimatedKeyboard({ mode, activeKey, size = 'sm' }: AnimatedKeyboardProps) {
  let keyIndex = 0;
  return (
    <div className={`akb akb--${mode} akb--${size}`} aria-hidden="true">
      {ROWS.map((row, r) => (
        <div className="akb__row" key={r}>
          {row.map((key) => {
            const i = keyIndex++;
            const isActive = mode === 'live' && activeKey === key;
            return (
              <span
                key={key}
                className={`akb__key${isActive ? ' akb__key--active' : ''}`}
                style={mode === 'idle' ? ({ '--akb-delay': `${i * 60}ms` } as CSSProperties) : undefined}
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
