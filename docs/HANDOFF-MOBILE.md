# Handoff — Kas Tunai Mobile

Dokumen acuan lintas sesi. Setiap perintah `/kt-*` membaca file ini lebih dulu.
**Perbarui papan status di bawah setiap kali satu tugas selesai.**

**Fokus utama proyek ini: pengelolaan transaksi di HP.** Satu transaksi harus bisa
diurus tuntas dari layar detailnya — tambah/ubah nota, foto nota, foto barang, hitung
pajak, tahu berapa yang boleh diserahkan ke penyedia, catat pengembalian sisa, dan
mencetak bukti-buktinya. Fitur lain (offline, pagu, akun) menyusul setelah inti ini beres.

---

## 1. Papan status

| # | Tugas | Perintah | Status |
|---|-------|----------|--------|
| 1 | Tambal draft foto hilang diam-diam | `/kt-1-draft` | 🟡 kode selesai → c2395b9 |
| **2** | **Neraca transaksi + nilai yang boleh diserahkan** | `/kt-2-neraca` | 🟡 kode selesai → ed4c2a1 |
| **3** | **Kelola nota lengkap (ubah, hapus, foto susulan)** | `/kt-3-nota` | 🟡 kode selesai → 5cde48e |
| **4** | **Pajak per nota: mode bayar & bukti potong** | `/kt-4-pajak` | 🟡 kode selesai → 9cf8655 |
| **5** | **Pengembalian + tanda bukti (kuitansi & BA)** | `/kt-5-kembali` | 🟡 kode selesai → 9d9dd19 |
| 6 | Antrean unggah offline | `/kt-6-antrean` | 🟡 kode selesai → ddbc6b1 |
| 7 | Layar Akun | `/kt-7-akun` | 🟡 kode selesai → e5455ad |
| 8 | Item POK + cek sisa pagu | `/kt-8-pagu` | 🟡 kode selesai → f3a1c88 |
| 9 | Papan PUM belum dipertanggungjawabkan | `/kt-9-pum` | 🟡 kode selesai → 47d256a |
| 10 | Worklist pajak lintas transaksi + setor | `/kt-10-setor` | ⬜ belum |

Status: ⬜ belum · 🟡 jalan · ✅ selesai (sudah diuji di HP) · ⛔ terblokir

> **Dikerjakan 27 Jul 2026, sebelum paket ini dipasang.** Diuji otomatis di Chromium
> lewat jalur asli aplikasi; naikkan ke ✅ setelah dikonfirmasi di HP pasca `deploy.bat`.
> - **Tugas 1** selesai: `_prev` tidak lagi disimpan (874→437 KB/foto), `simpanDraft()`
>   mengembalikan boolean dan melaporkan gagal, penjaga 3,5 MB menolak foto sebelum kuota
>   jebol. Uji 12 foto: 8 tersimpan, ke-9 ditolak, isi FOTOS selalu sama dengan isi draft.
> - **Tugas 3** selesai (5cde48e): termasuk pulihkan nota, alur kamera disatukan,
>   pratinjau sebelum hapus foto, dan penanda nota tanpa Bukti A.
> - **Tugas 7** selesai: layar Akun, ganti password, dan Keluar yang benar-benar
>   menghapus sesi di server (token lama dijawab `SESI_BERAKHIR`).

**Tugas 2–5 adalah inti dan saling bergantung — kerjakan berurutan, jangan diloncat.**
Tugas 1 dulu (kecil, melindungi foto). Sisanya bebas setelah inti beres, kecuali
10 yang menunggu 4.

---

## 2. Rumus neraca transaksi (SUMBER KEBENARAN — jangan ditulis ulang berbeda)

Dipakai bersama oleh tugas 2, 3, 4, dan 5. Semua nilai bilangan bulat rupiah.

### Per nota ke-*i*

```
pajak_i        = pph_i + ppn_i
modeBayar_i    = 'NETTO' | 'BRUTO'          (dipilih bendahara per nota)

NETTO : dibayarKePenyedia_i = nilai_i − pajak_i
        pajakDitarik_i      = pajak_i        ← uang pajak kembali ke bendahara untuk disetor
BRUTO : dibayarKePenyedia_i = nilai_i
        pajakDitarik_i      = 0              ← pajak disetor dari sumber lain
```

`dibayarKePenyedia_i` **inilah "nilai yang boleh diserahkan ke penyedia/toko"** —
angka yang selama ini hanya muncul sekilas sebagai `pjNetto` di layar pajak, tidak
disimpan, dan hilang begitu layar ditutup.

### Per transaksi

```
UM              = uangDiserahkan > 0 ? uangDiserahkan : kredit
ΣNota           = Σ nilai_i
ΣPajak          = Σ pajak_i
ΣDibayar        = Σ dibayarKePenyedia_i
ΣPajakDitarik   = Σ pajakDitarik_i                 (wajib disetor, uangnya sudah di bendahara)
ΣPajakLuarUM    = ΣPajak − ΣPajakDitarik           (wajib disetor, dananya dari sumber lain)
ΣKembaliSisa    = Σ pengembalian berjenis SISA
SisaDiTanganPUM = UM − ΣNota − ΣKembaliSisa
```

### Jebakan yang wajib dihindari

`SisaDiTanganPUM` memakai **ΣNota (bruto)**, bukan ΣDibayar. Alasannya: pada mode NETTO
uang pajak memang tidak sampai ke toko, tapi ia kembali ke bendahara sebagai **titipan
pajak** — bukan sisa uang muka. Kalau titipan pajak ikut tercatat sebagai pengembalian
biasa, angka sisa akan terkurangi dua kali dan transaksi terlihat lunas padahal belum.

Karena itu **sheet `Pengembalian` perlu kolom JENIS** (`SISA` / `TITIPAN_PAJAK`), dan:

- `KEMBALIAN_TOTAL` serta `STATUS_SPJ` di `Pengembalian.gs → _recalc()` **hanya menghitung
  jenis SISA**. Baca ulang fungsi itu sebelum mengubah apa pun — sekarang ia memakai
  `notaTotal + total >= target`.
- Baris `Pengembalian` yang sudah ada (sebelum kolom JENIS lahir) diperlakukan sebagai
  `SISA`.

Status pertanggungjawaban:

```
Lunas  bila ΣNota + ΣKembaliSisa ≥ (nilaiSpby > 0 ? nilaiSpby : UM)
```

---

## 3. Keputusan yang sudah diambil (jangan tanya ulang)

| Topik | Keputusan |
|-------|-----------|
| Perlakuan uang pajak | **Dipilih per nota** — mode NETTO dan BRUTO keduanya harus ada, default NETTO. Mode disimpan per nota. |
| Tanda bukti pengembalian | **Dua format, dipilih saat cetak** — Kuitansi Pengembalian (harian) dan Berita Acara Pengembalian Sisa Uang Muka (formal, diketahui PPK). |
| Identitas & pejabat untuk dokumen | Ambil dari `serverGetInstansi(token)` / `CONFIG.INSTANSI`, jangan hardcode. |
| **Kolom baru (28 Jul 2026)** | `MULTI_NOTA.DIBAYAR_PENYEDIA` — nilai yang diserahkan DISIMPAN, bukan dihitung ulang saat tampil. `MULTI_NOTA.MODE_BAYAR` — kosong = NETTO. `PENGEMBALIAN.JENIS` — kosong = SISA. |
| **Migrasi header** | Kunci `hdr_fixed_*` di `serverGetDashboard` **wajib dinaikkan setiap ada kolom baru**, kalau tidak migrasi dilewati sampai cache 6 jam habis. Sekarang **v9**. |
| **Kolom baru (28 Jul, lanjutan)** | `KAS_TUNAI.CLIENT_ID` — atas persetujuan pengguna, anti-dobel antrean luring; `tambahTransaksi` mengembalikan `duplikat:true` bila penanda sudah pernah tersimpan. |
| **Format kode item POK** | Tepat 6 digit angka (`\d{6}`, lihat `_apItemCell` di index.html) — BUKAN format bertitik ala `2360.QDB.001.051.A`. Pemilih HP menyaring karakter sama seperti `_cariItem()` desktop. |
| **Kolom baru (28 Jul, tugas 9)** | Sheet baru `MASTER_PUM` (`NAMA_PUM`, `NO_HP`, `TERAKHIR_DIPAKAI`) — pola identik `MasterPenyedia.gs`. Nomor HP hanya diminta sekali, saat pertama kali menagih. |
| **Ambang hari papan PUM** | `AMBANG_HARI_PUM = {perhatian:7, mendesak:14}` di `mobile.html` — satu konstanta, jangan diketik ulang. |
| **hitungNeraca() mode ringkas** | `notas === null` (bukan `[]`) → ΣNota diambil dari `t.notaTotal` alih-alih menjumlah array nota. Dipakai papan PUM yang menyapu banyak transaksi tanpa memuat detail nota tiap satu. Sama fungsi, sama rumus — hanya sumber datanya beda, mengikuti pola `kmb=null` yang sudah ada. |
| Status hijau saat sisa negatif | **Ditahan.** Rumus `lunas` di bagian 2 tetap apa adanya, tetapi panel menampilkan 'Periksa dulu — nota melebihi uang muka'. Lampu hijau di atas keadaan janggal berbahaya. |
| Pajak setelah nilai nota diubah | **Tidak dihitung ulang otomatis** — tarif dan kategori keputusan bendahara. Aplikasi hanya memberi peringatan tegas untuk meninjau ulang. |

---

## 4. Kondisi kode saat ini (sudah diverifikasi — jangan telusuri ulang)

### Sudah ada dan jalan

- Tambah nota dari HP: `bukaNotaBaru()` + `ntSisa()` (menampilkan uang muka, sudah bernota, sisa).
- Foto nota & foto barang saat membuat nota baru: `ntAmbil('nota'|'barang')`.
- Kamera dengan segmen nota/barang di alur catat: `setFotoJenis()`, `renderKamera()`.
- Pajak per nota: `bukaPajak()`, `hitungPajak()` (salinan mesin desktop, termasuk ambang
  batas, non-NPWP ×2 hanya untuk PPh 22 & 23), `simpanPajak()` → `serverSimpanPajakNota`.
- Pengembalian: `bukaPengembalian()` menghitung wajib kembali; `serverTambahPengembalian`
  otomatis membuat transaksi masuk dan menautkannya (`REF_MASUK_NO`).
- Cetak Tanda Terima penyerahan uang muka: `cetakTandaTerima()` + `_htmlTandaTerima()`.

### Belum ada / putus

| Kebutuhan | Kondisi sekarang |
|-----------|------------------|
| Nilai yang boleh diserahkan ke penyedia | Dihitung di `hitungPajakUI()` sebagai `pjNetto`, **tidak disimpan**, tidak muncul di detail transaksi maupun daftar nota |
| Ringkasan uang satu transaksi | Tidak ada. `detailKepala()` hanya menampilkan nilai transaksi, tanpa Σ nota / Σ pajak / Σ dibayar / sisa |
| Ubah & hapus nota dari HP | ~~Tidak ada UI~~ → **sudah ada** (`bukaNotaUbah()`, `hapusNota()`, 8f4acf0). `serverRestoreNota` masih belum dipakai |
| Tambah/hapus foto pada nota yang sudah tersimpan | ~~Tidak ada UI~~ → **sudah ada** (ganti Bukti A, hapus Bukti B lewat `ntHapusFotoServer()`, 8f4acf0) |
| Foto barang susulan setelah transaksi tersimpan | Belum ada UI. **JANGAN pakai `serverUploadFotoBarang`** — ia menulis ke sheet `Foto Barang`, sedangkan `getSpjData()` hanya membaca `Foto Nota`, jadi fotonya tidak akan muncul di cetakan SPJ. Pakai `serverUploadFotoNota(no, notaId, arr)` seperti versi desktop |
| Mode bayar netto/bruto per nota | Belum ada sama sekali (kolom baru) |
| Koreksi/hapus pengembalian dari HP | Tidak ada UI, padahal `serverHapusPengembalian`, `serverRestorePengembalian` **sudah ada** |
| Tanda bukti pengembalian | **Tidak ada.** `cetakTandaTerima()` hanya untuk penyerahan uang muka |
| Bukti potong pajak per nota | Tidak ada |
| Draft foto di localStorage | ~~Bug aktif~~ → **sudah ditambal** (c2395b9), lihat bagian 5 |
| Antrean unggah offline | Masih `belumSiap()` (tugas 6) |
| Layar Akun | ~~`belumSiap()`~~ → **sudah ada** (e5455ad) |
| `kodeItem` dari HP | Tidak pernah dikirim → belanja HP tidak mengurangi pagu (tugas 8) |

---

## 5. Draft foto hilang diam-diam — SUDAH DITAMBAL (c2395b9)

`simpanDraft()` menyimpan seluruh `FOTOS` ke localStorage. Tiap foto membawa **dua**
salinan gambar: `base64` dan `_prev` (data URL hasil `kompres()`). Satu foto 1280px q0.7
≈ 200–450 KB → dobel ≈ 0,5–0,9 MB. Kuota localStorage 5 MB, jadi draft gagal disimpan
mulai foto ke-6 s.d. ke-9. `try{...}catch(e){}` menelan `QuotaExceededError` tanpa suara,
lalu tetap menulis "Draft tersimpan otomatis di perangkat" ke `#ctDraftInfo`.

**Diukur ulang 27 Jul 2026 di Chromium, ternyata lebih parah:** satu objek foto
1.153 KB, `QuotaExceededError` muncul pada **foto ke-5** (bukan ke-6…9). Dari 12 foto,
hanya 5 yang selamat setelah tab ditutup-buka.

Sudah ditambal di c2395b9. **Batas 3,5 MB itu penambal, bukan penyelesaian** — yang
menghapus batas adalah antrean IndexedDB di tugas 6.

---

## 6. Endpoint yang sudah tersedia

| Kebutuhan | Endpoint |
|-----------|----------|
| Data awal (transaksi, saldo, role, `pajakRef`, `fotoMap`) | `serverGetDashboard(token)` |
| Nota satu transaksi | `serverGetMultiNota(token, no)`, `serverGetNotaDanFoto(token, no)` |
| Tambah / ubah / hapus / pulihkan nota | `serverTambahNota`, `serverUpdateNota`, `serverHapusNotaItem`, `serverRestoreNota` |
| Foto nota | `serverGetFotoNota`, `serverUploadFotoNota`, `serverHapusFotoNota` |
| Foto barang | `serverUploadFotoBarang(token, no, fotoArr)` |
| Pajak per nota | `serverSimpanPajakNota(token, no, urutan, d)`, `serverGetNotaPajak(token)` |
| Pengembalian | `serverGetPengembalian`, `serverTambahPengembalian`, `serverHapusPengembalian`, `serverRestorePengembalian` |
| Data SPJ satu transaksi | `serverGetSpjData(token, no)` |
| Penyedia | `serverGetAllPenyedia`, `serverCariPenyedia`, `serverSimpanPenyedia` |
| Sisa pagu per item POK | `serverKetersediaanDana(token)` |
| Identitas & pejabat | `serverGetInstansi(token)` |
| Ganti password / keluar | `serverGantiPassword`, `serverLogout` |

---

## 7. Aturan main tiap sesi

1. Baca `CLAUDE.md` dan dokumen ini dulu. Jangan menelusuri ulang temuan di bagian 4–5.
2. Mulai di branch/worktree baru (`using-git-worktrees`). Jangan bekerja di `main`.
3. Untuk tugas 2–5: kunci spec lewat `brainstorming` → `writing-plans` dulu. Tugas 1 dan 7
   kecil, kerjakan langsung.
4. **Rumus di bagian 2 adalah satu-satunya sumber kebenaran.** Bila sebuah tugas menuntut
   rumus berbeda, ubah bagian 2 lebih dulu dan sebutkan alasannya — jangan menaruh varian
   rumus di dalam kode.
5. **Berhenti dan tanya** untuk keputusan domain yang belum tercatat di bagian 3.
   Jangan menebak diam-diam — ini menyangkut uang negara.
6. Menambah kolom sheet: daftarkan di `_Config.gs`, pastikan `SheetRepo.ensureHeaders()`
   mengisinya, dan pastikan baris lama tetap terbaca (nilai kosong = default yang aman).
7. Klaim "selesai" wajib berbukti (`verification-before-completion`).
8. Sebelum menutup sesi: perbarui papan status di bagian 1 dan catat keputusan baru di
   bagian 3.

---

## 8. Sengaja tidak dikerjakan di HP

Rekonsiliasi rekening koran/SAKTI, impor pagu, manajemen user, pemecahan transaksi, dan
layout SPJ **tetap di desktop**. Memindahkannya ke layar kecil hanya menambah risiko
salah input.
