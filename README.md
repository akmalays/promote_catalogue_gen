# 🚀 Promote Catalogue Gen - Business Suite

Sistem manajemen toko all-in-one yang mencakup Kasir (POS), Analisis Pendapatan (Revenue Analytics), dan Manajemen Notifikasi Tim yang didukung oleh AI & Supabase Cloud.

---

## 🛠️ Tech Stack

- **Frontend:** [React 19](https://react.dev/) + [Vite](https://vitejs.dev/)
- **Styling:** [Tailwind CSS 4](https://tailwindcss.com/)
- **Database & Auth:** [Supabase](https://supabase.com/)
- **Charts:** [Recharts](https://recharts.org/)
- **Icons:** [Lucide React](https://lucide.dev/)
- **Animations:** [Motion for React](https://motion.dev/)

---

## 📦 Instalasi Lokal

Ikuti langkah-langkah berikut untuk menjalankan project di komputer Anda:

1. **Clone Repository:**
   ```bash
   git clone https://github.com/akmalays/promote_catalogue_gen.git
   cd promote_catalogue_gen
   ```

2. **Install Dependensi:**
   ```bash
   npm install
   ```

3. **Konfigurasi Environment (.env):**
   Salin file `.env.example` menjadi `.env` dan isi kredensial Supabase Anda:
   ```bash
   cp .env.example .env
   # Buka .env dan isi VITE_SUPABASE_URL & VITE_SUPABASE_ANON_KEY
   ```

4. **Jalankan Aplikasi:**
   ```bash
   npm run dev
   ```

---

## 🗄️ Manajemen Database (Supabase)

Untuk mempermudah migrasi atau setup database baru, seluruh skema database (SQL) telah disediakan di folder migrations:

📂 **Lokasi:** `supabase/migrations/`

Daftar file migrasi (jalankan berurutan di SQL Editor Supabase):
1. `00_init_notifications.sql` - Tabel Notifikasi.
2. `00_store_settings.sql` - Target Omzet & Item Fokus.
3. `01_auth_and_users.sql` - Tabel User & Login.
4. `02_core_business.sql` - Tabel Produk, Katalog, & Pelanggan.
5. `03_transactions_and_logs.sql` - Tabel Sales, Stok, & Blast History.

---

## 💾 Backup Data (JSON Snapshot)

Kami telah menyediakan fitur backup otomatis untuk mengambil seluruh data dari Supabase dan menyimpannya secara lokal demi keamanan.

**Cara menjalankan backup:**
```bash
npm run backup
```

**Hasil Backup:**
- File akan disimpan dalam format JSON di folder: `supabase/backups/`.
- Nama file akan menyertakan timestamp (contoh: `backup_2026-04-03T...json`).
- **Catatan:** Folder `backups/` sudah otomatis diabaikan oleh Git (`.gitignore`) untuk menghindari kebocoran data sensitif ke GitHub.

---

## ✨ Fitur Utama

- **Pusat Notifikasi:** Kirim info/promo ke seluruh tim atau role spesifik dengan sistem penjadwalan.
- **Revenue Dashboard:** Pantau omzet harian, target penjualan, dan item fokus secara real-time.
- **POS (Point of Sale):** Sistem kasir yang ringan dengan integrasi stok produk otomatis.
- **Product Inventory:** Kelola database produk, stok masuk (supply), dan histori pergerakan barang.
- **Blast History:** Lacak riwayat pengiriman promosi katalog ke pelanggan.

---

## 👨‍💻 Kontribusi
Pastikan untuk melakukan `git checkout -b nama-fitur` sebelum melakukan perubahan besar dan diskusikan di bagian Issues jika ada kendala.
