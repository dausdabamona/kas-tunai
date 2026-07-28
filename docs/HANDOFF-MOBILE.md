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
| 10 | Worklist pajak lintas transaksi + setor | `/kt-10-setor` | 🟡 kode selesai → 861f750 |
| 11 | Kartu transaksi interaktif — Fase 1/4 (lihat bagian 9) | *(belum ada perintah)* | 🟡 kode selesai → *(commit setelah Task 1-3 plan ini)* |

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

> **BUG KRITIS ditemukan dan diperbaiki 28 Jul 2026 (commit 861f750) — DEPLOY SEGERA.**
> `onclick="fn(' + JSON.stringify(String(x)) + ')"` menghasilkan kutip GANDA di
> dalam atribut HTML berkutip ganda, memotong markup dan membuat tombol sama
> sekali tidak bereaksi saat diketuk. Dipakai 13 kali di `mobile.html`,
> **termasuk `barisTx()` yang dipakai sejak Tahap 1** untuk membuka transaksi
> dari daftar. Ditemukan lewat verifikasi klik NYATA (bukan memanggil fungsi
> langsung) setelah laporan pengguna "belum bisa buka transaksi" pada layar
> papan PUM baru. Semua 13 pemakaian sudah diganti helper `aq()` (kutip
> tunggal) dan diuji ulang via klik sungguhan.
>
> **Pelajaran metodologi**: verifikasi otomatis di seluruh sesi ini (tugas
> 1–9) memanggil fungsi JS langsung lewat `page.evaluate(() => fn(...))`,
> TIDAK PERNAH via `page.click()` pada elemen yang benar-benar dirender. Itu
> membuktikan LOGIKA benar tapi tidak membuktikan MARKUP-nya valid. Sesi
> berikutnya: verifikasi UI wajib lewat klik nyata pada HTML yang dirender,
> bukan hanya pemanggilan fungsi.

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
| **Kolom baru (28 Jul, tugas 10)** | `MULTI_NOTA.SETOR_STATUS` / `SETOR_TANGGAL` / `SETOR_NTPN`. `CONFIG.BATAS_SETOR_TANGGAL = 10` — tanggal 10 bulan berikutnya, SATU konstanta untuk semua jenis pajak, dikonfirmasi pengguna (bukan ditebak).
| **getSemuaNota() vs getNotaPajak()** | `getNotaPajak()` (lama, dipakai desktop mencetak) HANYA mengembalikan nota terpotong pajak — kontraknya TIDAK diubah. `getSemuaNota()` (baru) mengembalikan SEMUA nota, dengan atau tanpa pajak, untuk worklist tugas 10.
| **Helper `aq()`** | Wajib dipakai untuk SEMUA argumen string/angka di dalam `onclick="..."`/`onchange="..."` — jangan pernah `JSON.stringify()` di situ (lihat bug kritis di atas). |
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

---

## 9. Kartu transaksi interaktif — Fase 1 dari 4 (✅ DESAIN LENGKAP — siap `writing-plans`)

Permintaan pengguna 28 Jul 2026: *"aplikasi mobile agar dibuat interaktif bukan hanya
daftar."* Cakupannya awalnya 4 area × 4 pola interaksi — terlalu besar untuk satu
putaran desain, jadi dipecah jadi 4 fase independen, masing-masing lewat siklus
brainstorming → writing-plans sendiri:

1. **Kartu transaksi + aksi geser** ← fase ini, desain LENGKAP (Bagian 1–5/5), siap `writing-plans`.
2. Beranda — kartu ringkas lebih hidup (animasi angka, susunan menyorot urgensi)
3. Layar Antrean & status kirim — indikator hidup, animasi saat item terkirim
4. Alur Catat/Kamera/Pajak — transisi halus antar langkah

**Fase 2–4 belum dibahas sama sekali.** Jangan mulai sebelum Fase 1 disepakati, dikerjakan,
dan sempat dipakai — supaya polanya (warna, ambang gestur, gaya animasi) sudah teruji
sebelum ditiru ke fase berikutnya.

### Keputusan Fase 1 yang sudah terkunci (lewat `AskUserQuestion`, jangan tanya ulang)

| Topik | Keputusan |
|-------|-----------|
| Cakupan layar | Daftar Transaksi **penuh** saja. Beranda (3 kartu ringkas) TIDAK ikut — ruang kartu di situ sempit, tujuannya sekilas info, bukan bekerja. |
| Aksi saat kartu digeser (urutan prioritas) | 1. `+ Tambah nota` — selalu berlaku, tidak perlu tahu nota mana. 2. `Tagih` — **hanya bila** `hitungNeraca(t, null, null).sisaPUM > 0` (pakai fungsi & mode ringkas tugas 9 apa adanya, jangan tulis ulang). 3. `Tanda Terima` / `Bukti Transfer` — reuse `cetakTandaTerima()`. 4. `Pengembalian` — reuse `bukaPengembalian()`. |
| Ketuk kartu (bukan digeser) | **Tidak berubah** — tetap langsung `bukaDetail(no)`, TANPA perluas-di-tempat (accordion ditolak). Geser dan ketuk dua gestur terpisah yang tidak tumpang tindih. |
| Pendekatan teknis | **Sentuh manual** (`touchstart`/`touchmove`/`touchend`, `transform:translateX()` GPU-accelerated) — BUKAN CSS scroll-snap. Alasan yang disepakati: perilaku lebih bisa diprediksi lintas versi Chrome Android, dan konsisten dengan gaya ES5 murni (`var`, tanpa arrow/const/let) yang sudah dipakai di seluruh `mobile.html` — dicek eksplisit, 0 pemakaian ES6+ di file itu. |
| Haptic | Ya — `navigator.vibrate(~15ms)` singkat saat kartu terkunci terbuka penuh, dan saat aksi selesai. **Bukan** tiap sentuhan. Wajib dibungkus feature-detect (`if (navigator.vibrate)`), tidak semua browser mendukung. |
| Kartu terbuka sekaligus | Hanya **satu**. Membuka kartu lain otomatis menutup yang sebelumnya. |

### Bagian 1 — Struktur kartu & mekanika geser (✅ dikonfirmasi)

```html
<div class="rowWrap">
  <div class="rowActions">
    <button class="ra ra-nota">+ Nota</button>
    <button class="ra ra-tagih">Tagih</button>      <!-- kondisional, lihat tabel di atas -->
    <button class="ra ra-tt">Tanda Terima</button>
    <button class="ra ra-kembali">Kembali</button>
  </div>
  <div class="rowCard">...isi kartu yang sudah ada, TANPA onclick...</div>
</div>
```

- `rowCard` digeser lewat `transform:translateX()` (GPU-accelerated), **bukan**
  `left`/`margin` — supaya tetap mulus di Android murah.
- `rowCard` **bukan lagi `<button>`**. Navigasi ke Detail ditangani logika sentuh
  (`bukaDetail(no)` dipanggil langsung dari JS saat terdeteksi ketuk), bukan `onclick` —
  sekaligus menutup celah bug tanda kutip (lihat peringatan bug kritis di bagian 1) untuk
  elemen ini secara struktural, bukan cuma ditambal.
- Ambang ketuk-vs-geser: gerakan horizontal **< 10px** saat `touchend` → dianggap ketuk.
  **≥ 10px** → geser sungguhan, kartu mengunci ke posisi terbuka/tertutup dengan transisi
  CSS ~180ms.
- `touch-action:pan-y` pada `.rowWrap` supaya gulir vertikal daftar Transaksi tidak
  terganggu saat pengguna sebenarnya cuma ingin scroll, bukan menggeser kartu.

### Bagian 2 — Perilaku tiap aksi (✅ dikonfirmasi)

Keempat aksi langsung memanggil fungsi yang **sudah ada**, tanpa animasi/layar antara —
sama seperti tombol yang sudah ada di layar Detail sekarang:

| Aksi | Panggilan | Catatan |
|---|---|---|
| `+ Tambah nota` | `bukaNotaBaru(no)` | Pindah layar penuh ke `scNota` |
| `Tagih` | `tagihPum(no)` | Apa adanya, **termasuk** `prompt()` bawaan browser untuk nomor HP saat pertama kali menagih PUM itu — disetujui eksplisit, bukan dianggap mengganggu |
| `Tanda Terima` / `Bukti Transfer` | `cetakTandaTerima(no)` | Buka tab cetak baru, tidak pindah layar |
| `Pengembalian` | `bukaPengembalian(no)` | Pindah layar penuh ke `scKembali` |

### Bagian 3 — Visual: warna & ikon (✅ dikonfirmasi)

Dipilih dari token & ikon yang **sudah dipakai** di aplikasi, tidak ada yang baru kecuali
`ph-printer` (belum pernah dipakai, tapi cocok secara makna):

| Aksi | Warna latar | Ikon | Alasan |
|---|---|---|---|
| `+ Tambah nota` | `--ac` (teal utama) | `ph-note-pencil` | Sama dengan tombol "Catat pengeluaran" — aksi paling primer |
| `Tagih` | `--a2` (magenta) | `ph-bell-ringing` | Magenta = warna urgensi, sudah dipakai di `.pumRow.mendesak` & banner peringatan |
| `Tanda Terima` / `Bukti Transfer` | `--ac7` (teal gelap) | `ph-printer` | Satu-satunya ikon baru di fase ini |
| `Pengembalian` | `--n700` (netral) | `ph-arrow-u-down-left` | **Ikon yang sama persis** dengan tombol "Pengembalian" di kartu aksi cepat Beranda |

Teks putih di atas warna latar, ukuran sentuh ≥44px.

### Bagian 4 — Kasus tepi & penanganan galat (✅ dikonfirmasi)

- **Transaksi masuk (debet, `!isKeluar(t)`): geser DIMATIKAN TOTAL, bukan ditampilkan
  kosong.** Ditelusuri satu per satu: `+ Tambah nota`, `cetakTandaTerima()`, dan
  `bukaPengembalian()` semuanya menghitung dari `kredit` (uang keluar); `Tagih` sudah
  pasti hanya untuk pengeluaran. Tidak ada satu pun dari keempat aksi yang relevan untuk
  transaksi masuk, jadi `rowActions` **tidak dirender sama sekali** untuk kartu jenis ini
  (bukan cuma disembunyikan sebagian).
- **Kartu menutup segera setelah tombol aksi diketuk**, tanpa menunggu hasil
  berhasil/gagal dari aksinya. Mencegah kartu "nyangkut" terbuka saat pengguna kembali
  dari tab WhatsApp (`Tagih`) atau tab cetak (`Tanda Terima`).
- **Menggulir daftar menutup kartu yang sedang terbuka.**
- **Pindah Dana**: sudah tersaring dari `TX` sejak `muat()` (`bukanPindahDana`) — tidak
  perlu penanganan baru.
- **Luring**: tidak perlu penanganan baru — layar tujuan (`scNota`, `scKembali`, dst.)
  sudah menangani kondisi luring sendiri, sama seperti saat dibuka lewat tombol biasa.
- Aplikasi mobile **tidak** membedakan transaksi Perjalanan Dinas (`suratMap` tidak
  pernah dikirim/dibaca di `mobile.html`, beda dari desktop) — bukan kasus baru yang
  perlu ditangani fase ini, perilakunya sama dengan tombol "+ Tambah nota" yang sudah
  ada sekarang di layar Detail.

### Bagian 5 — Rencana uji (✅ dikonfirmasi, WAJIB dibaca sebelum menulis kode)

Implementasinya memakai `touchstart`/`touchmove`/`touchend`, **bukan** `onclick`/`click`
untuk gestur geser. Verifikasi karena itu **wajib** mengirim event sentuh sintetis lewat
`page.evaluate()` (`new Touch()` + `new TouchEvent()` dengan `touches`/`changedTouches`
berisi `clientX`/`clientY`) — `page.click()` biasa **tidak** memicu handler sentuh sama
sekali dan akan memberi rasa aman yang palsu.

Skenario wajib dibuktikan sebelum diklaim selesai:

1. Geser ≥10px pada kartu pengeluaran → panel aksi muncul, `bukaDetail()` **tidak** terpanggil
2. Geser <10px lalu lepas → dihitung ketuk, `bukaDetail(no)` tetap terpanggil (regresi)
3. Membuka kartu kedua otomatis menutup kartu pertama
4. Ketuk tiap tombol aksi → fungsi yang benar terpanggil **dan** kartu langsung menutup
5. Kartu transaksi masuk — tidak ada `rowActions` sama sekali di DOM
6. `Tagih` hanya muncul saat `hitungNeraca(t,null,null).sisaPUM > 0`
7. `navigator.vibrate` terpanggil pada dua titik yang benar; tidak error saat API itu
   tidak tersedia
8. Menggulir daftar menutup kartu yang sedang terbuka
9. Pemindaian `onclick`/`onchange` menyeluruh (pola tugas 10) — keempat tombol aksi baru
   memakai `aq()`, bukan `JSON.stringify()`

### Status: kode selesai, siap uji manual di HP
Kelima bagian disetujui bertahap oleh pengguna lewat `AskUserQuestion` (28 Jul 2026). Rencana implementasi:
`docs/superpowers/plans/2026-07-28-kartu-transaksi-geser.md` — 5 tugas, semua 9 skenario Bagian 5 lolos verifikasi
Playwright (event sentuh sintetis). Langkah berikutnya: `clasp push` ke deployment uji + uji manual gestur geser
di Chrome Android sungguhan sebelum `deploy.bat` ke produksi (event sentuh sintetis Playwright tidak menggantikan
uji jari sungguhan di perangkat low-end).
