import type { GameState, Cell, CellState, GameStatus, Difficulty } from './types';

export const SERIALIZE_VERSION = 1;

// ---------------------------------------------------------------------------
// SerializedGame type
// ---------------------------------------------------------------------------

export interface SerializedGame {
  v: typeof SERIALIZE_VERSION;
  difficulty: Difficulty;
  rows: number;
  cols: number;
  mines: number;
  cells: Cell[][];
  status: GameStatus;
  minesPlaced: boolean;
  flagsUsed: number;
  startedAt: number | null;
  finishedAt: number | null;
}

// ---------------------------------------------------------------------------
// serialize
// ---------------------------------------------------------------------------

export function serialize(state: GameState): SerializedGame {
  return {
    v: SERIALIZE_VERSION,
    difficulty: state.difficulty,
    rows: state.rows,
    cols: state.cols,
    mines: state.mines,
    // Deep copy cells so the serialized object is independent
    cells: state.cells.map(row => row.map(cell => ({ ...cell }))),
    status: state.status,
    minesPlaced: state.minesPlaced,
    flagsUsed: state.flagsUsed,
    startedAt: state.startedAt,
    finishedAt: state.finishedAt,
  };
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

const VALID_DIFFICULTIES: ReadonlySet<string> = new Set(['beginner', 'intermediate', 'expert']);
const VALID_CELL_STATES: ReadonlySet<string> = new Set(['hidden', 'revealed', 'flagged']);
const VALID_STATUSES: ReadonlySet<string> = new Set(['idle', 'playing', 'won', 'lost']);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function assertField<T>(
  obj: Record<string, unknown>,
  key: string,
  check: (v: unknown) => v is T,
  label: string,
): T {
  if (!check(obj[key])) {
    throw new Error(`deserialize: invalid field "${key}" — ${label}`);
  }
  return obj[key] as T;
}

function isNumber(v: unknown): v is number {
  return typeof v === 'number';
}

function isBoolean(v: unknown): v is boolean {
  return typeof v === 'boolean';
}

function isNumberOrNull(v: unknown): v is number | null {
  return v === null || typeof v === 'number';
}

function isDifficulty(v: unknown): v is Difficulty {
  return typeof v === 'string' && VALID_DIFFICULTIES.has(v);
}

function isGameStatus(v: unknown): v is GameStatus {
  return typeof v === 'string' && VALID_STATUSES.has(v);
}

function isCellState(v: unknown): v is CellState {
  return typeof v === 'string' && VALID_CELL_STATES.has(v);
}

function validateCell(raw: unknown, rowIdx: number, colIdx: number): Cell {
  if (!isPlainObject(raw)) {
    throw new Error(`deserialize: cells[${rowIdx}][${colIdx}] is not an object`);
  }
  const row = assertField(raw, 'row', isNumber, 'must be a number');
  const col = assertField(raw, 'col', isNumber, 'must be a number');
  const isMine = assertField(raw, 'isMine', isBoolean, 'must be a boolean');
  const adjacentMines = assertField(raw, 'adjacentMines', isNumber, 'must be a number');
  const state = assertField(raw, 'state', isCellState, 'must be a CellState');
  return { row, col, isMine, adjacentMines, state };
}

// ---------------------------------------------------------------------------
// deserialize
// ---------------------------------------------------------------------------

export function deserialize(json: unknown): GameState {
  if (!isPlainObject(json)) {
    throw new Error('deserialize: input is not a plain object');
  }

  // Version check first
  if (json['v'] !== SERIALIZE_VERSION) {
    throw new Error(
      `deserialize: unsupported version ${String(json['v'])} (expected ${SERIALIZE_VERSION})`,
    );
  }

  const difficulty = assertField(json, 'difficulty', isDifficulty, 'must be a Difficulty');
  const rows = assertField(json, 'rows', isNumber, 'must be a number');
  const cols = assertField(json, 'cols', isNumber, 'must be a number');
  const mines = assertField(json, 'mines', isNumber, 'must be a number');
  const status = assertField(json, 'status', isGameStatus, 'must be a GameStatus');
  const minesPlaced = assertField(json, 'minesPlaced', isBoolean, 'must be a boolean');
  const flagsUsed = assertField(json, 'flagsUsed', isNumber, 'must be a number');
  const startedAt = assertField(json, 'startedAt', isNumberOrNull, 'must be number | null');
  const finishedAt = assertField(json, 'finishedAt', isNumberOrNull, 'must be number | null');

  // Validate cells shape
  if (!Array.isArray(json['cells'])) {
    throw new Error('deserialize: "cells" must be an array');
  }
  const rawCells = json['cells'] as unknown[];
  if (rawCells.length !== rows) {
    throw new Error(
      `deserialize: "cells" has ${rawCells.length} rows but "rows" is ${rows}`,
    );
  }

  const cells: Cell[][] = rawCells.map((rawRow, r) => {
    if (!Array.isArray(rawRow)) {
      throw new Error(`deserialize: cells[${r}] is not an array`);
    }
    const rowArr = rawRow as unknown[];
    if (rowArr.length !== cols) {
      throw new Error(
        `deserialize: cells[${r}] has ${rowArr.length} cols but "cols" is ${cols}`,
      );
    }
    return rowArr.map((rawCell, c) => validateCell(rawCell, r, c));
  });

  return {
    difficulty,
    rows,
    cols,
    mines,
    cells,
    status,
    minesPlaced,
    flagsUsed,
    startedAt,
    finishedAt,
  };
}
