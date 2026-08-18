import { useEffect, useRef, useState } from 'react';
import { getSongById } from '../../data/songs';
import { getAudioContext, playChime, scheduleSong } from '../../engine/audioEngine';
import { WordRunner, gradeForAccuracy } from '../../engine/chartEngine';
import type { Judgement, RunResult } from '../../types/game';
import type { Difficulty } from '../../types/song';
import { recordScoreIfBest } from '../../utils/highScores';
import { formatScore } from '../../utils/format';
import { getInputOffsetMs, getVolume } from '../../utils/settings';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import WordStage from './WordStage';
import './GameplayScreen.css';

const COUNTDOWN_SEC = 2;
const QUEUE_PREVIEW = 3;
const LETTER_RE = /^[a-zA-Z]$/;

interface GameplayScreenProps {
  songId: string;
  difficulty: Difficulty;
  onFinish: (result: RunResult) => void;
  onQuit: () => void;
}

interface HudState {
  score: number;
  combo: number;
  accuracy: number;
  lastJudgement: Judgement | null;
  judgementSeq: number;
}

interface StageState {
  word: string;
  typed: number;
  fractionRemaining: number;
  overtime: boolean;
  upcoming: string[];
}

const INITIAL_HUD: HudState = { score: 0, combo: 0, accuracy: 100, lastJudgement: null, judgementSeq: 0 };
const INITIAL_STAGE: StageState = { word: '', typed: 0, fractionRemaining: 1, overtime: false, upcoming: [] };

export default function GameplayScreen({ songId, difficulty, onFinish, onQuit }: GameplayScreenProps) {
  const actionsRef = useRef({ togglePause: () => {}, quit: () => {} });
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [stage, setStage] = useState<StageState>(INITIAL_STAGE);
  const [paused, setPausedState] = useState(false);
  const [progress, setProgressState] = useState(0);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    const song = getSongById(songId);
    if (!song) {
      onQuit();
      return;
    }

    const ctx = getAudioContext();
    ctx.resume().catch(() => {});

    const masterGain = ctx.createGain();
    masterGain.gain.value = getVolume();
    masterGain.connect(ctx.destination);

    const fxGain = ctx.createGain();
    fxGain.gain.value = 0.5;
    fxGain.connect(ctx.destination);

    const runner = new WordRunner(song.charts[difficulty]);
    const offsetSec = getInputOffsetMs() / 1000;
    const startAt = ctx.currentTime + COUNTDOWN_SEC;
    const durationSec = song.durationSec;
    scheduleSong(ctx, song, startAt, masterGain);

    let finished = false;
    let isPaused = false;
    let raf = 0;

    function teardown() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibility);
    }

    function finish() {
      if (finished) return;
      finished = true;
      masterGain.disconnect();
      fxGain.disconnect();
      teardown();

      const accuracy = runner.accuracy;
      const grade = gradeForAccuracy(accuracy);
      const isNewBest = recordScoreIfBest(songId, difficulty, { score: runner.score, accuracy, grade });
      onFinish({
        songId,
        difficulty,
        score: runner.score,
        maxCombo: runner.maxCombo,
        accuracy,
        counts: runner.counts,
        grade,
        isNewBest,
      });
    }

    function quit() {
      if (finished) return;
      finished = true;
      masterGain.disconnect();
      fxGain.disconnect();
      teardown();
      onQuit();
    }

    function setPaused(next: boolean) {
      isPaused = next;
      if (next) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
      setPausedState(next);
    }

    actionsRef.current = { togglePause: () => setPaused(!isPaused), quit };

    function bumpHud(judgement: Judgement) {
      setHud((h) => ({
        score: runner.score,
        combo: runner.combo,
        accuracy: runner.accuracy,
        lastJudgement: judgement,
        judgementSeq: h.judgementSeq + 1,
      }));
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        setPaused(!isPaused);
        return;
      }
      if (isPaused || e.repeat || !LETTER_RE.test(e.key)) return;

      const letter = e.key.toUpperCase();
      setActiveKey(letter);

      const rawSongTime = ctx.currentTime - startAt;
      const judgeTime = rawSongTime - offsetSec;
      const result = runner.handleKey(letter, judgeTime);
      if (result.type === 'ignored') return;

      playChime(ctx, fxGain, 'key');
      if (result.type === 'wordComplete') {
        playChime(ctx, fxGain, result.judgement);
        bumpHud(result.judgement);
      }
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey((k) => (k === letter ? null : k));
    }

    function onVisibility() {
      if (document.hidden && !isPaused) setPaused(true);
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    document.addEventListener('visibilitychange', onVisibility);

    function loop() {
      if (!isPaused) {
        const rawSongTime = ctx.currentTime - startAt;
        const judgeTime = rawSongTime - offsetSec;

        if (runner.sweepMisses(judgeTime)) {
          playChime(ctx, fxGain, 'miss');
          bumpHud('miss');
        }

        const active = runner.activeWord;
        if (active) {
          const prevDeadline = runner.activeIndex > 0 ? runner.words[runner.activeIndex - 1].note.time : 0;
          const budget = Math.max(0.001, active.note.time - prevDeadline);
          const fractionRemaining = 1 - (judgeTime - prevDeadline) / budget;
          const upcoming = runner.words
            .slice(runner.activeIndex + 1, runner.activeIndex + 1 + QUEUE_PREVIEW)
            .map((w) => w.note.word);

          setStage({
            word: active.note.word,
            typed: active.typed,
            fractionRemaining,
            overtime: judgeTime > active.note.time,
            upcoming,
          });
        }

        setProgressState(Math.min(1, Math.max(0, rawSongTime / durationSec)));

        if (runner.isComplete || rawSongTime >= durationSec) {
          finish();
          return;
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      if (!finished) {
        masterGain.disconnect();
        fxGain.disconnect();
      }
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, difficulty]);

  return (
    <div className="screen gameplay-screen">
      <div className="gameplay-hud">
        <div className="gameplay-hud__stat">
          <span className="gameplay-hud__label">Score</span>
          <span className="gameplay-hud__value">{formatScore(hud.score)}</span>
        </div>
        <div className="gameplay-hud__stat">
          <span className="gameplay-hud__label">Combo</span>
          <span className="gameplay-hud__value">{hud.combo}</span>
        </div>
        <div className="gameplay-hud__stat">
          <span className="gameplay-hud__label">Accuracy</span>
          <span className="gameplay-hud__value">{hud.accuracy.toFixed(1)}%</span>
        </div>
      </div>

      <div className="gameplay-progress">
        <div className="gameplay-progress__fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="gameplay-body">
        <WordStage
          word={stage.word}
          typed={stage.typed}
          fractionRemaining={stage.fractionRemaining}
          overtime={stage.overtime}
          upcoming={stage.upcoming}
        />
        <AnimatedKeyboard mode="live" activeKey={activeKey} />

        {hud.lastJudgement && (
          <div
            key={hud.judgementSeq}
            className={`gameplay-judgement gameplay-judgement--${hud.lastJudgement}`}
          >
            {hud.lastJudgement.toUpperCase()}
          </div>
        )}
      </div>

      {paused && (
        <div className="gameplay-pause">
          <div className="panel gameplay-pause__panel">
            <h2 className="wordmark wordmark--small">Paused</h2>
            <div className="cap-row">
              <button type="button" className="cap cap--primary" onClick={() => actionsRef.current.togglePause()}>
                Resume
              </button>
              <button type="button" className="cap" onClick={() => actionsRef.current.quit()}>
                Quit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
