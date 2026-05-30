const PLAYER_ID_KEY = 'minesweeper.playerId';

export function getPlayerId(): string {
  try {
    const stored = localStorage.getItem(PLAYER_ID_KEY);
    if (stored && stored.trim().length > 0) return stored;
    const id = crypto.randomUUID();
    localStorage.setItem(PLAYER_ID_KEY, id);
    return id;
  } catch {
    // localStorage unavailable — return a per-call UUID (non-persistent but functional)
    return crypto.randomUUID();
  }
}
