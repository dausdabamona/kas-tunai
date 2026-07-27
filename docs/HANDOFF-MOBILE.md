# Handoff — Pengembangan Kas Tunai Mobile

Dokumen acuan lintas sesi. Setiap perintah `/kt-*` membaca file ini lebih dulu.
**Perbarui papan status di bawah setiap kali satu tugas selesai.**

---

## 1. Papan status

| # | Tugas | Perintah | Status | Branch / commit |
|---|-------|----------|--------|-----------------|
| 0 | CLAUDE.md repo | `/kt-0-setup` | ⬜ belum | — |
| 1 | Tambal draft foto hilang diam-diam | `/kt-1-draft` | 🟡 kode selesai | `kt-1-draft` → c2395b9 |
| 2 | Antrean unggah offline | `/kt-2-antrean` | ⬜ belum | — |
| 3 | Layar Akun | `/kt-3-akun` | 🟡 kode selesai | `kt-3-akun` → e5455ad |
| 4 | Item POK + cek sisa pagu | `/kt-4-pagu` | ⬜ belum | — |
| 5 | Papan PUM belum dipertanggungjawabkan | `/kt-5-pum` | ⬜ belum | — |
| 6 | Worklist pajak + pengingat setor | `/kt-6-pajak` | ⬜ belum | — |

Status: ⬜ belum · 🟡 jalan · ✅ selesai (sudah diuji di HP) · ⛔ terblokir

> Tugas 1: kode selesai dan diuji otomatis di Chromium lewat jalur asli aplikasi
> (`#kmCam` → `terimaFoto` → `kompres` → `simpanDraft`, 12 foto, tutup-buka tab).
> Naikkan ke ✅ setelah dikonfirmasi di HP sungguhan pasca `deploy.bat`.
>
> Tugas 3: diuji dengan tiruan sesi bergaya `Users.gs` — ganti password, login
> dengan password lama ditolak, keluar, lalu token lama dijawab `SESI_BERAKHIR`.
> Konfirmasi di HP juga masih perlu.

**Urutan wajib:** 1 → 2 (keduanya menyentuh penyimpanan lokal yang sama, jangan paralel).
3 boleh kapan saja. 4 → 5 → 6 setelah 2 beres.

---

## 2. Temuan yang sudah diverifikasi

Tiga hal di bawah sudah ditelusuri di kode; **jangan dicari ulang, langsung kerjakan.**

### T1 — Draft foto hilang diam-diam (bug aktif)

`simpanDraft()` di `mobile.html` menyimpan seluruh `FOTOS` ke localStorage. Tiap objek
foto membawa **dua** salinan gambar yang sama: `base64` dan `_prev` (data URL hasil
`kompres()`). Satu foto 1280px q0.7 ≈ 200–450 KB → tersimpan dobel ≈ 0,5–0,9 MB.
Kuota localStorage 5 MB, jadi draft gagal disimpan mulai foto ke-6 s.d. ke-9.
`try{...}catch(e){}` menelan `QuotaExceededError` tanpa suara, lalu baris berikutnya
tetap menulis "Draft tersimpan otomatis di perangkat" ke `#ctDraftInfo`.
Bendahara mengira notanya aman padahal hilang.

> **Diukur ulang 27 Jul 2026 di Chromium — ternyata LEBIH parah dari perkiraan di atas.**
> Foto nota 1280×960 q0.7 berisi teks (entropi tinggi, seperti nota sungguhan):
> satu objek foto = **1.153 KB** tersimpan; tanpa `_prev` = 577 KB (hemat 50%).
> `QuotaExceededError` muncul pada **foto ke-5**, bukan ke-6…9, saat draft menyentuh
> 5.767 KB. Empat foto pertama tersimpan, sisanya hilang tanpa pemberitahuan apa pun.
> Membuang `_prev` menggeser batasnya ke sekitar foto ke-9 — jadi penjaga ukuran di
> langkah 3 `/kt-1-draft` tetap wajib, bukan opsional.

### T2 — UI menjanjikan kemampuan luring yang belum ada

- `#nvAntrean` → `belumSiap('Antrean unggah')`
- chip filter `draft` ("Draft offline") selalu dikosongkan di `lolosFilter()`,
  `renderTransaksi()` menampilkan "Draft offline hadir di tahap berikutnya"
- banner `#bdOffline` hanya memberi toast kosong
- `simpanSemua()` saat `!navigator.onLine` **menolak** menyimpan; hanya ada satu slot
  draft (`kt_draft`) yang akan tertimpa transaksi berikutnya
- `#nvAkun` → `belumSiap('Akun')`, padahal `serverLogout` dan `serverGantiPassword`
  sudah ada di backend

Untuk aplikasi uang, janji palsu lebih berbahaya daripada fitur yang belum ada.

### T3 — Transaksi dari HP tidak pernah mengurangi pagu (cacat data)

`Anggaran.ketersediaan()` menghitung serapan lewat kolom `KODE_ITEM` (item POK).
Form catat di `mobile.html` hanya punya field teks bebas "Akun / MAK" (`#ctAkun`), dan
`simpanSemua()` **tidak pernah mengirim `kodeItem`** ke `serverTambahTransaksi`.
Akibatnya setiap transaksi dari HP jatuh ke `belanjaTanpaItem` dan tidak mengurangi pagu
item mana pun. Makin sering HP dipakai, makin melenceng angka Ketersediaan Dana di desktop.
Desktop sudah punya pemilih item POK — lihat `#txItem` dan `_cariItem()` di `index.html`,
tiru polanya.

---

## 3. Endpoint yang sudah tersedia (jangan bikin baru bila ini cukup)

| Kebutuhan | Endpoint |
|-----------|----------|
| Data awal (transaksi, saldo, role, pajakRef, fotoMap) | `serverGetDashboard(token)` |
| Sisa pagu per item POK | `serverKetersediaanDana(token)` → `{items:[{kodeItem, uraianItem, akun, uraianAkun, pagu, realisasiSakti, belanjaKas, belumMasukSakti, sisaAman, lebihPagu}], total, belanjaTanpaItem, periode}` |
| Daftar pagu mentah | `serverGetPagu(token)` |
| Simpan transaksi / nota / foto | `serverTambahTransaksi`, `serverTambahNota`, `serverUploadFotoNota` |
| Nota yang pajaknya sudah dipotong | `serverGetNotaPajak(token)` |
| Ganti password / keluar | `serverGantiPassword(token, lama, baru)`, `serverLogout(token)` |
| Identitas instansi untuk cetak | `serverGetInstansi(token)` |

---

## 4. Aturan main tiap sesi

1. Baca `CLAUDE.md` dan dokumen ini dulu. Jangan menelusuri ulang temuan T1–T3.
2. Mulai di branch/worktree baru (`using-git-worktrees`). Branch default repo ini
   `claude/determined-archimedes-od8jtc` — tidak ada `main`.
3. Untuk tugas 2, 4, dan 6: kunci spec lewat `brainstorming` → `writing-plans` dulu,
   baru eksekusi. Tugas 1 dan 3 kecil, kerjakan langsung.
4. **Berhenti dan tanya** bila menemui keputusan domain yang ambigu (definisi
   "belum dipertanggungjawabkan", aturan tarif/ambang pajak, skema kolom baru).
   Jangan menebak diam-diam — ini menyangkut uang negara.
5. Klaim "selesai" wajib berbukti (`verification-before-completion`): tampilkan hasil
   uji yang benar-benar dijalankan, bukan ringkasan niat.
6. Commit kecil dan sering, Conventional Commits Bahasa Indonesia.
7. Sebelum menutup sesi: perbarui papan status di bagian 1 dan catat keputusan penting
   di bagian 5.

---

## 5. Catatan keputusan

Isi saat ada keputusan yang mengikat sesi berikutnya (skema kolom baru, definisi domain
yang disepakati, ambang hari, dsb).

| Tanggal | Tugas | Keputusan |
|---------|-------|-----------|
| 27 Jul 2026 | T1 | Diukur ulang: gagal pada foto ke-5 (bukan 6–9). Penjaga ukuran wajib. |
| 27 Jul 2026 | T2, T3 | Diperiksa ulang di kode — keduanya masih benar dan belum ditambal. |
| 27 Jul 2026 | T1 | **Selesai.** `_prev` tidak lagi ikut disimpan (874→437 KB/foto); `simpanDraft()` mengembalikan boolean dan melaporkan gagal; penjaga 3,5 MB menolak foto sebelum kuota jebol. Uji 12 foto: 8 tersimpan, ke-9 ditolak dengan peringatan, isi FOTOS selalu sama dengan isi draft, jenis nota/barang bertahan setelah muat ulang. Catatan untuk `/kt-2-antrean`: batas 3,5 MB ini hanya penambal — antrean IndexedDB yang akan menghapus batas tersebut. |
| 27 Jul 2026 | Tugas 3 | **Selesai.** Keluar memakai `serverLogout` (menghapus baris sesi, bukan hanya cache) lalu membersihkan token/user/draft di HP. Ganti password otomatis mematikan sesi supaya token lama tidak ikut hidup. `keluar()` untuk sesi kedaluwarsa sengaja TIDAK menghapus draft — pengguna tidak memilih keluar. |

---

## 6. Sengaja tidak dikerjakan

Rekonsiliasi rekening koran/SAKTI, impor pagu, manajemen user, dan layout SPJ **tetap
di desktop**. Memindahkannya ke layar kecil hanya menambah risiko salah input.

---

## 7. Sudah selesai sebelum handoff ini (jangan dikerjakan ulang)

Dikerjakan 27 Jul 2026, sudah di branch default. Papan status di bagian 1 **tidak**
mencakup ini karena bukan bagian dari tugas 1–6.

| Kemampuan mobile | Catatan |
|---|---|
| Edit transaksi | Detail → "✎ Edit transaksi"; kirim keenam kolom yang selalu ditimpa `updateTransaksi`, plus No Kuitansi |
| Tambah / ubah / hapus nota | Layar nota dwi-mode; `serverTambahNota`, `serverUpdateNota`, `serverHapusNotaItem` |
| Foto nota (Bukti A) vs foto barang (Bukti B) | Dipisah di kamera, layar Periksa, dan Detail. Bukti A menempel pada baris nota; Bukti B lewat `serverUploadFotoNota`. **Jangan pakai `serverUploadFotoBarang`** — sheet itu tidak dibaca cetakan SPJ |
| Ganti Bukti A / hapus Bukti B | `serverHapusFotoNota(no, notaId, urutan)` |
| Pajak per nota setara desktop | Tabel 20 kategori kini satu sumber di `CONFIG.PAJAK_REF`, dikirim lewat `serverGetDashboard.pajakRef`. Mobile meniru `hitungPajak()` desktop termasuk ambang PPh/PPN dan penggandaan tarif non-NPWP. Diverifikasi 672 kombinasi, 0 selisih |
| Pindah dana bank ↔ tunai | Layar sendiri + konversi transaksi keluar jadi Pindah Dana (`serverKonversiPindahDana`) |
| Tanda terima 2 salinan per A4 | Atas bendahara, bawah PUM, garis potong di tengah |
| Ikon aplikasi | `assets/`, dipasang lewat `setFaviconUrl` di `doGet` — `addMetaTag` hanya menerima viewport, apple-mobile-web-app-capable, mobile-web-app-capable, google-site-verification; tag lain **menjatuhkan seluruh halaman** |
