---
description: Pengembalian sisa & titipan pajak, plus kuitansi dan Berita Acara
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu — **bagian 2 (jebakan titipan
pajak)** dan **bagian 3**. Tugas 2–4 harus sudah selesai. Lalu baca `Pengembalian.gs`
seluruhnya (terutama `_recalc()`), `mobile.html` bagian `bukaPengembalian()`,
`renderRiwayatKembali()`, `simpanPengembalian()`, `cetakTandaTerima()`,
`_htmlTandaTerima()`, `terbilang()`, `tglPanjang()`.

Dua kekurangan yang harus ditutup:

**(a) Uang yang kembali ada dua jenis, sekarang tercampur.** Sisa uang muka dan titipan
pajak (mode NETTO dari tugas 4) sama-sama kas masuk, tapi maknanya beda. Kalau titipan
pajak ikut dihitung sebagai pengembalian sisa, `KEMBALIAN_TOTAL` dan `STATUS_SPJ` di
`_recalc()` akan mengurangi dua kali dan transaksi terlihat lunas padahal belum.

**(b) Tidak ada tanda bukti pengembalian.** `cetakTandaTerima()` hanya untuk penyerahan
uang muka. Saat PUM menyerahkan sisa, tidak ada apa pun yang ditandatangani — ini
persis yang ditanyakan pemeriksa.

Alur: `brainstorming` untuk mengunci isi dokumen → `writing-plans` → eksekusi. Branch baru.

Yang harus jadi:

1. **Kolom JENIS di sheet `Pengembalian`** (`SISA` / `TITIPAN_PAJAK`) lewat `_Config.gs` +
   `ensureHeaders`. Baris lama dibaca sebagai `SISA`.
2. **`Pengembalian.gs → _recalc()` hanya menghitung jenis SISA** untuk `KEMBALIAN_TOTAL`
   dan `STATUS_SPJ`. Baca fungsi itu utuh sebelum mengubah, dan pastikan transaksi masuk
   otomatis (`REF_MASUK_NO`) tetap dibuat untuk kedua jenis — uangnya memang masuk kas.
   Keterangan transaksi masuk harus menyebut jenisnya.
3. **Layar pengembalian memakai neraca tugas 2**: tampilkan wajib kembali dan uraikan dari
   mana angkanya. Pilihan jenis (sisa / titipan pajak) muncul jelas; bila ada
   ΣPajakDitarik yang belum tercatat, sarankan nilainya.
4. **Koreksi dan hapus pengembalian** dari HP (`serverHapusPengembalian`,
   `serverRestorePengembalian` sudah ada), dengan konfirmasi yang menyebut dampak ke neraca.
5. **Dua dokumen, dipilih saat cetak** — pakai pola `_htmlTandaTerima()` + `_bukaCetak()`,
   identitas dari `serverGetInstansi`, nilai dalam angka **dan** terbilang
   (`terbilang()` sudah ada):
   - **Kuitansi Pengembalian** — ringkas: nomor transaksi, tanggal, nama PUM, nilai
     dikembalikan, jenis, tanda tangan PUM dan Bendahara.
   - **Berita Acara Pengembalian Sisa Uang Muka** — formal: identitas satker, dasar
     transaksi (No, tanggal, uraian, uang muka), rincian realisasi (Σ nota, Σ pajak,
     nilai diserahkan ke penyedia), nilai yang dikembalikan, sisa akhir, tanda tangan PUM
     dan Bendahara, diketahui PPK.
6. **Bagikan lewat WhatsApp** selain cetak — di lapangan tidak ada printer.

Batasan: backend ES5, pola SoftDelete/DeferredFlush, tanpa library baru, Bahasa Indonesia,
uang bilangan bulat.

Verifikasi wajib: satu transaksi uji dengan nota bermode NETTO — catat titipan pajak, lalu
catat pengembalian sisa. Buktikan `KEMBALIAN_TOTAL` **tidak** menghitung titipan pajak,
`STATUS_SPJ` berubah pada saat yang benar, dan sisa akhir cocok dengan hitungan manual.
Cetak kedua dokumen dan periksa angkanya konsisten dengan neraca. Tampilkan buktinya.

Selesai: commit bertahap, lalu perbarui papan status dan catatan keputusan di
`docs/HANDOFF-MOBILE.md`.
