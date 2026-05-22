import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { Toaster } from 'react-hot-toast';
import logoAsset from '../../assets/img/pcs_logo.png';

interface ToolsLayoutProps {
  /** Optional content placed in the navbar's right slot (e.g. Riwayat / Reset buttons) */
  navbarRight?: ReactNode;
  /** Hero badge label (e.g. "Tools gratis · Kalkulator") */
  badge?: string;
  /** Page title shown in hero */
  title: string;
  /** Subtitle/description shown below title */
  subtitle?: string;
  /** Custom hero icon (lucide). Defaults to none. */
  heroIcon?: ReactNode;
  /** Page body */
  children: ReactNode;
  /** Set to false to hide the bottom CTA section */
  showCta?: boolean;
}

/**
 * Shared layout wrapper for every page under /tools/*.
 * Provides:
 * - Sticky navbar with brand + back-to-tools button
 * - Hero header with badge / title / subtitle
 * - Toaster pre-mounted
 * - Bottom CTA card pointing to other tools and main app signup
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
    <div className="min-h-screen bg-stone-50 text-stone-900 font-sans antialiased">
      <Toaster position="top-center" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-3.5 flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-2.5 hover:opacity-80 transition-opacity shrink-0"
          >
            <img src={logoAsset} alt="myStore" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold tracking-tight">myStore</span>
          </button>

          <div className="flex items-center gap-2">
            {navbarRight}
            <button
              onClick={() => navigate('/tools')}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" /> Tools
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 pt-10 md:pt-14 pb-6">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-200 rounded-full text-xs font-medium text-stone-500 mb-4">
            {heroIcon}
            {badge}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold tracking-tight mb-3">{title}</h1>
          {subtitle && (
            <p className="text-stone-500 text-sm md:text-base max-w-xl mx-auto">{subtitle}</p>
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
              className="p-5 bg-white border border-stone-200 rounded-2xl text-left hover:border-stone-300 transition-colors"
            >
              <p className="text-sm font-semibold text-stone-900 mb-1">Lihat tools lainnya</p>
              <p className="text-xs text-stone-500 mb-3">
                Generator katalog, kalkulator margin, QR menu, dan lainnya — semuanya gratis.
              </p>
              <span className="inline-flex items-center gap-1.5 text-xs font-medium text-stone-700">
                Buka tools hub <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="p-5 bg-stone-900 text-white rounded-2xl text-left hover:bg-stone-800 transition-colors"
            >
              <p className="text-sm font-semibold mb-1">Coba myStore POS gratis</p>
              <p className="text-xs text-stone-300 mb-3">
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
