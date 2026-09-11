import { useEffect, useRef, useState } from 'react';
import { pickParagraph } from '../../data/paragraphs';
import { getAudioContext, playChime } from '../../engine/audioEngine';
import { gradeForAccuracy } from '../../engine/chartEngine';
import { SentenceRunner, wpmFrom } from '../../engine/sentenceRunner';
import type { ParagraphRunResult } from '../../types/game';
import { DIFFICULTIES, type Difficulty } from '../../types/song';
import { getVolume } from '../../utils/settings';
import { recordParagraphScoreIfBest } from '../../utils/paragraphHighScores';
import { IS_TOUCH } from '../../utils/mobileTyping';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import SentenceStage from '../SentenceScreen/SentenceStage';
import '../GameplayScreen/GameplayScreen.css';
import '../SentenceScreen/SentenceScreen.css';

// No fog — Paragraph Mode shows the whole text at once, so this is just
// "wide enough to never visibly kick in" rather than a real limit.
const NO_FOG_WINDOW = 9999;

const DIFFICULTY_LABEL: Record<Difficulty, string> = { easy: 'Easy', normal: 'Normal', hard: 'Hard' };

interface ParagraphScreenProps {
  initialDifficulty?: Difficulty;
  autoStart?: boolean;
  onFinish: (result: ParagraphRunResult) => void;
  onExit: () => void;
}

type Phase = 'setup' | 'playing';

interface HudState {
  wpm: number;
  accuracy: number;
  combo: number;
}

const INITIAL_HUD: HudState = { wpm: 0, accuracy: 100, combo: 0 };

export default function ParagraphScreen({ initialDifficulty, autoStart, onFinish, onExit }: ParagraphScreenProps) {
  const [phase, setPhase] = useState<Phase>(autoStart ? 'playing' : 'setup');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty ?? 'normal');
  const [paragraphText, setParagraphText] = useState(() =>
    autoStart ? pickParagraph(initialDifficulty ?? 'normal') : ''
  );
  const [typed, setTyped] = useState(0);
  const [wrongSeq, setWrongSeq] = useState(0);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);

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

    const runner = new SentenceRunner(paragraphText);
    let startedAt: number | null = null;
    let mobileKeyFlashTimer = 0;
    let finished = false;

    function teardown() {
      window.clearTimeout(mobileKeyFlashTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      mobileInputRef.current?.removeEventListener('input', onMobileInput);
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

      const elapsedSec = startedAt !== null ? ctx.currentTime - startedAt : 0;
      const accuracy = runner.accuracy;
      const wpm = wpmFrom(runner.typed, elapsedSec);
      const isNewBest = recordParagraphScoreIfBest(difficulty, { wpm, accuracy, score: runner.score });
      const result: ParagraphRunResult = {
        difficulty,
        charactersTyped: runner.typed,
        errors: runner.errors,
        accuracy,
        wpm,
        maxCombo: runner.maxCombo,
        score: runner.score,
        grade: gradeForAccuracy(accuracy),
        isNewBest,
      };
      onFinish(result);
    }

    function pushHud() {
      const elapsedSec = startedAt !== null ? ctx.currentTime - startedAt : 0;
      setHud({ wpm: wpmFrom(runner.typed, elapsedSec), accuracy: runner.accuracy, combo: runner.combo });
    }

    function processChar(ch: string) {
      if (startedAt === null) startedAt = ctx.currentTime;
      const result = runner.handleKey(ch);

      if (result.type === 'ignored') return;

      if (result.type === 'wrong') {
        playChime(ctx, fxGain, 'miss');
        setWrongSeq((s) => s + 1);
        pushHud();
        return;
      }

      playChime(ctx, fxGain, 'key');
      setTyped(runner.typed);
      pushHud();

      if (result.type === 'complete') {
        playChime(ctx, fxGain, 'perfect');
        finish();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        quit();
        return;
      }
      if (e.repeat || e.key.length !== 1) return;
      setActiveKey(e.key.toUpperCase());
      processChar(e.key);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key.length !== 1) return;
      const key = e.key.toUpperCase();
      setActiveKey((k) => (k === key ? null : k));
    }

    function onMobileInput(e: Event) {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      target.value = '';
      if (value.length === 0) return;
      const ch = value[value.length - 1];
      setActiveKey(ch.toUpperCase());
      window.clearTimeout(mobileKeyFlashTimer);
      mobileKeyFlashTimer = window.setTimeout(() => setActiveKey(null), 150);
      processChar(ch);
    }

    if (IS_TOUCH) {
      mobileInputRef.current?.addEventListener('input', onMobileInput);
      mobileInputRef.current?.focus();
    } else {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }

    return () => {
      if (!finished) fxGain.disconnect();
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, paragraphText, difficulty]);

  function handleStart() {
    getAudioContext().resume().catch(() => {});
    setParagraphText(pickParagraph(difficulty));
    setTyped(0);
    setWrongSeq(0);
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
        <h1 className="wordmark wordmark--small">Paragraph Mode</h1>
        <p className="tagline">One continuous paragraph, nothing hidden — just keep attaching.</p>

        <div className="difficulty-picker" role="radiogroup" aria-label="Difficulty">
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

        <div className="panel sentence-screen__hint">
          <p>
            Type straight through the whole paragraph — every word flows into the next, no reset between sentences.
            The full text stays visible the entire time.
          </p>
        </div>

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
    <div className="screen gameplay-screen sentence-screen">
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
          <span className="gameplay-hud__label">WPM</span>
          <span className="gameplay-hud__value">{Math.round(hud.wpm)}</span>
        </div>
        <div className="gameplay-hud__stat">
          <span className="gameplay-hud__label">Accuracy</span>
          <span className="gameplay-hud__value">{hud.accuracy.toFixed(1)}%</span>
        </div>
        <div className="gameplay-hud__stat">
          <span className="gameplay-hud__label">Combo</span>
          <span className="gameplay-hud__value">{hud.combo}</span>
        </div>
      </div>

      <div className="gameplay-progress">
        <div
          className="gameplay-progress__fill"
          style={{ width: `${paragraphText.length ? (typed / paragraphText.length) * 100 : 0}%` }}
        />
      </div>

      <div className="gameplay-body">
        <SentenceStage text={paragraphText} typed={typed} revealWindow={NO_FOG_WINDOW} wrongSeq={wrongSeq} />
        {!IS_TOUCH && <AnimatedKeyboard mode="live" activeKey={activeKey} />}
      </div>

      <div className="sentence-controls-hint">
        <kbd>Esc</kbd> exit
      </div>
    </div>
  );
}
