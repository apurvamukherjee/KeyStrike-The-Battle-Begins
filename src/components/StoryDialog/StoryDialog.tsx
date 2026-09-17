import { useCallback, useEffect, useRef, useState } from 'react';
import Swordsman from '../Swordsman/Swordsman';
import type { DialogLine } from '../../data/storyScript';
import { prefersReducedMotion } from '../../utils/motion';
import './StoryDialog.css';

interface StoryDialogProps {
  lines: DialogLine[];
  /** Portrait + name for the 'hero' speaker. */
  hero: { name: string; swordsmanIndex: number };
  /** Portrait + name for the 'enemy' speaker. */
  enemy: { name: string; swordsmanIndex: number };
  /** Runs when the last line is dismissed, or the whole scene is skipped. */
  onDone: () => void;
}

/** Characters per second for the typewriter reveal. */
const REVEAL_CPS = 58;

/**
 * A full-screen story beat: portraits either side, a blade-framed text box,
 * and one line at a time. Advance with click/Enter/Space; the first press
 * completes the line being typed rather than skipping it, which is the
 * convention every dialogue box in the genre uses.
 */
export default function StoryDialog({ lines, hero, enemy, onDone }: StoryDialogProps) {
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(0);
  const rafRef = useRef<number | null>(null);

  const line = lines[index];
  const full = line?.text ?? '';
  const isComplete = revealed >= full.length;

  // Typewriter. Driven by rAF against real elapsed time so the reveal runs at
  // the same speed regardless of frame rate, and is skipped whole under
  // reduced motion.
  useEffect(() => {
    if (!line) return;
    if (prefersReducedMotion()) {
      setRevealed(full.length);
      return;
    }

    setRevealed(0);
    const started = performance.now();

    const step = (now: number) => {
      const chars = Math.floor(((now - started) / 1000) * REVEAL_CPS);
      if (chars >= full.length) {
        setRevealed(full.length);
        return;
      }
      setRevealed(chars);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [line, full]);

  const advance = useCallback(() => {
    if (!isComplete) {
      // First press finishes the line rather than consuming it.
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      setRevealed(full.length);
      return;
    }
    if (index + 1 >= lines.length) onDone();
    else setIndex((i) => i + 1);
  }, [isComplete, full.length, index, lines.length, onDone]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // A focused button (Skip) activates itself on Enter/Space; handling the
      // same press here too would fire both actions at once.
      if (e.target instanceof HTMLButtonElement) return;
      if (e.repeat) return;

      if (e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Space') {
        e.preventDefault();
        advance();
      } else if (e.code === 'Escape') {
        onDone();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance, onDone]);

  if (!line) return null;

  const speakerName =
    line.speaker === 'hero' ? (line.name ?? hero.name) : line.speaker === 'enemy' ? (line.name ?? enemy.name) : null;

  return (
    <div className="story-dialog" role="dialog" aria-label="Story scene">
      <div className="story-dialog__stage">
        <div
          className={`story-dialog__portrait story-dialog__portrait--left${line.speaker === 'hero' ? ' story-dialog__portrait--active' : ''}`}
          aria-hidden="true"
        >
          <Swordsman index={hero.swordsmanIndex} />
        </div>
        <div
          className={`story-dialog__portrait story-dialog__portrait--right${line.speaker === 'enemy' ? ' story-dialog__portrait--active' : ''}`}
          aria-hidden="true"
        >
          <Swordsman index={enemy.swordsmanIndex} />
        </div>
      </div>

      {/*
        A div, not a button: the keyboard is handled once at window level, and
        a focusable button here would ALSO activate on Enter/Space, advancing
        two lines per press. Pointer taps still advance anywhere on the box.
      */}
      <div
        className={`story-dialog__box story-dialog__box--${line.speaker}`}
        onClick={advance}
        aria-live="polite"
        role="presentation"
      >
        <span className="story-dialog__blade" aria-hidden="true" />
        {speakerName && <span className="story-dialog__speaker">{speakerName}</span>}
        <p className="story-dialog__text">
          {full.slice(0, revealed)}
          <span className="story-dialog__cursor" aria-hidden="true" data-done={isComplete || undefined} />
        </p>
        <span className="story-dialog__hint">
          {isComplete ? (index + 1 >= lines.length ? 'Enter to begin' : 'Enter') : ' '}
        </span>
      </div>

      <div className="story-dialog__progress" aria-hidden="true">
        {lines.map((_, i) => (
          <span key={i} className={`story-dialog__pip${i <= index ? ' story-dialog__pip--seen' : ''}`} />
        ))}
      </div>

      <button type="button" className="story-dialog__skip cap" onClick={onDone}>
        Skip
      </button>
    </div>
  );
}
