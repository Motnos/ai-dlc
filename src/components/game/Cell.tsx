import { useRef } from 'react';
import type { JSX } from 'react';
import type { Cell as CellType } from '../../game/types';

interface CellProps {
  cell: CellType;
  onReveal(): void;
  onFlag(): void;
  onChord?(): void;
}

// Classic Minesweeper number colors mapped to Tailwind classes
const NUMBER_COLORS: Record<number, string> = {
  1: 'text-blue-600',
  2: 'text-green-600',
  3: 'text-red-600',
  4: 'text-blue-900',
  5: 'text-red-900',
  6: 'text-cyan-600',
  7: 'text-black',
  8: 'text-gray-500',
};

export function Cell({ cell, onReveal, onFlag, onChord }: CellProps): JSX.Element {
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);

  function cancelLongPress(): void {
    if (longPressTimerRef.current !== null) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }

  function handlePointerDown(e: React.PointerEvent): void {
    if (e.pointerType === 'touch' || e.pointerType === 'pen') {
      longPressFiredRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        onFlag();
        cancelLongPress();
      }, 500);
    }
  }

  function handlePointerUp(): void {
    cancelLongPress();
  }

  function handlePointerLeave(): void {
    cancelLongPress();
  }

  function handlePointerMove(): void {
    cancelLongPress();
  }

  function handleClick(e: React.MouseEvent): void {
    e.preventDefault();
    if (longPressFiredRef.current) {
      longPressFiredRef.current = false;
      return;
    }
    if (cell.state === 'revealed' && cell.adjacentMines > 0 && onChord) {
      onChord();
    } else {
      onReveal();
    }
  }

  function handleContextMenu(e: React.MouseEvent): void {
    e.preventDefault();
    onFlag();
  }

  const { state, isMine, adjacentMines } = cell;

  function computeAppearance(): { cellClass: string; content: string | JSX.Element } {
    if (state === 'hidden') {
      return {
        cellClass:
          'bg-zinc-400 hover:bg-zinc-300 active:bg-zinc-500 border-t-2 border-l-2 border-zinc-200 border-b-2 border-r-2 border-b-zinc-600 border-r-zinc-600 cursor-pointer',
        content: '',
      };
    }
    if (state === 'flagged') {
      return {
        cellClass:
          'bg-zinc-400 border-t-2 border-l-2 border-zinc-200 border-b-2 border-r-2 border-b-zinc-600 border-r-zinc-600 cursor-pointer',
        content: '🚩',
      };
    }
    // revealed
    if (isMine) {
      return { cellClass: 'bg-red-400 border border-zinc-500', content: '💣' };
    }
    if (adjacentMines > 0) {
      return {
        cellClass: `bg-zinc-200 border border-zinc-400 font-bold text-sm ${NUMBER_COLORS[adjacentMines] ?? 'text-black'}`,
        content: String(adjacentMines),
      };
    }
    return { cellClass: 'bg-zinc-200 border border-zinc-400', content: '' };
  }

  const { cellClass, content } = computeAppearance();

  return (
    <button
      data-testid={`cell-${cell.row}-${cell.col}`}
      data-state={state}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerLeave}
      onPointerMove={handlePointerMove}
      className={`aspect-square flex items-center justify-center select-none touch-manipulation text-xs leading-none ${cellClass}`}
      aria-label={`cell ${cell.row} ${cell.col} ${state}`}
    >
      {content}
    </button>
  );
}
