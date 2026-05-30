import { useState, useEffect } from 'react';
import type { JSX } from 'react';

function formatTime(date: Date): string {
  const h = date.getHours().toString().padStart(2, '0');
  const m = date.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function StatusBar(): JSX.Element {
  const [time, setTime] = useState(() => formatTime(new Date()));

  useEffect(() => {
    const interval = setInterval(() => {
      setTime(formatTime(new Date()));
    }, 30_000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-white text-xs font-semibold shrink-0 select-none">
      <span className="tabular-nums">{time}</span>
      <div className="flex items-center gap-1.5">
        {/* Signal bars */}
        <svg width="17" height="12" viewBox="0 0 17 12" fill="white" aria-hidden="true">
          <rect x="0" y="8" width="3" height="4" rx="0.5" opacity="1" />
          <rect x="4.5" y="5.5" width="3" height="6.5" rx="0.5" opacity="1" />
          <rect x="9" y="3" width="3" height="9" rx="0.5" opacity="1" />
          <rect x="13.5" y="0" width="3" height="12" rx="0.5" opacity="1" />
        </svg>
        {/* Wifi */}
        <svg width="16" height="12" viewBox="0 0 16 12" fill="white" aria-hidden="true">
          <path d="M8 9.5 a1.5 1.5 0 1 1 0 .001 z" fillRule="evenodd" />
          <path
            d="M4.8 7.2 Q8 4.5 11.2 7.2"
            fill="none"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
          <path
            d="M2 4.8 Q8 0.5 14 4.8"
            fill="none"
            stroke="white"
            strokeWidth="1.4"
            strokeLinecap="round"
          />
        </svg>
        {/* Battery */}
        <svg width="25" height="12" viewBox="0 0 25 12" fill="white" aria-hidden="true">
          <rect x="0" y="1" width="21" height="10" rx="2" fill="none" stroke="white" strokeWidth="1" opacity="0.4" />
          <rect x="1.5" y="2.5" width="16" height="7" rx="1.2" fill="white" />
          <rect x="22" y="4" width="2.5" height="4" rx="1" fill="white" opacity="0.5" />
        </svg>
      </div>
    </div>
  );
}
