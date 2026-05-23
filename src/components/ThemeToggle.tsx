import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../lib/theme';
import { cn } from '../lib/utils';

interface ThemeToggleProps {
  className?: string;
  /** Visual style for the button background. "subtle" matches navbars; "solid" stands out. */
  variant?: 'subtle' | 'solid';
}

/**
 * Light/dark theme toggle button. Persists choice and applies it globally
 * via the `useTheme` hook (writes the `.dark` class to `<html>`).
 */
export default function ThemeToggle({ className, variant = 'subtle' }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={isDark ? 'Mode terang' : 'Mode gelap'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={cn(
        'inline-flex items-center justify-center w-9 h-9 rounded-lg transition-colors',
        variant === 'subtle'
          ? 'text-stone-500 hover:text-stone-900 hover:bg-stone-100 dark:text-stone-400 dark:hover:text-white dark:hover:bg-stone-800'
          : 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700',
        className,
      )}
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
