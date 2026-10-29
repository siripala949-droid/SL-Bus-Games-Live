import React from 'react';
import { Home, Radio, Gem, Tv, Lock } from 'lucide-react';
import { NavTab } from '../utils/streamLogic';

interface BottomNavProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  liveCount: number;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  liveCount,
}) => {
  const navItems: {
    id: NavTab;
    label: string;
    icon: React.ReactNode;
    badge?: string | number;
    locked?: boolean;
  }[] = [
    {
      id: 'HOME',
      label: 'Home',
      icon: <Home className="w-5 h-5" />,
      badge: liveCount > 0 ? liveCount : undefined,
    },
    {
      id: 'CAST',
      label: 'Cast Live',
      icon: <Radio className="w-5 h-5" />,
    },
    {
      id: 'GEMS',
      label: 'Gems',
      icon: <Gem className="w-5 h-5" />,
      locked: true,
    },
    {
      id: 'CHANNEL',
      label: 'Channel',
      icon: <Tv className="w-5 h-5" />,
    },
  ];

  return (
    <nav
      aria-label="Primary bottom navigation"
      className="fixed bottom-0 left-0 right-0 z-40 h-16 bg-[#0b0b0e]/95 backdrop-blur-md border-t border-white/[0.08]"
    >
      <div className="max-w-7xl mx-auto h-full grid grid-cols-4 items-center px-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelectTab(item.id)}
              aria-label={item.label}
              aria-current={isActive ? 'page' : undefined}
              className={`relative min-h-[48px] flex flex-col items-center justify-center rounded-xl transition-colors whitespace-nowrap shrink-0 ${
                isActive
                  ? 'text-[#e11d48]'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <div className="relative flex items-center justify-center">
                {item.icon}
                {item.badge !== undefined && (
                  <span className=" -top-1.5 -right-3.5 absolute px-1.5 py-0.2 min-w-[18px] h-[16px] rounded-full bg-[#e11d48] text-white text-[10px] font-mono font-bold flex items-center justify-center tabular-nums">
                    {item.badge}
                  </span>
                )}
                {item.locked && (
                  <Lock className="w-3 h-3 text-amber-400 absolute -top-1 -right-2.5" />
                )}
              </div>
              <span className="text-[11px] font-semibold tracking-tight mt-1">
                {item.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 w-5 h-0.5 rounded-full bg-[#e11d48]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};
