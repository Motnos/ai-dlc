import { useEffect, useRef } from 'react';
import type { GameRepository } from '../persistence/types';
import type { GameState, Difficulty, GameStatus } from '../game/types';

export interface UseGamePersistenceArgs {
  repository: GameRepository;
  playerId: string;
  state: GameState;
  restore(state: GameState): void;
  newGame(difficulty: Difficulty): void;
}

export function useGamePersistence(args: UseGamePersistenceArgs): void {
  const { repository, playerId, state, restore } = args;
  const hydratedRef = useRef(false);
  const prevStatusRef = useRef<GameStatus>(state.status);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // On mount: load saved game
  useEffect(() => {
    void repository
      .loadSave(playerId)
      .then((saved) => {
        if (saved && (saved.state.status === 'idle' || saved.state.status === 'playing')) {
          restore(saved.state);
        }
        hydratedRef.current = true;
      })
      .catch(() => {
        hydratedRef.current = true;
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced save while playing
  useEffect(() => {
    if (!hydratedRef.current) return;
    if (state.status !== 'playing') return;

    if (saveTimerRef.current !== null) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      void repository.saveGame(playerId, state).catch(() => {});
    }, 400);

    return () => {
      if (saveTimerRef.current !== null) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
    };
  }, [repository, playerId, state]);

  // Terminal transition: record result + clear save
  useEffect(() => {
    const prevStatus = prevStatusRef.current;
    const currStatus = state.status;

    if (
      (currStatus === 'won' || currStatus === 'lost') &&
      prevStatus !== currStatus
    ) {
      const { difficulty, rows, cols, mines, startedAt, finishedAt } = state;
      void repository
        .recordResult(playerId, {
          difficulty,
          outcome: currStatus,
          durationMs: (finishedAt ?? 0) - (startedAt ?? 0),
          rows,
          cols,
          mines,
        })
        .catch(() => {});
      void repository.clearSave(playerId).catch(() => {});
    }

    prevStatusRef.current = currStatus;
  }, [repository, playerId, state]);

  // beforeunload flush
  useEffect(() => {
    function handleBeforeUnload(): void {
      if (state.status === 'playing') {
        void repository.saveGame(playerId, state).catch(() => {});
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [repository, playerId, state]);
}
