import { useEffect, useState, type CSSProperties } from 'react';
import { getSongById } from '../../data/songs';
import { getAudioContext, playChime, scheduleSong } from '../../engine/audioEngine';
import { beatAnimationDelay } from '../../engine/beatClock';
import { gradeForAccuracy } from '../../engine/chartEngine';
import { SentenceRunner, wpmFrom } from '../../engine/sentenceRunner';
import { RoomClient } from '../../multiplayer/RoomClient';
import { clearPendingSession } from '../../multiplayer/session';
import type { PlayerResult, RoomState } from '../../multiplayer/types';
import type { Difficulty, SongDefinition } from '../../types/song';
import { getVolume } from '../../utils/settings';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import RaceTrack, { type Racer } from '../../components/RaceTrack/RaceTrack';
import SentenceStage from '../SentenceScreen/SentenceStage';

/** Backing track borrowed purely for ambiance/beat-sync — its word chart is never used. */
const AMBIENT_SONG_ID = 'binary-sunset';
const REVEAL_WINDOW: Record<Difficulty, number> = { easy: 14, normal: 9, hard: 5 };

interface SentenceBattleStageProps {
  client: RoomClient;
  room: RoomState;
  racers: Racer[];
  onCarProgress: (progress: number) => void;
  onEliminated: () => void;
  onLeave: () => void;
}

interface HudState {
  wpm: number;
  accuracy: number;
  combo: number;
}

const INITIAL_HUD: HudState = { wpm: 0, accuracy: 100, combo: 0 };

export default function SentenceBattleStage({ client, room, racers, onLeave, onCarProgress }: SentenceBattleStageProps) {
  const [typed, setTyped] = useState(0);
  const [wrongSeq, setWrongSeq] = useState(0);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [beatPulseStyle, setBeatPulseStyle] = useState<CSSProperties>({});

  const sessionText = room.sentenceText ?? '';

  useEffect(() => {
    const maybeAmbientSong = getSongById(AMBIENT_SONG_ID);
    if (!sessionText || !maybeAmbientSong) {
      onLeave();
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
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    }

    function leave() {
      if (finished) return;
      finished = true;
      masterGain?.disconnect();
      fxGain.disconnect();
      teardown();
      client.leaveRoom();
      client.destroy();
      clearPendingSession();
      onLeave();
    }

    function finish() {
      if (finished) return;
      finished = true;
      masterGain?.disconnect();
      fxGain.disconnect();
      teardown();

      const accuracy = runner.accuracy;
      const grade = gradeForAccuracy(accuracy);
      // Completing your text is the only way to finish a Sentence race — there's no duration timeout, unlike Song mode.
      const result: PlayerResult = { score: runner.score, maxCombo: runner.maxCombo, accuracy, grade, wonByFinish: true };
      client.sendFinished(result);
    }

    function pushHud() {
      const elapsedSec = typingStartAt !== null ? ctx.currentTime - typingStartAt : 0;
      setHud({
        wpm: wpmFrom(runner.typed, elapsedSec),
        accuracy: runner.accuracy,
        combo: runner.combo,
      });
    }

    function processChar(ch: string) {
      if (typingStartAt === null) typingStartAt = ctx.currentTime;
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

      const progress = runner.typed / runner.length;
      onCarProgress(progress);
      client.sendProgress({ carProgress: progress, score: runner.score, combo: runner.combo, accuracy: runner.accuracy });

      if (result.type === 'complete') {
        playChime(ctx, fxGain, 'perfect');
        finish();
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        leave();
        return;
      }
      if (finished || e.repeat || e.key.length !== 1) return;
      setActiveKey(e.key.toUpperCase());
      processChar(e.key);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (e.key.length !== 1) return;
      const key = e.key.toUpperCase();
      setActiveKey((k) => (k === key ? null : k));
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    return () => {
      if (!finished) {
        masterGain?.disconnect();
        fxGain.disconnect();
      }
      teardown();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionText]);

  return (
    <>
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

      <RaceTrack racers={racers} />

      <div className="gameplay-body">
        <div className="beat-pulse" style={beatPulseStyle} aria-hidden="true" />
        <SentenceStage
          text={sessionText}
          typed={typed}
          revealWindow={REVEAL_WINDOW[room.difficulty]}
          wrongSeq={wrongSeq}
        />
        <AnimatedKeyboard mode="live" activeKey={activeKey} />
      </div>
    </>
  );
}
