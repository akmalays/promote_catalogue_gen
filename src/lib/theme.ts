import { useEffect, useState } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'theme';

/**
 * Read the user's preferred theme.
 * Order: localStorage → OS preference → 'light' fallback.
 */
function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';

  // 1. Explicit user choice
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === 'light' || saved === 'dark') return saved;

  // 2. Backwards-compat: legacy boolean key from protected app
  const legacy = localStorage.getItem('dark_mode');
  if (legacy === 'true') return 'dark';
  if (legacy === 'false') return 'light';

  // 3. OS preference
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

/** Apply the theme class to <html> and persist the choice. */
function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', theme === 'dark');
  localStorage.setItem(STORAGE_KEY, theme);
  // keep legacy key in sync so the protected app picks up the same value
  localStorage.setItem('dark_mode', String(theme === 'dark'));
}

/**
 * Hook used by public pages (landing, auth, tools).
 * Persists user choice and stays in sync across tabs.
 */
export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(readInitialTheme);

  // Apply on mount + whenever theme changes
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  // Listen for storage changes from other tabs
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === 'light' || e.newValue === 'dark')) {
        setThemeState(e.newValue);
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setTheme = (next: Theme) => setThemeState(next);
  const toggleTheme = () => setThemeState(t => (t === 'dark' ? 'light' : 'dark'));

  return { theme, setTheme, toggleTheme };
}

/**
 * Synchronously initialise the theme on app boot, before React mounts.
 * Call this once from `main.tsx`.
 */
export function bootstrapTheme() {
  if (typeof document === 'undefined') return;
  const theme = readInitialTheme();
  document.documentElement.classList.toggle('dark', theme === 'dark');
}
