# Cirquo Mobile (React Native CLI + Standalone Convex)

Aplikasi mobile native React Native (Bare CLI) untuk **Cirquo — Circular Food Recovery Platform**, dilengkapi backend **Convex** mandiri (`convex/`) yang terhubung ke deployment Cloud khusus mobile (`dev:curious-avocet-549`).

## Cakupan Fitur

Seluruh peran dan alur utama Cirquo tersedia secara native:

- **Public & Auth**: Welcome, Tentang Kami, Login, Pilih Peran & Register, Onboarding Merchant & Organic Processor (dengan GPS perangkat), Pending/Rejected/Suspended Verification, dan Notifikasi.
- **Consumer**: Beranda, Jelajah (filter bottom sheet + peta interaktif Mapbox + daftar), Halaman Kategori, Profil Mitra Usaha, Detail Rescue Item + Reserve Sheet, Checkout (timer payment hold 15 menit + Midtrans Snap Sandbox WebView), Daftar Pesanan, Detail Pesanan (kode pickup 6 digit + salin clipboard + pembatalan reservasi + timeline), Dampak Pribadi, dan Profil.
- **Merchant**: Ringkasan Dampak Material, Daftar Rescue Item, Buat Rescue Item (Dynamic Rescue Pricing live preview + upload foto galeri ke Convex Storage), Detail Rescue Item (terbitkan draf + pilih Organic Processor untuk batch recovery), Konfirmasi Pickup 6 digit, Dampak Merchant, dan Notifikasi.
- **Organic Processor**: Ringkasan Kapasitas & Outcome, Antrean Recovery (Ditawarkan / Diterima / Ditimbang + countdown offer), Detail Batch (terima/tolak offer, catat intake terukur, catat outcome & process loss), Riwayat Outcome, Profil Kapasitas & Routing, dan Notifikasi.
- **Admin**: Ringkasan Platform & Kualitas Data, Verifikasi Mitra (approve/reject/suspend/reinstate), Moderasi Rescue Item, Material Flow Ledger Inspector (cek konservasi berat & kelengkapan + inspeksi timeline per item), Operasi Admin (manual reroute & dispute order), dan Notifikasi.

## Setup Convex Standalone

1. Login ke akun Convex CLI:
   ```bash
   npx convex login
   ```
2. Push schema, fungsi, crons, dan HTTP actions ke deployment `dev:curious-avocet-549`:
   ```bash
   npm run convex
   ```
3. Set Environment Variables di **Convex Dashboard → Settings → Environment Variables**:
   - `MIDTRANS_SERVER_KEY`: Server Key Midtrans Sandbox milikmu (wajib untuk transaksi & verifikasi webhook)
   - `APP_URL` *(opsional)*: `https://curious-avocet-549.convex.site`
4. Di **Midtrans Sandbox Dashboard → Settings → Configuration → Payment Notification URL**, arahkan ke:
   ```text
   https://curious-avocet-549.convex.site/midtrans/webhook
   ```
5. Salin `.env.example` menjadi `.env` dan isi:
   ```env
   CONVEX_URL=https://curious-avocet-549.convex.cloud
   MAPBOX_ACCESS_TOKEN=<token-mapbox>
   MIDTRANS_CLIENT_KEY=<midtrans-sandbox-client-key>
   ```

## Menjalankan Aplikasi

```bash
# Terminal 1: sinkronkan & pantau backend Convex
npm run convex

# Terminal 2: jalankan Metro bundler (pakai --reset-cache setelah mengubah .env)
npm start -- --reset-cache

# Terminal 3: build & jalankan di Android emulator / perangkat
npm run android
```

## Verifikasi

```bash
npm run typecheck         # TypeScript app mobile
npm run typecheck:convex  # TypeScript khusus backend convex/
npm test                  # Unit test Jest
```
