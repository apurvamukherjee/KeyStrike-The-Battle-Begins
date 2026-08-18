import { useCallback, useEffect, useReducer } from 'react';
import LoaderScreen from './screens/LoaderScreen/LoaderScreen';
import HomeScreen from './screens/HomeScreen/HomeScreen';
import SongSelectScreen from './screens/SongSelectScreen/SongSelectScreen';
import SettingsScreen from './screens/SettingsScreen/SettingsScreen';
import GameplayScreen from './screens/GameplayScreen/GameplayScreen';
import ResultsScreen from './screens/ResultsScreen/ResultsScreen';
import StatsScreen from './screens/StatsScreen/StatsScreen';
import PracticeScreen from './screens/PracticeScreen/PracticeScreen';
import type { RunResult, ScreenState } from './types/game';
import type { Difficulty } from './types/song';
import { applyAppearanceSettings } from './utils/settings';

type Action =
  | { type: 'LOADED' }
  | { type: 'GO_HOME' }
  | { type: 'GO_SONG_SELECT' }
  | { type: 'GO_SETTINGS' }
  | { type: 'GO_STATS' }
  | { type: 'START_SONG'; songId: string; difficulty: Difficulty }
  | { type: 'START_PRACTICE'; songId: string; difficulty: Difficulty }
  | { type: 'FINISH_SONG'; result: RunResult };

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
    case 'START_SONG':
      return { name: 'playing', songId: action.songId, difficulty: action.difficulty };
    case 'START_PRACTICE':
      return { name: 'practice', songId: action.songId, difficulty: action.difficulty };
    case 'FINISH_SONG':
      return { name: 'results', result: action.result };
    default:
      return state;
  }
}

export default function App() {
  const [screen, dispatch] = useReducer(reducer, { name: 'loader' } as ScreenState);
  const goHome = useCallback(() => dispatch({ type: 'GO_HOME' }), []);
  const goSongSelect = useCallback(() => dispatch({ type: 'GO_SONG_SELECT' }), []);

  useEffect(() => {
    applyAppearanceSettings();
  }, []);

  return (
    <>
      <div className="backdrop" aria-hidden="true" />

      {screen.name === 'loader' && <LoaderScreen onDone={() => dispatch({ type: 'LOADED' })} />}

      {screen.name === 'home' && (
        <HomeScreen
          onPlay={goSongSelect}
          onSettings={() => dispatch({ type: 'GO_SETTINGS' })}
          onStats={() => dispatch({ type: 'GO_STATS' })}
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
