---
description: Papan pemantau uang muka PUM yang belum dipertanggungjawabkan
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu — **bagian 2** memberi rumus
`SisaDiTanganPUM` yang wajib dipakai di sini. Tugas 2 harus sudah selesai. Lalu baca
`KasTunai.gs`, `FotoNota.gs`, dan layar Beranda + Transaksi di `mobile.html`.

Konteks domain: aplikasi memisahkan penyerahan **uang muka ke PUM** (nota menyusul) dari
**belanja langsung ke toko** (nota sudah di tangan). Risiko terbesar bendahara ada di jenis
pertama: uang keluar, nota tidak pernah masuk, baru ketahuan saat SPJ disusun atau saat
diperiksa.

Branch baru.

Yang harus jadi:

1. **Definisi "belum dipertanggungjawabkan":** transaksi pengeluaran, bukan pindah dana
   (`refTransfer` tidak diawali `TF-`), dengan `SisaDiTanganPUM > 0` menurut rumus bagian 2.
   Pakai fungsi penghitung neraca dari tugas 2 — jangan menulis rumus kedua.
2. Kartu ringkas di Beranda: "Uang muka belum dipertanggungjawabkan — Rp X, N orang",
   ketuk untuk daftar lengkap.
3. Daftar diurutkan dari **paling tua**: nama PUM, uraian, nilai, umur hari, dan berapa
   yang sudah tertutup nota. Penanda warna bertingkat (mis. < 7 hari netral, 7–14
   perhatian, > 14 mendesak) — ambang harinya jadikan konstanta di satu tempat.
4. Tombol **Tagih** per baris → WhatsApp lewat `wa.me` dengan pesan terisi: nama PUM,
   tanggal, nilai, uraian, permintaan menyerahkan nota. Nomor HP PUM belum ada di data —
   rancang tempat menyimpannya (pola `MasterPenyedia.gs`) dan sediakan isian nomor saat
   pertama kali menagih. Bila menuntut kolom baru, **tanyakan dulu**.
5. Chip filter baru di layar Transaksi untuk menyaring hanya yang belum dipertanggungjawabkan.

Batasan: hitung di klien dari data `serverGetDashboard` bila cukup; tambah endpoint hanya
bila tidak terhindarkan, tetap ES5. Tanpa library baru, Bahasa Indonesia.

Verifikasi: cocokkan beberapa baris hasil hitungan dengan isi sheet `MULTI_NOTA` dan
`Pengembalian` secara manual, tampilkan perbandingannya sebelum menyatakan selesai.

Selesai: commit `feat: papan pemantau uang muka belum dipertanggungjawabkan`, perbarui
papan status dan catatan keputusan (ambang hari, lokasi nomor HP) di handoff.
