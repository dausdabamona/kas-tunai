---
description: Pajak per nota — mode bayar netto/bruto, nilai tersimpan, bukti potong
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu — **bagian 2 (rumus, termasuk
jebakan titipan pajak)** dan **bagian 3 (keputusan yang sudah diambil)**. Tugas 2 dan 3
harus sudah selesai. Lalu baca di `mobile.html`: `klasifikasiPajak()`, `pjTeksKlasifikasi()`,
`hitungPajak()`, `bukaPajak()`, `hitungPajakUI()`, `simpanPajak()`; di backend:
`_Config.gs` bagian `PAJAK_REF`/`PAJAK_DEFAULT`, `KasTunai.gs` fungsi pajak nota.

Mesin hitungnya sudah benar dan sama dengan desktop — **jangan diubah tarif, ambang batas,
atau aturan non-NPWP ×2 (hanya PPh 22 & 23)**. Yang kurang ada di sekitarnya.

Keputusan yang sudah ditetapkan pengguna: **mode bayar dipilih per nota**, default NETTO.

- **NETTO** — PUM menyerahkan (nilai nota − pajak) ke toko, uang pajaknya kembali ke
  bendahara untuk disetor.
- **BRUTO** — toko menerima nilai nota utuh; pajak disetor dari sumber lain dan tidak
  ditarik dari uang muka.

Alur: `writing-plans` → eksekusi (spec-nya sudah terkunci di handoff). Branch baru.

Yang harus jadi:

1. **Pilihan mode bayar per nota** di layar pajak, dengan penjelasan satu kalimat untuk
   masing-masing mode dalam bahasa bendahara — bukan istilah teknis. Simpan modenya di
   kolom baru sheet `MULTI_NOTA` (`_Config.gs` + `ensureHeaders`); baris lama tanpa nilai
   dibaca sebagai **NETTO**.
2. **Simpan hasilnya**, tidak sekadar ditampilkan: DPP, PPh, PPN, mode bayar, dan
   `dibayarKePenyedia` (kolom dari tugas 2). Sesudah simpan, panel neraca harus langsung
   berubah.
3. **Layar pajak menampilkan konsekuensi uangnya**, bukan cuma angka pajak:
   "Serahkan ke toko Rp X · Tahan untuk disetor Rp Y" pada mode NETTO;
   "Serahkan ke toko Rp X · Setor dari sumber lain Rp Y" pada mode BRUTO.
4. **Ringkasan pajak per transaksi** di layar detail: total PPh, total PPN, mana yang
   uangnya sudah ditarik (ΣPajakDitarik) dan mana yang belum (ΣPajakLuarUM), lengkap
   dengan kode MAP/KJS per nota.
5. **Bukti potong per nota** yang bisa dicetak/dibagikan: identitas satker dan pejabat dari
   `serverGetInstansi`, identitas penyedia + NPWP, DPP, tarif, jenis PPh, nilai potongan,
   kode MAP/KJS, tanggal, ruang tanda tangan bendahara dan penyedia. Pakai pola
   `_htmlTandaTerima()` + `_bukaCetak()` yang sudah ada.
6. Nota yang **terindikasi kena pajak tapi belum diisi** ditandai jelas di kartu notanya
   (pakai `klasifikasiPajak()` yang sudah ada). Jangan memblokir apa pun — cukup tandai.

Batasan: uang dan pajak **bilangan bulat**; uji pembulatan eksplisit. Backend ES5, pola
SoftDelete/DeferredFlush, tanpa library baru, Bahasa Indonesia.

Verifikasi wajib: ambil **5 nota nyata** dengan kategori berbeda (kena PPN, di bawah ambang,
non-NPWP, bebas pajak, PPh 23). Hitung manual DPP/PPh/PPN/nilai diserahkan untuk masing-
masing, bandingkan dengan aplikasi pada **kedua mode**, dan **tampilkan tabel
perbandingannya** sebelum menyatakan selesai.

Selesai: commit bertahap, lalu perbarui papan status dan catatan keputusan (nama kolom
baru) di `docs/HANDOFF-MOBILE.md`.
