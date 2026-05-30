import type { Difficulty, GameState } from '../game/types';

export type GameOutcome = 'won' | 'lost';

export interface GameResultInput {
  difficulty: Difficulty;
  outcome: GameOutcome;
  durationMs: number;
  rows: number;
  cols: number;
  mines: number;
}

export interface GameResult extends GameResultInput {
  id: string;
  playedAt: number;
}

export interface GameRepository {
  loadSave(playerId: string): Promise<{ difficulty: Difficulty; state: GameState } | null>;
  saveGame(playerId: string, state: GameState): Promise<void>;
  clearSave(playerId: string): Promise<void>;
  recordResult(playerId: string, result: GameResultInput): Promise<void>;
  listResults(playerId: string, limit?: number): Promise<GameResult[]>;
}
