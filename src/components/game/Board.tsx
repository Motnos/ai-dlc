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
      className="flex-1 min-h-0 min-w-0 flex items-center justify-center p-1 overflow-hidden"
      onContextMenu={(e) => e.preventDefault()}
    >
      <div className="flex items-center justify-center w-full h-full min-h-0 min-w-0">
        <div
          className="max-w-full max-h-full select-none touch-manipulation"
          style={{ display: 'grid', gridTemplateColumns: `repeat(${state.cols}, minmax(0, 1fr))`, aspectRatio: `${state.cols} / ${state.rows}`, width: '100%' }}
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
    </div>
  );
}
