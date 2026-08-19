import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { pickSentences } from '../../data/sentences';
import { getSongById } from '../../data/songs';
import { getAudioContext, playChime, scheduleSong } from '../../engine/audioEngine';
import { beatAnimationDelay, distanceToBeat } from '../../engine/beatClock';
import { gradeForAccuracy } from '../../engine/chartEngine';
import { SentenceRunner, wpmFrom } from '../../engine/sentenceRunner';
import type { SentenceRunResult } from '../../types/game';
import { DIFFICULTIES, type Difficulty, type SongDefinition } from '../../types/song';
import { getVolume } from '../../utils/settings';
import { recordSentenceRun } from '../../utils/stats';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import SentenceStage from './SentenceStage';
import './SentenceScreen.css';

const SESSION_SENTENCE_COUNT = 4;
/** Backing track borrowed purely for ambiance/beat-sync — its word chart is never used. */
const AMBIENT_SONG_ID = 'binary-sunset';
const REVEAL_WINDOW: Record<Difficulty, number> = { easy: 14, normal: 9, hard: 5 };
const BEAT_CHALLENGE_WINDOW_SEC = 0.08;
const BEAT_CHALLENGE_BONUS = 15;
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;

const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  easy: 'Easy',
  normal: 'Normal',
  hard: 'Hard',
};

interface SentenceScreenProps {
  /** Pre-fills the setup picker; combined with `autoStart`, skips straight into a fresh session with these settings (used by "Retry" from results). */
  initialDifficulty?: Difficulty;
  initialBeatChallenge?: boolean;
  autoStart?: boolean;
  onFinish: (result: SentenceRunResult) => void;
  onExit: () => void;
}

type Phase = 'setup' | 'playing';

interface HudState {
  wpm: number;
  accuracy: number;
  combo: number;
  onBeatHits: number;
}

const INITIAL_HUD: HudState = { wpm: 0, accuracy: 100, combo: 0, onBeatHits: 0 };

export default function SentenceScreen({
  initialDifficulty,
  initialBeatChallenge,
  autoStart,
  onFinish,
  onExit,
}: SentenceScreenProps) {
  const [phase, setPhase] = useState<Phase>(autoStart ? 'playing' : 'setup');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty ?? 'normal');
  const [beatChallenge, setBeatChallenge] = useState(initialBeatChallenge ?? false);
  const [sessionText, setSessionText] = useState(() =>
    autoStart ? pickSentences(initialDifficulty ?? 'normal', SESSION_SENTENCE_COUNT).join(' ') : ''
  );
  const [typed, setTyped] = useState(0);
  const [wrongSeq, setWrongSeq] = useState(0);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [beatPulseStyle, setBeatPulseStyle] = useState<CSSProperties>({});
  const mobileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (phase === 'playing' && IS_TOUCH) window.setTimeout(() => mobileInputRef.current?.focus(), 50);
  }, [phase]);

  useEffect(() => {
    if (phase !== 'playing') return;

    const maybeAmbientSong = getSongById(AMBIENT_SONG_ID);
    if (!maybeAmbientSong) {
      onExit();
      return;
    }
    // Re-bound with an explicit type: TS doesn't carry narrowing from the
    // guard above into the nested function declarations below that close
    // over it (a `function` closure limitation, not an arrow-function one).
    const ambientSong: SongDefinition = maybeAmbientSong;

    const ctx = getAudioContext();
    ctx.resume().catch(() => {});

    const fxGain = ctx.createGain();
    fxGain.gain.value = 0.5;
    fxGain.connect(ctx.destination);

    const runner = new SentenceRunner(sessionText);
    let masterGain: GainNode | null = null;
    let ambientStartAt = 0;
    let ambientLoopTimer = 0;
    let typingStartAt: number | null = null;
    let mobileKeyFlashTimer = 0;
    let finished = false;

    function scheduleAmbientLoop() {
      masterGain?.disconnect();
      masterGain = ctx.createGain();
      masterGain.gain.value = getVolume() * 0.6; // sits under the typing, not center stage
      masterGain.connect(ctx.destination);
      ambientStartAt = ctx.currentTime + 0.2;
      scheduleSong(ctx, ambientSong, ambientStartAt, masterGain);
      setBeatPulseStyle({
        animationDuration: `${60 / ambientSong.bpm}s`,
        animationDelay: `${beatAnimationDelay(ctx.currentTime, ambientStartAt, ambientSong.bpm)}s`,
      });
      ambientLoopTimer = window.setTimeout(scheduleAmbientLoop, (ambientSong.durationSec + 0.2) * 1000);
    }
    scheduleAmbientLoop();

    function teardown() {
      window.clearTimeout(ambientLoopTimer);
      window.clearTimeout(mobileKeyFlashTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      mobileInputRef.current?.removeEventListener('input', onMobileInput);
    }

    function quit() {
      if (finished) return;
      finished = true;
      masterGain?.disconnect();
      fxGain.disconnect();
      teardown();
      onExit();
    }

    function finish() {
      if (finished) return;
      finished = true;
      masterGain?.disconnect();
      fxGain.disconnect();
      teardown();

      const elapsedSec = typingStartAt !== null ? ctx.currentTime - typingStartAt : 0;
      const accuracy = runner.accuracy;
      const result: SentenceRunResult = {
        difficulty,
        beatChallenge,
        charactersTyped: runner.typed,
        errors: runner.errors,
        accuracy,
        wpm: wpmFrom(runner.typed, elapsedSec),
        maxCombo: runner.maxCombo,
        score: runner.score,
        grade: gradeForAccuracy(accuracy),
      };
      recordSentenceRun(result);
      onFinish(result);
    }

    function pushHud(onBeatDelta: number) {
      const elapsedSec = typingStartAt !== null ? ctx.currentTime - typingStartAt : 0;
      setHud((h) => ({
        wpm: wpmFrom(runner.typed, elapsedSec),
        accuracy: runner.accuracy,
        combo: runner.combo,
        onBeatHits: h.onBeatHits + onBeatDelta,
      }));
    }

    function processChar(ch: string) {
      if (typingStartAt === null) typingStartAt = ctx.currentTime;
      const result = runner.handleKey(ch);

      if (result.type === 'ignored') return;

      if (result.type === 'wrong') {
        playChime(ctx, fxGain, 'miss');
        setWrongSeq((s) => s + 1);
        pushHud(0);
        return;
      }

      playChime(ctx, fxGain, 'key');
      setTyped(runner.typed);

      let onBeatHit = false;
      if (beatChallenge) {
        const judgeTime = ctx.currentTime - ambientStartAt;
        if (distanceToBeat(judgeTime, ambientSong.bpm) <= BEAT_CHALLENGE_WINDOW_SEC) {
          runner.addBonus(BEAT_CHALLENGE_BONUS);
          playChime(ctx, fxGain, 'onbeat');
          onBeatHit = true;
        }
      }
      pushHud(onBeatHit ? 1 : 0);

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

    // Same hidden-focused-input trick as GameplayScreen for mobile virtual keyboards.
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
      if (!finished) {
        masterGain?.disconnect();
        fxGain.disconnect();
      }
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionText, difficulty, beatChallenge]);

  function handleStart() {
    getAudioContext().resume().catch(() => {});
    setSessionText(pickSentences(difficulty, SESSION_SENTENCE_COUNT).join(' '));
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
      } else if (e.code === 'KeyB') {
        setBeatChallenge((b) => !b);
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
        <h1 className="wordmark wordmark--small">Sentence Mode</h1>
        <p className="tagline">Type to reveal — the fog only lifts as far as you've typed.</p>

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

        <div className="sentence-screen__beat-toggle settings__toggle-row">
          <span className="settings__toggle-label">Beat Challenge</span>
          <div className="settings__toggle" role="radiogroup" aria-label="Beat Challenge">
            <button
              type="button"
              role="radio"
              aria-checked={!beatChallenge}
              className={`settings__toggle-option${!beatChallenge ? ' settings__toggle-option--active' : ''}`}
              onClick={() => setBeatChallenge(false)}
            >
              Off
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={beatChallenge}
              className={`settings__toggle-option${beatChallenge ? ' settings__toggle-option--active' : ''}`}
              onClick={() => setBeatChallenge(true)}
            >
              On
            </button>
          </div>
        </div>

        <div className="panel sentence-screen__hint">
          <p>
            Already-typed text stays lit and a caret glides ahead of it. What&rsquo;s coming next fades into fog —
            {' '}
            <strong>{DIFFICULTY_LABEL[difficulty]}</strong> only shows you {REVEAL_WINDOW[difficulty]} characters
            ahead before it disappears.
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
        {beatChallenge && (
          <div className="gameplay-hud__stat">
            <span className="gameplay-hud__label">On-Beat</span>
            <span className="gameplay-hud__value">{hud.onBeatHits}</span>
          </div>
        )}
      </div>

      <div className="gameplay-progress">
        <div
          className="gameplay-progress__fill"
          style={{ width: `${sessionText.length ? (typed / sessionText.length) * 100 : 0}%` }}
        />
      </div>

      <div className="gameplay-body">
        <div className="beat-pulse" style={beatPulseStyle} aria-hidden="true" />
        <SentenceStage text={sessionText} typed={typed} revealWindow={REVEAL_WINDOW[difficulty]} wrongSeq={wrongSeq} />
        {!IS_TOUCH && <AnimatedKeyboard mode="live" activeKey={activeKey} />}
      </div>

      <div className="sentence-controls-hint">
        <kbd>Esc</kbd> exit
      </div>
    </div>
  );
}
