import { useCallback, useEffect, useReducer, useRef } from 'react';
import LoaderScreen from './screens/LoaderScreen/LoaderScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import SongSelectScreen from './screens/SongSelectScreen/SongSelectScreen';
import SettingsScreen from './screens/SettingsScreen/SettingsScreen';
import GameplayScreen from './screens/GameplayScreen/GameplayScreen';
import ResultsScreen from './screens/ResultsScreen/ResultsScreen';
import StatsScreen from './screens/StatsScreen/StatsScreen';
import PracticeScreen from './screens/PracticeScreen/PracticeScreen';
import LobbyScreen from './screens/LobbyScreen/LobbyScreen';
import RoomScreen from './screens/RoomScreen/RoomScreen';
import BattleScreen from './screens/BattleScreen/BattleScreen';
import BattleResultsScreen from './screens/BattleResultsScreen/BattleResultsScreen';
import FullscreenButton from './components/FullscreenButton/FullscreenButton';
import type { RunResult, ScreenState } from './types/game';
import type { Difficulty } from './types/song';
import { RoomClient } from './multiplayer/RoomClient';
import { clearPendingSession, loadPendingSession } from './multiplayer/session';
import type { RoomState } from './multiplayer/types';
import { applyAppearanceSettings } from './utils/settings';

type Action =
  | { type: 'LOADED' }
  | { type: 'GO_HOME' }
  | { type: 'GO_SONG_SELECT' }
  | { type: 'GO_SETTINGS' }
  | { type: 'GO_STATS' }
  | { type: 'GO_LOBBY' }
  | { type: 'START_SONG'; songId: string; difficulty: Difficulty }
  | { type: 'START_PRACTICE'; songId: string; difficulty: Difficulty }
  | { type: 'FINISH_SONG'; result: RunResult }
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
      return { name: 'lobby' };
    case 'START_SONG':
      return { name: 'playing', songId: action.songId, difficulty: action.difficulty };
    case 'START_PRACTICE':
      return { name: 'practice', songId: action.songId, difficulty: action.difficulty };
    case 'FINISH_SONG':
      return { name: 'results', result: action.result };
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
  const goLobby = useCallback(() => dispatch({ type: 'GO_LOBBY' }), []);

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
        backHandlerRef.current = goHome;
        break;
      case 'playing':
      case 'practice':
      case 'results':
        backHandlerRef.current = goSongSelect;
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
  }, [screen, goHome, goSongSelect]);

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
          onPlay={goSongSelect}
          onSettings={() => dispatch({ type: 'GO_SETTINGS' })}
          onStats={() => dispatch({ type: 'GO_STATS' })}
          onBattle={goLobby}
        />
      )}

      {screen.name === 'songSelect' && (
        <SongSelectScreen
          onSelect={(songId, difficulty) => dispatch({ type: 'START_SONG', songId, difficulty })}
          onPractice={(songId, difficulty) => dispatch({ type: 'START_PRACTICE', songId, difficulty })}
          onBack={goHome}
        />
      )}

      {screen.name === 'settings' && <SettingsScreen onBack={goHome} />}

      {screen.name === 'stats' && <StatsScreen onBack={goHome} />}

      {screen.name === 'lobby' && (
        <LobbyScreen onEnterRoom={(client, room) => dispatch({ type: 'ENTER_ROOM', client, room })} onBack={goHome} />
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
          onLeave={goHome}
        />
      )}

      {screen.name === 'playing' && (
        <GameplayScreen
          songId={screen.songId}
          difficulty={screen.difficulty}
          onFinish={(result) => dispatch({ type: 'FINISH_SONG', result })}
          onQuit={goSongSelect}
        />
      )}

      {screen.name === 'practice' && (
        <PracticeScreen songId={screen.songId} difficulty={screen.difficulty} onExit={goSongSelect} />
      )}

      {screen.name === 'results' && (
        <ResultsScreen
          result={screen.result}
          onRetry={() =>
            dispatch({ type: 'START_SONG', songId: screen.result.songId, difficulty: screen.result.difficulty })
          }
          onSongSelect={goSongSelect}
          onHome={goHome}
        />
      )}
    </>
  );
}
