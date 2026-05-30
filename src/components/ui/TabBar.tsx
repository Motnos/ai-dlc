import type { JSX } from 'react';

export type Tab = 'game' | 'history';

export interface TabBarProps {
  active: Tab;
  onChange(tab: Tab): void;
}

interface TabConfig {
  id: Tab;
  label: string;
  icon: string;
}

const TABS: TabConfig[] = [
  { id: 'game', label: 'Game', icon: '💣' },
  { id: 'history', label: 'History', icon: '📋' },
];

export function TabBar({ active, onChange }: TabBarProps): JSX.Element {
  return (
    <nav
      className="flex bg-zinc-900 border-t border-zinc-700 shrink-0"
      aria-label="Tab navigation"
    >
      {TABS.map(({ id, label, icon }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className={`flex-1 flex flex-col items-center py-2 gap-0.5 text-xs transition-colors ${
            active === id
              ? 'text-blue-400'
              : 'text-zinc-500 hover:text-zinc-300'
          }`}
          aria-current={active === id ? 'page' : undefined}
        >
          <span className="text-base leading-none">{icon}</span>
          <span className="font-medium">{label}</span>
        </button>
      ))}
    </nav>
  );
}
