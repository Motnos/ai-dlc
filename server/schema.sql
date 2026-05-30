CREATE TABLE IF NOT EXISTS game_saves (
  player_id  TEXT PRIMARY KEY,
  difficulty TEXT NOT NULL,
  state      TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS game_results (
  id          TEXT PRIMARY KEY,
  player_id   TEXT NOT NULL,
  difficulty  TEXT NOT NULL,
  outcome     TEXT NOT NULL CHECK(outcome IN ('won','lost')),
  duration_ms INTEGER NOT NULL,
  mines       INTEGER NOT NULL,
  rows        INTEGER NOT NULL,
  cols        INTEGER NOT NULL,
  finished_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_game_results_player_finished
  ON game_results (player_id, finished_at DESC);
