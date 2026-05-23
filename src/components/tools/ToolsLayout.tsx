import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import logoAsset from '../../assets/img/pcs_logo.png';
import ThemeToggle from '../ThemeToggle';

interface ToolsLayoutProps {
  navbarRight?: ReactNode;
  badge?: string;
  title: string;
  subtitle?: string;
  heroIcon?: ReactNode;
  children: ReactNode;
  showCta?: boolean;
}

/**
 * Shared layout for every page under /tools/*. Adapts to light/dark theme.
 *
 * NOTE: Sub-tool content (HPP, Margin, Promo) is currently optimized for
 * light only; the navbar/hero/CTA respect theme but the tool body cards
 * stay light. Toggle still works — only the chrome changes color.
 */
export default function ToolsLayout({
  navbarRight,
  badge = 'Tools gratis',
  title,
  subtitle,
  heroIcon,
  children,
  showCta = true,
}: ToolsLayoutProps) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-stone-50 dark:bg-stone-950 text-stone-900 dark:text-stone-100 font-sans antialiased">
      <Toaster position="top-center" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 dark:bg-stone-950/80 backdrop-blur-md border-b border-stone-100 dark:border-stone-800/60">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
          >
            <img src={logoAsset} alt="myStore" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold tracking-tight text-stone-900 dark:text-white">myStore</span>
          </button>

          <div className="flex items-center gap-2">
            {navbarRight}
            <ThemeToggle />
            <button
              onClick={() => navigate('/tools')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Tools
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-14 pb-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-stone-900/70 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-full text-xs font-medium text-stone-500 dark:text-stone-400 mb-4">
            {heroIcon}
            {badge}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3 text-stone-900 dark:text-white">{title}</h1>
          {subtitle && (
            <p className="text-stone-500 dark:text-stone-400 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pb-10">{children}</div>

      {/* CTA */}
      {showCta && (
        <div className="max-w-5xl mx-auto px-4 md:px-6 pb-10 md:pb-14">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => navigate('/tools')}
              className="p-5 bg-white dark:bg-stone-900/50 dark:backdrop-blur-sm border border-stone-200 dark:border-stone-800 rounded-2xl text-left hover:border-stone-300 dark:hover:border-stone-700 transition-colors"
            >
              <p className="text-sm font-semibold text-stone-900 dark:text-white mb-1">Lihat tools lainnya</p>
              <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
                Generator katalog, kalkulator margin, dan lainnya — semuanya gratis.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700 dark:text-stone-300">
                Buka tools hub <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="p-5 bg-stone-900 dark:bg-white text-white dark:text-stone-950 rounded-2xl text-left hover:bg-stone-800 dark:hover:bg-stone-100 transition-colors dark:shadow-lg dark:shadow-amber-500/10"
            >
              <p className="text-sm font-semibold mb-1">Coba myStore POS gratis</p>
              <p className="text-xs text-stone-300 dark:text-stone-600 mb-3">
                Solusi kasir lengkap untuk toko retail — kelola stok, transaksi, dan laporan dalam satu tempat.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium">
                Daftar gratis <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
