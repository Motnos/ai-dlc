import type { JSX } from 'react';
import type { UseMinesweeper } from '../../hooks/useMinesweeper';
import { GameHeader } from './GameHeader';
import { Board } from './Board';

export interface GameScreenProps {
  game: UseMinesweeper;
}

export function GameScreen({ game }: GameScreenProps): JSX.Element {
  const { state, reveal, flag, chord, newGame } = game;

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden bg-zinc-900">
      <GameHeader
        state={state}
        onReset={() => newGame(state.difficulty)}
        onSelectDifficulty={(d) => newGame(d)}
      />
      <Board
        state={state}
        onReveal={reveal}
        onFlag={flag}
        onChord={chord}
      />
    </div>
  );
}
