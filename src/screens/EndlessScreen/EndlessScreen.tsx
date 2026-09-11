import { useEffect, useRef, useState } from 'react';
import { getEndlessWordPool } from '../../data/endlessWords';
import { getAudioContext, playChime } from '../../engine/audioEngine';
import { EndlessRunner } from '../../engine/endlessRunner';
import type { EndlessRunResult } from '../../types/game';
import { DIFFICULTIES, type Difficulty } from '../../types/song';
import { getEndlessBest, recordEndlessScoreIfBest } from '../../utils/endlessHighScores';
import { attachMobileTypingInput, IS_TOUCH } from '../../utils/mobileTyping';
import { getVolume } from '../../utils/settings';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import WordStage from '../GameplayScreen/WordStage';
import '../GameplayScreen/GameplayScreen.css';
import '../SentenceScreen/SentenceScreen.css';

const LETTER_RE = /^[a-zA-Z]$/;
const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };
/** Starting-pace shift, in ms/char shaved off — higher tiers start faster, same escalation curve after that. */
const SPEED_OFFSET: Record<Difficulty, number> = { easy: 0, normal: 50, hard: 100 };

interface EndlessScreenProps {
  initialDifficulty?: Difficulty;
  autoStart?: boolean;
  onFinish: (result: EndlessRunResult) => void;
  onExit: () => void;
}

type Phase = 'setup' | 'playing';

interface StageState {
  word: string;
  typed: number;
  fractionRemaining: number;
}

interface HudState {
  score: number;
  combo: number;
  wordsCleared: number;
}

const INITIAL_STAGE: StageState = { word: '', typed: 0, fractionRemaining: 1 };
const INITIAL_HUD: HudState = { score: 0, combo: 0, wordsCleared: 0 };

export default function EndlessScreen({ initialDifficulty, autoStart, onFinish, onExit }: EndlessScreenProps) {
  const [phase, setPhase] = useState<Phase>(autoStart ? 'playing' : 'setup');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty ?? 'normal');
  const [stage, setStage] = useState<StageState>(INITIAL_STAGE);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const best = getEndlessBest(difficulty);

  useEffect(() => {
    if (phase === 'playing' && IS_TOUCH) window.setTimeout(() => mobileInputRef.current?.focus(), 50);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const ctx = getAudioContext();
    ctx.resume().catch(() => {});
    const fxGain = ctx.createGain();
    fxGain.gain.value = getVolume();
    fxGain.connect(ctx.destination);

    const runner = new EndlessRunner(getEndlessWordPool(), SPEED_OFFSET[difficulty]);
    let wordStartAt = ctx.currentTime;
    let raf = 0;
    let finished = false;
    let detachMobile: () => void = () => {};

    function teardown() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      detachMobile();
    }

    function quit() {
      if (finished) return;
      finished = true;
      fxGain.disconnect();
      teardown();
      onExit();
    }

    function finish() {
      if (finished) return;
      finished = true;
      fxGain.disconnect();
      teardown();

      const isNewBest = recordEndlessScoreIfBest(difficulty, {
        score: runner.score,
        wordsCleared: runner.wordsCleared,
        maxCombo: runner.maxCombo,
      });
      onFinish({
        difficulty,
        score: runner.score,
        wordsCleared: runner.wordsCleared,
        maxCombo: runner.maxCombo,
        isNewBest,
      });
    }

    function processLetter(letter: string) {
      const result = runner.handleKey(letter);
      if (result.type === 'ignored') return;
      if (result.type === 'progress') {
        playChime(ctx, fxGain, 'key');
        return;
      }
      playChime(ctx, fxGain, 'perfect');
      wordStartAt = ctx.currentTime;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        quit();
        return;
      }
      if (e.repeat || !LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey(letter);
      processLetter(letter);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey((k) => (k === letter ? null : k));
    }

    if (IS_TOUCH) {
      detachMobile = attachMobileTypingInput(mobileInputRef.current, (letter) => {
        setActiveKey(letter);
        window.setTimeout(() => setActiveKey(null), 150);
        processLetter(letter);
      });
      mobileInputRef.current?.focus();
    } else {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

    function loop() {
      const budgetSec = runner.timeBudgetMs / 1000;
      const elapsed = ctx.currentTime - wordStartAt;
      const fractionRemaining = 1 - elapsed / budgetSec;

      if (elapsed >= budgetSec) {
        playChime(ctx, fxGain, 'miss');
        runner.timeExpired();
        finish();
        return;
      }

      setStage({ word: runner.currentWord, typed: runner.typed, fractionRemaining });
      setHud({ score: runner.score, combo: runner.combo, wordsCleared: runner.wordsCleared });
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      if (!finished) fxGain.disconnect();
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, difficulty]);

  function handleStart() {
    getAudioContext().resume().catch(() => {});
    setStage(INITIAL_STAGE);
    setHud(INITIAL_HUD);
    setPhase('playing');
  }

  useEffect(() => {
    if (phase !== 'setup') return;
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'ArrowRight' || e.code === 'ArrowLeft') {
        const i = DIFFICULTIES.indexOf(difficulty);
        const dir = e.code === 'ArrowRight' ? 1 : -1;
        setDifficulty(DIFFICULTIES[(i + dir + DIFFICULTIES.length) % DIFFICULTIES.length]);
      } else if (e.code === 'Enter' || e.code === 'NumpadEnter') {
        handleStart();
      } else if (e.code === 'Escape') {
        onExit();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, difficulty]);

  if (phase === 'setup') {
    return (
      <div className="screen">
        <h1 className="wordmark wordmark--small">Endless Mode</h1>
        <p className="tagline">One miss ends the run. The pace only ever gets faster.</p>

        <div className="difficulty-picker" role="radiogroup" aria-label="Starting pace">
          {DIFFICULTIES.map((d) => (
            <button
              key={d}
              type="button"
              role="radio"
              aria-checked={d === difficulty}
              className={`difficulty-picker__option${d === difficulty ? ' difficulty-picker__option--active' : ''}`}
              onClick={() => setDifficulty(d)}
            >
              {DIFFICULTY_LABEL[d]}
            </button>
          ))}
        </div>

        {best && (
          <p className="tagline">
            Best: {best.score.toLocaleString('en-US')} score · {best.wordsCleared} words
          </p>
        )}

        <div className="cap-row">
          <button type="button" className="cap cap--primary" onClick={handleStart} autoFocus>
            Start
          </button>
          <button type="button" className="cap" onClick={onExit}>
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen gameplay-screen">
      {IS_TOUCH && (
        <input
          ref={mobileInputRef}
          className="gameplay-mobile-input"
          type="text"
          inputMode="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          aria-hidden="true"
          tabIndex={-1}
        />
      )}

      <div className="gameplay-hud">
        <div className="gameplay-hud__stat">
          <span className="gameplay-hud__label">Score</span>
          <span className="gameplay-hud__value">{hud.score.toLocaleString('en-US')}</span>
        </div>
        <div className="gameplay-hud__stat">
          <span className="gameplay-hud__label">Combo</span>
          <span className="gameplay-hud__value">{hud.combo}</span>
        </div>
        <div className="gameplay-hud__stat">
          <span className="gameplay-hud__label">Words</span>
          <span className="gameplay-hud__value">{hud.wordsCleared}</span>
        </div>
      </div>

      <div className="gameplay-body">
        <WordStage
          word={stage.word}
          typed={stage.typed}
          fractionRemaining={stage.fractionRemaining}
          overtime={false}
          upcoming={[]}
        />
        {!IS_TOUCH && <AnimatedKeyboard mode="live" activeKey={activeKey} />}
      </div>

      <div className="sentence-controls-hint">
        <kbd>Esc</kbd> exit
      </div>
    </div>
  );
}
