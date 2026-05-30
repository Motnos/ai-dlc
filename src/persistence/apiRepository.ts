import { serialize, deserialize } from '../game/serialize';
import type { Difficulty, GameState } from '../game/types';
import type { GameRepository, GameResult, GameResultInput } from './types';

export function createApiRepository(): GameRepository {
  return {
    async loadSave(playerId: string): Promise<{ difficulty: Difficulty; state: GameState } | null> {
      try {
        const enc = encodeURIComponent(playerId);
        const res = await fetch(`/api/saves/${enc}`);
        if (!res.ok) return null;
        const body = (await res.json()) as { difficulty: unknown; state: unknown };
        const state = deserialize(body.state);
        return { difficulty: body.difficulty as Difficulty, state };
      } catch {
        return null;
      }
    },

    async saveGame(playerId: string, state: GameState): Promise<void> {
      try {
        const enc = encodeURIComponent(playerId);
        const game = serialize(state);
        await fetch(`/api/saves/${enc}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ difficulty: state.difficulty, state: game }),
        });
      } catch {
        // non-fatal
      }
    },

    async clearSave(playerId: string): Promise<void> {
      try {
        const enc = encodeURIComponent(playerId);
        await fetch(`/api/saves/${enc}`, { method: 'DELETE' });
      } catch {
        // non-fatal
      }
    },

    async recordResult(playerId: string, result: GameResultInput): Promise<void> {
      try {
        await fetch('/api/results', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            playerId,
            difficulty: result.difficulty,
            outcome: result.outcome,
            durationMs: result.durationMs,
            mines: result.mines,
            rows: result.rows,
            cols: result.cols,
          }),
        });
      } catch {
        // non-fatal
      }
    },

    async listResults(playerId: string, limit?: number): Promise<GameResult[]> {
      try {
        const enc = encodeURIComponent(playerId);
        const res = await fetch(`/api/results/${enc}?limit=${limit ?? 50}`);
        if (!res.ok) return [];
        const data = (await res.json()) as GameResult[];
        return data;
      } catch {
        return [];
      }
    },
  };
}

export const apiRepository: GameRepository = createApiRepository();
