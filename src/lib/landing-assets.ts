/**
 * Landing page image assets — stored in Supabase Storage (bucket: store-assets/assets/landing/)
 * 
 * To update images:
 * 1. Take screenshots of the app
 * 2. Upload to Supabase Storage → store-assets/assets/landing/
 * 3. Use the naming convention: {menu-id}/{sub-id}.webp
 * 
 * Recommended image specs:
 * - Format: WebP or PNG
 * - Width: 1400px (landscape 16:9)
 * - Quality: 80% (for WebP)
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const BUCKET = 'store-assets';
const FOLDER = 'assets/landing';

/** Helper to construct a storage public URL */
function storageUrl(path: string): string {
  if (!SUPABASE_URL) return '';
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${FOLDER}/${path}`;
}

export interface PreviewImage {
  id: string;
  label: string;
  url: string;
}

export interface PreviewMenu {
  id: string;
  label: string;
  images: PreviewImage[];
}

export const PREVIEW_MENUS: PreviewMenu[] = [
  {
    id: 'pos',
    label: 'Kasir',
    images: [
      { id: 'transaksi', label: 'Transaksi', url: storageUrl('pos/transaksi.webp') },
      { id: 'promo-aktif', label: 'Promo aktif', url: storageUrl('pos/promo-aktif.webp') },
      { id: 'struk', label: 'Cetak struk', url: storageUrl('pos/struk.webp') },
    ],
  },
  {
    id: 'inventory',
    label: 'Inventori',
    images: [
      { id: 'daftar-produk', label: 'Daftar produk', url: storageUrl('inventory/daftar-produk.webp') },
      { id: 'tambah-produk', label: 'Tambah produk', url: storageUrl('inventory/tambah-produk.webp') },
      { id: 'print-label', label: 'Print label', url: storageUrl('inventory/print-label.webp') },
    ],
  },
  {
    id: 'stock-opname',
    label: 'Stock Opname',
    images: [
      { id: 'sesi-baru', label: 'Sesi baru', url: storageUrl('stock-opname/sesi-baru.webp') },
      { id: 'input-hitung', label: 'Input hitung', url: storageUrl('stock-opname/input-hitung.webp') },
      { id: 'riwayat', label: 'Riwayat', url: storageUrl('stock-opname/riwayat.webp') },
    ],
  },
  {
    id: 'supply',
    label: 'Pasokan',
    images: [
      { id: 'input-barang', label: 'Input barang masuk', url: storageUrl('supply/input-barang.webp') },
      { id: 'riwayat', label: 'Riwayat pasokan', url: storageUrl('supply/riwayat.webp') },
    ],
  },
  {
    id: 'promo',
    label: 'Promo',
    images: [
      { id: 'kampanye', label: 'Kampanye', url: storageUrl('promo/kampanye.webp') },
      { id: 'blast-wa', label: 'Blast WA', url: storageUrl('promo/blast-wa.webp') },
      { id: 'katalog', label: 'Katalog visual', url: storageUrl('promo/katalog.webp') },
    ],
  },
  {
    id: 'laporan',
    label: 'Laporan',
    images: [
      { id: 'penjualan', label: 'Penjualan harian', url: storageUrl('laporan/penjualan.webp') },
      { id: 'analitik', label: 'Analitik', url: storageUrl('laporan/analitik.webp') },
      { id: 'dashboard', label: 'Dashboard', url: storageUrl('laporan/dashboard.webp') },
    ],
  },
  {
    id: 'pengaturan',
    label: 'Pengaturan',
    images: [
      { id: 'profil-toko', label: 'Profil toko', url: storageUrl('pengaturan/profil-toko.webp') },
      { id: 'kelola-user', label: 'Kelola user', url: storageUrl('pengaturan/kelola-user.webp') },
    ],
  },
];

/** Hero images for the auto-sliding carousel at the top */
export const HERO_IMAGES = [
  { id: 'dashboard', label: 'Dashboard', url: storageUrl('hero/dashboard.webp') },
  { id: 'sales', label: 'Sales Report', url: storageUrl('hero/sales.webp') },
  { id: 'pos', label: 'Kasir', url: storageUrl('hero/pos.webp') },
  { id: 'inventory', label: 'Inventori', url: storageUrl('hero/inventory.webp') },
  { id: 'katalog', label: 'Katalog', url: storageUrl('hero/katalog.webp') },
];
