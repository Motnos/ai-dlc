import type { Difficulty, GameState } from '../game/types';
import { serialize, deserialize } from '../game/serialize';
import type { GameRepository, GameResult, GameResultInput } from './types';

function saveKey(playerId: string): string {
  return `minesweeper.save.${playerId}`;
}

function resultsKey(playerId: string): string {
  return `minesweeper.results.${playerId}`;
}

function lsGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function lsSet(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // quota or unavailable — ignore
  }
}

function lsRemove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function createMemoryRepository(): GameRepository {
  // In-memory fallbacks when localStorage is unavailable/throws
  const saveFallback = new Map<string, string>();
  const resultsFallback = new Map<string, string>();

  function readRaw(key: string, fallback: Map<string, string>): string | null {
    const ls = lsGet(key);
    if (ls !== null) return ls;
    return fallback.get(key) ?? null;
  }

  function writeRaw(key: string, value: string, fallback: Map<string, string>): void {
    const before = lsGet(key);
    lsSet(key, value);
    // If localStorage didn't save (still same as before or still null), use fallback
    const after = lsGet(key);
    if (after !== value) {
      fallback.set(key, value);
    } else if (before !== null) {
      // Also keep fallback in sync if it was there
      fallback.delete(key);
    }
  }

  function removeRaw(key: string, fallback: Map<string, string>): void {
    lsRemove(key);
    fallback.delete(key);
  }

  return {
    async loadSave(playerId: string): Promise<{ difficulty: Difficulty; state: GameState } | null> {
      try {
        const raw = readRaw(saveKey(playerId), saveFallback);
        if (!raw) return null;
        const parsed: unknown = JSON.parse(raw);
        if (
          typeof parsed !== 'object' ||
          parsed === null ||
          !('difficulty' in parsed) ||
          !('game' in parsed)
        ) {
          removeRaw(saveKey(playerId), saveFallback);
          return null;
        }
        const { difficulty, game } = parsed as { difficulty: unknown; game: unknown };
        const state = deserialize(game);
        return { difficulty: difficulty as Difficulty, state };
      } catch {
        // Corrupt save — clear it
        removeRaw(saveKey(playerId), saveFallback);
        return null;
      }
    },

    async saveGame(playerId: string, state: GameState): Promise<void> {
      try {
        const game = serialize(state);
        const payload = JSON.stringify({ difficulty: state.difficulty, game });
        writeRaw(saveKey(playerId), payload, saveFallback);
      } catch {
        // Storage failure — non-fatal
      }
    },

    async clearSave(playerId: string): Promise<void> {
      try {
        removeRaw(saveKey(playerId), saveFallback);
      } catch {
        // ignore
      }
    },

    async recordResult(playerId: string, result: GameResultInput): Promise<void> {
      try {
        const existing = readRaw(resultsKey(playerId), resultsFallback);
        const arr: GameResult[] = existing ? (JSON.parse(existing) as GameResult[]) : [];
        const entry: GameResult = {
          ...result,
          id: crypto.randomUUID(),
          playedAt: Date.now(),
        };
        arr.unshift(entry);
        writeRaw(resultsKey(playerId), JSON.stringify(arr), resultsFallback);
      } catch {
        // non-fatal
      }
    },

    async listResults(playerId: string, limit?: number): Promise<GameResult[]> {
      try {
        const raw = readRaw(resultsKey(playerId), resultsFallback);
        if (!raw) return [];
        const arr = JSON.parse(raw) as GameResult[];
        return limit !== undefined ? arr.slice(0, limit) : arr;
      } catch {
        return [];
      }
    },
  };
}

export const memoryRepository: GameRepository = createMemoryRepository();
