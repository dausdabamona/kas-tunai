---
description: Tambal bug draft foto hilang diam-diam saat kuota localStorage penuh
---

Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md` (temuan **T1**) lebih dulu. Akar masalahnya
sudah diverifikasi — jangan menelusuri ulang, tapi **reproduksi dulu** sebelum menambal.

Mulai di branch/worktree baru.

Perbaikan yang wajib ada di `mobile.html`:

1. **Jangan simpan `_prev` ke localStorage.** Simpan hanya `base64`, `mimeType`,
   `namaFile`, `jenis`. Fungsi `prev(f)` sudah bisa membangun ulang data URL dari
   `base64`, jadi pratinjau tetap jalan setelah `muatDraft()`.
2. **`simpanDraft()` harus melaporkan kegagalan.** Bila `setItem` melempar, set
   `#ctDraftInfo` jadi peringatan mencolok "Draft tidak muat di penyimpanan HP — segera
   unggah" dan tampilkan toast error. Jangan pernah menulis "tersimpan" saat gagal.
3. **Penjaga ukuran.** Bila perkiraan ukuran draft melewati ±3,5 MB, tolak menambah foto
   baru dengan pesan jelas dan sarankan simpan & unggah dulu.

Batasan: jangan sentuh file `.gs`. Jangan ubah alur UI lain. Ikuti `systematic-debugging`.

Verifikasi sebelum klaim selesai (`verification-before-completion`): di Chrome device mode
atau HP, ambil 12 foto berturut-turut, tutup tab, buka lagi — draft dan pratinjau utuh,
atau muncul peringatan yang benar. Tunjukkan buktinya.

Selesai: commit `fix: cegah draft foto hilang diam-diam saat kuota localStorage penuh`,
lalu perbarui papan status di `docs/HANDOFF-MOBILE.md`.
