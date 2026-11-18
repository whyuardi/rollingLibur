# Rolling Libur MagangHub — PT Ethes Teknologi Makmur

Web satu halaman untuk mengatur rolling libur MagangHub di PT Ethes Teknologi Makmur.

## Aturan

- Masuk **5 hari** dalam seminggu: Senin–Kamis selalu masuk, plus Jumat atau Sabtu.
- Setiap peserta libur **Jumat atau Sabtu**. Kalau libur Jumat, Sabtu masuk — begitu sebaliknya.
- **Selang-seling:** kalau minggu ini libur Jumat, minggu depan hanya bisa libur Sabtu
  (pilihan Jumat terkunci otomatis, dan sebaliknya).
- Roll membagi seimbang per divisi: Mobile 3 Jumat / 3 Sabtu, Web 3/3, Analyst 1/1.

## Divisi

| Divisi | Jumlah |
| --- | --- |
| Junior Mobile App Engineer | 6 orang |
| Junior Web Engineer | 6 orang |
| System Analyst | 2 orang |

Nama peserta awal berupa placeholder (`Peserta Mobile 1`, dst.) dan bisa diedit
langsung di web lewat ikon pensil di samping nama.

## Fitur

- Navigasi minggu berupa tautan teks (Sebelumnya / Minggu ini / Berikutnya)
- Grid jadwal mingguan: baris peserta, kolom Senin–Sabtu; sel LIBUR (blok tinta),
  MASUK, atau PILIH — semua bermono-spasi
- Daftar Libur & Masuk untuk Jumat dan Sabtu dalam bentuk daftar teks; status
  **Jadwal final** saat semua sudah memilih
- Tombol **Roll Minggu Ini** (acak seimbang per divisi, menghormati aturan selang-seling)
- Tombol **Export PDF** — memakai `window.print()` + stylesheet `@media print`,
  hasil cetaknya hanya berisi kop, rentang minggu, daftar libur/masuk, dan tabel rincian
- Tombol **Bersihkan** — menghapus jadwal minggu yang sedang tampil saja (dengan konfirmasi)
- Data tersimpan di **Supabase (Postgres)** kalau `.env.local` diisi, jadi jadwalnya
  sama di semua perangkat. Tanpa `.env`, web fallback ke `localStorage` per minggu
  (reload tidak hilang, ganti minggu tidak menghapus minggu sebelumnya), seperti
  sebelumnya. Tidak ada server sendiri yang perlu dijalankan.

## Setup Supabase (database)

1. Buat proyek gratis di [supabase.com](https://supabase.com) (Dashboard → New project).
2. Buka **SQL Editor** di dashboard proyek, lalu jalankan seluruh isi file
   `supabase/schema.sql` — ini membuat tabel `participants` dan `assignments`
   (plus 14 peserta placeholder) dan mengaktifkan Row Level Security.
3. Buka **Project Settings → API**, copy **Project URL** dan **anon public key**.
4. Di repo ini, copy `.env.example` menjadi `.env.local` lalu isi:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
   ```
   Jangan pernah commit `.env.local` — file itu sudah ada di `.gitignore`.
   Kunci `anon` memang dirancang untuk dipakai di client; policy di `schema.sql`
   membuka akses baca/tulis untuk proyek internal kecil tanpa login ini. Kalau
   nanti butuh pembatasan, tambahkan Supabase Auth dan ketatkan policy-nya.

## Cara menjalankan

```bash
npm install
npm run dev
```

Lalu buka http://localhost:3000

Build produksi:

```bash
npm run build
npm start
```

## Deploy ke Vercel

1. Push repo ini ke GitHub.
2. Di Vercel: **Add New → Project → Import** repo ini.
3. Framework terdeteksi otomatis sebagai Next.js. Di **Environment Variables** isi:
   `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_ANON_KEY` (dari
   Supabase Project Settings → API) — tanpa ini web jalan dengan localStorage
   per perangkat, bukan database bersama.
4. Klik **Deploy**.

## Teknologi

Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · Supabase
(Postgres, `@supabase/supabase-js`) · desain lembar roster cetak yang
tipografis (garis hairline, tanpa kartu/avatar/chip warna, font IBM Plex
Sans + IBM Plex Mono).
