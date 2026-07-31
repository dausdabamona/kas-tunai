# Kas Tunai — Poltek KP Sorong

Aplikasi Google Apps Script untuk manajemen kas tunai satker. Backend Google Sheets,
dua entry point: `index.html` (desktop) dan `mobile.html` (HP).

## Batasan yang tidak bisa dilanggar

- **Backend ES5.** Semua `.gs` pakai `var` + `function`. Tanpa `let`, `const`, arrow,
  template literal, `Promise`, `class`.
- **Frontend vanilla JS, satu file per entry point.** Tanpa framework, tanpa build step,
  tanpa dependency eksternal baru.
- **Web app GAS berjalan di iframe sandbox** → service worker, PWA install, dan
  Background Sync API **tidak bisa dipakai**. Offline = localStorage/IndexedDB + retry
  manual saat aplikasi dibuka atau event `online`.
- **Tidak ada hard delete.** Semua penghapusan lewat `IS_DELETED='Y'` (`SoftDelete.gs`).
- **`SpreadsheetApp.flush()` sekali di akhir request** via `DeferredFlush.commitAndInvalidate()`.
- **Urutan muat diatur `filePushOrder` di `.clasp.json`** — `_Config.gs` harus dievaluasi
  lebih dulu. Menambah file `.gs` baru berarti mendaftarkannya di sana.
- Semua panggilan frontend→backend lewat `google.script.run.serverXxx(token, ...)`.
  Endpoint dibungkus `_run(token, fn)` yang memvalidasi sesi.

## Peta file

| File | Peran |
|------|-------|
| `_Config.gs` | `CONFIG`: SPREADSHEET_ID, nama sheet, index kolom, header, PAJAK_REF, INSTANSI |
| `Util.gs` | `num`, `fmtDate`, `emptyRow`, `set`, `colMap` |
| `SheetRepository.gs` | Cache 3 lapis (`_ExecCache`, `AppCache`, `SheetRepo`) + `DeferredFlush` |
| `SoftDelete.gs` | `softDelete`, `restoreRecord`, `AuditLog`, `getOperator` |
| `TxnHelper.gs` | Lookup berbasis NO transaksi |
| `DriveHelper.gs` | Upload / trash file ke Drive |
| `KasTunai.gs` | Transaksi, multi-nota, foto barang, SPBY, rekap, `getNotaPajak` |
| `FotoNota.gs` | Foto per nota (`NO_TRANSAKSI` + `NOTA_ID`) |
| `Anggaran.gs` | Pagu POK & `ketersediaan()` — **berbasis `KODE_ITEM`, bukan akun** + pembebanan satu transaksi ke beberapa item (`simpanPembebanan`) |
| `Rekonsiliasi.gs` | Impor rek koran / SAKTI, pencocokan |
| `Pengembalian.gs`, `MasterPenyedia.gs`, `SuratTugas.gs`, `BuktiPD.gs`, `ScanInbox.gs`, `Users.gs`, `Settings.gs` | modul pendukung |
| `Code.gs` | `doGet()` + seluruh `server*` |
| `index.html` | Frontend desktop (CSS+JS satu file) |
| `mobile.html` | Frontend HP (CSS+JS satu file) |

## Pembagian peran desktop vs mobile

HP = **alat tangkap**: catat transaksi, foto nota, pajak per nota, pengembalian,
pindah dana, cetak tanda terima. Desktop = **pekerjaan meja**: rekonsiliasi, impor pagu,
manajemen user, layout SPJ. Jangan pindahkan pekerjaan meja ke layar kecil.

## Konvensi

- Ikuti skill `firdaus-dev`. Bahasa UI **Indonesia**. Target Android low-end, koneksi
  tidak stabil (Sorong & Raja Ampat). Tap target minimal 44px.
- Komentar business logic Bahasa Indonesia, komentar teknis boleh Inggris.
- Uang dan pajak = bilangan bulat. Pembulatan diuji eksplisit.
- Commit: Conventional Commits, subjek Bahasa Indonesia, imperatif, < 72 karakter.
- Branch default repo ini **`claude/determined-archimedes-od8jtc`** (tidak ada `main`).
  Pekerjaan besar sebaiknya di branch/worktree baru (`using-git-worktrees`), lalu
  digabungkan ke branch default itu.

## Perintah

```bat
deploy.bat            # git pull + clasp push  (TANPA versi baru - staf belum lihat)
deploy.bat rilis      # + buat versi baru      (staf melihat perubahan)
deploy.bat nopull     # lewati git pull
```

**Versi dipisah dengan sengaja.** Apps Script membatasi **200 versi per proyek**.
`deploy.bat` versi lama membuat versi tiap kali dijalankan, sehingga batasnya tercapai
30 Jul 2026. Versi lama **bisa dihapus** dan URL tidak berubah — tapi itu pekerjaan
manual yang tidak perlu ada kalau jatahnya tidak dibakar untuk percobaan kecil. Saat
mencoba-coba: `deploy` biasa, lalu periksa lewat URL `/dev` (Deploy → Test deployments)
yang selalu menjalankan kode terbaru. Bila batasnya tercapai:
`docs/BATAS-VERSI-APPS-SCRIPT.md`.

`deploy.bat` memakai `clasp deploy -i <DEPLOY_ID>` sehingga **URL web app tidak
berubah**. Jangan menjalankan `clasp deploy` tanpa `-i` — itu membuat deployment
BARU dengan URL baru, sedangkan pengguna sudah menyimpan pintasan URL lama di
layar utama HP.

```bash
clasp push --force    # unggah kode saja
clasp deployments     # lihat DEPLOY_ID
clasp open            # buka editor Apps Script
```

Hak akses web app diatur di `appsscript.json`: `access` harus
`ANYONE_ANONYMOUS` ("Siapa saja"), bukan `ANYONE` (yang berarti "siapa saja yang
memiliki Akun Google" dan menghalangi staf ber-Gmail pribadi).

GAS sulit di-unit-test otomatis: verifikasi = `clasp push` ke deployment uji +
uji manual di Chrome Android, dengan bukti (lihat `verification-before-completion`).

## Pekerjaan mobile yang sedang berjalan

**Fokus utama: pengelolaan transaksi di HP** — satu transaksi diurus tuntas dari layar
detailnya (nota, foto nota, foto barang, pajak, nilai yang boleh diserahkan ke penyedia,
pengembalian sisa, dan bukti-buktinya).

Rumus neraca transaksi, temuan terverifikasi, keputusan domain, dan papan status ada di
**`docs/HANDOFF-MOBILE.md`** — baca sebelum menyentuh kode mobile. **Rumus di bagian 2
dokumen itu adalah satu-satunya sumber kebenaran**; jangan menaruh varian rumus di kode.

Perintah siap pakai: `/kt-status`, lalu `/kt-1-draft` … `/kt-10-setor`.
