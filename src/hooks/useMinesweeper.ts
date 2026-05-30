import { useCallback, useReducer } from 'react';
import type { Difficulty, GameState } from '../game/types';
import { createGame, revealCell, toggleFlag, chordCell } from '../game/engine';

export interface UseMinesweeper {
  state: GameState;
  reveal(row: number, col: number): void;
  flag(row: number, col: number): void;
  chord(row: number, col: number): void;
  newGame(difficulty: Difficulty): void;
  restore(state: GameState): void;
}

type Action =
  | { type: 'reveal'; row: number; col: number }
  | { type: 'flag'; row: number; col: number }
  | { type: 'chord'; row: number; col: number }
  | { type: 'newGame'; difficulty: Difficulty }
  | { type: 'restore'; state: GameState };

function reducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'reveal':
      return revealCell(state, action.row, action.col);
    case 'flag':
      return toggleFlag(state, action.row, action.col);
    case 'chord':
      return chordCell(state, action.row, action.col);
    case 'newGame':
      return createGame(action.difficulty);
    case 'restore':
      return action.state;
  }
}

export function useMinesweeper(): UseMinesweeper {
  const [state, dispatch] = useReducer(reducer, undefined, () => createGame('beginner'));

  const reveal = useCallback((row: number, col: number) => {
    dispatch({ type: 'reveal', row, col });
  }, []);

  const flag = useCallback((row: number, col: number) => {
    dispatch({ type: 'flag', row, col });
  }, []);

  const chord = useCallback((row: number, col: number) => {
    dispatch({ type: 'chord', row, col });
  }, []);

  const newGame = useCallback((difficulty: Difficulty) => {
    dispatch({ type: 'newGame', difficulty });
  }, []);

  const restore = useCallback((gameState: GameState) => {
    dispatch({ type: 'restore', state: gameState });
  }, []);

  return { state, reveal, flag, chord, newGame, restore };
}
