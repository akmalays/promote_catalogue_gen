import { ReactNode, useEffect, useState } from 'react';
import logoAsset from '../../assets/img/pcs_logo.png';
import ThemeToggle from '../ThemeToggle';

interface AuthLayoutProps {
  taglines: string[];
  children: ReactNode;
  footer?: ReactNode;
}

/**
 * Auth layout used by Login, Signup, and ResetPassword.
 * Adapts to light/dark theme via the global `.dark` class on <html>.
 *
 * Composition (top → bottom, vertically centered):
 * 1. Floating ThemeToggle (top-right)
 * 2. Hero: logo, brand title, animated tagline
 * 3. Form card (glass-like in dark, clean white in light)
 * 4. Footer link
 */
export default function AuthLayout({ taglines, children, footer }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans antialiased relative overflow-hidden">
      {/* ============================================================
          Background layers
          ============================================================ */}

      {/* Grid pattern (visible in both modes, gentler in light) */}
      <div
        className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-100"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgb(120 113 108 / 0.08) 1px, transparent 1px), linear-gradient(to bottom, rgb(120 113 108 / 0.08) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
          WebkitMaskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />

      {/* Soft amber glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-amber-500/[0.04] dark:bg-amber-500/[0.08] rounded-full blur-3xl pointer-events-none" />

      {/* Bottom-right cool accent (dark only) */}
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-stone-400/10 dark:bg-stone-700/30 rounded-full blur-3xl pointer-events-none" />

      {/* Vignette top & bottom (dark only, helps form float) */}
      <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-stone-50 dark:from-stone-950 via-stone-50/60 dark:via-stone-950/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-stone-50 dark:from-stone-950 via-stone-50/60 dark:via-stone-950/60 to-transparent pointer-events-none" />

      {/* ============================================================
          Content
          ============================================================ */}

      {/* Theme toggle — floating top-right */}
      <div className="absolute top-4 right-4 z-10">
        <ThemeToggle variant="solid" />
      </div>

      <div className="relative min-h-screen flex flex-col items-center justify-center px-4 py-10 md:py-16">
        {/* Hero */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4">
            <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full" />
            <img
              src={logoAsset}
              alt="myStore Studio"
              className="relative w-16 h-16 md:w-20 md:h-20 object-contain"
            />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-stone-900 dark:text-white mb-2">
            myStore Studio
          </h1>
          <div className="text-xs md:text-sm h-5 text-stone-500 dark:text-stone-400">
            <TypingText texts={taglines} />
          </div>
        </div>

        {/* Form card */}
        <div className="w-full max-w-md relative">
          <div className="absolute -inset-px bg-gradient-to-b from-stone-200 to-stone-100 dark:from-stone-700/60 dark:to-stone-800/30 rounded-2xl pointer-events-none" />

          <div className="relative bg-white dark:bg-stone-900/70 dark:backdrop-blur-xl border border-stone-200 dark:border-stone-800/80 rounded-2xl shadow-lg shadow-stone-200/40 dark:shadow-2xl dark:shadow-black/40 p-6 md:p-8">
            {children}
          </div>

          {footer && (
            <div className="mt-5 text-center text-sm text-stone-500 dark:text-stone-400">
              {footer}
            </div>
          )}

          <p className="mt-6 text-center text-[11px] text-stone-400 dark:text-stone-600">
            © 2026 myStore Studio
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Typing text
// ============================================================

function TypingText({ texts }: { texts: string[] }) {
  const [displayText, setDisplayText] = useState('');
  const [index, setIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fullText = texts[index % texts.length];
    const speed = isDeleting ? 30 : 55;

    const timer = setTimeout(() => {
      if (!isDeleting) {
        setDisplayText(fullText.substring(0, displayText.length + 1));
        if (displayText === fullText) {
          setTimeout(() => setIsDeleting(true), 2200);
          return;
        }
      } else {
        setDisplayText(fullText.substring(0, displayText.length - 1));
        if (displayText === '') {
          setIsDeleting(false);
          setIndex(prev => prev + 1);
        }
      }
    }, speed);

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, index, texts]);

  return (
    <span>
      {displayText}
      <span className="inline-block w-px h-3.5 bg-amber-500 dark:bg-amber-400 ml-0.5 animate-pulse align-middle" />
    </span>
  );
}
