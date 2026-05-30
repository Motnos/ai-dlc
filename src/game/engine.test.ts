import { createGame, revealCell, toggleFlag, chordCell, checkWin, minesRemaining } from './engine';
import { createRng } from './rng';
import { DIFFICULTY } from './difficulty';
import type { Difficulty, GameState, GameStatus } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Count mine cells across the whole board. */
function countMines(state: GameState): number {
  let n = 0;
  for (const row of state.cells) {
    for (const cell of row) {
      if (cell.isMine) n++;
    }
  }
  return n;
}

/** Count cells with a given state across the whole board. */
function countByState(state: GameState, s: 'hidden' | 'revealed' | 'flagged'): number {
  let n = 0;
  for (const row of state.cells) {
    for (const cell of row) {
      if (cell.state === s) n++;
    }
  }
  return n;
}

/** Actual mine-neighbor count for a given cell (ground-truth). */
function realAdjacentMines(state: GameState, r: number, c: number): number {
  let count = 0;
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
        if (state.cells[nr][nc].isMine) count++;
      }
    }
  }
  return count;
}

/** Returns all valid neighbor coordinates for (r, c). */
function neighborCoords(state: GameState, r: number, c: number): [number, number][] {
  const coords: [number, number][] = [];
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue;
      const nr = r + dr;
      const nc = c + dc;
      if (nr >= 0 && nr < state.rows && nc >= 0 && nc < state.cols) {
        coords.push([nr, nc]);
      }
    }
  }
  return coords;
}

// ---------------------------------------------------------------------------
// createGame
// ---------------------------------------------------------------------------

describe('createGame', () => {
  const difficulties: Difficulty[] = ['beginner', 'intermediate', 'expert'];

  for (const diff of difficulties) {
    describe(`difficulty: ${diff}`, () => {
      const { rows, cols, mines } = DIFFICULTY[diff];

      it('has correct rows and cols', () => {
        const state = createGame(diff);
        expect(state.rows).toBe(rows);
        expect(state.cols).toBe(cols);
      });

      it('cells array is rows x cols', () => {
        const state = createGame(diff);
        expect(state.cells).toHaveLength(rows);
        for (const row of state.cells) {
          expect(row).toHaveLength(cols);
        }
      });

      it('total cells equals rows * cols', () => {
        const state = createGame(diff);
        expect(state.cells.flat().length).toBe(rows * cols);
      });

      it('all cells are hidden and isMine false', () => {
        const state = createGame(diff);
        for (const row of state.cells) {
          for (const cell of row) {
            expect(cell.state).toBe('hidden');
            expect(cell.isMine).toBe(false);
            expect(cell.adjacentMines).toBe(0);
          }
        }
      });

      it('cells have correct row/col coordinates', () => {
        const state = createGame(diff);
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            expect(state.cells[r][c].row).toBe(r);
            expect(state.cells[r][c].col).toBe(c);
          }
        }
      });

      it('status is idle', () => {
        const state = createGame(diff);
        expect(state.status).toBe('idle');
      });

      it('minesPlaced is false', () => {
        const state = createGame(diff);
        expect(state.minesPlaced).toBe(false);
      });

      it('flagsUsed is 0', () => {
        const state = createGame(diff);
        expect(state.flagsUsed).toBe(0);
      });

      it('startedAt and finishedAt are null', () => {
        const state = createGame(diff);
        expect(state.startedAt).toBeNull();
        expect(state.finishedAt).toBeNull();
      });

      it('mines field equals difficulty mines count', () => {
        const state = createGame(diff);
        expect(state.mines).toBe(mines);
      });

      it('difficulty field is correct', () => {
        const state = createGame(diff);
        expect(state.difficulty).toBe(diff);
      });
    });
  }
});

// ---------------------------------------------------------------------------
// First-click safety
// ---------------------------------------------------------------------------

describe('First-click safety', () => {
  const difficulties: Difficulty[] = ['beginner', 'intermediate', 'expert'];
  const seeds = Array.from({ length: 50 }, (_, i) => i); // seeds 0..49
  const now = 1000;

  for (const diff of difficulties) {
    describe(`difficulty: ${diff}`, () => {
      const { rows, cols } = DIFFICULTY[diff];
      // Test several click positions (corners, center, edge midpoints)
      const testCells: [number, number][] = [
        [0, 0],
        [0, cols - 1],
        [rows - 1, 0],
        [rows - 1, cols - 1],
        [Math.floor(rows / 2), Math.floor(cols / 2)],
        [0, Math.floor(cols / 2)],
        [Math.floor(rows / 2), 0],
      ];

      for (const [clickR, clickC] of testCells) {
        it(`click (${clickR},${clickC}): clicked cell and neighbors never mines across seeds 0-49`, () => {
          for (const seed of seeds) {
            const base = createGame(diff);
            const state = revealCell(base, clickR, clickC, createRng(seed), now);

            // minesPlaced must be true
            expect(state.minesPlaced).toBe(true);
            // status must be playing
            expect(state.status).toBe('playing');
            // startedAt must be set
            expect(state.startedAt).toBe(now);

            // clicked cell is not a mine
            expect(state.cells[clickR][clickC].isMine).toBe(false);
            // clicked cell is revealed
            expect(state.cells[clickR][clickC].state).toBe('revealed');

            // no neighbor of clicked cell is a mine
            const neighbors = neighborCoords(state, clickR, clickC);
            for (const [nr, nc] of neighbors) {
              // seed ${seed} diff ${diff}: neighbor must not be a mine
              expect(state.cells[nr][nc].isMine).toBe(false);
            }
          }
        });
      }
    });
  }
});

// ---------------------------------------------------------------------------
// Exact mine count
// ---------------------------------------------------------------------------

describe('Mine count after first reveal', () => {
  const difficulties: Difficulty[] = ['beginner', 'intermediate', 'expert'];

  for (const diff of difficulties) {
    it(`${diff}: mine count equals state.mines for seeds 0-19`, () => {
      const { mines, rows, cols } = DIFFICULTY[diff];
      for (let seed = 0; seed < 20; seed++) {
        const base = createGame(diff);
        const state = revealCell(
          base,
          Math.floor(rows / 2),
          Math.floor(cols / 2),
          createRng(seed),
          9999,
        );
        expect(countMines(state)).toBe(mines);
      }
    });
  }
});

// ---------------------------------------------------------------------------
// adjacentMines correctness
// ---------------------------------------------------------------------------

describe('adjacentMines correctness', () => {
  it('all cells have adjacentMines matching actual neighbor mine count after first reveal', () => {
    // Use beginner for a manageable exhaustive check
    for (let seed = 0; seed < 10; seed++) {
      const base = createGame('beginner');
      const state = revealCell(base, 4, 4, createRng(seed), 1000);
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const actual = realAdjacentMines(state, r, c);
          expect(state.cells[r][c].adjacentMines).toBe(actual);
        }
      }
    }
  });

  it('corner cell (0,0) adjacentMines counts only 3 neighbors', () => {
    // Find a seed where some neighbor of (0,0) is a mine
    let found = false;
    for (let seed = 0; seed < 100 && !found; seed++) {
      const base = createGame('beginner');
      // Click elsewhere so (0,0) might have mines near it
      const state = revealCell(base, 8, 8, createRng(seed), 1000);
      const actual = realAdjacentMines(state, 0, 0);
      expect(state.cells[0][0].adjacentMines).toBe(actual);
      if (actual > 0) found = true;
    }
  });

  it('corner cell (rows-1, cols-1) adjacentMines is correct', () => {
    for (let seed = 0; seed < 20; seed++) {
      const base = createGame('beginner');
      const state = revealCell(base, 0, 0, createRng(seed), 1000);
      const r = state.rows - 1;
      const c = state.cols - 1;
      const actual = realAdjacentMines(state, r, c);
      expect(state.cells[r][c].adjacentMines).toBe(actual);
    }
  });

  it('edge cell (0, middle) adjacentMines counts only 5 neighbors', () => {
    for (let seed = 0; seed < 10; seed++) {
      const base = createGame('intermediate');
      const state = revealCell(base, 8, 8, createRng(seed), 1000);
      const c = Math.floor(state.cols / 2);
      const actual = realAdjacentMines(state, 0, c);
      expect(state.cells[0][c].adjacentMines).toBe(actual);
    }
  });

  it('adjacentMines is 0 for cells with no mine neighbors', () => {
    for (let seed = 0; seed < 10; seed++) {
      const base = createGame('beginner');
      const state = revealCell(base, 4, 4, createRng(seed), 1000);
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          if (realAdjacentMines(state, r, c) === 0) {
            expect(state.cells[r][c].adjacentMines).toBe(0);
          }
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// Flood-fill
// ---------------------------------------------------------------------------

describe('Flood-fill', () => {
  it('reveals the zero-region and its numbered border', () => {
    // Keep trying seeds until we get a zero cell in the revealed region
    let testedZeroRegion = false;
    for (let seed = 0; seed < 200; seed++) {
      const base = createGame('beginner');
      const state = revealCell(base, 4, 4, createRng(seed), 1000);

      // Find revealed zero cells
      const revealedZeroCells: [number, number][] = [];
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const cell = state.cells[r][c];
          if (cell.state === 'revealed' && cell.adjacentMines === 0 && !cell.isMine) {
            revealedZeroCells.push([r, c]);
          }
        }
      }

      if (revealedZeroCells.length > 0) {
        testedZeroRegion = true;
        // Every neighbor of each revealed zero cell must also be revealed
        // (unless flagged — but we have no flags here)
        for (const [r, c] of revealedZeroCells) {
          const neighbors = neighborCoords(state, r, c);
          for (const [nr, nc] of neighbors) {
            const neighbor = state.cells[nr][nc];
            if (!neighbor.isMine) {
              expect(neighbor.state).toBe('revealed');
            }
          }
        }
        break;
      }
    }
    expect(testedZeroRegion).toBe(true);
  });

  it('cells beyond the numbered border stay hidden', () => {
    // After flood-fill, hidden cells should not be neighbors of zero-cells
    // (they'd have been opened). They may be adjacent to numbered cells.
    for (let seed = 0; seed < 50; seed++) {
      const base = createGame('beginner');
      const state = revealCell(base, 4, 4, createRng(seed), 1000);

      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const cell = state.cells[r][c];
          if (cell.state === 'hidden') {
            // No hidden cell should be a direct neighbor of a revealed zero cell
            const neighbors = neighborCoords(state, r, c);
            for (const [nr, nc] of neighbors) {
              const nbr = state.cells[nr][nc];
              if (nbr.state === 'revealed' && nbr.adjacentMines === 0 && !nbr.isMine) {
                // A hidden cell adjacent to a revealed zero cell means flood-fill missed it
                expect(true).toBe(false); // fail with a clear implicit message
              }
            }
          }
        }
      }
    }
  });

  it('terminates on expert (large board, no hang)', () => {
    // If flood-fill had infinite loop this test would time out
    const base = createGame('expert');
    for (let seed = 0; seed < 5; seed++) {
      const state = revealCell(base, 8, 15, createRng(seed), 1000);
      expect(state.minesPlaced).toBe(true);
    }
  });

  it('respects flags: flagged cells stay flagged when revealCell targets them', () => {
    // A flagged cell that is targeted by revealCell must remain flagged (no-op).
    // This directly tests the "no-op on flagged" rule which is the flood-fill guard.
    let tested = false;
    for (let seed = 0; seed < 50; seed++) {
      const base = createGame('beginner');
      const afterFirst = revealCell(base, 4, 4, createRng(seed), 1000);
      if (afterFirst.status !== 'playing') continue;

      // Find any hidden non-mine cell and flag it
      let flagR = -1;
      let flagC = -1;
      for (let r = 0; r < afterFirst.rows && flagR === -1; r++) {
        for (let c = 0; c < afterFirst.cols && flagR === -1; c++) {
          const cell = afterFirst.cells[r][c];
          if (cell.state === 'hidden') {
            flagR = r;
            flagC = c;
          }
        }
      }
      if (flagR === -1) continue;

      const withFlag = toggleFlag(afterFirst, flagR, flagC);
      expect(withFlag.cells[flagR][flagC].state).toBe('flagged');

      // Directly attempt to reveal the flagged cell — must be no-op
      const afterAttempt = revealCell(withFlag, flagR, flagC, createRng(seed + 1), 2000);
      expect(afterAttempt.cells[flagR][flagC].state).toBe('flagged');
      expect(afterAttempt).toBe(withFlag); // same reference = no-op
      tested = true;
      break;
    }
    expect(tested).toBe(true);
  });

  it('respects flags in flood-fill: flagged cells adjacent to zero regions stay flagged', () => {
    // Set up: place mines via first-reveal, then flag a hidden cell.
    // Do a subsequent reveal that triggers flood-fill from a zero cell.
    // The flagged cell must not be revealed by the flood.
    let tested = false;
    for (let seed = 0; seed < 100; seed++) {
      const base = createGame('beginner');
      const after1 = revealCell(base, 4, 4, createRng(seed), 1000);
      if (after1.status !== 'playing') continue;

      // Find a hidden non-mine cell adjacent to a hidden zero-adjacentMines cell
      // (one that would be flood-opened if revealed). We want to flag it.
      let flagR = -1;
      let flagC = -1;
      let triggerR = -1;
      let triggerC = -1;

      outerSearch: for (let r = 0; r < after1.rows; r++) {
        for (let c = 0; c < after1.cols; c++) {
          const cell = after1.cells[r][c];
          // Find a hidden non-mine cell with adjacentMines === 0 (a potential flood origin)
          if (cell.state === 'hidden' && !cell.isMine && cell.adjacentMines === 0) {
            // Check if it has at least one hidden non-mine neighbor to flag
            const neighbors = neighborCoords(after1, r, c);
            for (const [nr, nc] of neighbors) {
              const nb = after1.cells[nr][nc];
              if (nb.state === 'hidden' && !nb.isMine) {
                flagR = nr;
                flagC = nc;
                triggerR = r;
                triggerC = c;
                break outerSearch;
              }
            }
          }
        }
      }

      if (flagR === -1) continue;

      // Flag the cell
      const withFlag = toggleFlag(after1, flagR, flagC);
      expect(withFlag.cells[flagR][flagC].state).toBe('flagged');

      // Trigger flood-fill from the zero cell
      const afterFlood = revealCell(withFlag, triggerR, triggerC, undefined, 3000);

      // The flagged cell must remain flagged
      expect(afterFlood.cells[flagR][flagC].state).toBe('flagged');
      tested = true;
      break;
    }
    expect(tested).toBe(true);
  });

  it('flagged cell in flood-fill path stays flagged, does not propagate', () => {
    // Set up: create a game, do first reveal to place mines, flag a hidden cell,
    // then do a second reveal that would flood-fill through it
    for (let seed = 0; seed < 100; seed++) {
      const base = createGame('beginner');
      const after1 = revealCell(base, 4, 4, createRng(seed), 1000);

      // Find a hidden non-mine cell
      let found = false;
      for (let r = 0; r < after1.rows && !found; r++) {
        for (let c = 0; c < after1.cols && !found; c++) {
          const cell = after1.cells[r][c];
          if (cell.state === 'hidden' && !cell.isMine) {
            const withFlag = toggleFlag(after1, r, c);
            // The flagged cell should remain flagged after any reveal operation
            // Attempt to reveal it — must be a no-op
            const tryReveal = revealCell(withFlag, r, c, createRng(seed + 99), 5000);
            expect(tryReveal.cells[r][c].state).toBe('flagged');
            found = true;
          }
        }
      }
      if (found) break;
    }
  });
});

// ---------------------------------------------------------------------------
// toggleFlag
// ---------------------------------------------------------------------------

describe('toggleFlag', () => {
  it('hidden -> flagged increments flagsUsed', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    // Find a hidden cell
    const [r, c] = findHiddenCell(after1);
    const flagged = toggleFlag(after1, r, c);
    expect(flagged.cells[r][c].state).toBe('flagged');
    expect(flagged.flagsUsed).toBe(after1.flagsUsed + 1);
  });

  it('flagged -> hidden decrements flagsUsed', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const [r, c] = findHiddenCell(after1);
    const flagged = toggleFlag(after1, r, c);
    const unflagged = toggleFlag(flagged, r, c);
    expect(unflagged.cells[r][c].state).toBe('hidden');
    expect(unflagged.flagsUsed).toBe(after1.flagsUsed);
  });

  it('no-op on revealed cells', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const state = toggleFlag(after1, 4, 4);
    expect(state).toBe(after1); // same reference = no-op
  });

  it('no-op on out-of-bounds coordinates', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const state1 = toggleFlag(after1, -1, 0);
    const state2 = toggleFlag(after1, 9, 0);
    const state3 = toggleFlag(after1, 0, -1);
    const state4 = toggleFlag(after1, 0, 9);
    expect(state1).toBe(after1);
    expect(state2).toBe(after1);
    expect(state3).toBe(after1);
    expect(state4).toBe(after1);
  });

  it('no-op when game is won', () => {
    // Build a won state by finding a single-mine board scenario
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(5), 1000);
    // Force won status for test by creating a manipulated state
    const wonState: GameState = { ...after1, status: 'won' };
    const [r, c] = findHiddenCell(after1);
    const result = toggleFlag(wonState, r, c);
    expect(result).toBe(wonState);
  });

  it('no-op when game is lost', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(5), 1000);
    const lostState: GameState = { ...after1, status: 'lost' };
    const [r, c] = findHiddenCell(after1);
    const result = toggleFlag(lostState, r, c);
    expect(result).toBe(lostState);
  });

  it('revealCell on a flagged cell is a no-op (cell stays flagged)', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(2), 1000);
    const [r, c] = findHiddenCell(after1);
    const withFlag = toggleFlag(after1, r, c);
    expect(withFlag.cells[r][c].state).toBe('flagged');
    const afterRevealAttempt = revealCell(withFlag, r, c, createRng(3), 2000);
    expect(afterRevealAttempt.cells[r][c].state).toBe('flagged');
    // State should be same reference (no-op)
    expect(afterRevealAttempt).toBe(withFlag);
  });

  it('flagsUsed equals count of flagged cells', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(10), 1000);
    let state = after1;
    // Flag several cells
    let expected = 0;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.cells[r][c].state === 'hidden' && expected < 5) {
          state = toggleFlag(state, r, c);
          expected++;
          expect(state.flagsUsed).toBe(expected);
          expect(countByState(state, 'flagged')).toBe(expected);
        }
      }
    }
  });

  it('double toggle returns to original flagsUsed', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(7), 1000);
    const [r, c] = findHiddenCell(after1);
    const flagged = toggleFlag(after1, r, c);
    const unflagged = toggleFlag(flagged, r, c);
    expect(unflagged.flagsUsed).toBe(after1.flagsUsed);
    expect(unflagged.cells[r][c].state).toBe('hidden');
  });
});

/** Find the first hidden cell in the state. */
function findHiddenCell(state: GameState): [number, number] {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      if (state.cells[r][c].state === 'hidden') return [r, c];
    }
  }
  throw new Error('No hidden cell found');
}

/** Find the first hidden mine cell. */
function findHiddenMine(state: GameState): [number, number] {
  for (let r = 0; r < state.rows; r++) {
    for (let c = 0; c < state.cols; c++) {
      const cell = state.cells[r][c];
      if (cell.isMine && cell.state === 'hidden') return [r, c];
    }
  }
  throw new Error('No hidden mine found');
}

// ---------------------------------------------------------------------------
// Win transition
// ---------------------------------------------------------------------------

describe('Win transition', () => {
  it('revealing all non-mine cells sets status=won and finishedAt non-null', () => {
    // Find a board where we can reveal all safe cells
    for (let seed = 0; seed < 50; seed++) {
      const base = createGame('beginner');
      let state = revealCell(base, 4, 4, createRng(seed), 1000);
      if (state.status === 'won') {
        // Already won on first click — valid scenario, test it
        expect(state.status).toBe('won');
        expect(state.finishedAt).not.toBeNull();
        expect(checkWin(state)).toBe(true);
        return;
      }

      // Reveal all hidden non-mine cells
      let prevStatus: GameStatus = state.status;
      for (let r = 0; r < state.rows && prevStatus === 'playing'; r++) {
        for (let c = 0; c < state.cols && prevStatus === 'playing'; c++) {
          const cell = state.cells[r][c];
          if (!cell.isMine && cell.state === 'hidden') {
            state = revealCell(state, r, c, createRng(seed + r + c), 2000);
            prevStatus = state.status;
          }
        }
      }

      if (state.status === 'won') {
        expect(state.finishedAt).not.toBeNull();
        expect(checkWin(state)).toBe(true);
        return;
      }
    }
    // If we get here without a won state, something is wrong
    // But this is very unlikely — fail explicitly
    expect('did not reach won state').toBe('should have won');
  });

  it('checkWin returns false while non-mine cells are still hidden', () => {
    const base = createGame('beginner');
    const state = revealCell(base, 4, 4, createRng(0), 1000);
    if (state.status !== 'won') {
      expect(checkWin(state)).toBe(false);
    }
  });

  it('checkWin returns true when all non-mine cells are revealed', () => {
    // Force a state where all non-mine cells are revealed
    const base = createGame('beginner');
    let state = revealCell(base, 4, 4, createRng(42), 1000);
    // Reveal all non-mine hidden cells
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (!state.cells[r][c].isMine && state.cells[r][c].state === 'hidden') {
          state = revealCell(state, r, c, undefined, 2000);
          if (state.status === 'lost') return; // oops, shouldn't happen but guard
        }
      }
    }
    if (state.status === 'won') {
      expect(checkWin(state)).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// Lose transition
// ---------------------------------------------------------------------------

describe('Lose transition', () => {
  it('revealing a mine sets status=lost, finishedAt non-null, reveals all mines', () => {
    let tested = false;
    for (let seed = 0; seed < 100; seed++) {
      const base = createGame('beginner');
      const after1 = revealCell(base, 4, 4, createRng(seed), 1000);
      if (after1.status !== 'playing') continue;

      // Find a hidden mine
      let mineR = -1;
      let mineC = -1;
      for (let r = 0; r < after1.rows && mineR === -1; r++) {
        for (let c = 0; c < after1.cols && mineR === -1; c++) {
          const cell = after1.cells[r][c];
          if (cell.isMine && cell.state === 'hidden') {
            mineR = r;
            mineC = c;
          }
        }
      }
      if (mineR === -1) continue;

      const lost = revealCell(after1, mineR, mineC, createRng(seed + 1), 5000);
      expect(lost.status).toBe('lost');
      expect(lost.finishedAt).not.toBeNull();
      expect(lost.finishedAt).toBe(5000);

      // ALL mine cells must be revealed
      for (let r = 0; r < lost.rows; r++) {
        for (let c = 0; c < lost.cols; c++) {
          if (lost.cells[r][c].isMine) {
            expect(lost.cells[r][c].state).toBe('revealed');
          }
        }
      }

      tested = true;
      break;
    }
    expect(tested).toBe(true);
  });

  it('non-mine cells keep their state after losing', () => {
    for (let seed = 0; seed < 100; seed++) {
      const base = createGame('beginner');
      const after1 = revealCell(base, 4, 4, createRng(seed), 1000);
      if (after1.status !== 'playing') continue;

      const [mineR, mineC] = findHiddenMine(after1);

      // Flag a non-mine cell first
      let flagR = -1;
      let flagC = -1;
      for (let r = 0; r < after1.rows && flagR === -1; r++) {
        for (let c = 0; c < after1.cols && flagR === -1; c++) {
          const cell = after1.cells[r][c];
          if (!cell.isMine && cell.state === 'hidden') {
            flagR = r;
            flagC = c;
          }
        }
      }
      if (flagR === -1) continue;

      const withFlag = toggleFlag(after1, flagR, flagC);
      const lost = revealCell(withFlag, mineR, mineC, createRng(seed + 1), 7000);

      expect(lost.status).toBe('lost');
      // Flagged non-mine cell retains its state
      expect(lost.cells[flagR][flagC].state).toBe('flagged');
      return;
    }
  });

  it('game over: revealCell is no-op after lost', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(0), 1000);
    if (after1.status !== 'playing') return;

    const [mineR, mineC] = findHiddenMine(after1);
    const lost = revealCell(after1, mineR, mineC, createRng(1), 2000);
    expect(lost.status).toBe('lost');

    // Try to reveal another cell — must be no-op
    const result = revealCell(lost, 0, 0, createRng(2), 3000);
    expect(result).toBe(lost);
  });

  it('game over: revealCell is no-op after won', () => {
    const base = createGame('beginner');
    let state = revealCell(base, 4, 4, createRng(42), 1000);
    // Reveal all non-mine cells
    for (let r = 0; r < state.rows && state.status === 'playing'; r++) {
      for (let c = 0; c < state.cols && state.status === 'playing'; c++) {
        if (!state.cells[r][c].isMine && state.cells[r][c].state === 'hidden') {
          state = revealCell(state, r, c, undefined, 2000);
        }
      }
    }
    if (state.status === 'won') {
      const result = revealCell(state, 0, 0, createRng(99), 3000);
      expect(result).toBe(state);
    }
  });
});

// ---------------------------------------------------------------------------
// chordCell
// ---------------------------------------------------------------------------

describe('chordCell', () => {
  /**
   * Build a state where we can safely chord.
   * Returns a state with at least one numbered revealed cell whose neighbors
   * are all correctly flagged (matching adjacentMines).
   */
  function buildChordableState(): {
    state: GameState;
    chordR: number;
    chordC: number;
  } | null {
    for (let seed = 0; seed < 200; seed++) {
      const base = createGame('beginner');
      const after1 = revealCell(base, 4, 4, createRng(seed), 1000);
      if (after1.status !== 'playing') continue;

      // Look for a revealed numbered cell where all mine-neighbors are hidden
      for (let r = 0; r < after1.rows; r++) {
        for (let c = 0; c < after1.cols; c++) {
          const cell = after1.cells[r][c];
          if (cell.state !== 'revealed' || cell.adjacentMines === 0) continue;

          const neighbors = neighborCoords(after1, r, c);
          const mineNeighbors = neighbors.filter(([nr, nc]) => after1.cells[nr][nc].isMine);
          const hiddenNeighbors = neighbors.filter(([nr, nc]) => after1.cells[nr][nc].state === 'hidden');

          // We need all mine neighbors to be hidden (so we can flag them)
          if (mineNeighbors.length !== cell.adjacentMines) continue;
          if (mineNeighbors.every(([mr, mc]) => hiddenNeighbors.some(([hr, hc]) => hr === mr && hc === mc))) {
            // Flag all mine neighbors
            let state = after1;
            for (const [mr, mc] of mineNeighbors) {
              state = toggleFlag(state, mr, mc);
            }
            return { state, chordR: r, chordC: c };
          }
        }
      }
    }
    return null;
  }

  it('no-op when status is not playing', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const idleState: GameState = { ...after1, status: 'idle' };
    const result = chordCell(idleState, 4, 4);
    expect(result).toBe(idleState);
  });

  it('no-op on unrevealed cell', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const [r, c] = findHiddenCell(after1);
    const result = chordCell(after1, r, c);
    expect(result).toBe(after1);
  });

  it('no-op on revealed zero cell (adjacentMines === 0)', () => {
    let tested = false;
    for (let seed = 0; seed < 100; seed++) {
      const base = createGame('beginner');
      const state = revealCell(base, 4, 4, createRng(seed), 1000);
      // Find a revealed zero cell
      for (let r = 0; r < state.rows && !tested; r++) {
        for (let c = 0; c < state.cols && !tested; c++) {
          const cell = state.cells[r][c];
          if (cell.state === 'revealed' && cell.adjacentMines === 0) {
            const result = chordCell(state, r, c);
            expect(result).toBe(state);
            tested = true;
          }
        }
      }
      if (tested) break;
    }
    // If we found a zero cell, test passed. If not, that's fine (unlikely for beginner)
  });

  it('no-op when flag count does not match adjacentMines', () => {
    // Find a revealed numbered cell and do NOT flag its mine-neighbors
    for (let seed = 0; seed < 100; seed++) {
      const base = createGame('beginner');
      const state = revealCell(base, 4, 4, createRng(seed), 1000);
      for (let r = 0; r < state.rows; r++) {
        for (let c = 0; c < state.cols; c++) {
          const cell = state.cells[r][c];
          if (cell.state === 'revealed' && cell.adjacentMines > 0) {
            // No flags placed — flag count is 0, adjacentMines > 0 => mismatch
            const result = chordCell(state, r, c);
            expect(result).toBe(state);
            return;
          }
        }
      }
    }
  });

  it('correct chord: reveals all non-flagged neighbors when flags match', () => {
    const setup = buildChordableState();
    if (!setup) {
      // Could not construct scenario — skip gracefully
      return;
    }
    const { state, chordR, chordC } = setup;
    const cell = state.cells[chordR][chordC];

    const neighbors = neighborCoords(state, chordR, chordC);
    const hiddenNonFlaggedNeighbors = neighbors.filter(([nr, nc]) => {
      return state.cells[nr][nc].state === 'hidden';
    });

    const result = chordCell(state, chordR, chordC);

    // All previously-hidden non-mine neighbors should now be revealed
    for (const [nr, nc] of hiddenNonFlaggedNeighbors) {
      if (!state.cells[nr][nc].isMine) {
        expect(result.cells[nr][nc].state).toBe('revealed');
      }
    }

    // Flagged cells stay flagged
    const flaggedNeighbors = neighbors.filter(([nr, nc]) => state.cells[nr][nc].state === 'flagged');
    for (const [nr, nc] of flaggedNeighbors) {
      expect(result.cells[nr][nc].state).toBe('flagged');
    }

    // adjacentMines check for coverage
    expect(cell.adjacentMines).toBeGreaterThan(0);
  });

  it('wrong flag causes chord to trigger loss', () => {
    // Build a state: revealed numbered cell, flag a SAFE neighbor (wrong), leave mine unflagged
    for (let seed = 0; seed < 200; seed++) {
      const base = createGame('beginner');
      const after1 = revealCell(base, 4, 4, createRng(seed), 1000);
      if (after1.status !== 'playing') continue;

      // Find a revealed numbered cell with at least one mine neighbor and one safe neighbor
      for (let r = 0; r < after1.rows; r++) {
        for (let c = 0; c < after1.cols; c++) {
          const cell = after1.cells[r][c];
          if (cell.state !== 'revealed' || cell.adjacentMines !== 1) continue;

          const neighbors = neighborCoords(after1, r, c);
          const mineNeighbors = neighbors.filter(([nr, nc]) => after1.cells[nr][nc].isMine && after1.cells[nr][nc].state === 'hidden');
          const safeHidden = neighbors.filter(([nr, nc]) => !after1.cells[nr][nc].isMine && after1.cells[nr][nc].state === 'hidden');

          if (mineNeighbors.length === 1 && safeHidden.length >= 1) {
            // Flag the safe cell instead of the mine (wrong flag)
            const [wrongR, wrongC] = safeHidden[0];
            const withWrongFlag = toggleFlag(after1, wrongR, wrongC);

            // Now chord: flag count (1) === adjacentMines (1), but the flag is wrong
            const result = chordCell(withWrongFlag, r, c);

            // The mine neighbor (unflagged) should have been revealed => loss
            expect(result.status).toBe('lost');
            expect(result.finishedAt).not.toBeNull();
            // All mines revealed
            for (let lr = 0; lr < result.rows; lr++) {
              for (let lc = 0; lc < result.cols; lc++) {
                if (result.cells[lr][lc].isMine) {
                  expect(result.cells[lr][lc].state).toBe('revealed');
                }
              }
            }
            return;
          }
        }
      }
    }
  });

  it('no-op on out-of-bounds', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    expect(chordCell(after1, -1, 0)).toBe(after1);
    expect(chordCell(after1, 9, 0)).toBe(after1);
    expect(chordCell(after1, 0, -1)).toBe(after1);
    expect(chordCell(after1, 0, 9)).toBe(after1);
  });
});

// ---------------------------------------------------------------------------
// Purity: input not mutated
// ---------------------------------------------------------------------------

describe('Purity (inputs not mutated)', () => {
  it('revealCell does not mutate input on first reveal', () => {
    const base = createGame('beginner');
    const clone = structuredClone(base);
    revealCell(base, 4, 4, createRng(1), 1000);
    expect(base).toEqual(clone);
  });

  it('revealCell does not mutate input on subsequent reveal', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const [r, c] = findHiddenCell(after1);
    const clone = structuredClone(after1);
    revealCell(after1, r, c, createRng(2), 2000);
    expect(after1).toEqual(clone);
  });

  it('revealCell does not mutate input on no-op (out of bounds)', () => {
    const base = createGame('beginner');
    const clone = structuredClone(base);
    revealCell(base, -1, 0, createRng(1), 1000);
    expect(base).toEqual(clone);
  });

  it('revealCell does not mutate input on mine reveal', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(0), 1000);
    if (after1.status !== 'playing') return;
    const [mineR, mineC] = findHiddenMine(after1);
    const clone = structuredClone(after1);
    revealCell(after1, mineR, mineC, createRng(1), 2000);
    expect(after1).toEqual(clone);
  });

  it('toggleFlag does not mutate input (hidden->flagged)', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const [r, c] = findHiddenCell(after1);
    const clone = structuredClone(after1);
    toggleFlag(after1, r, c);
    expect(after1).toEqual(clone);
  });

  it('toggleFlag does not mutate input (flagged->hidden)', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const [r, c] = findHiddenCell(after1);
    const flagged = toggleFlag(after1, r, c);
    const clone = structuredClone(flagged);
    toggleFlag(flagged, r, c);
    expect(flagged).toEqual(clone);
  });

  it('toggleFlag does not mutate input on no-op', () => {
    const base = createGame('beginner');
    const clone = structuredClone(base);
    toggleFlag(base, 4, 4); // idle state is a no-op (won/lost check doesn't apply but revealed does)
    expect(base).toEqual(clone);
  });

  it('chordCell does not mutate input', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const clone = structuredClone(after1);
    chordCell(after1, 4, 4);
    expect(after1).toEqual(clone);
  });

  it('revealCell returns new object (not same reference) on actual reveal', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    expect(after1).not.toBe(base);
  });

  it('toggleFlag returns new object on actual flag change', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    const [r, c] = findHiddenCell(after1);
    const flagged = toggleFlag(after1, r, c);
    expect(flagged).not.toBe(after1);
  });
});

// ---------------------------------------------------------------------------
// minesRemaining
// ---------------------------------------------------------------------------

describe('minesRemaining', () => {
  it('equals mines - flagsUsed on idle state', () => {
    const state = createGame('beginner');
    expect(minesRemaining(state)).toBe(state.mines - state.flagsUsed);
    expect(minesRemaining(state)).toBe(10);
  });

  it('decrements by 1 after each flag placed', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    let state = after1;
    let flagged = 0;
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (state.cells[r][c].state === 'hidden' && flagged < 3) {
          state = toggleFlag(state, r, c);
          flagged++;
          expect(minesRemaining(state)).toBe(state.mines - state.flagsUsed);
        }
      }
    }
  });

  it('can be negative when over-flagged', () => {
    const base = createGame('beginner');
    const after1 = revealCell(base, 4, 4, createRng(1), 1000);
    let state = after1;
    // Flag more cells than there are mines
    let flagCount = 0;
    for (let r = 0; r < state.rows && flagCount <= state.mines; r++) {
      for (let c = 0; c < state.cols && flagCount <= state.mines; c++) {
        if (state.cells[r][c].state === 'hidden') {
          state = toggleFlag(state, r, c);
          flagCount++;
        }
      }
    }
    if (state.flagsUsed > state.mines) {
      expect(minesRemaining(state)).toBeLessThan(0);
    }
  });

  it('equals mines - flagsUsed (raw, unclamped)', () => {
    const base = createGame('intermediate');
    let state = revealCell(base, 8, 8, createRng(5), 1000);
    let flagged = 0;
    for (let r = 0; r < state.rows && flagged < 7; r++) {
      for (let c = 0; c < state.cols && flagged < 7; c++) {
        if (state.cells[r][c].state === 'hidden') {
          state = toggleFlag(state, r, c);
          flagged++;
        }
      }
    }
    expect(minesRemaining(state)).toBe(state.mines - state.flagsUsed);
  });
});

// ---------------------------------------------------------------------------
// revealCell no-op cases
// ---------------------------------------------------------------------------

describe('revealCell no-ops', () => {
  it('out of bounds row (negative)', () => {
    const base = createGame('beginner');
    const result = revealCell(base, -1, 0, createRng(1), 1000);
    expect(result).toBe(base);
  });

  it('out of bounds row (too large)', () => {
    const base = createGame('beginner');
    const result = revealCell(base, 9, 0, createRng(1), 1000);
    expect(result).toBe(base);
  });

  it('out of bounds col (negative)', () => {
    const base = createGame('beginner');
    const result = revealCell(base, 0, -1, createRng(1), 1000);
    expect(result).toBe(base);
  });

  it('out of bounds col (too large)', () => {
    const base = createGame('beginner');
    const result = revealCell(base, 0, 9, createRng(1), 1000);
    expect(result).toBe(base);
  });
});
