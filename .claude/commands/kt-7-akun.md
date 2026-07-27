---
description: Layar Akun di mobile (ganti password, keluar, info sesi)
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu.

Masalah: `#nvAkun` masih `belumSiap('Akun')`. Tidak ada cara keluar dari sesi atau ganti
password dari HP, padahal token tersimpan di localStorage perangkat — kalau HP bendahara
hilang atau dipinjam, tidak ada jalan mengunci selain lewat desktop. Backend
`serverLogout` dan `serverGantiPassword` **sudah ada**.

Branch baru. Tugas kecil, kerjakan langsung tanpa fase perencanaan.

Isi layar Akun:

1. Identitas: nama, email, role (dari objek `USER`). Untuk role non-admin saldo memang
   disembunyikan server — jelaskan di UI, jangan menampilkan kolom kosong tanpa keterangan.
2. Ganti password: lama, baru, ulangi baru. Validasi di klien lalu
   `serverGantiPassword(token, lama, baru)`. Setelah sukses, paksa login ulang.
3. Keluar: `serverLogout(token)`, bersihkan token dan draft, kembali ke layar login.
   **Konfirmasi dulu** bila masih ada draft atau antrean yang belum terkirim.
4. Pindahkan info versi/deploy dan tautan "Buka versi desktop" ke sini.

Batasan: jangan ubah tanda tangan fungsi backend. Pakai gaya CSS yang sudah ada, tanpa
library baru, tap target 44px, Bahasa Indonesia.

Verifikasi: ganti password → login ulang dengan password baru → keluar → token lama tidak
bisa dipakai. Tunjukkan buktinya.

Selesai: commit `feat: tambah layar Akun (ganti password, keluar, info sesi)`, perbarui
papan status di `docs/HANDOFF-MOBILE.md`.
