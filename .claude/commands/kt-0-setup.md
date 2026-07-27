---
description: Verifikasi handoff cocok dengan repo dan siapkan lingkungan kerja
---

Sesi persiapan. Belum menulis fitur.

1. Baca `CLAUDE.md` dan `docs/HANDOFF-MOBILE.md`.
2. Verifikasi isi `CLAUDE.md` benar-benar cocok dengan repo saat ini: daftar file `.gs`,
   `filePushOrder` di `.clasp.json`, dan daftar endpoint di bagian 3 handoff. Perbaiki
   yang tidak cocok.
3. Verifikasi ketiga temuan T1–T3 di `docs/HANDOFF-MOBILE.md` masih berlaku di kode
   sekarang (mungkin sebagian sudah tertambal). Tandai yang sudah tidak berlaku.
4. Cek `clasp` terpasang dan `.clasp.json` menunjuk Script ID yang benar. **Jangan**
   menjalankan `clasp push` di sesi ini.
5. Laporkan temuan. Bila ada yang berubah, commit dengan
   `docs: samakan CLAUDE.md dan handoff dengan kondisi repo`.

Jangan mengubah kode aplikasi di sesi ini.
