# Side-effect server

Server Node tipis, hanya untuk hal-hal yang tidak bisa dilakukan langsung dari
Supabase RLS atau pg_cron.

## Endpoints

- `GET  /healthz` — liveness probe
- `POST /api/scheduler/run` — fallback manual untuk:
  - `flush_due_notifications()`
  - `deactivate_expired_campaigns()`

  Tidak diperlukan bila `pg_cron` sudah dijadwalkan oleh migrasi
  `20260517010000_background_jobs_and_rpc.sql`.

## Environment

Server membaca dua key dari `.env` repo (root):

- `VITE_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY` (preferred) atau `VITE_SUPABASE_ANON_KEY`

`SUPABASE_SERVICE_ROLE_KEY` direkomendasikan karena RPC scheduler perlu hak
update tanpa auth user.

## Menjalankan

```sh
cd server
npm install
npm start
```

## Kapan server ini benar-benar perlu?

- Kalau nanti ada integrasi outbound: WhatsApp blast, email, payment webhook,
  print queue eksternal. Tambah endpoint baru di `index.js`.
- Kalau cluster Supabase tidak menyediakan `pg_cron` (mis. self-hosted lawas),
  panggil `POST /api/scheduler/run` dari cron eksternal (cron-job.org, GitHub
  Actions schedule, dll.) sebagai pengganti.

Untuk Supabase Cloud standar, `pg_cron` sudah cukup dan server ini boleh tidak
dijalankan sama sekali.
