import type { JSX } from 'react';
import type { GameState, Difficulty } from '../../game/types';
import { minesRemaining } from '../../game/engine';
import { Timer } from './Timer';

interface GameHeaderProps {
  state: GameState;
  onReset(): void;
  onSelectDifficulty(d: Difficulty): void;
}

function statusFace(status: GameState['status']): string {
  switch (status) {
    case 'won': return '😎';
    case 'lost': return '😵';
    case 'playing': return '🙂';
    default: return '😶';
  }
}

function formatMines(n: number): string {
  if (n < 0) return String(n).padStart(3, '0');
  return String(n).padStart(3, '0');
}

export function GameHeader({ state, onReset, onSelectDifficulty }: GameHeaderProps): JSX.Element {
  const remaining = minesRemaining(state);

  return (
    <div className="flex items-center justify-between px-2 py-1.5 bg-zinc-800 border-b border-zinc-700 shrink-0">
      {/* Mines remaining */}
      <div className="flex items-center gap-1 min-w-[3.5rem]">
        <span className="text-xs">💣</span>
        <span className="font-mono text-sm font-bold text-red-400 tabular-nums">
          {formatMines(remaining)}
        </span>
      </div>

      {/* Center: face button + timer */}
      <div className="flex flex-col items-center gap-0.5">
        <button
          onClick={onReset}
          className="text-xl leading-none hover:scale-110 active:scale-95 transition-transform"
          aria-label="New game"
        >
          {statusFace(state.status)}
        </button>
        <Timer state={state} />
      </div>

      {/* Difficulty select */}
      <div className="flex items-center min-w-[3.5rem] justify-end">
        <select
          value={state.difficulty}
          onChange={(e) => onSelectDifficulty(e.target.value as Difficulty)}
          className="text-xs bg-zinc-700 text-white rounded px-1 py-0.5 border border-zinc-600 cursor-pointer"
          aria-label="Difficulty"
        >
          <option value="beginner">Beg</option>
          <option value="intermediate">Int</option>
          <option value="expert">Exp</option>
        </select>
      </div>
    </div>
  );
}
