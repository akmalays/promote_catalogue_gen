import React from 'react';
import { cn } from '../../lib/utils';

interface ToggleProps {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}

export default function Toggle({ checked, onChange, label, description, disabled, size = 'md' }: ToggleProps) {
  const track = size === 'sm' ? 'w-7 h-4' : 'w-9 h-5';
  const thumb = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';
  const translate = size === 'sm' ? 'translate-x-3' : 'translate-x-4';
  return (
    <label className={cn('inline-flex items-start gap-2.5 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => !disabled && onChange(!checked)}
        className={cn(
          'relative inline-flex shrink-0 rounded-full transition-colors mt-0.5',
          track,
          checked ? 'bg-stone-900 dark:bg-stone-100' : 'bg-stone-200 dark:bg-stone-700',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 left-0.5 inline-block rounded-full bg-white dark:bg-stone-900 shadow transition-transform',
            thumb,
            checked ? translate : 'translate-x-0',
          )}
        />
      </button>
      {(label || description) && (
        <div className="leading-tight">
          {label && <span className="text-sm text-stone-700 dark:text-stone-200 block">{label}</span>}
          {description && <span className="text-[11px] text-stone-500 dark:text-stone-400 block mt-0.5">{description}</span>}
        </div>
      )}
    </label>
  );
}
