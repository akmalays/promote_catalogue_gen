import React from 'react';
import { motion } from 'motion/react';
import logoAsset from '../assets/img/pcs_logo.png';
import { cn } from '../lib/utils';

/**
 * Global reusable loading screen.
 * 
 * Usage:
 *   <LoadingScreen page="dashboard" />                    — uses preset title/subtitle
 *   <LoadingScreen page="dashboard" fullScreen />         — overlay mode
 *   <LoadingScreen message="Custom..." subMessage="..." /> — custom text
 */

export type LoadingPage =
  | 'dashboard'
  | 'pos'
  | 'inventory'
  | 'supply'
  | 'stock-opname'
  | 'catalogue-history'
  | 'analytics'
  | 'sales'
  | 'activity'
  | 'promotions'
  | 'campaign'
  | 'settings'
  | 'notifications'
  | 'reports';

const PAGE_PRESETS: Record<LoadingPage, { message: string; subMessage: string }> = {
  dashboard: {
    message: 'Memuat dashboard...',
    subMessage: 'Menyiapkan ringkasan data toko Anda.',
  },
  pos: {
    message: 'Menyiapkan kasir...',
    subMessage: 'Memuat data produk dan promo aktif.',
  },
  inventory: {
    message: 'Memuat inventori...',
    subMessage: 'Mengambil data produk dari server.',
  },
  supply: {
    message: 'Memuat data supply...',
    subMessage: 'Sinkronisasi riwayat pasokan barang.',
  },
  'stock-opname': {
    message: 'Menyiapkan stock opname...',
    subMessage: 'Sinkronisasi data stok terkini.',
  },
  'catalogue-history': {
    message: 'Memuat katalog...',
    subMessage: 'Mengambil data draft katalog.',
  },
  analytics: {
    message: 'Memuat analitik...',
    subMessage: 'Menghitung statistik penjualan.',
  },
  sales: {
    message: 'Memuat penjualan...',
    subMessage: 'Mengambil data transaksi toko.',
  },
  activity: {
    message: 'Memuat aktivitas...',
    subMessage: 'Menyinkronkan riwayat promosi.',
  },
  promotions: {
    message: 'Memuat promosi...',
    subMessage: 'Mengambil data pelanggan dan blast.',
  },
  campaign: {
    message: 'Memuat kampanye...',
    subMessage: 'Mengambil data kampanye promo.',
  },
  settings: {
    message: 'Memuat pengaturan...',
    subMessage: 'Mengambil konfigurasi toko.',
  },
  notifications: {
    message: 'Memuat notifikasi...',
    subMessage: 'Mengambil pesan terbaru.',
  },
  reports: {
    message: 'Memuat laporan...',
    subMessage: 'Menyiapkan data laporan.',
  },
};

interface LoadingScreenProps {
  /** Use a preset page key for automatic title/subtitle */
  page?: LoadingPage;
  /** Custom main message (overrides page preset) */
  message?: string;
  /** Custom sub message (overrides page preset) */
  subMessage?: string;
  /** Overlay mode — covers entire viewport with backdrop blur */
  fullScreen?: boolean;
}

export default function LoadingScreen({
  page,
  message,
  subMessage,
  fullScreen = false,
}: LoadingScreenProps) {
  const preset = page ? PAGE_PRESETS[page] : null;
  const displayMessage = message || preset?.message || 'Sedang menyiapkan halaman...';
  const displaySub = subMessage || preset?.subMessage || 'Mohon tunggu sejenak.';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center p-12 text-center',
        fullScreen
          ? 'fixed inset-0 z-[9999] bg-white/80 dark:bg-stone-950/80 backdrop-blur-md'
          : 'flex-1 min-h-[70vh] bg-transparent',
      )}
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center"
      >
        {/* Animated Brand Logo */}
        <div className="relative mb-6">
          <motion.div
            animate={{
              scale: [1, 1.08, 1],
              rotate: [0, 3, -3, 0],
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="w-32 h-32 flex items-center justify-center relative z-10"
          >
            <img
              src={logoAsset}
              alt="myStore Logo"
              className="w-full h-full object-contain drop-shadow-2xl"
            />
          </motion.div>

          {/* Soft Glow */}
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="absolute inset-0 bg-[#8b7365]/15 rounded-full blur-3xl -z-10"
          />
        </div>

        {/* Text */}
        <div className="space-y-3 max-w-xs">
          <div className="pt-2">
            <p className="text-base font-bold text-slate-700 dark:text-stone-200 tracking-tight mb-1">
              {displayMessage}
            </p>
            <p className="text-[11px] font-medium text-slate-400 dark:text-stone-500 leading-relaxed px-4">
              {displaySub}
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-8 w-48 h-1 bg-slate-100 dark:bg-stone-800 rounded-full mx-auto overflow-hidden">
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: '100%' }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
              className="w-full h-full bg-[#8b7365]/40 rounded-full"
            />
          </div>
        </div>
      </motion.div>
    </div>
  );
}
