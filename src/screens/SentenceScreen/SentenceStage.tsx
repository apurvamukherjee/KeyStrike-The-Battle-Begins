import { useLayoutEffect, useRef } from 'react';
import './SentenceStage.css';

interface SentenceStageProps {
  text: string;
  typed: number;
  /** How many characters ahead of the cursor fade from full visibility to the fog floor — narrower reads as "blinder"/harder. */
  revealWindow: number;
  /** Bumped on every wrong keystroke — remounts the caret to retrigger its brief red flash. */
  wrongSeq: number;
}

const FOG_FLOOR = 0.04;

/** Squared falloff: bright immediately ahead of the cursor, fading fast into the fog rather than a flat linear ramp. */
function fogOpacity(distance: number, revealWindow: number): number {
  const t = Math.min(1, Math.max(0, distance / revealWindow));
  return FOG_FLOOR + (1 - FOG_FLOOR) * (1 - t) ** 2;
}

export default function SentenceStage({ text, typed, revealWindow, wrongSeq }: SentenceStageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const caretRef = useRef<HTMLDivElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);

  const measure = () => {
    const container = containerRef.current;
    const caret = caretRef.current;
    // The cursor sits on the next letter to type, or — once the whole
    // sentence is typed — collapses onto the position just after the last
    // character rather than vanishing outright.
    const target = letterRefs.current[Math.min(typed, text.length - 1)];
    if (!container || !caret || !target) return;

    const containerRect = container.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const atEnd = typed >= text.length;
    const x = targetRect.left - containerRect.left + (atEnd ? targetRect.width : 0);

    caret.style.transform = `translate(${x}px, ${targetRect.top - containerRect.top}px)`;
    caret.style.height = `${targetRect.height}px`;
  };

  useLayoutEffect(measure, [typed, text]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(measure);
    ro.observe(container);
    window.addEventListener('resize', measure);
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  return (
    <div className="sentence-stage" ref={containerRef}>
      <div className="sentence-stage__text" aria-live="off">
        {text.split('').map((ch, i) => {
          const distance = i - typed;
          const isDone = i < typed;
          const isCurrent = i === typed;
          const style = !isDone && !isCurrent ? { opacity: fogOpacity(distance, revealWindow) } : undefined;
          return (
            <span
              key={i}
              ref={(el) => {
                letterRefs.current[i] = el;
              }}
              className={
                'sentence-stage__letter' +
                (isDone ? ' sentence-stage__letter--done' : '') +
                (isCurrent ? ' sentence-stage__letter--current' : '')
              }
              style={style}
            >
              {ch}
            </span>
          );
        })}
      </div>
      <div
        key={wrongSeq}
        className={`sentence-caret${wrongSeq > 0 ? ' sentence-caret--wrong' : ''}`}
        ref={caretRef}
        aria-hidden="true"
      />
    </div>
  );
}
