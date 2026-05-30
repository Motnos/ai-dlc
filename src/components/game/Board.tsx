import type { JSX } from 'react';
import type { GameState } from '../../game/types';
import { Cell } from './Cell';

interface BoardProps {
  state: GameState;
  onReveal(r: number, c: number): void;
  onFlag(r: number, c: number): void;
  onChord(r: number, c: number): void;
}

export function Board({ state, onReveal, onFlag, onChord }: BoardProps): JSX.Element {
  return (
    <div
      className="flex-1 flex items-center justify-center p-1 overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        className="w-full select-none touch-manipulation"
        style={{ display: 'grid', gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))` }}
      >
        {state.cells.map((row, r) =>
          row.map((cell, c) => (
            <Cell
              key={`${r}-${c}`}
              cell={cell}
              onReveal={() => onReveal(r, c)}
              onFlag={() => onFlag(r, c)}
              onChord={() => onChord(r, c)}
            />
          )),
        )}
      </div>
    </div>
  );
}
