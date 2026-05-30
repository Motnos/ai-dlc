export type Difficulty = 'beginner' | 'intermediate' | 'expert';

export interface DifficultyConfig {
  rows: number;
  cols: number;
  mines: number;
}

export type CellState = 'hidden' | 'revealed' | 'flagged';

export interface Cell {
  row: number;
  col: number;
  isMine: boolean;
  adjacentMines: number;
  state: CellState;
}

// idle = board exists, mines not yet placed
export type GameStatus = 'idle' | 'playing' | 'won' | 'lost';

export interface GameState {
  difficulty: Difficulty;
  rows: number;
  cols: number;
  mines: number;
  cells: Cell[][];        // cells[row][col]
  status: GameStatus;
  minesPlaced: boolean;
  flagsUsed: number;
  startedAt: number | null;
  finishedAt: number | null;
}
