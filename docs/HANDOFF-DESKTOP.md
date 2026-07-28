# Handoff — Kas Tunai Desktop

Dokumen acuan lintas sesi untuk pekerjaan **desktop** (`index.html`), setara
`docs/HANDOFF-MOBILE.md` tapi untuk layar besar (1440px). Sumber: paket desain
`Kas_Tunai_Mobile_App.zip` yang sama dengan yang dipakai membangun mobile — bagian
mobile-nya (10 layar, Bagian I) sudah selesai lewat `/kt-1` … `/kt-11`; **dokumen ini
mengurus Bagian II (redesain desktop rail-nav) dan Bagian III (Pencocokan Pagu &
Realisasi / GLP039)** dari paket yang sama, diunggah ulang 28 Jul 2026.

**Belum ada satu baris kode pun dikerjakan untuk isi dokumen ini.** Semua di bawah
adalah ringkasan desain + gap analysis terhadap kode desktop yang ada sekarang.
**Perbarui papan status di bawah setiap kali satu tugas selesai** — ikuti pola
`/kt-*` di mobile: brainstorming → writing-plans → subagent-driven-development
untuk setiap tugas non-trivial.

---

## 1. Papan status

| # | Tugas | Perintah | Status |
|---|-------|----------|--------|
| 1 | Kerangka rail-nav (menggantikan tab atas) | *(belum ada perintah)* | 🟡 kode selesai → f89dd42 (markup+CSS 2476395, perbaikan sticky-nav & banner mobile f89dd42; verifikasi klik nyata 8/8 lolos; belum diuji manual di browser sungguhan) |
| 2 | Layar Papan kerja (dashboard) | *(belum ada perintah)* | ⬜ belum |
| 3 | Layar Transaksi + panel detail kanan (redesain) | *(belum ada perintah)* | ⬜ belum |
| 4 | Layar Perjalanan dinas (redesain) | *(belum ada perintah)* | ⬜ belum |
| 5 | Layar Rekonsiliasi (redesain) | *(belum ada perintah)* | ⬜ belum |
| 6 | Layar Laporan & cetakan (redesain) | *(belum ada perintah)* | ⬜ belum |
| 7 | Parser GLP039 di klien (FileReader + unzip xlsx) | *(belum ada perintah)* | ⬜ belum |
| 8 | Sheet `PAGU_POK` + `PAGU_UPLOAD`, endpoint pencocokan | *(belum ada perintah)* | ⬜ belum |
| 9 | Layar Pagu & realisasi: tab Pencocokan (tabel pohon) | *(belum ada perintah)* | ⬜ belum |
| 10 | Layar Pagu & realisasi: tab Selisih & tindakan | *(belum ada perintah)* | ⬜ belum |
| 11 | Layar Pagu & realisasi: tab Unggah GLP039 | *(belum ada perintah)* | ⬜ belum |

Status: ⬜ belum · 🟡 jalan/kode selesai · ✅ selesai (sudah diuji) · ⛔ terblokir

**Urutan disarankan**: 1 dulu (kerangka rail-nav — semua layar lain menumpang di
sini), lalu 2-6 bisa berurutan bebas, 7-8 (fondasi data GLP039) sebelum 9-11 (layar
yang memakainya). Tugas 7-11 **tidak bergantung** pada 1-6 secara teknis (bisa
duluan), tapi secara UX akan aneh punya "Pagu & realisasi" versi baru di dalam
kerangka tab lama — kerjakan 1 dulu kalau sumber daya terbatas.

---

## 2. Keputusan yang sudah dijawab pengguna (28 Jul 2026)

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Tab lama diganti total atau berdampingan dengan rail-nav? | **Diganti total.** Tab atas (`index.html:269-274`, `switchTab`) dibongkar, rail-nav 6-layar jadi satu-satunya kerangka navigasi desktop. |
| 2 | Sistem pagu lama (`serverImporPagu`/`serverGetPagu`/`serverKetersediaanDana`, tugas 8) digantikan `PAGU_POK`/`PAGU_UPLOAD`, atau berdampingan? | **Digantikan.** Sistem lama tidak dipertahankan berdampingan — `PAGU_POK`/`PAGU_UPLOAD` (hierarki 8 level, versi unggahan, pencocokan SAKTI) jadi satu-satunya sumber kebenaran pagu. Endpoint lama (`serverImporPagu`/`serverGetPagu`/`serverKetersediaanDana`) perlu rencana migrasi/penghapusan saat tugas 7-8 (bagian 4) dikerjakan — jangan biarkan dua sistem pagu hidup berdampingan tanpa batas waktu. |
| 3 | Field "Item POK" mobile (tugas 8) dipetakan ke sistem GLP039 baru, atau tetap independen? | **Ikuti/dipetakan ke sistem baru** — konsisten dengan keputusan #2 (satu sistem pagu, bukan dua). Saat tugas 7-8 desktop selesai, field "Item POK" di mobile perlu disambungkan ulang ke `KODE_ITEM`/endpoint versi GLP039, menggantikan jalur lama. Ini pekerjaan **lintas mobile-desktop** — dampaknya harus dicatat di `docs/HANDOFF-MOBILE.md` juga saat dikerjakan, bukan cuma di sini. |
| 4 | Siapa berwenang mengunggah GLP039? | **Ditunda** — diputuskan terpisah setelah alur unggah (tugas 11) sungguhan dicoba, bukan diputuskan di muka. Tugas 11 (layar Unggah GLP039) boleh dikerjakan tanpa jawaban ini dulu; jangan tambah logika approval/pembatasan peran sebelum diminta eksplisit. |

**Konsekuensi dari #2/#3 terhadap urutan pengerjaan** (lihat juga bagian 1, papan
status): tugas 7-8 (fondasi `PAGU_POK`) sekarang **wajib** disertai rencana migrasi
dari sistem lama, bukan sekadar fitur tambahan — cakupannya lebih besar dari yang
tertulis semula di papan status. Bahas ini eksplisit saat brainstorming tugas 7-8,
jangan dianggap otomatis dari catatan ini saja.

---

## 3. Ringkasan desain — Bagian II: Desktop 1440px (rail-nav)

Sumber: `Kas Tunai Desktop.dc.html` dalam paket desain (prototipe `.dc.html`,
markup/ukuran/warna/alur mengikat, sintaks `<x-dc>`/`<sc-if>`/`<sc-for>` diabaikan —
itu cuma alat prototipe). Bahasa visual identik desain mobile 1a (design system
**Broadsheet**, lihat `docs/HANDOFF-MOBILE.md` untuk token warna yang sudah dipakai
di `mobile.html`) — desktop **memakai token yang sama persis**, jangan menambah
warna baru.

### Kerangka
- **Rail kiri** 236px, `--color-neutral-200` (`#eae7e7`), padding `24px 18px`.
  - Merek "Kas Tunai" 22px/600 + "Poltek KP Sorong · TA 2026" 12px.
  - Menu: pil radius 999px, min-height 42px; aktif = isi `--color-accent` (`#0088b0`)
    putih 600; lencana angka pil magenta (`#d6006c`) — di menu aktif jadi putih 25%
    transparan.
  - Bawah rail: banner antrean magenta radius 16px + avatar bulat 36px inisial.
- **Bar atas** tinggi ~58px, garis bawah `1px --color-neutral-300` (`#d7d3d3`):
  kolom cari pil netral (maks 420px), pemilih periode, tombol utama
  "Catat transaksi" (pil accent).
- **Area konten** `overflow:auto`, padding `26px 28px 36px`. Judul halaman 28px/600 +
  subjudul 14px neutral-700 (`#605d5d`), aksi kanan atas berupa pil.
- **Kartu statistik** `flex:1`, radius 20px, padding `20px 22px`; satu kartu per
  layar memakai isi `--color-accent` putih (kartu terpenting), sisanya
  `--color-neutral-200`.
- **Tabel**: header 11px uppercase `letter-spacing .1em` neutral-600 dengan garis
  bawah `2px solid --color-text` (`#201e1d`); baris `1px --color-neutral-200`;
  baris terpilih radius 14px isi `--color-accent-100` (`#e9f8ff`); baris bermasalah
  isi `--color-accent-2-100` (`#fff1f4`). Angka rupiah rata kanan, `--font-heading`
  600 (Source Serif 4).
- **Panel detail kanan** 404–408px, isi `--color-neutral-200`, `overflow:auto`.

### 6 layar
1. **Papan kerja** (dashboard, layar pertama/beranda desktop) — 4 kartu statistik,
   daftar "Menunggu tindakan Anda", bar serapan per akun (bar tinggi 8px radius
   999px, isi >80% jadi magenta), panel kanan: antrean unggah (magenta), kotak
   masuk scan, catatan batas setor pajak.
2. **Transaksi** — chip filter + tabel 5 kolom (No/Tgl, Uraian & penyedia, Status,
   Bukti, Nilai) dan panel detail kanan (meta, strip foto 68px, blok hitung pajak,
   aksi SPBY/pengembalian/kuitansi). **Ini redesain dari tab "Transaksi" yang sudah
   ada** — fungsi-fungsi backend (`server*` untuk transaksi, nota, SPBY, dst) sudah
   ada semua, ini murni pekerjaan tampilan + reorganisasi panel.
3. **Pagu & realisasi** — lihat bagian 4 di bawah (Bagian III desain).
4. **Perjalanan dinas** — form surat tugas (grid 3 kolom, field bergaris bawah),
   tabel pelaksana, panel kanan: kartu accent total uang muka, rincian biaya riil,
   blok "Wajib dikembalikan" (angka magenta). **Redesain dari tab "Perjalanan
   Dinas"** yang sudah ada (`SuratTugas.gs`).
5. **Rekonsiliasi** — kas tunai vs SAKTI, 4 kartu statistik, tabel dengan baris
   selisih disorot. **Redesain dari tab "Rekonsiliasi"** yang sudah ada
   (`Rekonsiliasi.gs`) — **beda dari pencocokan pagu Bagian III**: ini
   rekonsiliasi rekening koran/SAKTI transaksi-per-transaksi (sudah ada), bukan
   pencocokan pagu-vs-realisasi (baru).
6. **Laporan & cetakan** — grid 3×2 kartu keluaran (SPBY, DRPP, BKU, rekap pajak,
   berkas SPD, ekspor CSV) + daftar cetakan terakhir. Redesain dari tab "Laporan".

Detail lengkap tiap layar (ukuran persis, warna, tipografi) ada di README asli
paket desain (`design_handoff_kas_tunai_mobile/README.md`, Bagian II) dan prototipe
`Kas Tunai Desktop.dc.html` — **file-file ini tidak disalin ke repo**, minta
pengguna mengunggah ulang paketnya bila dibutuhkan di sesi berikutnya (sama seperti
paket mobile yang jadi rujukan `docs/HANDOFF-MOBILE.md` juga tidak disalin ke repo).

---

## 4. Ringkasan desain — Bagian III: Pencocokan Pagu & Realisasi (GLP039)

**Fitur baru, jauh lebih detail dari sistem pagu yang sudah ada (lihat tabel gap di
bawah).** Mencocokkan pagu DIPA/POK (dari file SAKTI) dengan realisasi tercatat di
Kas Tunai, per level hierarki anggaran.

### Sumber data & parser
- File **GLP039 — Laporan Ketersediaan Dana Detail** (Excel dari SAKTI). Contoh
  terverifikasi: `contoh-data/glp039-baris-terbaca.txt` dalam paket desain (410
  baris, Poltek KP Sorong Juli 2026) — **tidak disalin ke repo**, ada di paket zip
  yang diunggah pengguna.
- Karakteristik wajib ditangani parser:
  - Satu sheet `GLP039_LAPORAN REALISASI SUPER ` (ada spasi di akhir nama sheet).
  - **Tidak ada `sharedStrings.xml`** — semua teks `t="inlineStr"` dengan
    `<is><r><t>`. Parser harus baca inline string.
  - Angka disimpan float notasi ilmiah (`2.037392E10`) — pakai `parseFloat`.
  - Baris 1–6 judul/identitas satker; baris 7–8 header dua tingkat; data mulai
    **baris 9**. Baris 9 = `JUMLAH SELURUHNYA` (total satker).
  - Baris sisipan catatan kaki bisa muncul di tengah data — abaikan baris tanpa
    nilai di kolom Q.
  - Berkas asli bisa terpecah banyak segmen halaman; header bisa berulang.
- **Parsing di KLIEN (browser), bukan Apps Script**: baca `File` dengan
  `FileReader`, unzip, tarik `xl/worksheets/sheet1.xml`, parse `<row>`/`<c
  t="inlineStr">`. Alasan: hindari mengirim xlsx ~700 KB ke `google.script.run`
  (batas payload + waktu eksekusi GAS). Kirim ke server **hanya hasil ringkas**:
  array item POK `{program, kegiatan, kro, ro, komponen, subkomponen, akun, item,
  uraian, pagu, lock, realLalu, realIni, realSd}`.

### Hierarki (kode di satu kolom, uraian di kolom lain)
| Level | Kolom kode | Kolom uraian | Contoh |
|---|---|---|---|
| Program | B (tanpa titik) | D | `DL` — Program Pendidikan dan Pelatihan Vokasi |
| Kegiatan | B (dengan titik) | I | `DL.2376` — Pendidikan Kelautan dan Perikanan |
| KRO / Output | C (tanpa titik) | G | `SAC` — Pendidikan Vokasi Bidang Pertanian, Kelautan, dan Perikanan |
| RO / SubOutput | C (dengan titik) | K | `SAC.811` — Peserta Pendidikan Vokasi KP Yang Kompeten |
| Komponen | E | J | `302` — Pengajaran dan Perkuliahan |
| SubKomponen | F | L | `302.0B` — Praktik Reguler |
| Akun | H | M | `521832` — Belanja Barang Persediaan Lainnya |
| Item POK | — | N | `000017. Praktik Reguler Semester Genap` |

### Kolom nilai
| Kolom | Arti | Perlakuan |
|---|---|---|
| Q | Pagu Revisi | dipakai |
| S | Lock Pagu | dipakai — pagu tertahan usulan revisi DIPA/POK |
| W | Realisasi periode lalu | dipakai |
| X | Realisasi periode ini | dipakai |
| Y atau Z | Realisasi s.d. periode | dipakai sebagai realisasi SAKTI (Y di baris total, Z di baris rincian — ambil yang terisi) |
| AC | Persentase | **diabaikan**, hitung ulang |
| AD/AE | Sisa anggaran | **diabaikan**, hitung ulang |

Angka acuan berkas contoh (uji parser terhadap ini): pagu `20.373.920.000` ·
realisasi s.d. Juli `12.223.943.202` · serapan `60,00%` · sisa `8.149.976.798` ·
410 baris · 2 program (DL `4.443.868.000` / WA `15.930.052.000`) · 6 KRO · 38 akun.

### Rumus (SUMBER KEBENARAN untuk fitur ini — jangan ditulis ulang beda, sama
prinsipnya dengan `hitungNeraca` di `docs/HANDOFF-MOBILE.md` bagian 2)
```
realisasiSakti   = Y ?? Z                      // s.d. periode
realisasiKas     = SUM(transaksi kas tunai pada item, tidak termasuk soft-deleted)
selisih          = realisasiKas - realisasiSakti
sisaTersedia     = pagu - lockPagu - MAX(realisasiSakti, realisasiKas)
serapan          = MAX(realisasiSakti, realisasiKas) / pagu
```
`MAX` dipakai supaya transaksi tunai yang belum masuk GUP tetap mengurangi dana
tersedia — inti gunanya: mencegah pembebanan melebihi pagu. Semua perbandingan uang
**rupiah bulat** (`Math.round`); jangan bandingkan float mentah untuk kesetaraan.

### Klasifikasi selisih (otomatis)
| Jenis | Aturan | Warna |
|---|---|---|
| Cocok | `selisih == 0` | netral |
| Belum masuk SAKTI | `realisasiKas > 0 && realisasiSakti == 0` | magenta |
| Nilai beda | `selisih != 0` dan keduanya > 0 | magenta |
| Realisasi LS | `realisasiSakti > 0 && realisasiKas == 0` pada akun 51xxxx / pembayaran LS | ink (wajar, dikecualikan) |
| Pagu terkunci | `lockPagu > 0` | magenta + blokir pembebanan baru |

### 3 layar (segmented pil, satu halaman "Pagu & realisasi")
1. **Pencocokan** (tab utama) — 4 kartu statistik (Pagu revisi/Realisasi
   SAKTI/Tercatat kas tunai/Selisih) + **tabel pohon** (Segmen anggaran, Pagu
   revisi, Realisasi SAKTI, Kas tunai, Sisa tersedia, Serapan; indentasi
   `level×22px`, expand/collapse). Panel kanan: kartu "Sisa dana tersedia", rincian
   5 baris, daftar transaksi kas tunai pada item itu, aksi "Catat pada item ini" /
   "Tandai wajar" / "Riwayat unggahan".
2. **Selisih & tindakan** — tabel 5 kolom (Kode, Temuan, Jenis, Nilai, Tindakan
   disarankan) dengan tautan nyata ke layar lain (mis. "Masukkan ke DRPP GUP ke-7"
   → Laporan; "Periksa pengembalian KT-2026-0139" → detail transaksi; "Koreksi akun
   transaksi" → edit transaksi). **Tautan-tautan ini harus benar-benar berfungsi**,
   bukan dekorasi.
3. **Unggah GLP039** — zona jatuh berkas (dashed border, ikon xls), tabel pemetaan
   kolom (persis tabel "Kolom nilai" di atas, status Terdeteksi/Diabaikan), panel
   kanan hasil pembacaan + banner pagu terkunci. **Setiap unggahan disimpan sebagai
   versi** (tanggal, pengunggah, hash berkas) supaya selisih periode sebelumnya
   tetap bisa diaudit.

### Rencana backend (BELUM ADA — semua baru)
- Sheet baru **`PAGU_POK`** (satu baris per item POK per versi unggahan) +
  **`PAGU_UPLOAD`** (metadata versi: tanggal, pengunggah, hash berkas).
- Kunci pencocokan transaksi → item POK: kolom baru `KODE_ITEM` pada sheet
  transaksi, format `AKUN|KODE_ITEM` (mis. `521211|000291`). **Perhatikan**: sheet
  transaksi kemungkinan **sudah punya** kolom `KODE_ITEM` dari tugas 8 (lihat
  `_Config.gs:69` — index kolom `KODE_ITEM: 42`) untuk sistem pagu yang lama.
  Sebelum menambah kolom baru, **cek dulu** apakah format lama itu bisa dipakai
  ulang atau harus dibedakan (lihat Keputusan #2/#3 di bagian 2).
- Fungsi server baru: `serverSimpanPaguPok(versi, rows)`,
  `serverGetPencocokanPagu(periode)`, `serverTandaiWajar(kodeItem, catatan)`,
  `serverGetSisaPagu(kodeItem)`. **`serverGetSisaPagu` berpotensi tabrakan nama**
  dengan konsep `serverKetersediaanDana` yang sudah ada (`Code.gs:418`) — pilih
  nama baru atau satukan, jangan buat dua endpoint yang mirip tapi tak konsisten.
- **Mobile** (belum digambar layarnya): field "Item POK" saat catat transaksi
  memanggil pengecekan sisa pagu, tampilkan peringatan magenta bila nilai
  transaksi melebihi sisa (bukan blokir keras — kecuali pagu terkunci, itu
  diblokir keras). Ini kemungkinan **tumpang tindih dengan tugas 8 mobile yang
  sudah ada** ("Item POK + cek sisa pagu", kode selesai) — cek dulu sebelum
  membangun jalur baru yang duplikat.

---

## 5. Gap terhadap kode yang ada sekarang

| Yang ada sekarang | Yang diminta desain baru | Status |
|---|---|---|
| `index.html` tab atas: Transaksi/Perjalanan Dinas/Laporan/Nota Kena Pajak/Ketersediaan Dana/Rekonsiliasi (`index.html:269-274`, fungsi `switchTab`) | Rail-nav kiri 236px, 6 layar dengan kerangka Broadsheet | Belum — kerangka lama masih dipakai apa adanya |
| Sheet pagu sederhana (nama sheet: lihat `_Config.gs`), `serverImporPagu`/`serverGetPagu`/`serverKetersediaanDana` (`Code.gs:405-419`), fungsi `ketersediaan()` di `Anggaran.gs:113` — pagu flat per `KODE_ITEM`, impor manual | `PAGU_POK`+`PAGU_UPLOAD` (versi unggahan), hierarki 8 level penuh, parser GLP039 otomatis di klien, pencocokan otomatis vs realisasi kas tunai | Belum — dua sistem berbeda, **butuh keputusan** (bagian 2 #2) |
| Rekonsiliasi kas vs SAKTI/rek koran per transaksi (`Rekonsiliasi.gs`) | Layar "Rekonsiliasi" redesain visual saja (Bagian II #5) — bukan pengganti, cuma tampilan | Belum (tampilan lama masih dipakai) |
| Kolom `KODE_ITEM` di sheet transaksi (`_Config.gs:69`, dari tugas 8) | Kolom `KODE_ITEM` format `AKUN|KODE_ITEM` untuk pencocokan GLP039 | **Perlu dicek** apakah ini kolom yang sama atau perlu kolom baru — lihat bagian 4 |
| Mobile "Item POK + cek sisa pagu" (tugas 8, kode selesai) | Mobile field "Item POK" panggil `serverGetSisaPagu` versi baru | **Perlu dicek** tumpang tindih sebelum membangun jalur baru |

---

## 6. Design tokens (dari `design-system/styles.css`, Broadsheet — SAMA dengan mobile)

Jangan menambah warna baru. Tabel lengkap sudah ada di `docs/HANDOFF-MOBILE.md`
(dipakai `mobile.html`) — desktop memakai token yang **identik**, disalin ringkas
di sini untuk kemudahan:

| Token | Hex | Pakai untuk |
|---|---|---|
| `--color-bg` | `#f3f2f2` | latar layar |
| `--color-text` | `#201e1d` | teks utama |
| `--color-accent` | `#0088b0` | rail aktif, tombol utama, kartu terpenting |
| `--color-accent-700` | `#006786` | teks/ikon accent di atas kertas |
| `--color-accent-100 / 300` | `#e9f8ff` / `#99e0ff` | strip info, baris terpilih tabel |
| `--color-accent-2` | `#d6006c` | peringatan, lencana antrean, "wajib dikembalikan" |
| `--color-accent-2-100 / 700 / 900` | `#fff1f4` / `#aa0b56` / `#4b1528` | baris bermasalah, ikon gagal |
| `--color-neutral-200 / 300 / 400` | `#eae7e7` / `#d7d3d3` / `#bab6b6` | rail, garis, latar netral |
| `--color-neutral-600 / 700 / 800` | `#7d7979` / `#605d5d` / `#444141` | meta, subteks, header tabel |

Tipografi: **Source Serif 4** untuk judul dan teks (`--font-heading` 600 /
`--font-body`), sama seperti mobile. Radius: kartu statistik 20px, panel detail
kanan tak disebutkan radius (lurus ke tepi layar), tombol/pil 999px. Shadow: tidak
dipakai — hierarki dari warna dan ruang kosong.

---

## 7. Aturan main tiap sesi (sama seperti mobile, `docs/HANDOFF-MOBILE.md` bagian 8)

- Baca dokumen ini dulu sebelum menyentuh kode desktop terkait Bagian II/III.
- Tugas non-trivial: brainstorming → writing-plans → subagent-driven-development,
  jangan langsung menulis kode.
- Rumus di bagian 4 (`realisasiSakti`/`sisaTersedia`/`serapan`/klasifikasi selisih)
  adalah **satu-satunya sumber kebenaran** untuk fitur pagu baru — jangan menaruh
  varian rumus di kode.
- **Berhenti dan tanya** untuk 4 keputusan di bagian 2 sebelum mulai tugas manapun
  yang menyentuhnya — jangan menebak.
- Backend `.gs` tetap ES5 (`var`+`function`), `index.html` tetap satu file vanilla
  JS tanpa build step/dependency baru — sama seperti aturan `mobile.html` di
  `CLAUDE.md`.
- Kolom sheet baru (`PAGU_POK`/`PAGU_UPLOAD`/`KODE_ITEM` bila jadi kolom baru)
  wajib didaftarkan di `_Config.gs` + `ensureHeaders`, dan file `.gs` baru wajib
  didaftarkan di `filePushOrder` (`.clasp.json`).
- Verifikasi: `clasp push` ke deployment uji + uji manual di browser desktop —
  GAS sulit di-unit-test otomatis (lihat `CLAUDE.md`). Untuk tabel pohon/expand-
  collapse dan drag file, uji klik/interaksi NYATA (bukan cuma panggil fungsi
  langsung) — pelajaran dari bug kritis onclick di mobile (`docs/HANDOFF-MOBILE.md`
  bagian 1) berlaku sama di desktop.
- Perbarui papan status (bagian 1) sebelum menutup sesi.
