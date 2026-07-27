---
description: Kelola nota lengkap dari HP — ubah, hapus, foto nota & foto barang susulan
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` lebih dulu (bagian 2 rumus, bagian 4 daftar
yang sudah ada vs putus). **Tugas 2 harus sudah selesai** — panel neraca dipakai di sini.
Lalu baca di `mobile.html`: `bukaNotaBaru()`, `ntSisa()`, `ntRenderFoto()`, `detailNota()`,
`_dtTile()`; dan `FotoNota.gs`, `DetailNota.gs`, `DriveHelper.gs`.

Masalah: dari HP nota hanya bisa **ditambah**. Begitu tersimpan, tidak bisa diperbaiki
nilainya, tidak bisa dihapus kalau salah, dan tidak bisa ditambahi foto susulan — padahal
di lapangan nota sering datang bertahap dan sering salah ketik. Backendnya sudah siap
seluruhnya: `serverUpdateNota`, `serverHapusNotaItem`, `serverRestoreNota`,
`serverUploadFotoNota`, `serverHapusFotoNota`, `serverUploadFotoBarang`.

Alur: `brainstorming` → `writing-plans` → eksekusi. Branch baru.

Yang harus jadi:

1. **Ubah nota** dari kartu nota di layar detail: nama penyedia, NPWP, alamat, nilai,
   tanggal nota. Setelah tersimpan, panel neraca dan pajak nota itu ikut terhitung ulang —
   **jangan biarkan nilai pajak lama menempel pada nilai nota baru**; beri peringatan tegas
   bila pajak sudah pernah diisi, dan minta bendahara meninjau ulang pajaknya.
2. **Hapus nota** (soft delete) dengan konfirmasi yang menyebut dampaknya ke neraca:
   berapa sisa PUM sebelum dan sesudah. Sediakan **pulihkan** untuk membatalkan.
3. **Tambah foto pada nota yang sudah tersimpan**, dua jenis terpisah:
   **Bukti A — foto nota** dan **Bukti B — foto barang diterima**. Pakai ulang layar kamera
   yang sudah ada (`setFotoJenis`, `renderKamera`, `kompres`) — jangan menulis alur kamera
   kedua.
4. **Hapus foto** per lembar, dengan pratinjau besar dulu sebelum dihapus.
5. Kartu nota di `detailNota()` menampilkan jumlah foto per jenis dan menandai jelas nota
   yang **belum punya foto nota sama sekali** — itu yang bikin SPJ ditolak.
6. Semua aksi menyegarkan neraca dari fungsi penghitung tunggal milik tugas 2, bukan
   menghitung sendiri.

Batasan: backend ES5 dan pola `SoftDelete` + `DeferredFlush` yang sudah ada. Kompresi foto
tetap 1280px q0.7. Tanpa library baru. Bahasa Indonesia, tap target 44px.

Verifikasi: pada satu transaksi uji — tambah nota, ubah nilainya, tambah 2 foto nota dan
1 foto barang, hapus satu foto, hapus notanya, lalu pulihkan. Setelah tiap langkah,
tunjukkan angka neraca dan bandingkan dengan hitungan manual.

Selesai: commit bertahap, lalu perbarui papan status di `docs/HANDOFF-MOBILE.md`.
