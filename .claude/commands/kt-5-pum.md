---
description: Papan pemantau uang muka PUM yang belum dipertanggungjawabkan
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu, lalu `KasTunai.gs`, `FotoNota.gs`,
dan layar Beranda + Transaksi + detail di `mobile.html`.

**Konteks domain, jangan diubah asumsinya:** aplikasi ini memisahkan penyerahan UANG MUKA
kepada PUM (nota belum ada, menyusul lewat "Kelola Nota") dari BELANJA LANGSUNG ke toko
(nota sudah di tangan) — lihat komentar di `simpanSemua()` dan blok `#ctLangsungWrap`.
Risiko terbesar bendahara ada di jenis pertama: uang sudah keluar, nota tidak pernah masuk,
dan baru ketahuan saat SPJ disusun atau saat diperiksa.

Branch baru.

Yang harus jadi:

1. **Definisi "belum dipertanggungjawabkan":** transaksi pengeluaran (`kredit > 0`), bukan
   pindah dana (`refTransfer` tidak diawali `TF-`), yang belum punya nota bernilai — atau
   total nilai notanya masih kurang dari nilai transaksi. **Bila kode menunjukkan ambiguitas,
   berhenti dan tanya saya.** Jangan menebak diam-diam.
2. Kartu ringkas di Beranda: "Uang muka belum dipertanggungjawabkan — Rp X, N orang",
   ketuk untuk membuka daftar lengkap.
3. Daftar diurutkan dari **paling tua**. Tiap baris: nama PUM, uraian, nilai, umur dalam
   hari sejak tanggal transaksi, dan berapa yang sudah tertutup nota. Penanda warna
   bertingkat berdasarkan umur (mis. < 7 hari netral, 7–14 perhatian, > 14 mendesak).
   Ambang harinya jadikan konstanta di satu tempat supaya gampang disetel.
4. Tombol **Tagih** per baris yang membuka WhatsApp lewat tautan `wa.me` dengan pesan
   terisi: nama PUM, tanggal, nilai, uraian, permintaan menyerahkan nota. Nomor HP PUM
   belum ada di data — rancang tempat menyimpannya (paling masuk akal ikut master yang
   sudah ada, lihat `MasterPenyedia.gs` sebagai pola) dan sediakan isian nomor saat pertama
   kali menagih orang itu. Bila ini menuntut kolom baru di sheet, **tanyakan dulu**.
5. Chip filter baru di layar Transaksi untuk menyaring hanya yang belum dipertanggungjawabkan.

Batasan: hitung sedapat mungkin **di klien** dari data yang sudah dikirim
`serverGetDashboard` supaya tidak menambah round-trip; tambah endpoint hanya bila tidak
terhindarkan, tetap ES5. Tanpa library baru, Bahasa Indonesia, tap target 44px.

Verifikasi dengan data nyata: cocokkan beberapa baris hasil hitungan dengan isi sheet
`MULTI_NOTA` secara manual, tampilkan perbandingannya sebelum menyatakan selesai.

Selesai: commit `feat: papan pemantau uang muka belum dipertanggungjawabkan`, lalu perbarui
papan status dan catatan keputusan (ambang hari, lokasi nomor HP) di `docs/HANDOFF-MOBILE.md`.
