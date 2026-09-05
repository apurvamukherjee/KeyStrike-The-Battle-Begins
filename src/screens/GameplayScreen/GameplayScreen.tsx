import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { getSongById } from '../../data/songs';
import { getAudioContext, playChime, scheduleSong } from '../../engine/audioEngine';
import { beatAnimationDelay, distanceToBeat } from '../../engine/beatClock';
import { WordRunner, gradeForAccuracy } from '../../engine/chartEngine';
import { applyIntensity } from '../../engine/musicIntensity';
import { advanceCarProgress } from '../../engine/raceProgress';
import { scaleSongTiming } from '../../engine/songBuilder';
import type { GhostFrame, GhostReplay, Judgement, RunResult } from '../../types/game';
import type { Difficulty } from '../../types/song';
import { recordScoreIfBest } from '../../utils/highScores';
import { saveGhostReplay } from '../../utils/ghostReplays';
import { recordRun, recordKeyStats, type KeyStat } from '../../utils/stats';
import { formatScore } from '../../utils/format';
import { getGameSpeed, getInputOffsetMs, getVolume } from '../../utils/settings';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import RaceTrack from '../../components/RaceTrack/RaceTrack';
import WordStage from './WordStage';
import './GameplayScreen.css';

const COUNTDOWN_SEC = 2;
const QUEUE_PREVIEW = 3;
const LETTER_RE = /^[a-zA-Z]$/;
const COMBO_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 500];
const IS_TOUCH = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches;
/** How close (seconds) a keystroke must land to a beat boundary to earn the Beat Challenge bonus. */
const BEAT_CHALLENGE_WINDOW_SEC = 0.08;
const BEAT_CHALLENGE_BONUS = 15;

interface GameplayScreenProps {
  songId: string;
  difficulty: Difficulty;
  beatChallenge: boolean;
  /** Your best-ever run for this song+difficulty, if any — raced live as a translucent second car. */
  ghostReplay?: GhostReplay;
  onFinish: (result: RunResult) => void;
  onQuit: () => void;
}

interface RaceState {
  you: number;
  ghost: number;
}

interface HudState {
  score: number;
  combo: number;
  accuracy: number;
  lastJudgement: Judgement | null;
  judgementSeq: number;
  shakeSeq: number;
  milestone: number | null;
  milestoneSeq: number;
  onBeatHits: number;
}

interface StageState {
  word: string;
  typed: number;
  fractionRemaining: number;
  overtime: boolean;
  upcoming: string[];
}

const INITIAL_HUD: HudState = {
  score: 0,
  combo: 0,
  accuracy: 100,
  lastJudgement: null,
  judgementSeq: 0,
  shakeSeq: 0,
  milestone: null,
  milestoneSeq: 0,
  onBeatHits: 0,
};
const INITIAL_STAGE: StageState = { word: '', typed: 0, fractionRemaining: 1, overtime: false, upcoming: [] };

export default function GameplayScreen({
  songId,
  difficulty,
  beatChallenge,
  ghostReplay,
  onFinish,
  onQuit,
}: GameplayScreenProps) {
  const actionsRef = useRef({ togglePause: () => {}, quit: () => {} });
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [stage, setStage] = useState<StageState>(INITIAL_STAGE);
  const [paused, setPausedState] = useState(false);
  const [progress, setProgressState] = useState(0);
  const [race, setRace] = useState<RaceState | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [mobileStarted, setMobileStarted] = useState(!IS_TOUCH);
  const [beatPulseStyle, setBeatPulseStyle] = useState<CSSProperties>({});

  useEffect(() => {
    if (!mobileStarted) return;

    const baseSong = getSongById(songId);
    if (!baseSong) {
      onQuit();
      return;
    }
    const gameSpeed = getGameSpeed();
    const song = scaleSongTiming(baseSong, gameSpeed);
    // scaleSongTiming divides every timestamp by gameSpeed without touching song.bpm,
    // so the beat grid's *effective* tempo after scaling is the original bpm times speed.
    const effectiveBpm = baseSong.bpm * gameSpeed;

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
    const reactiveLayers = scheduleSong(ctx, song, startAt, masterGain);

    setBeatPulseStyle({
      animationDuration: `${60 / effectiveBpm}s`,
      animationDelay: `${beatAnimationDelay(ctx.currentTime, startAt, effectiveBpm)}s`,
    });

    let finished = false;
    let isPaused = false;
    let raf = 0;
    let comboMilestonesHit = 0;
    let mobileKeyFlashTimer = 0;
    let carProgress = 0;
    let ghostFrameIndex = 0;
    const ghostFrames: GhostFrame[] = [];
    const hasGhost = !!ghostReplay;
    let lastAcceptedTime: number | null = null;
    const keyStats: Record<string, KeyStat> = {};

    function teardown() {
      cancelAnimationFrame(raf);
      window.clearTimeout(mobileKeyFlashTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      mobileInputRef.current?.removeEventListener('input', onMobileInput);
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
      if (isNewBest) {
        saveGhostReplay(songId, difficulty, {
          songId,
          difficulty,
          frames: ghostFrames,
          score: runner.score,
          recordedAt: Date.now(),
        });
      }
      const raceGhost = ghostReplay ? { won: runner.score > ghostReplay.score } : undefined;

      const longestCleared = runner.words
        .filter((w) => w.judgement === 'perfect' || w.judgement === 'good')
        .reduce((longest, w) => (w.note.word.length > longest.length ? w.note.word : longest), '');
      recordRun({ maxCombo: runner.maxCombo, score: runner.score, counts: runner.counts }, longestCleared);
      recordKeyStats(keyStats);

      onFinish({
        songId,
        difficulty,
        beatChallenge,
        score: runner.score,
        maxCombo: runner.maxCombo,
        accuracy,
        counts: runner.counts,
        grade,
        isNewBest,
        raceGhost,
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
      const milestoneIndex = COMBO_MILESTONES.indexOf(runner.combo);
      const hitNewMilestone = judgement !== 'miss' && milestoneIndex !== -1 && milestoneIndex >= comboMilestonesHit;
      if (hitNewMilestone) comboMilestonesHit = milestoneIndex + 1;

      applyIntensity(ctx, reactiveLayers, runner.multiplier());

      setHud((h) => ({
        score: runner.score,
        combo: runner.combo,
        accuracy: runner.accuracy,
        lastJudgement: judgement,
        judgementSeq: h.judgementSeq + 1,
        shakeSeq: judgement === 'miss' ? h.shakeSeq + 1 : h.shakeSeq,
        milestone: hitNewMilestone ? runner.combo : h.milestone,
        milestoneSeq: hitNewMilestone ? h.milestoneSeq + 1 : h.milestoneSeq,
        onBeatHits: h.onBeatHits,
      }));
    }

    function bumpOnBeat() {
      setHud((h) => ({ ...h, score: runner.score, onBeatHits: h.onBeatHits + 1 }));
    }

    /** Advances this run's own race-car progress and, since every run might become the next ghost, always records the frame. */
    function advanceRace(judgement: Judgement, rawSongTime: number) {
      carProgress = advanceCarProgress(carProgress, runner.totalWords, judgement, runner.multiplier());
      ghostFrames.push({ songFraction: Math.min(1, rawSongTime / durationSec), carProgress });
    }

    /** Feeds the Stats screen's typing heatmap — tracks every keypress against whether it was expected at that position, and how long correct ones took since the last accepted keystroke. */
    function recordKeyPress(letter: string, correct: boolean, judgeTime: number) {
      const entry =
        keyStats[letter] ?? (keyStats[letter] = { presses: 0, mistakes: 0, correctLatencyMs: 0, correctCount: 0 });
      entry.presses++;
      if (!correct) {
        entry.mistakes++;
        return;
      }
      if (lastAcceptedTime !== null) {
        entry.correctLatencyMs += Math.max(0, (judgeTime - lastAcceptedTime) * 1000);
        entry.correctCount++;
      }
      lastAcceptedTime = judgeTime;
    }

    function processLetter(letter: string) {
      const rawSongTime = ctx.currentTime - startAt;
      const judgeTime = rawSongTime - offsetSec;
      const active = runner.activeWord;
      const expected = active ? active.note.word[active.typed] : undefined;

      const result = runner.handleKey(letter, judgeTime);
      if (result.type === 'ignored') {
        if (expected) recordKeyPress(letter, false, judgeTime);
        return;
      }
      recordKeyPress(letter, true, judgeTime);

      playChime(ctx, fxGain, 'key');

      if (beatChallenge && distanceToBeat(judgeTime, effectiveBpm) <= BEAT_CHALLENGE_WINDOW_SEC) {
        runner.addBonus(BEAT_CHALLENGE_BONUS);
        playChime(ctx, fxGain, 'onbeat');
        bumpOnBeat();
      }

      if (result.type === 'wordComplete') {
        playChime(ctx, fxGain, result.judgement);
        bumpHud(result.judgement);
        advanceRace(result.judgement, rawSongTime);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        setPaused(!isPaused);
        return;
      }
      if (isPaused || e.repeat || !LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey(letter);
      processLetter(letter);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey((k) => (k === letter ? null : k));
    }

    // Mobile virtual keyboards don't reliably fire usable `keydown.key` values
    // (iOS Safari especially), so on touch devices a hidden, always-focused
    // text input drives the same processLetter() pipeline via its value diff.
    function onMobileInput(e: Event) {
      const target = e.target as HTMLInputElement;
      const value = target.value;
      target.value = '';
      if (isPaused || value.length === 0) return;
      const letter = value[value.length - 1].toUpperCase();
      if (!LETTER_RE.test(letter)) return;
      setActiveKey(letter);
      window.clearTimeout(mobileKeyFlashTimer);
      mobileKeyFlashTimer = window.setTimeout(() => setActiveKey(null), 150);
      processLetter(letter);
    }

    function onVisibility() {
      if (document.hidden && !isPaused) setPaused(true);
    }

    if (IS_TOUCH) {
      mobileInputRef.current?.addEventListener('input', onMobileInput);
      mobileInputRef.current?.focus();
    } else {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }
    document.addEventListener('visibilitychange', onVisibility);

    function loop() {
      if (!isPaused) {
        const rawSongTime = ctx.currentTime - startAt;
        const judgeTime = rawSongTime - offsetSec;

        if (runner.sweepMisses(judgeTime)) {
          playChime(ctx, fxGain, 'miss');
          bumpHud('miss');
          advanceRace('miss', rawSongTime);
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

        if (hasGhost) {
          const songFraction = Math.min(1, rawSongTime / durationSec);
          const frames = ghostReplay!.frames;
          while (ghostFrameIndex < frames.length && frames[ghostFrameIndex].songFraction <= songFraction) {
            ghostFrameIndex++;
          }
          const ghostProgress = ghostFrameIndex > 0 ? frames[ghostFrameIndex - 1].carProgress : 0;
          setRace({ you: carProgress, ghost: ghostProgress });
        }

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
  }, [songId, difficulty, beatChallenge, mobileStarted]);

  if (IS_TOUCH && !mobileStarted) {
    return (
      <div className="screen">
        <h1 className="wordmark wordmark--small">Tap to Start</h1>
        <div className="panel">
          <p className="gameplay-no-keyboard__copy">
            KeyStrike is a typing game — tapping below opens your keyboard so you can type each word as it
            appears.
          </p>
        </div>
        <div className="cap-row">
          <button
            type="button"
            className="cap cap--primary"
            onClick={() => {
              getAudioContext().resume().catch(() => {});
              setMobileStarted(true);
              window.setTimeout(() => mobileInputRef.current?.focus(), 50);
            }}
          >
            Tap to Start
          </button>
          <button type="button" className="cap" onClick={onQuit}>
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
        {beatChallenge && (
          <div className="gameplay-hud__stat">
            <span className="gameplay-hud__label">On-Beat</span>
            <span className="gameplay-hud__value">{hud.onBeatHits}</span>
          </div>
        )}
      </div>

      {race && (
        <div className="gameplay-race">
          <RaceTrack
            racers={[
              { id: 'you', nickname: 'You', avatarIndex: 0, carProgress: race.you, isYou: true, finished: false, connected: true },
              {
                id: 'ghost',
                nickname: 'Ghost',
                avatarIndex: 6,
                carProgress: race.ghost,
                isYou: false,
                finished: false,
                connected: true,
                ghost: true,
              },
            ]}
          />
        </div>
      )}

      <div className="gameplay-progress">
        <div className="gameplay-progress__fill" style={{ width: `${progress * 100}%` }} />
      </div>

      <div
        className={`gameplay-body${hud.shakeSeq > 0 ? ' gameplay-body--shake' : ''}`}
        key={hud.shakeSeq}
      >
        <div className="beat-pulse" style={beatPulseStyle} aria-hidden="true" />
        <WordStage
          word={stage.word}
          typed={stage.typed}
          fractionRemaining={stage.fractionRemaining}
          overtime={stage.overtime}
          upcoming={stage.upcoming}
        />
        {!IS_TOUCH && <AnimatedKeyboard mode="live" activeKey={activeKey} />}

        {hud.lastJudgement && (
          <div key={hud.judgementSeq} className={`gameplay-judgement gameplay-judgement--${hud.lastJudgement}`}>
            {hud.lastJudgement.toUpperCase()}
          </div>
        )}

        {hud.milestone && (
          <div key={hud.milestoneSeq} className="gameplay-milestone">
            {hud.milestone}x COMBO
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
