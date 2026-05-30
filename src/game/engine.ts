import type { Difficulty, GameState, Cell } from './types';
import { DIFFICULTY } from './difficulty';
import { createRng } from './rng';
import type { Rng } from './rng';

// ---------------------------------------------------------------------------
// createGame
// ---------------------------------------------------------------------------

export function createGame(difficulty: Difficulty): GameState {
  const { rows, cols, mines } = DIFFICULTY[difficulty];

  const cells: Cell[][] = [];
  for (let r = 0; r < rows; r++) {
    const row: Cell[] = [];
    for (let c = 0; c < cols; c++) {
      row.push({ row: r, col: c, isMine: false, adjacentMines: 0, state: 'hidden' });
    }
    cells.push(row);
  }

  return {
    difficulty,
    rows,
    cols,
    mines,
    cells,
    status: 'idle',
    minesPlaced: false,
    flagsUsed: 0,
    startedAt: null,
    finishedAt: null,
  };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns true if (r, c) is within the board bounds. */
function inBounds(rows: number, cols: number, r: number, c: number): boolean {
  return r >= 0 && r < rows && c >= 0 && c < cols;
}

/** Iterates over up-to-8 neighbors, calling cb(nr, nc) for each valid cell. */
function forEachNeighbor(
  rows: number,
  cols: number,
  r: number,
  c: number,
  cb: (nr: number, nc: number) => void,
): void {
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (inBounds(rows, cols, nr, nc)) {
        cb(nr, nc);
      }
    }
  }
}

/**
 * Builds a new cells[][] from an existing one, with mines placed at the given
 * flat indices, and adjacentMines computed for every cell.
 */
function buildCellsWithMines(
  rows: number,
  cols: number,
  existing: Cell[][],
  mineIndices: number[],
): Cell[][] {
  // Mark mines in a flat boolean array first
  const isMineFlat = new Uint8Array(rows * cols);
  for (const idx of mineIndices) {
    isMineFlat[idx] = 1;
  }

  // Build first pass: cells with isMine set
  const cells: Cell[][] = existing.map((row, r) =>
    row.map((cell, c) => ({
      ...cell,
      isMine: isMineFlat[r * cols + c] === 1,
      adjacentMines: 0,
    })),
  );

  // Second pass: compute adjacentMines
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let count = 0;
      forEachNeighbor(rows, cols, r, c, (nr, nc) => {
        if (cells[nr][nc].isMine) count++;
      });
      if (count !== 0) {
        cells[r][c] = { ...cells[r][c], adjacentMines: count };
      }
    }
  }

  return cells;
}

/**
 * Performs an iterative flood-fill reveal starting from (startR, startC).
 * Returns a new cells[][] with the revealed cells updated.
 * Assumes the start cell is NOT a mine (caller must ensure this).
 */
function floodReveal(rows: number, cols: number, cells: Cell[][], startR: number, startC: number): Cell[][] {
  // Work on a mutable copy at the row level for efficiency, then freeze
  // structure by copying rows only when a cell in that row changes.
  // We use a simple approach: track which cells changed in a Set, apply at end.

  // visited set to avoid re-enqueueing
  const revealed = new Set<number>();
  const stack: [number, number][] = [[startR, startC]];

  while (stack.length > 0) {
    const item = stack.pop()!;
    const [r, c] = item;
    const idx = r * cols + c;

    if (revealed.has(idx)) continue;

    const cell = cells[r][c];
    // Only reveal hidden cells (never reveal flagged, never re-reveal)
    if (cell.state !== 'hidden') continue;
    // Never reveal mines via flood-fill
    if (cell.isMine) continue;

    revealed.add(idx);

    // Propagate if zero
    if (cell.adjacentMines === 0) {
      forEachNeighbor(rows, cols, r, c, (nr, nc) => {
        const nidx = nr * cols + nc;
        if (!revealed.has(nidx)) {
          stack.push([nr, nc]);
        }
      });
    }
  }

  if (revealed.size === 0) return cells;

  // Build new cells array, copying only affected rows/cells
  const newCells = cells.map((row, r) => {
    const rowHasChange = row.some((_, c) => revealed.has(r * cols + c));
    if (!rowHasChange) return row;
    return row.map((cell, c) =>
      revealed.has(r * cols + c) ? { ...cell, state: 'revealed' as const } : cell,
    );
  });

  return newCells;
}

/**
 * Check whether all non-mine cells are revealed.
 */
export function checkWin(state: GameState): boolean {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.cells[r][c];
      if (!cell.isMine && cell.state !== 'revealed') return false;
    }
  }
  return true;
}

/**
 * Returns state.mines - state.flagsUsed (may be negative).
 */
export function minesRemaining(state: GameState): number {
  return state.mines - state.flagsUsed;
}

// ---------------------------------------------------------------------------
// revealCell
// ---------------------------------------------------------------------------

export function revealCell(
  state: GameState,
  row: number,
  col: number,
  rng?: Rng,
  now?: number,
): GameState {
  // Out-of-bounds
  if (!inBounds(state.rows, state.cols, row, col)) return state;
  // Game already over
  if (state.status === 'won' || state.status === 'lost') return state;
  // Cannot reveal flagged or already revealed
  const target = state.cells[row][col];
  if (target.state === 'flagged' || target.state === 'revealed') return state;

  const actualRng = rng ?? createRng(Date.now());
  const actualNow = now ?? Date.now();

  if (!state.minesPlaced) {
    // --- First reveal: place mines ---
    const { rows, cols, mines } = state;
    const total = rows * cols;

    // Determine exclusion set
    const neighborExcluded = new Set<number>();
    neighborExcluded.add(row * cols + col);
    forEachNeighbor(rows, cols, row, col, (nr, nc) => {
      neighborExcluded.add(nr * cols + nc);
    });

    let excludedSet: Set<number>;
    if (total - neighborExcluded.size >= mines) {
      excludedSet = neighborExcluded;
    } else if (total - 1 >= mines) {
      excludedSet = new Set([row * cols + col]);
    } else {
      excludedSet = new Set();
    }

    // Build eligible flat indices
    const eligible: number[] = [];
    for (let i = 0; i < total; i++) {
      if (!excludedSet.has(i)) eligible.push(i);
    }

    // Fisher-Yates shuffle the eligible list
    for (let i = eligible.length - 1; i > 0; i--) {
      const j = actualRng.int(i + 1);
      const tmp = eligible[i];
      eligible[i] = eligible[j];
      eligible[j] = tmp;
    }

    // Take first `mines` as mine positions
    const mineIndices = eligible.slice(0, mines);

    // Build new cells with mines and adjacentMines
    const newCells = buildCellsWithMines(rows, cols, state.cells, mineIndices);

    // Intermediate state with mines placed
    const stateWithMines: GameState = {
      ...state,
      cells: newCells,
      minesPlaced: true,
      status: 'playing',
      startedAt: actualNow,
    };

    // Flood-fill reveal from clicked cell
    const revealedCells = floodReveal(rows, cols, stateWithMines.cells, row, col);
    const afterReveal: GameState = { ...stateWithMines, cells: revealedCells };

    // Win check
    if (checkWin(afterReveal)) {
      return { ...afterReveal, status: 'won', finishedAt: actualNow };
    }
    return afterReveal;
  }

  // --- Subsequent reveal (mines already placed) ---
  if (target.isMine) {
    // Reveal clicked mine, reveal all mines, set lost
    const newCells = state.cells.map(rowArr =>
      rowArr.map(cell =>
        cell.isMine ? { ...cell, state: 'revealed' as const } : cell,
      ),
    );
    return {
      ...state,
      cells: newCells,
      status: 'lost',
      finishedAt: actualNow,
    };
  }

  // Safe subsequent reveal: flood-fill
  const revealedCells = floodReveal(state.rows, state.cols, state.cells, row, col);
  const afterReveal: GameState = { ...state, cells: revealedCells };

  if (checkWin(afterReveal)) {
    return { ...afterReveal, status: 'won', finishedAt: actualNow };
  }
  return afterReveal;
}

// ---------------------------------------------------------------------------
// toggleFlag
// ---------------------------------------------------------------------------

export function toggleFlag(state: GameState, row: number, col: number): GameState {
  if (!inBounds(state.rows, state.cols, row, col)) return state;
  if (state.status === 'won' || state.status === 'lost') return state;

  const cell = state.cells[row][col];
  if (cell.state === 'revealed') return state;

  const newCellState = cell.state === 'hidden' ? 'flagged' : 'hidden';
  const flagDelta = newCellState === 'flagged' ? 1 : -1;

  const newCells = state.cells.map((rowArr, r) =>
    r !== row
      ? rowArr
      : rowArr.map((c, ci) =>
          ci !== col ? c : { ...c, state: newCellState as const },
        ),
  );

  return {
    ...state,
    cells: newCells,
    flagsUsed: state.flagsUsed + flagDelta,
  };
}

// ---------------------------------------------------------------------------
// chordCell
// ---------------------------------------------------------------------------

export function chordCell(state: GameState, row: number, col: number): GameState {
  if (!inBounds(state.rows, state.cols, row, col)) return state;
  if (state.status !== 'playing') return state;

  const cell = state.cells[row][col];
  if (cell.state !== 'revealed' || cell.adjacentMines === 0) return state;

  // Count flagged neighbors
  let flaggedCount = 0;
  const eligibleNeighbors: [number, number][] = [];
  forEachNeighbor(state.rows, state.cols, row, col, (nr, nc) => {
    const neighbor = state.cells[nr][nc];
    if (neighbor.state === 'flagged') {
      flaggedCount++;
    } else if (neighbor.state === 'hidden') {
      eligibleNeighbors.push([nr, nc]);
    }
  });

  if (flaggedCount !== cell.adjacentMines) return state;

  // Reveal each eligible (non-flagged, non-revealed) neighbor
  const now = Date.now();
  let current = state;
  for (const [nr, nc] of eligibleNeighbors) {
    // Check that state hasn't ended (a mine reveal earlier in the loop could end game)
    if (current.status === 'lost' || current.status === 'won') break;
    current = revealCell(current, nr, nc, undefined, now);
  }

  return current;
}
