import { useEffect, useRef, useState } from 'react';
import { getSongById } from '../../data/songs';
import { getAudioContext, playChime, scheduleSong } from '../../engine/audioEngine';
import { WordRunner } from '../../engine/chartEngine';
import { scaleSongTiming, sliceSong } from '../../engine/songBuilder';
import type { Difficulty } from '../../types/song';
import { getVolume } from '../../utils/settings';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import WordStage from '../GameplayScreen/WordStage';
import './PracticeScreen.css';

const SPEED_STEPS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const DEFAULT_SPEED_INDEX = SPEED_STEPS.indexOf(1);
const QUEUE_PREVIEW = 3;
const LETTER_RE = /^[a-zA-Z]$/;

interface PracticeScreenProps {
  songId: string;
  difficulty: Difficulty;
  onExit: () => void;
}

interface StageState {
  word: string;
  typed: number;
  fractionRemaining: number;
  overtime: boolean;
  upcoming: string[];
}

const INITIAL_STAGE: StageState = { word: '', typed: 0, fractionRemaining: 1, overtime: false, upcoming: [] };

export default function PracticeScreen({ songId, difficulty, onExit }: PracticeScreenProps) {
  const [speedIdx, setSpeedIdx] = useState(DEFAULT_SPEED_INDEX);
  const [loopStart, setLoopStart] = useState<number | null>(null);
  const [loopEnd, setLoopEnd] = useState<number | null>(null);
  const [stage, setStage] = useState<StageState>(INITIAL_STAGE);
  const [paused, setPausedState] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const actionsRef = useRef({ togglePause: () => {}, exit: () => {} });
  const playheadRef = useRef(0);

  const speed = SPEED_STEPS[speedIdx];

  useEffect(() => {
    const baseSong = getSongById(songId);
    if (!baseSong) {
      onExit();
      return;
    }

    const windowStart = loopStart ?? 0;
    const windowEnd = Math.max(windowStart + 1, loopEnd ?? baseSong.durationSec);
    const sliced = sliceSong(baseSong, difficulty, windowStart, windowEnd);
    const song = scaleSongTiming(sliced, speed);

    const ctx = getAudioContext();
    ctx.resume().catch(() => {});

    const fxGain = ctx.createGain();
    fxGain.gain.value = 0.5;
    fxGain.connect(ctx.destination);

    let masterGain: GainNode | null = null;
    let runner = new WordRunner(song.charts[difficulty]);
    let startAt = 0;
    let isPaused = false;
    let stopped = false;
    let raf = 0;

    function scheduleIteration() {
      masterGain?.disconnect();
      masterGain = ctx.createGain();
      masterGain.gain.value = getVolume();
      masterGain.connect(ctx.destination);
      runner = new WordRunner(song.charts[difficulty]);
      startAt = ctx.currentTime + 0.3;
      scheduleSong(ctx, song, startAt, masterGain);
    }
    scheduleIteration();

    function teardown() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    }

    function exit() {
      if (stopped) return;
      stopped = true;
      masterGain?.disconnect();
      fxGain.disconnect();
      teardown();
      onExit();
    }

    function setPaused(next: boolean) {
      isPaused = next;
      if (next) ctx.suspend().catch(() => {});
      else ctx.resume().catch(() => {});
      setPausedState(next);
    }

    actionsRef.current = { togglePause: () => setPaused(!isPaused), exit };

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        exit();
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        setPaused(!isPaused);
        return;
      }
      if (e.code === 'BracketLeft') {
        setLoopStart(playheadRef.current);
        return;
      }
      if (e.code === 'BracketRight') {
        setLoopEnd(playheadRef.current);
        return;
      }
      if (e.code === 'KeyR') {
        setLoopStart(null);
        setLoopEnd(null);
        return;
      }
      if (e.code === 'ArrowRight') {
        setSpeedIdx((i) => Math.min(SPEED_STEPS.length - 1, i + 1));
        return;
      }
      if (e.code === 'ArrowLeft') {
        setSpeedIdx((i) => Math.max(0, i - 1));
        return;
      }

      if (isPaused || e.repeat || !LETTER_RE.test(e.key)) return;

      const letter = e.key.toUpperCase();
      setActiveKey(letter);
      const judgeTime = ctx.currentTime - startAt;
      const result = runner.handleKey(letter, judgeTime);
      if (result.type === 'ignored') return;
      playChime(ctx, fxGain, 'key');
      if (result.type === 'wordComplete') playChime(ctx, fxGain, result.judgement);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey((k) => (k === letter ? null : k));
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function loop() {
      if (!isPaused) {
        const songTime = ctx.currentTime - startAt;
        playheadRef.current = windowStart + Math.max(0, songTime) * speed;

        runner.sweepMisses(songTime);

        const active = runner.activeWord;
        if (active) {
          const prevDeadline = runner.activeIndex > 0 ? runner.words[runner.activeIndex - 1].note.time : 0;
          const budget = Math.max(0.001, active.note.time - prevDeadline);
          const fractionRemaining = 1 - (songTime - prevDeadline) / budget;
          const upcoming = runner.words
            .slice(runner.activeIndex + 1, runner.activeIndex + 1 + QUEUE_PREVIEW)
            .map((w) => w.note.word);

          setStage({
            word: active.note.word,
            typed: active.typed,
            fractionRemaining,
            overtime: songTime > active.note.time,
            upcoming,
          });
        }

        if (runner.isComplete || songTime >= song.durationSec) {
          scheduleIteration();
        }
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      if (!stopped) {
        masterGain?.disconnect();
        fxGain.disconnect();
      }
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [songId, difficulty, loopStart, loopEnd, speed]);

  const loopLabel =
    loopStart !== null || loopEnd !== null
      ? `Loop ${(loopStart ?? 0).toFixed(1)}s – ${loopEnd !== null ? `${loopEnd.toFixed(1)}s` : 'end'}`
      : 'Looping whole song';

  return (
    <div className="screen gameplay-screen practice-screen">
      <div className="practice-hud">
        <span className="practice-hud__item">{Math.round(speed * 100)}% speed</span>
        <span className="practice-hud__item">{loopLabel}</span>
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
      </div>

      <div className="practice-controls-hint">
        <kbd>[</kbd> start <kbd>]</kbd> end <kbd>R</kbd> reset <kbd>&larr;</kbd>/<kbd>&rarr;</kbd> speed{' '}
        <kbd>Space</kbd> pause <kbd>Esc</kbd> exit
      </div>

      {paused && (
        <div className="gameplay-pause">
          <div className="panel gameplay-pause__panel">
            <h2 className="wordmark wordmark--small">Paused</h2>
            <div className="cap-row">
              <button type="button" className="cap cap--primary" onClick={() => actionsRef.current.togglePause()}>
                Resume
              </button>
              <button type="button" className="cap" onClick={() => actionsRef.current.exit()}>
                Exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
