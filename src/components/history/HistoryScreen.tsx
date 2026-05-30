import { useState, useEffect } from 'react';
import type { JSX } from 'react';
import type { GameRepository, GameResult } from '../../persistence/types';

export interface HistoryScreenProps {
  repository: GameRepository;
  playerId: string;
}

function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatRelative(playedAt: number): string {
  const diff = Date.now() - playedAt;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function difficultyLabel(d: string): string {
  switch (d) {
    case 'beginner': return 'Beginner';
    case 'intermediate': return 'Intermediate';
    case 'expert': return 'Expert';
    default: return d;
  }
}

type LoadState =
  | { status: 'loading' }
  | { status: 'done'; results: GameResult[] };

export function HistoryScreen({ repository, playerId }: HistoryScreenProps): JSX.Element {
  const [loadState, setLoadState] = useState<LoadState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    repository
      .listResults(playerId, 50)
      .then((res) => {
        if (!cancelled) setLoadState({ status: 'done', results: res });
      })
      .catch(() => {
        if (!cancelled) setLoadState({ status: 'done', results: [] });
      });
    return () => { cancelled = true; };
  }, [repository, playerId]);

  const loading = loadState.status === 'loading';
  const results = loadState.status === 'done' ? loadState.results : [];

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-zinc-900">
      <div className="px-4 py-2 bg-zinc-800 border-b border-zinc-700 shrink-0">
        <h2 className="text-white font-semibold text-sm">Game History</h2>
      </div>
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24 text-zinc-500 text-sm">
            Loading…
          </div>
        ) : results.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 gap-2">
            <span className="text-3xl">🎮</span>
            <p className="text-zinc-500 text-sm">No games yet — go play!</p>
          </div>
        ) : (
          <ul className="divide-y divide-zinc-800">
            {results.map((result) => (
              <li key={result.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-white text-xs font-medium">
                    {difficultyLabel(result.difficulty)}
                  </span>
                  <span className="text-zinc-400 text-xs">
                    {result.rows}×{result.cols} · {result.mines} mines
                  </span>
                </div>
                <div className="flex flex-col items-end gap-0.5">
                  <span
                    className={`text-xs font-bold ${
                      result.outcome === 'won' ? 'text-green-400' : 'text-red-400'
                    }`}
                  >
                    {result.outcome === 'won' ? '😎 Won' : '💀 Lost'}
                  </span>
                  <span className="text-zinc-500 text-xs">
                    {formatDuration(result.durationMs)} · {formatRelative(result.playedAt)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
