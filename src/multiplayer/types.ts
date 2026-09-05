import type { Difficulty } from '../types/song';

export type RoomPhase = 'lobby' | 'countdown' | 'battle' | 'results';

export type RaceMode = 'song' | 'sentence' | 'duel';

export interface PlayerProgress {
  /** 0-1, how far this player's car has traveled toward the finish line */
  carProgress: number;
  score: number;
  combo: number;
  accuracy: number;
}

export interface PlayerResult {
  score: number;
  maxCombo: number;
  accuracy: number;
  grade: string;
  /** true if this player crossed the finish line first (won the race), false if their song simply ended */
  wonByFinish: boolean;
}

export type Team = 'A' | 'B';

/** Earned at a combo milestone during a word Battle race — see engine constant COMBO_MILESTONES in WordBattleStage. */
export type PowerUpType = 'nitro' | 'fog';

/** A one-off relayed event, not part of persisted RoomState — a rejoining player never needs to "catch up" on one. */
export interface PowerUpUsedEvent {
  fromId: string;
  type: PowerUpType;
  targetId: string | null;
}

/** Duel Mode: relayed each time a player lands a clean word, purely to trigger the swing animation on everyone's screen — the actual HP/damage numbers come from the regular progress broadcast (1v1/2v2) or the duel-strike event (FFA). */
export interface WordStruckEvent {
  fromId: string;
  /** FFA Duel only — which fighter was hit, so their screen (and everyone else's) knows who to flash. */
  targetId?: string | null;
}

export interface RoomPlayer {
  id: string;
  /** Stable across a refresh/reconnect (see rejoin-room), unlike `id` which is the live socket id. Duel Mode's duelWins/winnerId are keyed by this. */
  clientId: string;
  nickname: string;
  avatarIndex: number;
  ready: boolean;
  connected: boolean;
  team: Team | null;
  progress: PlayerProgress | null;
  finished: boolean;
  result: PlayerResult | null;
  /** Sudden Death: crashed out after a miss. FFA Duel: hp hit 0. Either way, keeps spectating but can't win. */
  eliminated: boolean;
  /** FFA Duel only: 0-1, damaged by other fighters' clean words (see DuelBattleStage's autoTarget/duel-strike). Meaningless outside FFA. */
  hp: number;
}

export interface RoomState {
  code: string;
  hostId: string;
  phase: RoomPhase;
  mode: RaceMode;
  songId: string | null;
  sentenceText: string | null;
  difficulty: Difficulty;
  startAtMs: number | null;
  /** Racing: the winning player's socket id. Duel Mode: the winning player's clientId (survives a rejoin) — see RoomPlayer.clientId. */
  winnerId: string | null;
  teamMode: boolean;
  /** Duel Mode only: 3-4 player free-for-all, mutually exclusive with teamMode. */
  duelFFA: boolean;
  winningTeam: Team | null;
  suddenDeath: boolean;
  /** Duel Mode only: rounds needed to decide a match (first to `ceil(duelBestOf/2)` round wins). */
  duelBestOf: number;
  /** Duel Mode only: round wins so far this match, keyed by player clientId (not socket id — survives a rejoin). */
  duelWins: Record<string, number>;
  /** Duel Mode only: true once someone has reached the wins needed to take the whole match. */
  duelMatchOver: boolean;
  players: RoomPlayer[];
}

export interface JoinAck {
  ok: boolean;
  code?: string;
  room?: RoomState;
  error?: string;
}
