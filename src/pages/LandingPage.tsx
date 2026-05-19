import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShoppingCart, BarChart3, Package, Megaphone, ClipboardCheck,
  Truck, Tag, Users, ArrowRight, Monitor, Smartphone, Moon,
  ImageIcon, ChevronRight,
} from 'lucide-react';
import { cn } from '../lib/utils';
import logoAsset from '../assets/img/pcs_logo.png';
import { PREVIEW_MENUS, HERO_IMAGES } from '../lib/landing-assets';

const FEATURES = [
  {
    icon: <ShoppingCart className="w-5 h-5" />,
    title: 'Kasir / POS',
    desc: 'Proses transaksi cepat, promo otomatis terpasang, cetak struk langsung.',
  },
  {
    icon: <Package className="w-5 h-5" />,
    title: 'Stok & Inventori',
    desc: 'Pantau jumlah barang real-time, alert stok menipis, kategori fleksibel.',
  },
  {
    icon: <ClipboardCheck className="w-5 h-5" />,
    title: 'Stock Opname',
    desc: 'Hitung fisik vs sistem dengan triple-check. Selisih langsung tercatat.',
  },
  {
    icon: <Megaphone className="w-5 h-5" />,
    title: 'Promo & Kampanye',
    desc: 'Diskon, B1G1, bundling — atur periode dan langsung aktif di kasir.',
  },
  {
    icon: <BarChart3 className="w-5 h-5" />,
    title: 'Laporan Harian',
    desc: 'Omzet, margin, item terlaris — semua terangkum tanpa perlu hitung manual.',
  },
  {
    icon: <Truck className="w-5 h-5" />,
    title: 'Catat Pasokan',
    desc: 'Input barang masuk, foto nota supplier, stok otomatis bertambah.',
  },
  {
    icon: <Tag className="w-5 h-5" />,
    title: 'Katalog & Label',
    desc: 'Buat katalog promo visual dan cetak label harga dengan barcode.',
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: 'Multi Pengguna',
    desc: 'Akun terpisah untuk pemilik, admin, dan kasir. Masing-masing punya akses sendiri.',
  },
];

const HIGHLIGHTS = [
  { icon: <Monitor className="w-4 h-4" />, text: 'Bisa diakses dari laptop atau tablet' },
  { icon: <Smartphone className="w-4 h-4" />, text: 'Responsive di layar kecil' },
  { icon: <Moon className="w-4 h-4" />, text: 'Mode gelap tersedia' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeMenu, setActiveMenu] = useState(0);
  const [activeImage, setActiveImage] = useState(0);

  const currentMenu = PREVIEW_MENUS[activeMenu];
  const currentImage = currentMenu?.images[activeImage];

  const handleMenuChange = (idx: number) => {
    setActiveMenu(idx);
    setActiveImage(0); // Reset sub-image when switching menu
  };

  return (
    <div className="min-h-screen bg-white text-stone-900 font-sans antialiased overflow-x-hidden">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-stone-100">
        <div className="max-w-6xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img src={logoAsset} alt="myStore" className="w-8 h-8 object-contain" />
            <span className="text-base font-bold tracking-tight">myStore</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/login')}
              className="px-4 py-2 text-sm font-medium text-stone-600 hover:text-stone-900 transition-colors"
            >
              Masuk
            </button>
            <button
              onClick={() => navigate('/signup')}
              className="px-4 py-2.5 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors"
            >
              Daftar
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative pt-20 pb-16 md:pt-28 md:pb-20">
        <div className="max-w-3xl mx-auto px-6 text-center relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <h1 className="text-4xl md:text-5xl lg:text-[3.5rem] font-extrabold tracking-tight leading-[1.15] mb-5">
              Satu aplikasi untuk
              <br />
              <span className="text-stone-400">seluruh operasional toko.</span>
            </h1>
            <p className="text-base md:text-lg text-stone-500 max-w-lg mx-auto leading-relaxed mb-9">
              Kasir, stok, promo, laporan — tidak perlu banyak tools. Cukup buka browser, semua sudah siap.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <button
                onClick={() => navigate('/signup')}
                className="px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all hover:shadow-lg hover:shadow-stone-900/10 flex items-center gap-2"
              >
                Coba sekarang <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => navigate('/login')}
                className="px-6 py-3 bg-stone-100 text-stone-700 rounded-xl text-sm font-semibold hover:bg-stone-200 transition-colors"
              >
                Sudah punya akun
              </button>
            </div>

            {/* Small highlights */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-10">
              {HIGHLIGHTS.map((h, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 text-xs text-stone-400 font-medium">
                  {h.icon} {h.text}
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Subtle gradient bg */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-stone-100 to-transparent rounded-full blur-3xl opacity-60" />
        </div>
      </section>

      {/* Hero Screenshot Carousel */}
      <HeroCarousel />

      {/* Preview Gallery — Per Menu with Sub-images */}
      <section className="py-16 md:py-24 bg-stone-50 border-y border-stone-100">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Lihat langsung tampilannya
            </h2>
            <p className="text-stone-500 text-sm md:text-base">
              Klik menu untuk melihat fitur di setiap halaman.
            </p>
          </div>

          {/* Menu tabs */}
          <div className="flex items-center justify-center gap-1 mb-4 flex-wrap">
            {PREVIEW_MENUS.map((menu, i) => (
              <button
                key={menu.id}
                onClick={() => handleMenuChange(i)}
                className={cn(
                  'px-3.5 py-2 rounded-lg text-xs font-medium transition-all',
                  activeMenu === i
                    ? 'bg-stone-900 text-white shadow-sm'
                    : 'bg-white border border-stone-200 text-stone-500 hover:text-stone-700 hover:border-stone-300',
                )}
              >
                {menu.label}
              </button>
            ))}
          </div>

          {/* Sub-image tabs */}
          {currentMenu && currentMenu.images.length > 1 && (
            <div className="flex items-center justify-center gap-1 mb-6">
              {currentMenu.images.map((img, i) => (
                <button
                  key={img.id}
                  onClick={() => setActiveImage(i)}
                  className={cn(
                    'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-[11px] font-medium transition-colors',
                    activeImage === i
                      ? 'bg-stone-200 text-stone-900'
                      : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100',
                  )}
                >
                  {activeImage === i && <ChevronRight className="w-3 h-3" />}
                  {img.label}
                </button>
              ))}
            </div>
          )}

          {/* Preview image */}
          <div className="relative rounded-xl border border-stone-200 bg-white p-1.5 shadow-lg shadow-stone-200/30 overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${currentMenu?.id}-${currentImage?.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.2 }}
                className="rounded-lg overflow-hidden"
              >
                <AppScreenshot
                  src={currentImage?.url || ''}
                  alt={`${currentMenu?.label} — ${currentImage?.label}`}
                  aspectRatio="16/9"
                />
              </motion.div>
            </AnimatePresence>

            {/* Caption */}
            <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
              <span className="px-2.5 py-1 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-md text-[11px] font-medium text-stone-600 shadow-sm">
                {currentMenu?.label} → {currentImage?.label}
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 md:py-28">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Apa saja yang bisa dilakukan?
            </h2>
            <p className="text-stone-500 text-sm md:text-base max-w-md mx-auto">
              Fitur yang memang dibutuhkan toko sehari-hari, tanpa yang berlebihan.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
                className="bg-white border border-stone-150 rounded-xl p-5 hover:border-stone-300 hover:shadow-sm transition-all"
              >
                <div className="w-9 h-9 rounded-lg bg-stone-100 text-stone-600 flex items-center justify-center mb-3">
                  {f.icon}
                </div>
                <h3 className="text-sm font-semibold text-stone-900 mb-1">{f.title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28 bg-stone-50 border-y border-stone-100">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Mulai dalam 3 langkah
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { step: '01', title: 'Daftar akun', desc: 'Isi nama toko dan buat akun. Tidak perlu kartu kredit.' },
              { step: '02', title: 'Tambah produk', desc: 'Input produk manual atau import dari spreadsheet.' },
              { step: '03', title: 'Langsung pakai', desc: 'Kasir, stok, promo — semuanya langsung aktif.' },
            ].map((s, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="text-center"
              >
                <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-stone-900 text-white flex items-center justify-center text-sm font-bold">
                  {s.step}
                </div>
                <h3 className="text-sm font-semibold mb-1">{s.title}</h3>
                <p className="text-xs text-stone-500 leading-relaxed max-w-[200px] mx-auto">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 md:py-24 bg-stone-900">
        <div className="max-w-2xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-white mb-3">
              Mau coba?
            </h2>
            <p className="text-stone-400 text-sm md:text-base mb-8 max-w-sm mx-auto">
              Gratis, tanpa batas waktu. Kalau cocok, terus pakai. Kalau tidak, tidak ada yang rugi.
            </p>
            <button
              onClick={() => navigate('/signup')}
              className="px-7 py-3 bg-white text-stone-900 rounded-xl text-sm font-semibold hover:bg-stone-100 transition-colors inline-flex items-center gap-2"
            >
              Daftar gratis <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 py-6">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src={logoAsset} alt="myStore" className="w-5 h-5 object-contain opacity-60" />
            <span className="text-xs text-stone-400">© {new Date().getFullYear()} myStore</span>
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => navigate('/login')} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
              Masuk
            </button>
            <button onClick={() => navigate('/signup')} className="text-xs text-stone-400 hover:text-stone-700 transition-colors">
              Daftar
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ============================================================
// HeroCarousel — auto-sliding hero screenshots
// ============================================================

const SLIDE_INTERVAL = 4000; // 4 seconds per slide

function HeroCarousel() {
  const [current, setCurrent] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  const next = useCallback(() => {
    setCurrent(prev => (prev + 1) % HERO_IMAGES.length);
  }, []);

  useEffect(() => {
    if (isPaused || HERO_IMAGES.length <= 1) return;
    const timer = setInterval(next, SLIDE_INTERVAL);
    return () => clearInterval(timer);
  }, [isPaused, next]);

  const currentSlide = HERO_IMAGES[current];

  return (
    <section className="pb-20 md:pb-28">
      <div className="max-w-5xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-80px' }}
          transition={{ duration: 0.6 }}
          className="relative rounded-2xl border border-stone-200 bg-stone-50 p-1.5 md:p-2 shadow-2xl shadow-stone-200/50"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Browser chrome */}
          <div className="flex items-center gap-1.5 px-3 py-2.5 bg-white rounded-t-xl border-b border-stone-100">
            <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
            <div className="w-2.5 h-2.5 rounded-full bg-stone-200" />
            <div className="flex-1 mx-4 h-5 bg-stone-100 rounded-md flex items-center px-2">
              <span className="text-[9px] text-stone-400 font-mono">mystore.app/{currentSlide?.id || 'dashboard'}</span>
            </div>
          </div>

          {/* Carousel content */}
          <div className="bg-white rounded-b-xl overflow-hidden relative">
            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
              >
                <AppScreenshot
                  src={currentSlide?.url || ''}
                  alt={currentSlide?.label || 'Preview'}
                  aspectRatio="16/9"
                />
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Slide indicators + label */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-stone-200 rounded-full shadow-sm">
            {HERO_IMAGES.map((slide, i) => (
              <button
                key={slide.id}
                onClick={() => setCurrent(i)}
                className="group flex items-center gap-1.5"
              >
                <div className={cn(
                  'h-1.5 rounded-full transition-all duration-300',
                  current === i ? 'w-5 bg-stone-900' : 'w-1.5 bg-stone-300 group-hover:bg-stone-500',
                )} />
                {current === i && (
                  <span className="text-[10px] font-medium text-stone-700">
                    {slide.label}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Progress bar */}
          {!isPaused && (
            <div className="absolute bottom-0 left-2 right-2 h-0.5 bg-stone-100 rounded-full overflow-hidden">
              <motion.div
                key={current}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: SLIDE_INTERVAL / 1000, ease: 'linear' }}
                className="h-full bg-stone-400 rounded-full"
              />
            </div>
          )}
        </motion.div>
      </div>
    </section>
  );
}

// ============================================================
// AppScreenshot — lazy-loaded image with skeleton placeholder
// ============================================================

function AppScreenshot({
  src,
  alt,
  aspectRatio = '16/9',
}: {
  src: string;
  alt: string;
  aspectRatio?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const showPlaceholder = !src || error || !loaded;

  return (
    <div className="relative w-full bg-stone-50" style={{ aspectRatio }}>
      {/* Placeholder / skeleton */}
      {showPlaceholder && (
        <div className="absolute inset-0 bg-stone-100 flex flex-col items-center justify-center gap-2 rounded-lg">
          <div className="w-10 h-10 rounded-lg bg-stone-200 flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-stone-400" />
          </div>
          <p className="text-[11px] text-stone-400 font-medium">
            {!src ? 'Screenshot belum diupload' : 'Memuat preview...'}
          </p>
        </div>
      )}

      {/* Actual image */}
      {src && !error && (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
          className={cn(
            'w-full h-full object-cover object-top rounded-lg transition-opacity duration-300',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
}
