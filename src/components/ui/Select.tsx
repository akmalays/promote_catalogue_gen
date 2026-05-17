import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  menuClassName?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  align?: 'left' | 'right';
  leadingIcon?: React.ReactNode;
  ariaLabel?: string;
}

/**
 * Themed dropdown that replaces the native `<select>` so the menu matches the
 * app's stone/dark-mode palette instead of the OS chrome.
 */
export default function Select({
  value,
  options,
  onChange,
  placeholder = 'Pilih...',
  className,
  buttonClassName,
  menuClassName,
  size = 'md',
  disabled = false,
  align = 'left',
  leadingIcon,
  ariaLabel,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKey);
    };
  }, [isOpen]);

  const selected = options.find(o => o.value === value);
  const sizeClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';
  const itemSizeClasses = size === 'sm' ? 'text-xs px-2 py-1.5' : 'text-sm px-2.5 py-1.5';

  return (
    <div ref={wrapperRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        aria-label={ariaLabel}
        onClick={() => setIsOpen(o => !o)}
        className={cn(
          'w-full inline-flex items-center justify-between gap-2',
          'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg',
          'text-stone-700 dark:text-stone-200',
          'hover:bg-stone-50 dark:hover:bg-stone-700/60',
          'focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10',
          'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
          sizeClasses,
          buttonClassName,
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          {leadingIcon ? <span className="shrink-0 text-stone-400 dark:text-stone-500">{leadingIcon}</span> : null}
          <span className={cn('truncate', !selected && 'text-stone-400 dark:text-stone-500')}>
            {selected ? selected.label : placeholder}
          </span>
        </span>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0 transition-transform',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.ul
            role="listbox"
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-[6500] mt-1 min-w-full max-h-60 overflow-y-auto',
              'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800',
              'rounded-lg shadow-lg p-1',
              align === 'right' ? 'right-0' : 'left-0',
              menuClassName,
            )}
          >
            {options.map(opt => {
              const isSelected = opt.value === value;
              return (
                <li key={opt.value}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange(opt.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-2 rounded-md text-left transition-colors',
                      itemSizeClasses,
                      opt.disabled && 'opacity-40 cursor-not-allowed',
                      isSelected
                        ? 'bg-stone-100 dark:bg-stone-800 text-stone-900 dark:text-stone-100 font-medium'
                        : 'text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-800/60',
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-stone-900 dark:text-stone-100 shrink-0" />
                    )}
                  </button>
                </li>
              );
            })}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}
