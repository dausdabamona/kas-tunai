---
description: Neraca transaksi — Σ nota, pajak, nilai yang boleh diserahkan, sisa PUM
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu — terutama **bagian 2 (rumus
neraca)**, yang merupakan satu-satunya sumber kebenaran. Lalu baca di `mobile.html`:
`detailKepala()`, `detailNota()`, `hitungPajakUI()`, `ntSisa()`, `bukaPengembalian()`;
dan di backend: `KasTunai.gs`, `Pengembalian.gs` fungsi `_recalc()`.

**Ini fondasi tugas 3, 4, dan 5. Kerjakan dengan benar sebelum melangkah.**

Masalah: bendahara tidak pernah melihat uang satu transaksi secara utuh. `pjNetto`
("nilai yang boleh diserahkan ke penyedia") hanya muncul sekilas di layar pajak, tidak
disimpan, dan hilang begitu layar ditutup. `ntSisa()` menghitung sisa hanya saat membuat
nota baru. Tidak ada satu tempat pun yang menjawab: *uang muka sekian, sudah bernota
sekian, pajak dipotong sekian, yang diserahkan ke toko sekian, yang harus dikembalikan
sekian.*

Alur: `brainstorming` untuk mengunci tampilan dan penamaan istilah → `writing-plans` →
eksekusi. Branch baru.

Yang harus jadi:

1. **Satu fungsi penghitung neraca** di `mobile.html` yang menerima transaksi + daftar
   nota + daftar pengembalian, dan mengembalikan seluruh besaran di bagian 2 handoff.
   Satu fungsi saja — tugas 3/4/5 memanggilnya, tidak boleh menghitung sendiri.
2. **Panel neraca di layar detail transaksi**, di bawah `detailKepala()`. Tampilkan
   berurutan: Uang muka → Σ nota → Σ pajak dipotong → **Nilai diserahkan ke penyedia** →
   Pajak ditarik untuk disetor → Σ pengembalian sisa → **Sisa di tangan PUM**, lalu status
   pertanggungjawaban (Lunas / Belum). Baris yang bernilai nol tetap ditampilkan dengan
   keterangan, jangan disembunyikan — angka yang hilang bikin bendahara ragu.
3. **`dibayarKePenyedia` per nota disimpan**, bukan dihitung ulang di layar. Tambahkan
   kolomnya di sheet `MULTI_NOTA` lewat `_Config.gs` + `SheetRepo.ensureHeaders()`.
   Baris lama tanpa nilai harus tetap terbaca (default: mode NETTO, hitung dari
   nilai − pajak). Kolom mode bayar NETTO/BRUTO dipasang di tugas 4 — di tugas ini
   **anggap semua NETTO** dan siapkan tempatnya.
4. **Tampilkan nilai diserahkan di tiap kartu nota** pada `detailNota()`, di samping
   nilai bruto: "Rp 5.000.000 · diserahkan Rp 4.900.000".
5. Bila `Sisa di tangan PUM` negatif (nota melebihi uang muka), tandai merah dengan
   penjelasan — jangan diam-diam dijadikan nol.

Batasan: backend ES5, tanpa library baru, Bahasa Indonesia, tap target 44px, uang
bilangan bulat.

Verifikasi wajib: ambil **3 transaksi nyata** dengan kondisi berbeda (belum bernota,
bernota sebagian + pajak, sudah ada pengembalian). Hitung manual ketujuh besaran untuk
tiap transaksi, bandingkan dengan tampilan aplikasi, **tampilkan tabel perbandingannya**
sebelum menyatakan selesai.

Selesai: commit `feat: panel neraca transaksi dan nilai yang boleh diserahkan ke penyedia`,
lalu perbarui papan status di `docs/HANDOFF-MOBILE.md`.
