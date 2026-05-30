import { useState, useEffect, useRef } from 'react';
import type { JSX } from 'react';
import type { GameState } from '../../game/types';

interface TimerProps {
  state: GameState;
}

export function Timer({ state }: TimerProps): JSX.Element {
  const { status, startedAt, finishedAt } = state;
  const [elapsed, setElapsed] = useState(0);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    startedAtRef.current = startedAt;
  }, [startedAt]);

  useEffect(() => {
    if (status === 'idle') {
      const id = setTimeout(() => setElapsed(0), 0);
      return () => clearTimeout(id);
    }
    if (status === 'won' || status === 'lost') {
      const frozen = Math.floor(((finishedAt ?? 0) - (startedAt ?? 0)) / 1000);
      const id = setTimeout(() => setElapsed(frozen), 0);
      return () => clearTimeout(id);
    }
    // playing
    if (startedAt == null) return;
    const start = startedAt;
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(id);
  }, [status, startedAt, finishedAt]);

  const display = String(elapsed).padStart(3, '0');

  return (
    <span className="font-mono text-sm font-bold tracking-wider tabular-nums">
      {display}
    </span>
  );
}
