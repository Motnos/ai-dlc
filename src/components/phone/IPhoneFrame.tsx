import type { ReactNode, JSX } from 'react';
import { StatusBar } from './StatusBar';
import { HomeIndicator } from './HomeIndicator';

export interface IPhoneFrameProps {
  children: ReactNode;
}

export function IPhoneFrame({ children }: IPhoneFrameProps): JSX.Element {
  return (
    <div
      className="relative bg-zinc-900 rounded-[3rem] ring-1 ring-white/10 shadow-2xl p-[0.6rem]"
      style={{ aspectRatio: '9 / 19.5', height: 'min(92dvh, 900px)', width: 'auto' }}
    >
      {/* Side buttons (decorative) */}
      <div className="absolute -left-[3px] top-24 w-[3px] h-8 bg-zinc-700 rounded-l-sm" />
      <div className="absolute -left-[3px] top-36 w-[3px] h-12 bg-zinc-700 rounded-l-sm" />
      <div className="absolute -left-[3px] top-52 w-[3px] h-12 bg-zinc-700 rounded-l-sm" />
      <div className="absolute -right-[3px] top-32 w-[3px] h-16 bg-zinc-700 rounded-r-sm" />

      {/* Inner screen */}
      <div className="relative flex flex-col w-full h-full bg-black rounded-[2.5rem] overflow-hidden">
        {/* Dynamic Island */}
        <div
          className="absolute top-3 left-1/2 -translate-x-1/2 bg-black w-28 h-7 rounded-full z-10 pointer-events-none"
          style={{ boxShadow: '0 0 0 1px rgba(255,255,255,0.05)' }}
        />

        <StatusBar />

        {/* Content area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {children}
        </div>

        <HomeIndicator />
      </div>
    </div>
  );
}
