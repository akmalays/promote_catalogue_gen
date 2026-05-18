import React, { useEffect, useRef, useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

interface DatePickerProps {
  value: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  size?: 'sm' | 'md';
  disabled?: boolean;
  /** Align dropdown: left or right */
  align?: 'left' | 'right';
  ariaLabel?: string;
}

const DAYS_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Pilih tanggal',
  className,
  size = 'md',
  disabled = false,
  align = 'left',
  ariaLabel,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Parse value or default to today
  const parsed = value ? new Date(value + 'T00:00:00') : new Date();
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T00:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

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

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const selectDate = (day: number) => {
    const m = String(viewMonth + 1).padStart(2, '0');
    const d = String(day).padStart(2, '0');
    onChange(`${viewYear}-${m}-${d}`);
    setIsOpen(false);
  };

  const goToday = () => {
    const now = new Date();
    setViewYear(now.getFullYear());
    setViewMonth(now.getMonth());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    onChange(`${now.getFullYear()}-${m}-${d}`);
    setIsOpen(false);
  };

  // Build calendar grid
  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const prevMonthDays = getDaysInMonth(viewYear, viewMonth === 0 ? 11 : viewMonth - 1);

  const cells: Array<{ day: number; current: boolean }> = [];
  // Previous month trailing days
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: prevMonthDays - i, current: false });
  }
  // Current month
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push({ day: i, current: true });
  }
  // Next month leading days
  const remaining = 42 - cells.length;
  for (let i = 1; i <= remaining; i++) {
    cells.push({ day: i, current: false });
  }

  // Selected day check
  const selectedYear = value ? parseInt(value.split('-')[0]) : null;
  const selectedMonth = value ? parseInt(value.split('-')[1]) - 1 : null;
  const selectedDay = value ? parseInt(value.split('-')[2]) : null;

  const today = new Date();
  const todayYear = today.getFullYear();
  const todayMonth = today.getMonth();
  const todayDay = today.getDate();

  // Display text
  const displayText = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  const sizeClasses = size === 'sm' ? 'px-2.5 py-1.5 text-xs' : 'px-3 py-2 text-sm';

  return (
    <div ref={wrapperRef} className={cn('relative inline-block', className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-label={ariaLabel || 'Pilih tanggal'}
        onClick={() => setIsOpen(o => !o)}
        className={cn(
          'w-full inline-flex items-center justify-between gap-2',
          'bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg',
          'text-stone-700 dark:text-stone-200',
          'hover:bg-stone-50 dark:hover:bg-stone-700/60',
          'focus:outline-none focus:ring-2 focus:ring-stone-900/10 dark:focus:ring-stone-100/10',
          'disabled:opacity-50 disabled:cursor-not-allowed transition-colors',
          sizeClasses,
        )}
      >
        <span className="flex items-center gap-1.5 min-w-0">
          <Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
          <span className={cn('truncate', !displayText && 'text-stone-400 dark:text-stone-500')}>
            {displayText || placeholder}
          </span>
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.12 }}
            className={cn(
              'absolute z-[6500] mt-1.5 w-[280px]',
              'bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800',
              'rounded-xl shadow-xl p-3',
              align === 'right' ? 'right-0' : 'left-0',
            )}
          >
            {/* Month/Year navigation */}
            <div className="flex items-center justify-between mb-3">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                {MONTHS_ID[viewMonth]} {viewYear}
              </span>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-md hover:bg-stone-100 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            {/* Day headers */}
            <div className="grid grid-cols-7 mb-1">
              {DAYS_ID.map(d => (
                <div key={d} className="text-center text-[10px] font-medium text-stone-400 dark:text-stone-500 py-1">
                  {d}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div className="grid grid-cols-7 gap-0.5">
              {cells.map((cell, idx) => {
                const isSelected =
                  cell.current &&
                  viewYear === selectedYear &&
                  viewMonth === selectedMonth &&
                  cell.day === selectedDay;
                const isToday =
                  cell.current &&
                  viewYear === todayYear &&
                  viewMonth === todayMonth &&
                  cell.day === todayDay;

                return (
                  <button
                    key={idx}
                    type="button"
                    disabled={!cell.current}
                    onClick={() => cell.current && selectDate(cell.day)}
                    className={cn(
                      'w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium transition-colors',
                      !cell.current && 'text-stone-300 dark:text-stone-700 cursor-default',
                      cell.current && !isSelected && !isToday && 'text-stone-700 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800',
                      isToday && !isSelected && 'text-stone-900 dark:text-stone-100 bg-stone-100 dark:bg-stone-800 font-bold',
                      isSelected && 'bg-stone-900 dark:bg-stone-100 text-white dark:text-stone-900 font-bold shadow-sm',
                    )}
                  >
                    {cell.day}
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-stone-100 dark:border-stone-800">
              <button
                type="button"
                onClick={() => { onChange(''); setIsOpen(false); }}
                className="text-xs font-medium text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
              >
                Hapus
              </button>
              <button
                type="button"
                onClick={goToday}
                className="text-xs font-medium text-stone-900 dark:text-stone-100 hover:text-stone-700 dark:hover:text-stone-300 transition-colors"
              >
                Hari ini
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
