import React from 'react';
import { cn } from '@/lib/utils';

export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-full bg-surface-2 border border-white/10',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative px-4 py-2 rounded-full text-xs font-medium transition-all duration-200 select-none cursor-pointer',
            activeTab === tab.value
              ? 'bg-surface text-text shadow-sm border border-white/15'
              : 'text-muted hover:text-text'
          )}
        >
          <span className="flex items-center gap-1.5">
            {tab.icon && <tab.icon className="h-3.5 w-3.5" strokeWidth={1.5} />}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
