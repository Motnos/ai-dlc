import { serialize, deserialize, SERIALIZE_VERSION } from './serialize';
import { createGame, revealCell, toggleFlag } from './engine';
import { createRng } from './rng';
import type { GameState } from './types';

// ---------------------------------------------------------------------------
// Helpers to build representative states
// ---------------------------------------------------------------------------

function makeIdleState(): GameState {
  return createGame('beginner');
}

function makePlayingState(): GameState {
  const base = createGame('beginner');
  return revealCell(base, 4, 4, createRng(1), 1000);
}

function makePlayingWithFlags(): GameState {
  const base = createGame('intermediate');
  let state = revealCell(base, 8, 8, createRng(3), 2000);
  // Add some flags
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.cells[r][c].state === 'hidden' && state.flagsUsed < 5) {
        state = toggleFlag(state, r, c);
      }
    }
  }
  return state;
}

function makeWonState(): GameState {
  // Reveal all non-mine cells
  const base = createGame('beginner');
  let state = revealCell(base, 4, 4, createRng(42), 1000);
  for (let r = 0; r < state.rows && state.status === 'playing'; r++) {
    for (let c = 0; c < state.cols && state.status === 'playing'; c++) {
      if (!state.cells[r][c].isMine && state.cells[r][c].state === 'hidden') {
        state = revealCell(state, r, c, undefined, 2000);
      }
    }
  }
  return state;
}

function makeLostState(): GameState {
  const base = createGame('beginner');
  const after1 = revealCell(base, 4, 4, createRng(0), 1000);
  if (after1.status !== 'playing') return after1;
  // Find a mine and reveal it
  for (let r = 0; r < after1.rows; r++) {
    for (let c = 0; c < after1.cols; c++) {
      const cell = after1.cells[r][c];
      if (cell.isMine && cell.state === 'hidden') {
        return revealCell(after1, r, c, createRng(1), 5000);
      }
    }
  }
  return after1;
}

// ---------------------------------------------------------------------------
// Round-trip lossless tests
// ---------------------------------------------------------------------------

describe('serialize/deserialize round-trip', () => {
  it('idle state round-trips losslessly', () => {
    const state = makeIdleState();
    const roundTripped = deserialize(serialize(state));
    expect(roundTripped).toEqual(state);
  });

  it('playing state round-trips losslessly', () => {
    const state = makePlayingState();
    // Only test if mines were placed (status === playing)
    if (state.status === 'playing') {
      const roundTripped = deserialize(serialize(state));
      expect(roundTripped).toEqual(state);
    }
  });

  it('playing state with flags round-trips losslessly', () => {
    const state = makePlayingWithFlags();
    if (state.status === 'playing') {
      const roundTripped = deserialize(serialize(state));
      expect(roundTripped).toEqual(state);
    }
  });

  it('won state round-trips losslessly', () => {
    const state = makeWonState();
    if (state.status === 'won') {
      const roundTripped = deserialize(serialize(state));
      expect(roundTripped).toEqual(state);
    }
  });

  it('lost state round-trips losslessly', () => {
    const state = makeLostState();
    if (state.status === 'lost') {
      const roundTripped = deserialize(serialize(state));
      expect(roundTripped).toEqual(state);
    }
  });

  it('beginner idle round-trip preserves all fields', () => {
    const state = createGame('beginner');
    const rt = deserialize(serialize(state));
    expect(rt.difficulty).toBe(state.difficulty);
    expect(rt.rows).toBe(state.rows);
    expect(rt.cols).toBe(state.cols);
    expect(rt.mines).toBe(state.mines);
    expect(rt.status).toBe(state.status);
    expect(rt.minesPlaced).toBe(state.minesPlaced);
    expect(rt.flagsUsed).toBe(state.flagsUsed);
    expect(rt.startedAt).toBe(state.startedAt);
    expect(rt.finishedAt).toBe(state.finishedAt);
    expect(rt.cells).toEqual(state.cells);
  });

  it('intermediate playing round-trip preserves cells shape', () => {
    const state = revealCell(createGame('intermediate'), 8, 8, createRng(7), 3000);
    if (state.status !== 'playing') return;
    const rt = deserialize(serialize(state));
    expect(rt.cells).toHaveLength(state.rows);
    for (let r = 0; r < state.rows; r++) {
      expect(rt.cells[r]).toHaveLength(state.cols);
    }
  });

  it('expert state round-trips losslessly', () => {
    const state = revealCell(createGame('expert'), 8, 15, createRng(99), 4000);
    if (state.status !== 'playing') return;
    const rt = deserialize(serialize(state));
    expect(rt).toEqual(state);
  });

  it('round-trip preserves startedAt timestamp', () => {
    const state = makePlayingState();
    if (state.startedAt === null) return;
    const rt = deserialize(serialize(state));
    expect(rt.startedAt).toBe(state.startedAt);
  });

  it('round-trip preserves finishedAt timestamp for lost state', () => {
    const state = makeLostState();
    if (state.status !== 'lost') return;
    const rt = deserialize(serialize(state));
    expect(rt.finishedAt).toBe(state.finishedAt);
  });

  it('round-trip of won state preserves finishedAt', () => {
    const state = makeWonState();
    if (state.status !== 'won') return;
    const rt = deserialize(serialize(state));
    expect(rt.finishedAt).toBe(state.finishedAt);
  });
});

// ---------------------------------------------------------------------------
// JSON-safety
// ---------------------------------------------------------------------------

describe('serialize JSON-safety', () => {
  it('serialize output survives JSON.stringify + JSON.parse and still deserializes', () => {
    const state = makePlayingState();
    const serialized = serialize(state);
    const jsonString = JSON.stringify(serialized);
    const parsed = JSON.parse(jsonString) as unknown;
    const rt = deserialize(parsed);
    if (state.status === 'playing') {
      expect(rt).toEqual(state);
    }
  });

  it('JSON round-trip for idle state', () => {
    const state = makeIdleState();
    const rt = deserialize(JSON.parse(JSON.stringify(serialize(state))));
    expect(rt).toEqual(state);
  });

  it('JSON round-trip for won state', () => {
    const state = makeWonState();
    if (state.status !== 'won') return;
    const rt = deserialize(JSON.parse(JSON.stringify(serialize(state))));
    expect(rt).toEqual(state);
  });

  it('JSON round-trip for lost state', () => {
    const state = makeLostState();
    if (state.status !== 'lost') return;
    const rt = deserialize(JSON.parse(JSON.stringify(serialize(state))));
    expect(rt).toEqual(state);
  });

  it('serialize includes version field v === SERIALIZE_VERSION', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(serialized.v).toBe(SERIALIZE_VERSION);
    expect(serialized.v).toBe(1);
  });

  it('serialize produces a plain object (no class instances)', () => {
    const state = makePlayingState();
    const serialized = serialize(state);
    expect(typeof serialized).toBe('object');
    expect(serialized).not.toBeNull();
    // JSON.stringify should not throw
    expect(() => JSON.stringify(serialized)).not.toThrow();
  });

  it('serialize deep-copies cells (modifying output does not affect original)', () => {
    const state = makePlayingState();
    if (state.status !== 'playing') return;
    const serialized = serialize(state);
    // Mutate the serialized cells
    serialized.cells[0][0] = { ...serialized.cells[0][0], isMine: !serialized.cells[0][0].isMine };
    // Original state should be unchanged
    expect(state.cells[0][0].isMine).toBe(false); // idle board cells are never mines
  });
});

// ---------------------------------------------------------------------------
// deserialize throws on invalid input
// ---------------------------------------------------------------------------

describe('deserialize throws on invalid input', () => {
  it('throws on null', () => {
    expect(() => deserialize(null)).toThrow();
  });

  it('throws on number', () => {
    expect(() => deserialize(42)).toThrow();
  });

  it('throws on string', () => {
    expect(() => deserialize('hello')).toThrow();
  });

  it('throws on boolean', () => {
    expect(() => deserialize(true)).toThrow();
  });

  it('throws on array (not a plain object)', () => {
    expect(() => deserialize([1, 2, 3])).toThrow();
  });

  it('throws on wrong version v: 0', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, v: 0 })).toThrow();
  });

  it('throws on wrong version v: 2', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, v: 2 })).toThrow();
  });

  it('throws on missing version field', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    const withoutV = Object.fromEntries(Object.entries(serialized).filter(([k]) => k !== 'v'));
    expect(() => deserialize(withoutV)).toThrow();
  });

  it('throws on version as string', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, v: '1' })).toThrow();
  });

  it('throws on missing difficulty field', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    const withoutDifficulty = Object.fromEntries(
      Object.entries(serialized).filter(([k]) => k !== 'difficulty'),
    );
    expect(() => deserialize({ ...withoutDifficulty, v: SERIALIZE_VERSION })).toThrow();
  });

  it('throws on invalid difficulty value', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, difficulty: 'hard' })).toThrow();
  });

  it('throws on missing rows field', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    const without = Object.fromEntries(Object.entries(serialized).filter(([k]) => k !== 'rows'));
    expect(() => deserialize({ ...without, v: SERIALIZE_VERSION })).toThrow();
  });

  it('throws when cells is not an array', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, cells: 'bad' })).toThrow();
  });

  it('throws when cells row count does not match rows field', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    // Remove one row from cells
    const badCells = serialized.cells.slice(0, serialized.rows - 1);
    expect(() => deserialize({ ...serialized, cells: badCells })).toThrow();
  });

  it('throws when a cells row is not an array', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    const badCells = [...serialized.cells];
    // Replace first row with a non-array
    (badCells as unknown[])[0] = 'not an array';
    expect(() => deserialize({ ...serialized, cells: badCells })).toThrow();
  });

  it('throws when a cells row has wrong column count', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    const badCells = serialized.cells.map((row, i) =>
      i === 0 ? row.slice(0, row.length - 1) : row,
    );
    expect(() => deserialize({ ...serialized, cells: badCells })).toThrow();
  });

  it('throws when a cell is not an object', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    const badCells = serialized.cells.map((row, ri) =>
      row.map((cell, ci) => (ri === 0 && ci === 0 ? 'not a cell' : cell)),
    );
    expect(() => deserialize({ ...serialized, cells: badCells })).toThrow();
  });

  it('throws when a cell has wrong isMine type', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    const badCells = serialized.cells.map((row, ri) =>
      row.map((cell, ci) =>
        ri === 0 && ci === 0 ? { ...cell, isMine: 'yes' } : cell,
      ),
    );
    expect(() => deserialize({ ...serialized, cells: badCells })).toThrow();
  });

  it('throws when a cell has invalid state value', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    const badCells = serialized.cells.map((row, ri) =>
      row.map((cell, ci) =>
        ri === 0 && ci === 0 ? { ...cell, state: 'unknown' } : cell,
      ),
    );
    expect(() => deserialize({ ...serialized, cells: badCells })).toThrow();
  });

  it('throws when status is invalid', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, status: 'paused' })).toThrow();
  });

  it('throws when minesPlaced is not boolean', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, minesPlaced: 1 })).toThrow();
  });

  it('throws when flagsUsed is not a number', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, flagsUsed: '0' })).toThrow();
  });

  it('throws when startedAt is wrong type (string)', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, startedAt: 'now' })).toThrow();
  });

  it('throws when finishedAt is wrong type (boolean)', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    expect(() => deserialize({ ...serialized, finishedAt: false })).toThrow();
  });

  it('startedAt and finishedAt as null is valid (idle state)', () => {
    const state = makeIdleState();
    const rt = deserialize(serialize(state));
    expect(rt.startedAt).toBeNull();
    expect(rt.finishedAt).toBeNull();
  });

  it('throws with a descriptive Error message on non-object', () => {
    expect(() => deserialize(null)).toThrow(Error);
  });

  it('throws with a descriptive Error message on wrong version', () => {
    const state = makeIdleState();
    const serialized = serialize(state);
    let err: Error | null = null;
    try {
      deserialize({ ...serialized, v: 999 });
    } catch (e) {
      err = e as Error;
    }
    expect(err).not.toBeNull();
    expect(err?.message).toMatch(/version/i);
  });
});

// ---------------------------------------------------------------------------
// Serialize independence (output is a copy, not aliased)
// ---------------------------------------------------------------------------

describe('serialize independence', () => {
  it('serialize output cells are not aliased to state cells', () => {
    const state = makePlayingState();
    if (state.status !== 'playing') return;
    const serialized = serialize(state);
    // They should be deeply equal but not the same reference
    expect(serialized.cells).not.toBe(state.cells);
    expect(serialized.cells[0]).not.toBe(state.cells[0]);
    expect(serialized.cells[0][0]).not.toBe(state.cells[0][0]);
    expect(serialized.cells).toEqual(state.cells);
  });

  it('deserialize output cells are new objects', () => {
    const state = makePlayingState();
    if (state.status !== 'playing') return;
    const serialized = serialize(state);
    const rt = deserialize(serialized);
    // Cell objects should be fresh (not the same reference as serialized)
    expect(rt.cells[0][0]).not.toBe(serialized.cells[0][0]);
    expect(rt.cells[0][0]).toEqual(serialized.cells[0][0]);
  });
});
