# Spesifikasi — Perbaikan Cetakan Tanda Terima Uang Muka / Bukti Transfer

Tanggal: 29 Sep 2026 · Status: **DRAFT — menunggu keputusan pengguna (bagian 6)**
Urutan: dikerjakan **setelah** `2026-09-29-pasangan-foto-nota-design.md`.
Cakupan: dokumen yang dicetak dari tombol **Tanda Terima** / **Bukti Transfer**
(desktop `bukaModalKuitansi` → `_renderKuitansiHtml`; HP `cetakTandaTerima` →
`_htmlTandaTerima`). Kuitansi perjalanan dinas, kuitansi pajak, bukti pengembalian,
dan SPJ **tidak** disentuh kecuali lewat fungsi bersama yang disebut eksplisit.

---

## 1. Keadaan sekarang (hasil telaah kode, commit `7486fa5`)

| # | Temuan | Lokasi | Akibat |
|---|--------|--------|--------|
| T-1 | Tiap salinan dikunci `height:148mm; overflow:hidden`. | `index.html` `_kuitansiCss` (`.page.dua .half`), `mobile.html` `_htmlTandaTerima` (`.half`) | Transaksi dengan banyak item POK / uraian panjang → **blok tanda tangan terpotong tanpa peringatan**. Dokumen tanpa TTD tidak sah. |
| T-2 | Nomor = `'KT-' + ('00'+t.no).slice(-3) + '/' + thn`. | kedua file | Transaksi ≥ 1000 kehilangan digit depan → **nomor kembar** (1234 dan 234 sama-sama `KT-234`). |
| T-3 | Dua implementasi terpisah untuk dokumen yang sama. | `index.html` `_kuitansiIsi`/`_kuitansiDua`/`_kuitansiCss`; `mobile.html` `_htmlTandaTerima` | Sudah menyimpang: kop desktop bertabel + logo, kop HP teks saja; terbilang beda fungsi (`_terbilangTitle` vs `terbilang()+' Rupiah'`); CSS digandakan. Setiap perubahan dikerjakan dua kali (contoh: `7486fa5`). |
| T-4 | Identitas institusi punya dua sumber: `INST` hardcoded di `index.html:1441` dan `CONFIG.INSTANSI` di `_Config.gs:351`. | | Ganti Bendahara/PPK harus diubah di dua tempat; lupa satu → cetakan desktop dan HP beda nama. |
| T-5 | Logo kop (`INST.logoGaruda`) disimpan di `localStorage` per browser. | `index.html:1478` | Logo hanya tampil di komputer yang pernah mengunggahnya; HP tidak pernah punya logo. |
| T-6 | `MATERAI_MIN = 5000000` didefinisikan tapi **tidak dipakai** di mana pun. Komentarnya "≥", sedangkan UU 10/2020 memakai "lebih dari Rp5.000.000". | `index.html:1479` | Tanda terima bernilai besar dicetak tanpa ruang meterai. Lihat keputusan K-4. |
| T-7 | Kolom `NO_SPBY` (22) dan `TGL_SPBY` (23) sudah ada di sheet, tapi tidak dicetak. | `_Config.gs` COLS | Tanda terima tidak tersambung ke berkas GUP (SPP → DRPP → SPBy). |
| T-8 | `Master PUM` hanya berisi `NAMA_PUM, NO_HP, TERAKHIR_DIPAKAI` — tanpa NIP. | `MasterPUM.gs` | NIP PUM belum bisa dicetak tanpa menambah kolom. |

---

## 2. Tujuan

1. Tanda terima **tidak pernah** tercetak dengan blok tanda tangan hilang.
2. Nomor tanda terima **unik** sepanjang tahun anggaran.
3. **Satu sumber** untuk isi, bentuk, dan identitas institusi — desktop dan HP
   menghasilkan dokumen yang identik.
4. Tambahan isi (bagian 4) sesuai keputusan pengguna.

Bukan tujuan: mengubah alur transaksi, format kuitansi lain, atau SPJ.

---

## 3. Rancangan

### 3.1 Satu perender di server (menjawab T-3, T-4, T-5)

- File baru **`TandaTerima.gs`** (didaftarkan di `filePushOrder` `.clasp.json`
  sesudah `Anggaran.gs`). ES5 murni.
- Endpoint baru di `Code.gs`:
  `serverHtmlTandaTerima(token, no, opsi)` → `{ html: String, peringatan: [String] }`.
  - Mengambil transaksi, pembebanan (`Anggaran.getPembebanan`), identitas
    (`CONFIG.INSTANSI`), dan logo dari server — klien tidak merakit apa pun.
  - `opsi` = `{ ppk: Boolean }` (lihat K-3). Tanpa opsi lain.
- Desktop dan HP hanya memanggil endpoint ini lalu membuka hasilnya di jendela
  cetak yang sudah ada (`_bukaPopup` / `_bukaCetak`).
- `_kuitansiIsi` di desktop **tetap ada** karena dipakai kuitansi perjalanan dinas
  dan lampiran SPJ PD; hanya cabang *Tanda Terima* dan *Bukti Transfer* di
  `_renderKuitansiHtml` yang dialihkan. `_htmlTandaTerima` di HP dihapus.
- **Logo:** dipindah dari `localStorage` ke Drive, ID berkasnya disimpan di
  `Settings` (kunci `LOGO_KOP_FILE_ID`), dibaca server lalu disisipkan sebagai
  data-URI. Unggah logo di layar Pengaturan desktop menulis ke sana. Logo lama di
  `localStorage` dipakai **sekali** untuk migrasi otomatis bila Settings masih kosong.
- **`INST` desktop:** bidang yang dipakai tanda terima dibaca dari `CONFIG.INSTANSI`
  (sudah tersedia lewat `serverGetInstansi`). Bidang lain `INST` (SSP, Surat Tugas)
  **tidak** dipindah di pekerjaan ini — dicatat sebagai utang di bagian 7.

Konsekuensi yang diterima: mencetak dari HP butuh sinyal. Ini **sudah** berlaku
sekarang (identitas & pembebanan diambil dari server); bila server gagal, tampilkan
toast "Gagal menyiapkan tanda terima. Periksa sinyal lalu coba lagi." — tidak ada
cetakan cadangan dari data lokal, supaya tidak lahir dokumen yang berbeda isi.

### 3.2 Pagar tinggi halaman (menjawab T-1)

Tidak mengandalkan pengukuran piksel di browser (berbeda antar-HP). Server menghitung
**beban baris** secara deterministik:

```
beban = jumlah item POK
      + ceil(panjang uraian kegiatan / 70)      // perkiraan baris teks
      + (NO_SPBY terisi ? 1 : 0)
      + (blok PPK dicetak ? 2 : 0)
      + (ruang meterai ? 2 : 0)
```

- `beban <= AMBANG_DUA_SALINAN` (nilai awal **8**, dikalibrasi di uji cetak nyata,
  disimpan sebagai konstanta di `TandaTerima.gs`) → mode **2 salinan per A4** seperti sekarang.
- Di atas ambang → mode **1 salinan per halaman, 2 halaman** (Lembar 1 & Lembar 2),
  dan `peringatan` berisi: "Isi terlalu panjang untuk setengah halaman — dicetak
  satu salinan per halaman."
- `overflow:hidden` **dihapus** dari kedua mode. Bila perkiraan meleset, akibatnya
  kertas tambahan — bukan tanda tangan hilang.

### 3.3 Nomor unik (menjawab T-2)

```
nomor = 'KT-' + pad4(t.no) + '/' + thn        // contoh: KT-0234/2026, KT-1234/2026
```

- `pad4` = minimal 4 digit, **tidak memotong** bila lebih panjang.
- Prefiks dan tahun tetap, jadi arsip yang sudah tercetak (`KT-234/2026`) tetap
  bisa dicari dengan membuang nol di depan. Tidak ada migrasi data — nomor tidak
  disimpan di sheet, selalu diturunkan dari `NO`.
- Bukti Transfer memakai pola yang sama (sudah begitu sekarang).

### 3.4 Terbilang

Satu fungsi `terbilang` di `TandaTerima.gs`, keluaran Title Case diakhiri
" Rupiah" tepat satu kali. Uji wajib (bagian 5): 0, 1, 11, 12, 100, 1.000,
1.000.000, 5.000.000, 5.000.001, 1.234.567.890.

---

## 4. Tambahan isi (masing-masing bergantung keputusan di bagian 6)

| Kode | Isi | Sumber data | Catatan |
|------|-----|-------------|---------|
| A-1 | Baris **"Dasar: SPBy Nomor … tanggal …"** | `NO_SPBY`, `TGL_SPBY` | Dicetak hanya bila `NO_SPBY` terisi. Tanpa kolom baru. |
| A-2 | **NIP PUM** di bawah nama penerima | kolom baru `NIP` di `Master PUM` | Kosong → baris NIP tidak dicetak (bukan "NIP. -"). Butuh isian awal data NIP. |
| A-3 | **Blok "Mengetahui, PPK"** | `CONFIG.INSTANSI.ppk/nipPpk` | Sebagai opsi saat cetak (K-3), bukan tetap. |
| A-4 | **Kotak meterai** di atas nama penerima | `jumlah` vs ambang | Lihat K-4. Kotak kosong bertulisan "Meterai Rp10.000", bukan meterai elektronik. |
| A-5 | **Batas pertanggungjawaban** di Lembar 2 (PUM) | tanggal transaksi + N hari | Lihat K-5. Hanya teks pengingat, tidak mengubah status transaksi. |
| A-6 | **MAK lengkap** per item POK (diminta pengguna 29 Sep 2026) — 🟡 **kode selesai** lebih dulu dari bagian lain spec ini: `Anggaran.rincianCetak` + `serverGetRincianCetak`, format `KEGIATAN.RO.AKUN` mengikuti contoh isian MAK yang sudah ada di aplikasi; tanpa item POK → kolom AKUN transaksi; kosong → titik-titik | sheet `Pagu`: `KODE_KEGIATAN`, `KODE_RO`, `KODE_KOMPONEN`, `AKUN`, dicari lewat `KODE_ITEM` | Dicetak di baris "Detail kegiatan (item POK)" menggantikan kolom akun saja, mis. `2376.QDB.001.051.521211`. Lihat K-7 dan K-8. Item tak ketemu di Pagu → cetak akun saja (perilaku sekarang), tanpa galat. |

---

## 5. Verifikasi

GAS tidak bisa di-unit-test otomatis (CLAUDE.md), jadi:

1. **Fungsi murni** (`terbilang`, `pad4`, `hitungBeban`) ditulis tanpa akses Sheets
   dan diuji lewat fungsi `ujiTandaTerima_()` yang dijalankan manual di editor
   Apps Script — keluaran PASS/FAIL per kasus di log.
2. **Uji cetak nyata** setelah `deploy.bat` (tanpa `rilis`), lewat URL `/dev`:
   - transaksi 1 item POK → 2 salinan per A4, TTD utuh;
   - transaksi ≥ 6 item POK + uraian panjang → cek batas ambang, kalibrasi nilai 8;
   - transaksi nomor ≥ 1000 (atau ubah sementara `NO` di salinan sheet uji);
   - Bukti Transfer (sumber BANK);
   - cetak dari **Chrome Android** dan dari **desktop**, bandingkan PDF-nya — harus identik.
3. Verifikasi UI lewat **klik nyata** pada tombol yang dirender, bukan memanggil
   fungsi langsung (pelajaran bug `861f750`, HANDOFF-MOBILE).
4. Baru `deploy.bat rilis` setelah poin 2 lolos.

---

## 6. Keputusan yang dibutuhkan dari pengguna

| # | Pertanyaan | Usulan default |
|---|-----------|----------------|
| K-1 | Setuju perender dipindah ke server (3.1)? | Ya |
| K-2 | Tambahan isi mana yang dipakai: A-1 SPBy, A-2 NIP PUM, A-3 PPK, A-4 meterai, A-5 batas waktu? | A-1 ya; lainnya menunggu jawaban |
| K-3 | Bila A-3 dipakai: blok PPK **opsional saat cetak** atau **selalu**? | Opsional (default tidak dicetak, sesuai keputusan dua-TTD sebelumnya) |
| K-4 | Bila A-4 dipakai: apakah tanda terima uang muka kepada pegawai sendiri di satker ini **diperlakukan sebagai objek bea meterai**? Ambangnya **> Rp5.000.000** (UU 10/2020), bukan ≥. | Perlu konfirmasi Bendahara/praktik satker — tidak diasumsikan oleh aplikasi |
| K-5 | Bila A-5 dipakai: berapa hari batas pertanggungjawaban uang muka yang berlaku di satker? | Diisi pengguna; disimpan di `Settings`, bukan hardcode |
| K-6 | Apakah nomor `KT-0234/2026` (4 digit) diterima, atau ada format penomoran resmi dari Bendahara? | 4 digit |
| K-7 | MAK perlu sampai **subkomponen** (A, B, …)? Impor pagu sekarang **tidak** menyimpan subkomponen, jadi perlu menambah kolom + impor ulang. | Berhenti di komponen dulu; subkomponen menyusul bila diminta |
| K-8 | Transaksi hanya menyimpan `KODE_ITEM` (tanpa RO). Bila satu kode item muncul di lebih dari satu RO/komponen, MAK-nya ambigu. | Diperiksa pada data asli sebelum kode ditulis; bila ambigu, cetak akun saja dan catat di log (menebak MAK lebih berbahaya daripada tidak mencetaknya) |

---

## 7. Di luar cakupan (dicatat, tidak dikerjakan)

- Memindahkan seluruh `INST` desktop (SSP, Surat Tugas, direktur, DIPA) ke
  `CONFIG.INSTANSI`. Tanda terima sudah lepas dari `INST`; sisanya pekerjaan terpisah.
- `MATERAI_MIN` di dokumen lain (kuitansi pajak, SPJ).
- Kuitansi perjalanan dinas masih memakai `_kuitansiIsi` di klien.

## 8. Urutan kerja setelah disetujui

1. `TandaTerima.gs`: `terbilang`, `pad4`, `hitungBeban` + `ujiTandaTerima_()` — commit.
2. Perender HTML server + endpoint `serverHtmlTandaTerima` (mode 2-salinan & 1-salinan) — commit.
3. Alihkan desktop (cabang Tanda Terima/Bukti Transfer) — commit.
4. Alihkan HP, hapus `_htmlTandaTerima` — commit.
5. Logo ke Drive + migrasi sekali dari `localStorage` — commit.
6. Tambahan isi A-x sesuai K-2 — satu commit per item.
7. Uji cetak nyata (bagian 5) → perbarui HANDOFF-MOBILE/DESKTOP → `deploy.bat rilis`.
