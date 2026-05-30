import type { JSX } from 'react';

export function HomeIndicator(): JSX.Element {
  return (
    <div className="flex justify-center pb-2 pt-1 shrink-0">
      <div className="w-32 h-1 bg-white/40 rounded-full" />
    </div>
  );
}
