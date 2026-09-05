import { useEffect, useRef, useState } from 'react';
import { getSongById } from '../../data/songs';
import { getEnemyById } from '../../data/enemies';
import { getAudioContext, playChime, scheduleSong } from '../../engine/audioEngine';
import { WordRunner } from '../../engine/chartEngine';
import { applyIntensity } from '../../engine/musicIntensity';
import { advanceCarProgress } from '../../engine/raceProgress';
import { initCpuState, stepCpu, type CpuState } from '../../engine/cpuOpponent';
import type { Judgement } from '../../types/game';
import type { Difficulty } from '../../types/song';
import { recordRun, recordKeyStats, type KeyStat } from '../../utils/stats';
import { recordDuelWin } from '../../utils/duelProgress';
import { formatScore } from '../../utils/format';
import { getInputOffsetMs, getVolume } from '../../utils/settings';
import AnimatedKeyboard from '../../components/AnimatedKeyboard/AnimatedKeyboard';
import DuelArena, { type DuelStrike } from '../../components/DuelArena/DuelArena';
import type { Racer } from '../../components/RaceTrack/RaceTrack';
import WordStage from '../GameplayScreen/WordStage';
import '../GameplayScreen/GameplayScreen.css';

const LETTER_RE = /^[a-zA-Z]$/;
const QUEUE_PREVIEW = 3;
const COMBO_MILESTONES = [10, 25, 50, 100, 150, 200, 300, 500];
const CPU_ID = 'cpu';

interface DuelScreenProps {
  songId: string;
  difficulty: Difficulty;
  enemyId: string;
  onExit: () => void;
}

interface HudState {
  score: number;
  combo: number;
  accuracy: number;
  lastJudgement: Judgement | null;
  judgementSeq: number;
  milestone: number | null;
  milestoneSeq: number;
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
  strike: null,
};
const INITIAL_STAGE: StageState = { word: '', typed: 0, fractionRemaining: 1, overtime: false, upcoming: [] };

export default function DuelScreen({ songId, difficulty, enemyId, onExit }: DuelScreenProps) {
  const enemy = getEnemyById(enemyId);
  const [hud, setHud] = useState<HudState>(INITIAL_HUD);
  const [stage, setStage] = useState<StageState>(INITIAL_STAGE);
  const [paused, setPausedState] = useState(false);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [racers, setRacers] = useState<[Racer, Racer] | null>(null);
  const [outcome, setOutcome] = useState<'won' | 'lost' | null>(null);
  const actionsRef = useRef({ togglePause: () => {}, quit: () => {} });

  useEffect(() => {
    if (!enemy) {
      onExit();
      return;
    }
    const activeEnemy = enemy; // narrowed once here — nested closures below (finishDuel, loop, ...) don't otherwise see through the outer `enemy`'s optional type
    const song = getSongById(songId);
    if (!song) {
      onExit();
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
    const startAt = ctx.currentTime + 2;
    const durationSec = song.durationSec;
    const reactiveLayers = scheduleSong(ctx, song, startAt, masterGain);

    let finished = false;
    let isPaused = false;
    let raf = 0;
    let comboMilestonesHit = 0;
    let carProgress = 0;
    let cpuState: CpuState = initCpuState(activeEnemy.profile, 0);
    const keyStats: Record<string, KeyStat> = {};
    let lastAcceptedTime: number | null = null;

    function teardown() {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      document.removeEventListener('visibilitychange', onVisibility);
    }

    function finishDuel(won: boolean) {
      if (finished) return;
      finished = true;
      masterGain.disconnect();
      fxGain.disconnect();
      teardown();

      if (won) recordDuelWin(activeEnemy.id);
      const longestCleared = runner.words
        .filter((w) => w.judgement === 'perfect' || w.judgement === 'good')
        .reduce((longest, w) => (w.note.word.length > longest.length ? w.note.word : longest), '');
      recordRun({ maxCombo: runner.maxCombo, score: runner.score, counts: runner.counts }, longestCleared);
      recordKeyStats(keyStats);

      setOutcome(won ? 'won' : 'lost');
    }

    function quit() {
      if (finished) return;
      finished = true;
      masterGain.disconnect();
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

    actionsRef.current = { togglePause: () => setPaused(!isPaused), quit };

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

    function bumpHud(judgement: Judgement, strikerId: string | null) {
      const milestoneIndex = COMBO_MILESTONES.indexOf(runner.combo);
      const hitNewMilestone = judgement !== 'miss' && milestoneIndex !== -1 && milestoneIndex >= comboMilestonesHit;
      if (hitNewMilestone) comboMilestonesHit = milestoneIndex + 1;

      applyIntensity(ctx, reactiveLayers, runner.multiplier());

      setHud((h) => ({
        ...h,
        score: runner.score,
        combo: runner.combo,
        accuracy: runner.accuracy,
        lastJudgement: judgement,
        judgementSeq: h.judgementSeq + 1,
        milestone: hitNewMilestone ? runner.combo : h.milestone,
        milestoneSeq: hitNewMilestone ? h.milestoneSeq + 1 : h.milestoneSeq,
        strike: strikerId ? { strikerId, seq: (h.strike?.seq ?? 0) + 1 } : h.strike,
      }));
    }

    function advanceRace(judgement: Judgement) {
      carProgress = advanceCarProgress(carProgress, runner.totalWords, judgement, runner.multiplier());
      if (carProgress >= 1) finishDuel(true);
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

      if (result.type === 'wordComplete') {
        playChime(ctx, fxGain, result.judgement);
        if (result.judgement !== 'miss') playChime(ctx, fxGain, 'clash');
        bumpHud(result.judgement, 'you');
        advanceRace(result.judgement);
      }
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.code === 'Escape') {
        setPaused(!isPaused);
        return;
      }
      if (isPaused || finished || e.repeat || !LETTER_RE.test(e.key)) return;
      const letter = e.key.toUpperCase();
      setActiveKey(letter);
      processLetter(letter);
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
      if (!isPaused && !finished) {
        const rawSongTime = ctx.currentTime - startAt;
        const judgeTime = rawSongTime - offsetSec;

        if (runner.sweepMisses(judgeTime)) {
          playChime(ctx, fxGain, 'miss');
          bumpHud('miss', null);
          advanceRace('miss');
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

        // The CPU's own swing gets the neutral clash sound (an impact
        // occurred) but never 'perfect'/'good', which would read as feedback
        // on the player's OWN typing rather than the enemy's.
        const cpuResult = stepCpu(cpuState, activeEnemy.profile, Math.max(0, rawSongTime), runner.totalWords);
        cpuState = cpuResult.state;
        if (cpuResult.judgement && cpuResult.judgement !== 'miss') {
          playChime(ctx, fxGain, 'clash');
          setHud((h) => ({ ...h, strike: { strikerId: CPU_ID, seq: (h.strike?.seq ?? 0) + 1 } }));
        }
        if (cpuState.progress >= 1) finishDuel(false);

        setRacers([
          { id: 'you', nickname: 'You', avatarIndex: 0, carProgress, isYou: true, finished: carProgress >= 1, connected: true },
          {
            id: CPU_ID,
            nickname: activeEnemy.name,
            avatarIndex: activeEnemy.swordsmanIndex,
            carProgress: cpuState.progress,
            isYou: false,
            finished: cpuState.progress >= 1,
            connected: true,
          },
        ]);

        if (!finished && (runner.isComplete || rawSongTime >= durationSec)) {
          // The song ran out before either side landed the finishing blow — the
          // one who dealt more damage (higher own carProgress) takes the round.
          finishDuel(carProgress >= cpuState.progress);
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
  }, [songId, difficulty, enemyId]);

  if (!enemy) return null;

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

      {racers && <DuelArena racers={racers} strike={hud.strike} />}

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
      </div>

      {paused && !outcome && (
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

      {outcome && (
        <div className="gameplay-pause">
          <div className="panel gameplay-pause__panel">
            <h2 className="wordmark wordmark--small">{outcome === 'won' ? `${enemy.name} Defeated` : 'You Were Struck Down'}</h2>
            <p className="gameplay-no-keyboard__copy">
              {outcome === 'won'
                ? `You landed the finishing blow on ${enemy.name}.`
                : `${enemy.name} proved too fast this time.`}
            </p>
            <div className="cap-row">
              <button type="button" className="cap cap--primary" onClick={onExit}>
                Back to the Ladder
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
