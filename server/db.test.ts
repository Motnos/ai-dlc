// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest';
import { createDb } from './db';
import type { Db } from './db';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeResultRow(overrides: Partial<{
  id: string;
  playerId: string;
  difficulty: string;
  outcome: 'won' | 'lost';
  durationMs: number;
  mines: number;
  rows: number;
  cols: number;
  finishedAt: string;
}> = {}) {
  return {
    id: crypto.randomUUID(),
    playerId: 'player-1',
    difficulty: 'beginner',
    outcome: 'won' as const,
    durationMs: 12345,
    mines: 10,
    rows: 9,
    cols: 9,
    finishedAt: new Date().toISOString(),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// getSave / upsertSave
// ---------------------------------------------------------------------------

describe('db getSave / upsertSave', () => {
  let db: Db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  it('returns null for unknown player', () => {
    const result = db.getSave('nobody');
    expect(result).toBeNull();
  });

  it('upsertSave then getSave round-trips difficulty', () => {
    db.upsertSave('player-1', 'beginner', JSON.stringify({ v: 1 }));
    const row = db.getSave('player-1');
    expect(row).not.toBeNull();
    expect(row!.difficulty).toBe('beginner');
  });

  it('upsertSave then getSave round-trips state', () => {
    const state = JSON.stringify({ v: 1, difficulty: 'expert', rows: 16, cols: 30 });
    db.upsertSave('player-2', 'expert', state);
    const row = db.getSave('player-2');
    expect(row).not.toBeNull();
    expect(row!.state).toBe(state);
  });

  it('upsertSave sets updatedAt as a non-empty string', () => {
    db.upsertSave('player-1', 'intermediate', '{}');
    const row = db.getSave('player-1');
    expect(typeof row!.updatedAt).toBe('string');
    expect(row!.updatedAt.length).toBeGreaterThan(0);
  });

  it('second upsertSave with same playerId overwrites difficulty', () => {
    db.upsertSave('player-1', 'beginner', JSON.stringify({ v: 1, first: true }));
    db.upsertSave('player-1', 'expert', JSON.stringify({ v: 1, second: true }));
    const row = db.getSave('player-1');
    expect(row!.difficulty).toBe('expert');
  });

  it('second upsertSave with same playerId overwrites state', () => {
    const first = JSON.stringify({ v: 1, first: true });
    const second = JSON.stringify({ v: 1, second: true });
    db.upsertSave('player-1', 'beginner', first);
    db.upsertSave('player-1', 'intermediate', second);
    const row = db.getSave('player-1');
    expect(row!.state).toBe(second);
  });

  it('getSave only returns data for the correct playerId', () => {
    db.upsertSave('player-A', 'beginner', JSON.stringify({ player: 'A' }));
    db.upsertSave('player-B', 'expert', JSON.stringify({ player: 'B' }));
    const rowA = db.getSave('player-A');
    const rowB = db.getSave('player-B');
    expect(rowA!.difficulty).toBe('beginner');
    expect(rowB!.difficulty).toBe('expert');
  });
});

// ---------------------------------------------------------------------------
// deleteSave
// ---------------------------------------------------------------------------

describe('db deleteSave', () => {
  let db: Db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  it('deleteSave removes the row (getSave returns null after)', () => {
    db.upsertSave('player-1', 'beginner', '{}');
    db.deleteSave('player-1');
    expect(db.getSave('player-1')).toBeNull();
  });

  it('deleteSave on a missing player does not throw', () => {
    expect(() => db.deleteSave('nonexistent')).not.toThrow();
  });

  it('deleteSave does not affect other players', () => {
    db.upsertSave('player-1', 'beginner', '{}');
    db.upsertSave('player-2', 'expert', '{}');
    db.deleteSave('player-1');
    expect(db.getSave('player-1')).toBeNull();
    expect(db.getSave('player-2')).not.toBeNull();
  });
});

// ---------------------------------------------------------------------------
// insertResult / listResults
// ---------------------------------------------------------------------------

describe('db insertResult / listResults', () => {
  let db: Db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  it('listResults returns empty array when no results exist', () => {
    const results = db.listResults('player-1', 50);
    expect(results).toEqual([]);
  });

  it('insertResult then listResults returns the row', () => {
    const row = makeResultRow({ playerId: 'player-1' });
    db.insertResult(row);
    const results = db.listResults('player-1', 50);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe(row.id);
    expect(results[0].playerId).toBe('player-1');
    expect(results[0].difficulty).toBe('beginner');
    expect(results[0].outcome).toBe('won');
    expect(results[0].durationMs).toBe(12345);
    expect(results[0].mines).toBe(10);
    expect(results[0].rows).toBe(9);
    expect(results[0].cols).toBe(9);
  });

  it('listResults returns results newest-first (finished_at DESC)', () => {
    const older = makeResultRow({
      id: 'id-older',
      playerId: 'player-1',
      finishedAt: '2025-01-01T10:00:00.000Z',
    });
    const newer = makeResultRow({
      id: 'id-newer',
      playerId: 'player-1',
      finishedAt: '2025-06-01T10:00:00.000Z',
    });
    // Insert older first, then newer
    db.insertResult(older);
    db.insertResult(newer);
    const results = db.listResults('player-1', 50);
    expect(results[0].id).toBe('id-newer');
    expect(results[1].id).toBe('id-older');
  });

  it('listResults respects the limit parameter', () => {
    for (let i = 0; i < 5; i++) {
      db.insertResult(makeResultRow({
        id: `id-${i}`,
        playerId: 'player-1',
        // Distinct timestamps so ordering is deterministic
        finishedAt: new Date(1_000_000_000_000 + i * 1000).toISOString(),
      }));
    }
    const results = db.listResults('player-1', 2);
    expect(results).toHaveLength(2);
  });

  it('limit=1 returns only the most recent result', () => {
    const rows = [
      makeResultRow({ id: 'oldest', playerId: 'p', finishedAt: '2024-01-01T00:00:00.000Z' }),
      makeResultRow({ id: 'middle', playerId: 'p', finishedAt: '2024-06-01T00:00:00.000Z' }),
      makeResultRow({ id: 'newest', playerId: 'p', finishedAt: '2025-01-01T00:00:00.000Z' }),
    ];
    for (const r of rows) db.insertResult(r);
    const results = db.listResults('p', 1);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('newest');
  });

  it('listResults only returns results for the specified player', () => {
    db.insertResult(makeResultRow({ id: 'a-1', playerId: 'player-A' }));
    db.insertResult(makeResultRow({ id: 'b-1', playerId: 'player-B' }));
    const results = db.listResults('player-A', 50);
    expect(results).toHaveLength(1);
    expect(results[0].id).toBe('a-1');
  });

  it('listResults maps snake_case columns to camelCase fields', () => {
    const row = makeResultRow({ playerId: 'player-1', durationMs: 9999 });
    db.insertResult(row);
    const results = db.listResults('player-1', 50);
    // durationMs (camelCase) must be present
    expect(results[0].durationMs).toBe(9999);
    // playerId (camelCase) must be present
    expect(results[0].playerId).toBe('player-1');
    // finishedAt (camelCase) must be present as an ISO string
    expect(typeof results[0].finishedAt).toBe('string');
    expect(results[0].finishedAt.length).toBeGreaterThan(0);
  });

  it('finishedAt stored in db is retrievable as ISO string for Date.parse', () => {
    const isoTs = '2025-05-30T20:53:44.734Z';
    db.insertResult(makeResultRow({ playerId: 'player-1', finishedAt: isoTs }));
    const results = db.listResults('player-1', 50);
    // Date.parse should produce a valid epoch ms (the conversion the route uses)
    const parsed = Date.parse(results[0].finishedAt);
    expect(isNaN(parsed)).toBe(false);
    expect(parsed).toBe(Date.parse(isoTs));
  });
});

// ---------------------------------------------------------------------------
// CHECK constraint — invalid outcome
// ---------------------------------------------------------------------------

describe('db CHECK constraint on outcome', () => {
  let db: Db;

  beforeEach(() => {
    db = createDb(':memory:');
  });

  it('insertResult throws when outcome is not won or lost', () => {
    const row = makeResultRow({
      outcome: 'draw' as 'won' | 'lost', // force invalid value past TS
    });
    expect(() => db.insertResult(row)).toThrow();
  });

  it('insertResult with outcome "won" does not throw', () => {
    expect(() => db.insertResult(makeResultRow({ outcome: 'won' }))).not.toThrow();
  });

  it('insertResult with outcome "lost" does not throw', () => {
    expect(() => db.insertResult(makeResultRow({ outcome: 'lost' }))).not.toThrow();
  });
});
