import express from 'express';
import { createDb } from './db';

const db = createDb(process.env['DB_PATH']);
const PORT = Number(process.env['PORT']) || 3001;

const app = express();
app.use(express.json());

// GET /api/health
app.get('/api/health', (_req, res) => {
  res.json({ ok: true });
});

// GET /api/saves/:playerId
app.get('/api/saves/:playerId', (req, res) => {
  const { playerId } = req.params;
  const row = db.getSave(playerId);
  if (!row) {
    res.status(404).json(null);
    return;
  }
  let parsedState: unknown;
  try {
    parsedState = JSON.parse(row.state);
  } catch {
    res.status(404).json(null);
    return;
  }
  res.json({ difficulty: row.difficulty, state: parsedState });
});

// PUT /api/saves/:playerId
app.put('/api/saves/:playerId', (req, res) => {
  const { playerId } = req.params;
  const { difficulty, state } = req.body as { difficulty?: unknown; state?: unknown };

  if (typeof difficulty !== 'string' || difficulty.length === 0) {
    res.status(400).json({ error: 'difficulty must be a non-empty string' });
    return;
  }
  if (state === undefined || state === null || typeof state !== 'object' || Array.isArray(state)) {
    res.status(400).json({ error: 'state must be a present object' });
    return;
  }

  db.upsertSave(playerId, difficulty, JSON.stringify(state));
  res.status(204).send();
});

// DELETE /api/saves/:playerId
app.delete('/api/saves/:playerId', (req, res) => {
  const { playerId } = req.params;
  db.deleteSave(playerId);
  res.status(204).send();
});

// POST /api/results
app.post('/api/results', (req, res) => {
  const body = req.body as Record<string, unknown>;
  const { playerId, difficulty, outcome, durationMs, mines, rows, cols } = body;

  if (typeof playerId !== 'string' || playerId.length === 0) {
    res.status(400).json({ error: 'playerId must be a non-empty string' });
    return;
  }
  if (typeof difficulty !== 'string' || difficulty.length === 0) {
    res.status(400).json({ error: 'difficulty must be a non-empty string' });
    return;
  }
  if (outcome !== 'won' && outcome !== 'lost') {
    res.status(400).json({ error: "outcome must be 'won' or 'lost'" });
    return;
  }
  if (typeof durationMs !== 'number' || !isFinite(durationMs)) {
    res.status(400).json({ error: 'durationMs must be a finite number' });
    return;
  }
  if (typeof mines !== 'number' || !isFinite(mines)) {
    res.status(400).json({ error: 'mines must be a finite number' });
    return;
  }
  if (typeof rows !== 'number' || !isFinite(rows)) {
    res.status(400).json({ error: 'rows must be a finite number' });
    return;
  }
  if (typeof cols !== 'number' || !isFinite(cols)) {
    res.status(400).json({ error: 'cols must be a finite number' });
    return;
  }

  const id = crypto.randomUUID();
  const finishedAt = new Date().toISOString();

  db.insertResult({ id, playerId, difficulty, outcome, durationMs, mines, rows, cols, finishedAt });
  res.status(201).json({ id });
});

// GET /api/results/:playerId
app.get('/api/results/:playerId', (req, res) => {
  const { playerId } = req.params;
  const rawLimit = Number(req.query['limit']);
  const limit = isNaN(rawLimit) ? 50 : Math.min(Math.max(1, rawLimit), 500);

  const rows = db.listResults(playerId, limit);
  const results = rows.map((r) => ({
    id: r.id,
    difficulty: r.difficulty,
    outcome: r.outcome,
    durationMs: r.durationMs,
    rows: r.rows,
    cols: r.cols,
    mines: r.mines,
    playedAt: Date.parse(r.finishedAt),
  }));

  res.json(results);
});

app.listen(PORT, () => {
  console.log(`API server listening on http://localhost:${PORT}`);
});
