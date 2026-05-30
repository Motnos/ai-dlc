import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface SaveRow {
  difficulty: string;
  state: string;
  updatedAt: string;
}

export interface ResultRow {
  id: string;
  playerId: string;
  difficulty: string;
  outcome: 'won' | 'lost';
  durationMs: number;
  mines: number;
  rows: number;
  cols: number;
  finishedAt: string;
}

export interface ResultInsert {
  id: string;
  playerId: string;
  difficulty: string;
  outcome: 'won' | 'lost';
  durationMs: number;
  mines: number;
  rows: number;
  cols: number;
  finishedAt: string;
}

export interface Db {
  getSave(playerId: string): SaveRow | null;
  upsertSave(playerId: string, difficulty: string, state: string): void;
  deleteSave(playerId: string): void;
  insertResult(row: ResultInsert): void;
  listResults(playerId: string, limit: number): ResultRow[];
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function createDb(dbPath?: string): Db {
  const resolvedPath = dbPath ?? path.join(process.cwd(), 'data', 'app.db');

  if (!dbPath || dbPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    fs.mkdirSync(dir, { recursive: true });
  }

  const db = new Database(resolvedPath);
  db.pragma('journal_mode = WAL');

  const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
  db.exec(schemaSql);

  const stmtGetSave = db.prepare<[string], { difficulty: string; state: string; updated_at: string }>(
    'SELECT difficulty, state, updated_at FROM game_saves WHERE player_id = ?',
  );

  const stmtUpsertSave = db.prepare<[string, string, string, string]>(
    `INSERT INTO game_saves (player_id, difficulty, state, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(player_id) DO UPDATE SET
       difficulty = excluded.difficulty,
       state = excluded.state,
       updated_at = excluded.updated_at`,
  );

  const stmtDeleteSave = db.prepare<[string]>(
    'DELETE FROM game_saves WHERE player_id = ?',
  );

  const stmtInsertResult = db.prepare<[string, string, string, string, number, number, number, number, string]>(
    `INSERT INTO game_results (id, player_id, difficulty, outcome, duration_ms, mines, rows, cols, finished_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const stmtListResults = db.prepare<[string, number], {
    id: string;
    player_id: string;
    difficulty: string;
    outcome: 'won' | 'lost';
    duration_ms: number;
    mines: number;
    rows: number;
    cols: number;
    finished_at: string;
  }>(
    `SELECT id, player_id, difficulty, outcome, duration_ms, mines, rows, cols, finished_at
     FROM game_results
     WHERE player_id = ?
     ORDER BY finished_at DESC
     LIMIT ?`,
  );

  return {
    getSave(playerId: string): SaveRow | null {
      const row = stmtGetSave.get(playerId);
      if (!row) return null;
      return {
        difficulty: row.difficulty,
        state: row.state,
        updatedAt: row.updated_at,
      };
    },

    upsertSave(playerId: string, difficulty: string, state: string): void {
      stmtUpsertSave.run(playerId, difficulty, state, new Date().toISOString());
    },

    deleteSave(playerId: string): void {
      stmtDeleteSave.run(playerId);
    },

    insertResult(row: ResultInsert): void {
      stmtInsertResult.run(
        row.id,
        row.playerId,
        row.difficulty,
        row.outcome,
        row.durationMs,
        row.mines,
        row.rows,
        row.cols,
        row.finishedAt,
      );
    },

    listResults(playerId: string, limit: number): ResultRow[] {
      const rows = stmtListResults.all(playerId, limit);
      return rows.map((r) => ({
        id: r.id,
        playerId: r.player_id,
        difficulty: r.difficulty,
        outcome: r.outcome,
        durationMs: r.duration_ms,
        mines: r.mines,
        rows: r.rows,
        cols: r.cols,
        finishedAt: r.finished_at,
      }));
    },
  };
}
