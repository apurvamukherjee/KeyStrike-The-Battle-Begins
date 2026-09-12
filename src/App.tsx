import { useCallback, useEffect, useReducer, useRef } from 'react';
import LoaderScreen from './screens/LoaderScreen/LoaderScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import SongSelectScreen from './screens/SongSelectScreen/SongSelectScreen';
import SettingsScreen from './screens/SettingsScreen/SettingsScreen';
import GameplayScreen from './screens/GameplayScreen/GameplayScreen';
import ResultsScreen from './screens/ResultsScreen/ResultsScreen';
import StatsScreen from './screens/StatsScreen/StatsScreen';
import PracticeScreen from './screens/PracticeScreen/PracticeScreen';
import SentenceScreen from './screens/SentenceScreen/SentenceScreen';
import SentenceResultsScreen from './screens/SentenceScreen/SentenceResultsScreen';
import ParagraphScreen from './screens/ParagraphScreen/ParagraphScreen';
import ParagraphResultsScreen from './screens/ParagraphScreen/ParagraphResultsScreen';
import EndlessScreen from './screens/EndlessScreen/EndlessScreen';
import EndlessResultsScreen from './screens/EndlessScreen/EndlessResultsScreen';
import CustomizeScreen from './screens/CustomizeScreen/CustomizeScreen';
import LobbyScreen from './screens/LobbyScreen/LobbyScreen';
import RoomScreen from './screens/RoomScreen/RoomScreen';
import BattleScreen from './screens/BattleScreen/BattleScreen';
import BattleResultsScreen from './screens/BattleResultsScreen/BattleResultsScreen';
import DuelSelectScreen from './screens/DuelSelectScreen/DuelSelectScreen';
import DuelScreen from './screens/DuelScreen/DuelScreen';
import StoryLadderScreen from './screens/StoryLadderScreen/StoryLadderScreen';
import FullscreenButton from './components/FullscreenButton/FullscreenButton';
import type { EndlessRunResult, ParagraphRunResult, RunResult, ScreenState, SentenceRunResult } from './types/game';
import type { Difficulty } from './types/song';
import { RoomClient } from './multiplayer/RoomClient';
import { clearPendingSession, loadPendingSession } from './multiplayer/session';
import type { RoomState } from './multiplayer/types';
import { applyAppearanceSettings } from './utils/settings';
import { getGhostReplay } from './utils/ghostReplays';
import { getEnemyById } from './data/enemies';
import { recordDuelWin } from './utils/duelProgress';
import { getStoryLevel, TOTAL_STORY_LEVELS } from './data/storyLevels';
import { recordStoryLevelClear } from './utils/storyProgress';
import { songs } from './data/songs';

type Action =
  | { type: 'LOADED' }
  | { type: 'GO_HOME' }
  | { type: 'GO_SONG_SELECT' }
  | { type: 'GO_SETTINGS' }
  | { type: 'GO_STATS' }
  | { type: 'GO_LOBBY'; presetMode?: 'duel' }
  | { type: 'GO_DUEL_SELECT' }
  | {
      type: 'START_DUEL';
      songId: string;
      difficulty: Difficulty;
      enemyId: string;
      /** Omitted for a fresh fight from the ladder — defaults to 0-0. Passed explicitly to continue an in-progress match's round tally. */
      matchScore?: { you: number; enemy: number };
    }
  | { type: 'START_SONG'; songId: string; difficulty: Difficulty; beatChallenge: boolean }
  | { type: 'START_PRACTICE'; songId: string; difficulty: Difficulty }
  | { type: 'FINISH_SONG'; result: RunResult }
  | { type: 'GO_SENTENCE'; retry?: { difficulty: Difficulty; beatChallenge: boolean } }
  | { type: 'FINISH_SENTENCE'; result: SentenceRunResult }
  | { type: 'GO_PARAGRAPH'; retry?: { difficulty: Difficulty } }
  | { type: 'FINISH_PARAGRAPH'; result: ParagraphRunResult }
  | { type: 'GO_ENDLESS'; retry?: { difficulty: Difficulty } }
  | { type: 'FINISH_ENDLESS'; result: EndlessRunResult }
  | { type: 'GO_CUSTOMIZE' }
  | { type: 'GO_STORY_LADDER' }
  | { type: 'START_STORY'; level: number; songId: string }
  | { type: 'ENTER_ROOM'; client: RoomClient; room: RoomState }
  | { type: 'ENTER_BATTLE'; client: RoomClient; room: RoomState }
  | { type: 'ENTER_BATTLE_RESULTS'; client: RoomClient; room: RoomState };

function reducer(state: ScreenState, action: Action): ScreenState {
  switch (action.type) {
    case 'LOADED':
    case 'GO_HOME':
      return { name: 'home' };
    case 'GO_SONG_SELECT':
      return { name: 'songSelect' };
    case 'GO_SETTINGS':
      return { name: 'settings', from: 'home' };
    case 'GO_STATS':
      return { name: 'stats' };
    case 'GO_LOBBY':
      return { name: 'lobby', presetMode: action.presetMode };
    case 'GO_DUEL_SELECT':
      return { name: 'duelSelect' };
    case 'START_DUEL':
      // A fresh attempt id (not just songId/difficulty/enemyId) so DuelScreen
      // fully remounts on every fight — including a Rematch that happens to
      // pick the same random song again, which wouldn't otherwise change any
      // of its props and so wouldn't reset its internal outcome/result state.
      return {
        name: 'duel',
        songId: action.songId,
        difficulty: action.difficulty,
        enemyId: action.enemyId,
        attempt: Date.now(),
        matchScore: action.matchScore ?? { you: 0, enemy: 0 },
      };
    case 'START_SONG':
      return { name: 'playing', songId: action.songId, difficulty: action.difficulty, beatChallenge: action.beatChallenge };
    case 'START_PRACTICE':
      return { name: 'practice', songId: action.songId, difficulty: action.difficulty };
    case 'FINISH_SONG':
      return { name: 'results', result: action.result };
    case 'GO_SENTENCE':
      return { name: 'sentence', retry: action.retry };
    case 'FINISH_SENTENCE':
      return { name: 'sentenceResults', result: action.result };
    case 'GO_PARAGRAPH':
      return { name: 'paragraph', retry: action.retry };
    case 'FINISH_PARAGRAPH':
      return { name: 'paragraphResults', result: action.result };
    case 'GO_ENDLESS':
      return { name: 'endless', retry: action.retry };
    case 'FINISH_ENDLESS':
      return { name: 'endlessResults', result: action.result };
    case 'GO_CUSTOMIZE':
      return { name: 'customize' };
    case 'GO_STORY_LADDER':
      return { name: 'storyLadder' };
    case 'START_STORY':
      // Same fresh-attempt-id trick as START_DUEL — Story's own best-of-1
      // "rematch" (retrying a loss) picks a new random song too, which
      // wouldn't otherwise change props enough to remount DuelScreen.
      return {
        name: 'story',
        level: action.level,
        songId: action.songId,
        difficulty: 'normal',
        attempt: Date.now(),
        matchScore: { you: 0, enemy: 0 },
      };
    case 'ENTER_ROOM':
      return { name: 'room', client: action.client, room: action.room };
    case 'ENTER_BATTLE':
      return { name: 'battle', client: action.client, room: action.room };
    case 'ENTER_BATTLE_RESULTS':
      return { name: 'battleResults', client: action.client, room: action.room };
    default:
      return state;
  }
}

export default function App() {
  const [screen, dispatch] = useReducer(reducer, { name: 'loader' } as ScreenState);
  const goHome = useCallback(() => dispatch({ type: 'GO_HOME' }), []);
  const goSongSelect = useCallback(() => dispatch({ type: 'GO_SONG_SELECT' }), []);
  const goSentence = useCallback(() => dispatch({ type: 'GO_SENTENCE' }), []);
  const goParagraph = useCallback(() => dispatch({ type: 'GO_PARAGRAPH' }), []);
  const goEndless = useCallback(() => dispatch({ type: 'GO_ENDLESS' }), []);
  const goCustomize = useCallback(() => dispatch({ type: 'GO_CUSTOMIZE' }), []);
  const goStoryLadder = useCallback(() => dispatch({ type: 'GO_STORY_LADDER' }), []);
  // Set by Story's onWin (only fires on an actual match win), read once by
  // onAdvance to decide "next level" vs "retry" — see the 'story' render
  // block below for why onAdvance's own argument can't carry this signal.
  const storyWonRef = useRef(false);
  const goLobby = useCallback(() => dispatch({ type: 'GO_LOBBY' }), []);
  const goDuelOnline = useCallback(() => dispatch({ type: 'GO_LOBBY', presetMode: 'duel' }), []);
  const goDuelSelect = useCallback(() => dispatch({ type: 'GO_DUEL_SELECT' }), []);

  useEffect(() => {
    applyAppearanceSettings();
  }, []);

  // A refresh or accidental close mid-room/mid-battle leaves a pending session
  // in sessionStorage; try to reclaim that seat once before showing any UI,
  // landing back on whichever phase the room is actually in (not just the lobby).
  useEffect(() => {
    const pending = loadPendingSession();
    if (!pending) return;
    const client = new RoomClient(() => {});
    client.rejoinRoom(pending.code, pending.clientId).then((ack) => {
      if (!ack.ok || !ack.room) {
        clearPendingSession();
        client.destroy();
        return;
      }
      if (ack.room.phase === 'lobby') dispatch({ type: 'ENTER_ROOM', client, room: ack.room });
      else if (ack.room.phase === 'results') dispatch({ type: 'ENTER_BATTLE_RESULTS', client, room: ack.room });
      else dispatch({ type: 'ENTER_BATTLE', client, room: ack.room });
    });
  }, []);

  // ---- Browser back/forward sync -----------------------------------------
  // Every screen change pushes a history entry; popstate (the browser's own
  // back/forward buttons) replays whatever "back" already means for the
  // screen on top — the same action its own Back/Quit/Leave button performs
  // — rather than trying to reconstruct arbitrary in-flight state (which,
  // for a live multiplayer socket, isn't reconstructable anyway).
  const backHandlerRef = useRef<() => void>(() => {});
  const suppressNextPush = useRef(false);

  useEffect(() => {
    switch (screen.name) {
      case 'loader':
      case 'home':
        backHandlerRef.current = () => {};
        break;
      case 'songSelect':
      case 'settings':
      case 'stats':
      case 'lobby':
      case 'duelSelect':
      case 'customize':
      case 'storyLadder':
        backHandlerRef.current = goHome;
        break;
      case 'playing':
      case 'practice':
      case 'results':
        backHandlerRef.current = goSongSelect;
        break;
      case 'duel':
        backHandlerRef.current = goDuelSelect;
        break;
      case 'story':
        backHandlerRef.current = goStoryLadder;
        break;
      case 'sentence':
      case 'sentenceResults':
      case 'paragraph':
      case 'paragraphResults':
      case 'endless':
      case 'endlessResults':
        backHandlerRef.current = goHome;
        break;
      case 'room':
      case 'battle':
      case 'battleResults':
        backHandlerRef.current = () => {
          screen.client.leaveRoom();
          screen.client.destroy();
          clearPendingSession();
          goHome();
        };
        break;
      default:
        backHandlerRef.current = goHome;
    }
  }, [screen, goHome, goSongSelect, goDuelSelect, goStoryLadder]);

  useEffect(() => {
    const onPopState = () => {
      suppressNextPush.current = true;
      backHandlerRef.current();
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    if (suppressNextPush.current) {
      suppressNextPush.current = false;
      return;
    }
    history.pushState({ screenName: screen.name }, '', `#${screen.name}`);
  }, [screen.name]);

  return (
    <>
      <div className="backdrop" aria-hidden="true" />
      <div className="app-corner-controls">
        <FullscreenButton />
      </div>

      {screen.name === 'loader' && <LoaderScreen onDone={() => dispatch({ type: 'LOADED' })} />}

      {screen.name === 'home' && (
        <HomeScreen
          onStory={goStoryLadder}
          onPlay={goSongSelect}
          onSentences={goSentence}
          onParagraph={goParagraph}
          onEndless={goEndless}
          onSettings={() => dispatch({ type: 'GO_SETTINGS' })}
          onStats={() => dispatch({ type: 'GO_STATS' })}
          onCustomize={goCustomize}
          onBattle={goLobby}
          onDuel={goDuelSelect}
        />
      )}

      {screen.name === 'customize' && <CustomizeScreen onBack={goHome} />}

      {screen.name === 'storyLadder' && (
        <StoryLadderScreen
          onFight={(level, songId) => dispatch({ type: 'START_STORY', level, songId })}
          onBack={goHome}
        />
      )}

      {screen.name === 'story' &&
        (() => {
          const storyLevel = getStoryLevel(screen.level);
          if (!storyLevel) return null;
          return (
            <DuelScreen
              key={screen.attempt}
              songId={screen.songId}
              difficulty={screen.difficulty}
              opponent={{ id: `story-${screen.level}`, name: storyLevel.name, swordsmanIndex: storyLevel.swordsmanIndex, profile: storyLevel.profile }}
              matchScore={screen.matchScore}
              winsNeeded={1}
              continueLabelOnWin={screen.level >= TOTAL_STORY_LEVELS ? undefined : 'Next Level'}
              onExit={goStoryLadder}
              onWin={() => {
                storyWonRef.current = true;
                recordStoryLevelClear(screen.level);
              }}
              onAdvance={() => {
                // DuelScreen's onRematch always passes a fresh {you:0,enemy:0} —
                // it doesn't carry the outcome of the fight just decided — so
                // whether that fight was won comes from onWin having fired
                // (above), captured here and reset for the next attempt.
                const won = storyWonRef.current;
                storyWonRef.current = false;
                if (won && screen.level >= TOTAL_STORY_LEVELS) {
                  goStoryLadder();
                  return;
                }
                dispatch({
                  type: 'START_STORY',
                  level: won ? screen.level + 1 : screen.level,
                  songId: songs[Math.floor(Math.random() * songs.length)].id,
                });
              }}
            />
          );
        })()}

      {screen.name === 'duelSelect' && (
        <DuelSelectScreen
          onFight={(songId, difficulty, enemyId) => dispatch({ type: 'START_DUEL', songId, difficulty, enemyId })}
          onDuelOnline={goDuelOnline}
          onBack={goHome}
        />
      )}

      {screen.name === 'duel' &&
        (() => {
          const enemy = getEnemyById(screen.enemyId);
          if (!enemy) return null;
          return (
            <DuelScreen
              key={screen.attempt}
              songId={screen.songId}
              difficulty={screen.difficulty}
              opponent={enemy}
              matchScore={screen.matchScore}
              onExit={goDuelSelect}
              onWin={recordDuelWin}
              onAdvance={(matchScore) =>
                dispatch({
                  type: 'START_DUEL',
                  // A fresh random song each round, same as picking "Fight" again from the ladder.
                  songId: songs[Math.floor(Math.random() * songs.length)].id,
                  difficulty: screen.difficulty,
                  enemyId: screen.enemyId,
                  matchScore,
                })
              }
            />
          );
        })()}

      {screen.name === 'songSelect' && (
        <SongSelectScreen
          onSelect={(songId, difficulty, beatChallenge) =>
            dispatch({ type: 'START_SONG', songId, difficulty, beatChallenge })
          }
          onPractice={(songId, difficulty) => dispatch({ type: 'START_PRACTICE', songId, difficulty })}
          onBack={goHome}
        />
      )}

      {screen.name === 'settings' && <SettingsScreen onBack={goHome} />}

      {screen.name === 'stats' && <StatsScreen onBack={goHome} />}

      {screen.name === 'lobby' && (
        <LobbyScreen
          presetMode={screen.presetMode}
          onEnterRoom={(client, room) => dispatch({ type: 'ENTER_ROOM', client, room })}
          onBack={goHome}
        />
      )}

      {screen.name === 'room' && (
        <RoomScreen
          client={screen.client}
          initialRoom={screen.room}
          onEnterBattle={(room) => dispatch({ type: 'ENTER_BATTLE', client: screen.client, room })}
          onLeave={goHome}
        />
      )}

      {screen.name === 'battle' && (
        <BattleScreen
          client={screen.client}
          initialRoom={screen.room}
          onResults={(room) => dispatch({ type: 'ENTER_BATTLE_RESULTS', client: screen.client, room })}
          onLeave={goHome}
        />
      )}

      {screen.name === 'battleResults' && (
        <BattleResultsScreen
          client={screen.client}
          room={screen.room}
          onRematch={() => dispatch({ type: 'ENTER_ROOM', client: screen.client, room: screen.room })}
          onEnterBattle={(room) => dispatch({ type: 'ENTER_BATTLE', client: screen.client, room })}
          onLeave={goHome}
        />
      )}

      {screen.name === 'playing' && (
        <GameplayScreen
          songId={screen.songId}
          difficulty={screen.difficulty}
          beatChallenge={screen.beatChallenge}
          ghostReplay={getGhostReplay(screen.songId, screen.difficulty)}
          onFinish={(result) => dispatch({ type: 'FINISH_SONG', result })}
          onQuit={goSongSelect}
        />
      )}

      {screen.name === 'practice' && (
        <PracticeScreen songId={screen.songId} difficulty={screen.difficulty} onExit={goSongSelect} />
      )}

      {screen.name === 'sentence' && (
        <SentenceScreen
          initialDifficulty={screen.retry?.difficulty}
          initialBeatChallenge={screen.retry?.beatChallenge}
          autoStart={!!screen.retry}
          onFinish={(result) => dispatch({ type: 'FINISH_SENTENCE', result })}
          onExit={goHome}
        />
      )}

      {screen.name === 'sentenceResults' && (
        <SentenceResultsScreen
          result={screen.result}
          onRetry={() =>
            dispatch({
              type: 'GO_SENTENCE',
              retry: { difficulty: screen.result.difficulty, beatChallenge: screen.result.beatChallenge },
            })
          }
          onHome={goHome}
        />
      )}

      {screen.name === 'paragraph' && (
        <ParagraphScreen
          initialDifficulty={screen.retry?.difficulty}
          autoStart={!!screen.retry}
          onFinish={(result) => dispatch({ type: 'FINISH_PARAGRAPH', result })}
          onExit={goHome}
        />
      )}

      {screen.name === 'paragraphResults' && (
        <ParagraphResultsScreen
          result={screen.result}
          onRetry={() => dispatch({ type: 'GO_PARAGRAPH', retry: { difficulty: screen.result.difficulty } })}
          onHome={goHome}
        />
      )}

      {screen.name === 'endless' && (
        <EndlessScreen
          initialDifficulty={screen.retry?.difficulty}
          autoStart={!!screen.retry}
          onFinish={(result) => dispatch({ type: 'FINISH_ENDLESS', result })}
          onExit={goHome}
        />
      )}

      {screen.name === 'endlessResults' && (
        <EndlessResultsScreen
          result={screen.result}
          onRetry={() => dispatch({ type: 'GO_ENDLESS', retry: { difficulty: screen.result.difficulty } })}
          onHome={goHome}
        />
      )}

      {screen.name === 'results' && (
        <ResultsScreen
          result={screen.result}
          onRetry={() =>
            dispatch({
              type: 'START_SONG',
              songId: screen.result.songId,
              difficulty: screen.result.difficulty,
              beatChallenge: screen.result.beatChallenge,
            })
          }
          onSongSelect={goSongSelect}
          onHome={goHome}
        />
      )}
    </>
  );
}
