import { useEffect, useRef, useState } from 'react';
import { getSongById } from '../../data/songs';
import { getAudioContext, playChime, scheduleSong } from '../../engine/audioEngine';
import { WordRunner, gradeForAccuracy } from '../../engine/chartEngine';
import { applyIntensity } from '../../engine/musicIntensity';
import { advanceCarProgress } from '../../engine/raceProgress';
import { RoomClient } from '../../multiplayer/RoomClient';
import { clearPendingSession } from '../../multiplayer/session';
import type { PlayerResult, PowerUpType, PowerUpUsedEvent, RoomState, WordStruckEvent } from '../../multiplayer/types';
import type { Judgement } from '../../types/game';
import { formatScore } from '../../utils/format';
import { attachMobileTypingInput, IS_TOUCH } from '../../utils/mobileTyping';
import { getInputOffsetMs, getVolume } from '../../utils/settings';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import type { Racer } from '../../components/RaceTrack/RaceTrack';
import DuelArena, { type DuelStrike } from '../../components/DuelArena/DuelArena';
import WordStage from '../GameplayScreen/WordStage';

const LETTER_RE = /^[a-zA-Z]$/;
const QUEUE_PREVIEW = 3;
const PROGRESS_SEND_INTERVAL = 0.25;
const COMBO_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 500];
/** Instant flat damage bump from an Iaijutsu Strike — a fixed fraction of the opponent's HP, not judgement-scaled like advanceCarProgress. */
const NITRO_BOOST = 0.06;
const FOG_DURATION_MS = 4000;

type PowerUpToast = {
  type: PowerUpType;
  fromNickname: string;
  targetNickname: string | null;
  isSelf: boolean;
  targetedMe: boolean;
};

// Same events as racing's Power-ups (Nitro/Fog) — reskinned in flavor only for
// the duel: an Iaijutsu Strike instead of a Nitro burst, a Smoke Bomb instead
// of a Fog cloud. The mechanics (self-buff vs. an attack on the other racer)
// and the underlying 'nitro'/'fog' event types are unchanged.
function powerUpToastText(toast: PowerUpToast): string {
  if (toast.type === 'nitro') {
    return toast.isSelf ? '🗡️ You unleash an Iaijutsu Strike!' : `🗡️ ${toast.fromNickname} unleashes an Iaijutsu Strike!`;
  }
  if (toast.isSelf) return `💨 You vanish in a Smoke Bomb, blinding ${toast.targetNickname ?? 'your rival'}!`;
  if (toast.targetedMe) return `💨 ${toast.fromNickname} blinds you with a Smoke Bomb!`;
  return `💨 ${toast.fromNickname} blinds ${toast.targetNickname ?? 'a rival'} with a Smoke Bomb!`;
}

interface DuelBattleStageProps {
  client: RoomClient;
  room: RoomState;
  racers: Racer[];
  onCarProgress: (progress: number) => void;
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
  heldPowerUp: PowerUpType | null;
  powerUpToast: PowerUpToast | null;
  powerUpToastSeq: number;
  strike: DuelStrike | null;
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
  heldPowerUp: null,
  powerUpToast: null,
  powerUpToastSeq: 0,
  strike: null,
};
const INITIAL_STAGE: StageState = { word: '', typed: 0, fractionRemaining: 1, overtime: false, upcoming: [] };

export default function DuelBattleStage({ client, room, racers, onCarProgress, onLeave }: DuelBattleStageProps) {
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [stage, setStage] = useState<StageState>(INITIAL_STAGE);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [fogged, setFogged] = useState(false);
  // The countdown/song clock is server-synced (room.startAtMs) and can't wait
  // for a tap, so — unlike DuelScreen/GameplayScreen's blocking pre-game gate —
  // this is a dismissible overlay on top of an already-running battle purely
  // so the hidden mobile input's focus() happens inside a real user gesture.
  const [mobileTapped, setMobileTapped] = useState(!IS_TOUCH);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const activatePowerUpRef = useRef<() => void>(() => {});

  // The battle-run effect below only re-mounts on song/difficulty change, so it
  // can't read a fresh `racers` prop (which updates every progress tick) out of
  // its own closure — this ref gives its Space-key handler the current standing
  // for Fog/Smoke Bomb's "target the other racer" lookup.
  const racersRef = useRef(racers);
  racersRef.current = racers;

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
    const reactiveLayers = scheduleSong(ctx, song, startAt, masterGain);
    const powerUpsEnabled = !room.teamMode;

    let finished = false;
    let raf = 0;
    let progress = 0;
    let lastSent = -Infinity;
    let comboMilestonesHit = 0;
    let heldPowerUp: PowerUpType | null = null;
    let fogTimer = 0;
    let mobileKeyFlashTimer = 0;
    let detachMobileInput = () => {};

    function teardown() {
      cancelAnimationFrame(raf);
      window.clearTimeout(fogTimer);
      window.clearTimeout(mobileKeyFlashTimer);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      detachMobileInput();
      client.setOnPowerUpUsed(null);
      client.setOnWordStruck(null);
    }

    function finishDuel(wonByFinish: boolean) {
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

      applyIntensity(ctx, reactiveLayers, runner.multiplier());

      // One held charge at a time — a milestone hit while already holding one
      // is a wash, rewarding using what you have over stockpiling.
      if (hitNewMilestone && powerUpsEnabled && !heldPowerUp) {
        heldPowerUp = milestoneIndex % 2 === 0 ? 'nitro' : 'fog';
      }

      // A clean word is a landed strike — play it instantly on this screen
      // (client-authoritative, zero latency) and let the room know so the
      // opponent's screen can play the same swing. A miss doesn't swing.
      if (judgement !== 'miss') {
        playChime(ctx, fxGain, 'clash');
        client.sendWordStruck();
      }

      setHud((h) => ({
        ...h,
        score: runner.score,
        combo: runner.combo,
        accuracy: runner.accuracy,
        lastJudgement: judgement,
        judgementSeq: h.judgementSeq + 1,
        milestone: hitNewMilestone ? runner.combo : h.milestone,
        milestoneSeq: hitNewMilestone ? h.milestoneSeq + 1 : h.milestoneSeq,
        heldPowerUp,
        strike: judgement !== 'miss' ? { strikerId: client.id, seq: (h.strike?.seq ?? 0) + 1 } : h.strike,
      }));
    }

    function advanceCar(judgement: Judgement) {
      progress = advanceCarProgress(progress, totalWords, judgement, runner.multiplier());
      onCarProgress(progress);
      if (progress >= 1) finishDuel(true);
    }

    /** Only one other racer exists in a duel, so this always resolves to "the opponent." */
    function opponent(): Racer | null {
      return racersRef.current.find((r) => r.id !== client.id) ?? null;
    }

    function handlePowerUpUsed(event: PowerUpUsedEvent) {
      if (event.type === 'fog' && event.targetId === client.id) {
        setFogged(true);
        window.clearTimeout(fogTimer);
        fogTimer = window.setTimeout(() => setFogged(false), FOG_DURATION_MS);
      }

      const fromNickname = racersRef.current.find((r) => r.id === event.fromId)?.nickname ?? 'Someone';
      const targetNickname = event.targetId
        ? (racersRef.current.find((r) => r.id === event.targetId)?.nickname ?? null)
        : null;

      setHud((h) => ({
        ...h,
        powerUpToast: {
          type: event.type,
          fromNickname,
          targetNickname,
          isSelf: event.fromId === client.id,
          targetedMe: event.targetId === client.id,
        },
        powerUpToastSeq: h.powerUpToastSeq + 1,
      }));
    }

    /** The opponent's own clean word landing — I already animated my own strike instantly in bumpHud, so only react here when it isn't mine. */
    function handleWordStruck(event: WordStruckEvent) {
      if (event.fromId === client.id) return;
      playChime(ctx, fxGain, 'clash');
      setHud((h) => ({ ...h, strike: { strikerId: event.fromId, seq: (h.strike?.seq ?? 0) + 1 } }));
    }

    function activatePowerUp() {
      const type = heldPowerUp;
      if (!type) return;

      if (type === 'nitro') {
        progress = Math.min(1, progress + NITRO_BOOST);
        onCarProgress(progress);
        playChime(ctx, fxGain, 'nitro');
        client.usePowerUp('nitro', null);
        heldPowerUp = null;
        setHud((h) => ({ ...h, heldPowerUp: null }));
        if (progress >= 1) finishDuel(true);
        return;
      }

      const target = opponent();
      if (!target) return; // no one to hit yet — keep the charge
      playChime(ctx, fxGain, 'fog');
      client.usePowerUp('fog', target.id);
      heldPowerUp = null;
      setHud((h) => ({ ...h, heldPowerUp: null }));
    }
    activatePowerUpRef.current = () => {
      if (powerUpsEnabled && !finished) activatePowerUp();
    };

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
      if (e.code === 'Space') {
        e.preventDefault();
        if (powerUpsEnabled && !finished) activatePowerUp();
        return;
      }
      if (finished || e.repeat || !LETTER_RE.test(e.key)) return;
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
      detachMobileInput = attachMobileTypingInput(mobileInputRef.current, (letter) => {
        if (finished) return;
        setActiveKey(letter);
        window.clearTimeout(mobileKeyFlashTimer);
        mobileKeyFlashTimer = window.setTimeout(() => setActiveKey(null), 150);
        processLetter(letter);
      });
    } else {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }
    if (powerUpsEnabled) client.setOnPowerUpUsed(handlePowerUpUsed);
    client.setOnWordStruck(handleWordStruck);

    function loop() {
      if (!finished) {
        const rawSongTime = ctx.currentTime - startAt;
        const judgeTime = rawSongTime - offsetSec;

        if (runner.sweepMisses(judgeTime)) {
          playChime(ctx, fxGain, 'miss');
          bumpHud('miss');
          advanceCar('miss');
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
          finishDuel(false);
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

  const me = room.players.find((p) => p.id === client.id);
  const opponentPlayer = room.players.find((p) => p.id !== client.id);
  const matchScore = {
    you: me ? (room.duelWins[me.clientId] ?? 0) : 0,
    opponent: opponentPlayer ? (room.duelWins[opponentPlayer.clientId] ?? 0) : 0,
  };

  return (
    <>
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
      {IS_TOUCH && !mobileTapped && (
        <button
          type="button"
          className="duel-mobile-tap-overlay"
          onClick={() => {
            setMobileTapped(true);
            mobileInputRef.current?.focus();
          }}
        >
          Tap to type
        </button>
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
        {hud.heldPowerUp && (
          <div className="gameplay-hud__stat">
            <span className="gameplay-hud__label">Power-Up</span>
            <span className="gameplay-hud__value gameplay-hud__value--powerup">
              {hud.heldPowerUp === 'nitro' ? '🗡️ Iaijutsu' : '💨 Smoke Bomb'}
              {IS_TOUCH ? (
                <>
                  {' '}
                  ·{' '}
                  <button
                    type="button"
                    className="duel-mobile-powerup-btn"
                    onClick={() => activatePowerUpRef.current()}
                  >
                    TAP
                  </button>
                </>
              ) : (
                ' · SPACE'
              )}
            </span>
          </div>
        )}
      </div>

      <DuelArena racers={racers} strike={hud.strike} matchScore={matchScore} />

      <div className="gameplay-body">
        <WordStage
          word={stage.word}
          typed={stage.typed}
          fractionRemaining={stage.fractionRemaining}
          overtime={stage.overtime}
          upcoming={stage.upcoming}
          fogged={fogged}
        />
        {!IS_TOUCH && <AnimatedKeyboard mode="live" activeKey={activeKey} />}

        {hud.lastJudgement && (
          <div key={`judgement-${hud.judgementSeq}`} className={`gameplay-judgement gameplay-judgement--${hud.lastJudgement}`}>
            {hud.lastJudgement.toUpperCase()}
          </div>
        )}

        {hud.milestone && (
          <div key={`milestone-${hud.milestoneSeq}`} className="gameplay-milestone">
            {hud.milestone}x COMBO
          </div>
        )}

        {hud.powerUpToast && (
          <div key={`powerup-${hud.powerUpToastSeq}`} className="battle-powerup-toast">
            {powerUpToastText(hud.powerUpToast)}
          </div>
        )}
      </div>
    </>
  );
}
