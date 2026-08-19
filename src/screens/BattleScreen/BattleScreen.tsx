import { useEffect, useState } from 'react';
import { getSongById } from '../../data/songs';
import { getAudioContext, playChime, scheduleSong } from '../../engine/audioEngine';
import { WordRunner, gradeForAccuracy } from '../../engine/chartEngine';
import { RoomClient } from '../../multiplayer/RoomClient';
import { clearPendingSession } from '../../multiplayer/session';
import type { PlayerResult, RoomPlayer, RoomState } from '../../multiplayer/types';
import type { Judgement } from '../../types/game';
import { formatScore } from '../../utils/format';
import { getInputOffsetMs, getVolume } from '../../utils/settings';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import RaceTrack, { type Racer } from '../../components/RaceTrack/RaceTrack';
import WordStage from '../GameplayScreen/WordStage';
import './BattleScreen.css';

const LETTER_RE = /^[a-zA-Z]$/;
const QUEUE_PREVIEW = 3;
const PROGRESS_SEND_INTERVAL = 0.25;
const MISS_ADVANCE_FRACTION = 0.15;
const COMBO_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 500];

interface BattleScreenProps {
  client: RoomClient;
  initialRoom: RoomState;
  onResults: (room: RoomState) => void;
  onLeave: () => void;
}

interface HudState {
  score: number;
  combo: number;
  accuracy: number;
  lastJudgement: Judgement | null;
  judgementSeq: number;
  milestone: number | null;
  milestoneSeq: number;
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
  milestone: null,
  milestoneSeq: 0,
};
const INITIAL_STAGE: StageState = { word: '', typed: 0, fractionRemaining: 1, overtime: false, upcoming: [] };

export default function BattleScreen({ client, initialRoom, onResults, onLeave }: BattleScreenProps) {
  const [room, setRoom] = useState(initialRoom);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [stage, setStage] = useState<StageState>(INITIAL_STAGE);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [carProgress, setCarProgress] = useState(0);
  const [countdown, setCountdown] = useState<number | 'go' | null>(null);
  const [eliminated, setEliminated] = useState(false);

  useEffect(() => {
    client.setOnRoomUpdate((next) => {
      setRoom(next);
      if (next.phase === 'results') onResults(next);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client]);

  useEffect(() => {
    const startAtMs = room.startAtMs;
    if (!startAtMs) {
      setCountdown(null);
      return;
    }
    let raf = 0;
    let goTimeout: number;
    function tick() {
      const secLeft = Math.ceil((startAtMs! - Date.now()) / 1000);
      if (secLeft > 0) {
        setCountdown(secLeft);
        raf = requestAnimationFrame(tick);
      } else {
        setCountdown('go');
        goTimeout = window.setTimeout(() => setCountdown(null), 700);
      }
    }
    tick();
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(goTimeout);
    };
  }, [room.startAtMs]);

  useEffect(() => {
    const song = getSongById(room.songId ?? '');
    if (!song) {
      onLeave();
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

    const runner = new WordRunner(song.charts[room.difficulty]);
    const totalWords = Math.max(1, runner.totalWords);
    const offsetSec = getInputOffsetMs() / 1000;
    const localDelayMs = (room.startAtMs ?? Date.now() + 3000) - Date.now();
    const startAt = ctx.currentTime + Math.max(0, localDelayMs) / 1000;
    const durationSec = song.durationSec;
    scheduleSong(ctx, song, startAt, masterGain);

    let finished = false;
    let crashedOut = false;
    let raf = 0;
    let progress = 0;
    let lastSent = -Infinity;
    let comboMilestonesHit = 0;

    function teardown() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    }

    function finishRace(wonByFinish: boolean) {
      if (finished) return;
      finished = true;
      const accuracy = runner.accuracy;
      const grade = gradeForAccuracy(accuracy);
      const result: PlayerResult = { score: runner.score, maxCombo: runner.maxCombo, accuracy, grade, wonByFinish };
      client.sendFinished(result);
      masterGain.disconnect();
      fxGain.disconnect();
      teardown();
    }

    function bumpHud(judgement: Judgement) {
      const milestoneIndex = COMBO_MILESTONES.indexOf(runner.combo);
      const hitNewMilestone = judgement !== 'miss' && milestoneIndex !== -1 && milestoneIndex >= comboMilestonesHit;
      if (hitNewMilestone) comboMilestonesHit = milestoneIndex + 1;

      setHud((h) => ({
        score: runner.score,
        combo: runner.combo,
        accuracy: runner.accuracy,
        lastJudgement: judgement,
        judgementSeq: h.judgementSeq + 1,
        milestone: hitNewMilestone ? runner.combo : h.milestone,
        milestoneSeq: hitNewMilestone ? h.milestoneSeq + 1 : h.milestoneSeq,
      }));
    }

    function crashOut() {
      if (crashedOut) return;
      crashedOut = true;
      setEliminated(true);
      client.sendEliminated();
    }

    function advanceCar(judgement: Judgement) {
      const speed = judgement === 'miss' ? MISS_ADVANCE_FRACTION : runner.multiplier();
      progress = Math.min(1, progress + (1 / totalWords) * speed);
      setCarProgress(progress);
      if (progress >= 1) finishRace(true);
    }

    function processLetter(letter: string) {
      const rawSongTime = ctx.currentTime - startAt;
      const judgeTime = rawSongTime - offsetSec;
      const result = runner.handleKey(letter, judgeTime);
      if (result.type === 'ignored') return;
      playChime(ctx, fxGain, 'key');
      if (result.type === 'wordComplete') {
        playChime(ctx, fxGain, result.judgement);
        bumpHud(result.judgement);
        advanceCar(result.judgement);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        client.leaveRoom();
        client.destroy();
        clearPendingSession();
        onLeave();
        return;
      }
      if (finished || crashedOut || e.repeat || !LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey(letter);
      processLetter(letter);
    }

    function onKeyUp(e: KeyboardEvent) {
      if (!LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey((k) => (k === letter ? null : k));
    }

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    function loop() {
      if (!finished) {
        const rawSongTime = ctx.currentTime - startAt;
        const judgeTime = rawSongTime - offsetSec;

        // sweepMisses keeps running even after a crash-out (so the runner's
        // internal index still advances toward isComplete), but the visible/
        // audible miss feedback and the crash/advance decision only fire
        // once, on the miss that actually happens — not on every subsequent
        // frame for the rest of the song.
        if (runner.sweepMisses(judgeTime) && !crashedOut) {
          playChime(ctx, fxGain, 'miss');
          bumpHud('miss');
          if (room.suddenDeath) crashOut();
          else advanceCar('miss');
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

        if (rawSongTime - lastSent >= PROGRESS_SEND_INTERVAL) {
          lastSent = rawSongTime;
          client.sendProgress({ carProgress: progress, score: runner.score, combo: runner.combo, accuracy: runner.accuracy });
        }

        if (!finished && (runner.isComplete || rawSongTime >= durationSec)) {
          finishRace(false);
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
  }, [room.songId, room.difficulty]);

  function playerProgress(p: RoomPlayer) {
    return p.id === client.id ? carProgress : (p.progress?.carProgress ?? 0);
  }

  function playerEliminated(p: RoomPlayer) {
    return p.id === client.id ? eliminated : p.eliminated;
  }

  const racers: Racer[] = room.teamMode
    ? (['A', 'B'] as const).map((team) => {
        const members = room.players.filter((p) => p.team === team);
        return {
          id: `team-${team}`,
          nickname: `Team ${team}`,
          avatarIndex: members[0]?.avatarIndex ?? 0,
          carProgress: Math.min(1, members.reduce((sum, p) => sum + playerProgress(p), 0)),
          isYou: members.some((p) => p.id === client.id),
          finished: room.winningTeam === team,
          connected: members.some((p) => p.connected),
          eliminated: members.length > 0 && members.every((p) => playerEliminated(p)),
          members: members.map((p) => ({ nickname: p.nickname, avatarIndex: p.avatarIndex, isYou: p.id === client.id })),
        };
      })
    : room.players.map((p) => ({
        id: p.id,
        nickname: p.nickname,
        avatarIndex: p.avatarIndex,
        carProgress: playerProgress(p),
        isYou: p.id === client.id,
        finished: p.finished,
        connected: p.connected,
        eliminated: playerEliminated(p),
      }));

  return (
    <div className="screen gameplay-screen battle-screen">
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

      <RaceTrack racers={racers} />

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
          <div key={hud.judgementSeq} className={`gameplay-judgement gameplay-judgement--${hud.lastJudgement}`}>
            {hud.lastJudgement.toUpperCase()}
          </div>
        )}

        {hud.milestone && (
          <div key={hud.milestoneSeq} className="gameplay-milestone">
            {hud.milestone}x COMBO
          </div>
        )}

        {eliminated && <div className="battle-eliminated-banner">Eliminated — spectating</div>}
      </div>

      {countdown !== null && (
        <div key={countdown} className={`battle-countdown${countdown === 'go' ? ' battle-countdown--go' : ''}`}>
          {countdown === 'go' ? 'GO' : countdown}
        </div>
      )}
    </div>
  );
}
