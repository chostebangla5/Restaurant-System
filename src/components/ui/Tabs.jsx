import React from 'react';
import { cn } from '@/lib/utils';

export function Tabs({ tabs, activeTab, onChange, className }) {
  return (
    <div
      className={cn(
        'flex items-center gap-1 p-1 rounded-xl bg-stone-100 dark:bg-stone-800/60 border border-stone-200/60 dark:border-stone-700/50',
        className
      )}
    >
      {tabs.map((tab) => (
        <button
          key={tab.value}
          type="button"
          onClick={() => onChange(tab.value)}
          className={cn(
            'relative px-4 py-2 rounded-lg text-xs font-semibold transition-all duration-200 select-none',
            activeTab === tab.value
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-white shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          )}
        >
          <span className="flex items-center gap-1.5">
            {tab.icon && <tab.icon className="h-4 w-4" />}
            {tab.label}
          </span>
        </button>
      ))}
    </div>
  );
}
