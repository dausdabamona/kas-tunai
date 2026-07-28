# Handoff — Kas Tunai Desktop

Dokumen acuan lintas sesi untuk pekerjaan **desktop** (`index.html`), setara
`docs/HANDOFF-MOBILE.md` tapi untuk layar besar. Sumber: paket desain
`Kas_Tunai_Mobile_App.zip` — bagian mobile-nya (10 layar, Bagian I) sudah selesai
lewat `/kt-1` … `/kt-11`; **dokumen ini mengurus Bagian II (redesain desktop
rail-nav) dan Bagian III (Pencocokan Pagu & Realisasi / GLP039)**.

> **Revisi 28 Jul 2026 (rev-2, hasil telaah kode).** Isi asli dokumen dipertahankan;
> yang berubah adalah **urutan eksekusi**, **cakupan keputusan #2/#4**, **aturan
> klasifikasi selisih**, dan penambahan **bagian 5 (Risiko)**. Ringkas perubahannya
> ada di bagian 0. Baca bagian 0 dan 5 dulu — di situ letak hal yang bisa merugikan
> uang, bukan cuma tampilan.

---

## 0. Yang berubah di rev-2 (baca ini dulu)

| # | Temuan telaah kode | Akibat pada rencana |
|---|---|---|
| A | **Rumus "baru" ternyata sudah ada.** `Anggaran.gs:130` menghitung `sisaAman = pagu − realisasiSakti − MAX(0, belanjaKas − realisasiSakti)`, yang secara aljabar **identik** dengan `pagu − MAX(realisasiSakti, realisasiKas)`. | Bagian III bukan rumus baru — hanya menambah `lockPagu` + hierarki 8 level + versioning. Perlakukan sebagai **perluasan**, bukan penulisan ulang. Cakupan tugas 8 turun. |
| B | **Ubah format `KODE_ITEM` = migrasi data pada transaksi hidup.** Pencocokan sekarang lewat `_norm(kode).toUpperCase()` (`Anggaran.gs:122`). Kalau format berubah jadi `AKUN\|KODE_ITEM` tanpa backfill, transaksi lama tidak ketemu → `realisasiKas` jadi 0 → **sisa pagu tampak lebih besar dari sebenarnya**. | **Jangan ubah format kolom `KODE_ITEM`.** Kolom `AKUN` sudah ada terpisah (`_Config.gs` COLS.AKUN: 30) — bentuk kunci komposit **di memori** saat pencocokan. Lihat tugas 8 & risiko R-1. |
| C | **Data pendukung klasifikasi sudah tersedia.** Sheet transaksi sudah punya `NO_DRPP` (37), `NO_SPP` (38), `STATUS_REKON` (39). | Klasifikasi selisih bisa menjawab *kenapa* belum masuk SAKTI, bukan sekadar *bahwa* belum. Lihat bagian 4, tabel klasifikasi yang direvisi. |
| D | **Aturan "Realisasi LS = akun 51xxxx" salah sasaran.** Kas tunai hanya menampung UP/GUP; item yang dibayar LS (kontraktual 52xxxx/53xxxx, honor pihak ketiga, belanja modal) **memang tidak pernah** punya transaksi kas tunai. Dengan aturan lama, semua item LS non-51 muncul sebagai temuan palsu. | Aturan diganti: item tanpa transaksi kas tunai sama sekali = **di luar lingkup kas tunai**, netral, tidak masuk daftar temuan. Lihat bagian 4. |
| E | `index.html` sudah **6.009 baris**. Rencana ini menambah ±3–4k baris di file yang sama tanpa build step. | Disiplin struktur wajib (bagian 7). Parser GLP039 **harus** fungsi murni tanpa DOM supaya bisa diuji. |
| F | Rail 236px + panel 404px = 640px terpakai. Di 1366×768 (laptop satker umum) sisa 726px untuk tabel pohon 6 kolom berindentasi 8 level. Dokumen asli tidak menyebut perilaku di bawah 1440 sama sekali. | Tentukan breakpoint sekarang, bukan setelah 6 layar jadi. Lihat bagian 3, "Perilaku di bawah 1280px". |
| G | Tugas 1 masih 🟡 (belum diuji manual), tapi 5 layar akan menumpang di atasnya. | Tugas 2–6 **diblokir** sampai tugas 1 diverifikasi di browser sungguhan. |

**Perubahan urutan eksekusi** (alasan: nilai terbesar ada di tugas 7 & 9; redesain 6
layar adalah pekerjaan terbanyak dengan dampak terkecil):

```
1 (verifikasi dulu) → 7 (parser, murni + self-test) → 9 (BACA-SAJA, berdampingan
dengan sistem lama) → [jalankan paralel 1 siklus GUP penuh] → 8 + 12 (migrasi &
matikan sistem lama) → 10 → 11 → 13 → 2,3,4,5,6 (kosmetik, paling akhir)
```

---

## 1. Papan status

Nomor tugas 1–11 **tidak diubah** (dirujuk oleh perintah `/kt-*` dan sesi lama).
Yang berubah: kolom **Urutan** dan tambahan tugas 12–14.

| # | Urutan | Tugas | Status |
|---|---|-------|--------|
| 1 | **1** | Kerangka rail-nav (menggantikan tab atas) | 🟡 kode selesai → `f89dd42` (markup+CSS `2476395`; verifikasi klik nyata 8/8 lolos; **belum diuji manual di browser sungguhan** — wajib sebelum apa pun lanjut) |
| 7 | **2** | Parser GLP039 di klien (`FileReader` + unzip xlsx) | ⬜ belum |
| 9 | **3** | Layar Pagu & realisasi: tab Pencocokan (tabel pohon) — **baca-saja, berdampingan** | ⬜ belum |
| — | **4** | *Gerbang:* jalankan paralel 1 siklus GUP, cocokkan hasil lama vs baru | ⬜ belum |
| 8 | **5** | Sheet `PAGU_POK` + `PAGU_UPLOAD`, endpoint pencocokan | ⬜ belum |
| 12 | **6** | Migrasi & penghapusan sistem pagu lama (baru, lihat R-1/R-2) | ⬜ belum |
| 10 | **7** | Layar Pagu & realisasi: tab Selisih & tindakan | ⬜ belum |
| 11 | **8** | Layar Pagu & realisasi: tab Unggah GLP039 | ⬜ belum |
| 13 | **9** | Jejak audit "Tandai wajar" (baru, lihat R-4) | ⬜ belum |
| 14 | **10** | Penanganan item yatim akibat revisi DIPA/POK (baru, lihat R-3) | ⬜ belum |
| 2 | 11 | Layar Papan kerja (dashboard) | ⬜ belum — **diblokir tugas 1** |
| 3 | 12 | Layar Transaksi + panel detail kanan (redesain) | ⬜ belum — diblokir tugas 1 |
| 4 | 13 | Layar Perjalanan dinas (redesain) | ⬜ belum — diblokir tugas 1 |
| 5 | 14 | Layar Rekonsiliasi (redesain) | ⬜ belum — diblokir tugas 1 |
| 6 | 15 | Layar Laporan & cetakan (redesain) | ⬜ belum — diblokir tugas 1 |

Status: ⬜ belum · 🟡 jalan/kode selesai · ✅ selesai (sudah diuji) · ⛔ terblokir

**Catatan urutan.** Tugas 9 dikerjakan **sebelum** 8 dengan sengaja: layar Pencocokan
versi pertama membaca `PAGU_POK` hasil unggahan sementara (bisa ditempel manual ke
sheet saat uji) dan **tidak menulis apa pun** serta **tidak mengganggu**
`serverKetersediaanDana` yang lama. Tujuannya membuktikan angka cocok sebelum
menyentuh data produksi. Kalau angka belum cocok, hentikan — jangan lanjut ke 8/12.

---

## 2. Keputusan pengguna

### 2.1 Keputusan asli (28 Jul 2026)

| # | Pertanyaan | Keputusan |
|---|---|---|
| 1 | Tab lama diganti total atau berdampingan dengan rail-nav? | **Diganti total.** Tab atas (`index.html:269-274`, `switchTab`) dibongkar, rail-nav 6-layar jadi satu-satunya kerangka navigasi desktop. |
| 2 | Sistem pagu lama (`serverImporPagu`/`serverGetPagu`/`serverKetersediaanDana`) digantikan `PAGU_POK`/`PAGU_UPLOAD`, atau berdampingan? | **Digantikan.** Satu sumber kebenaran pagu. Endpoint lama perlu rencana migrasi/penghapusan — jangan biarkan dua sistem hidup tanpa batas waktu. |
| 3 | Field "Item POK" mobile dipetakan ke sistem GLP039 baru, atau independen? | **Dipetakan ke sistem baru.** Dampaknya dicatat juga di `docs/HANDOFF-MOBILE.md` saat dikerjakan. |
| 4 | Siapa berwenang mengunggah GLP039? | **Ditunda** — diputuskan setelah alur unggah (tugas 11) dicoba. Jangan tambah logika approval sebelum diminta. |

### 2.2 Penyesuaian rev-2 (arah tetap, eksekusi diubah)

| # | Penyesuaian | Alasan |
|---|---|---|
| 2a | **Arah "diganti total" tetap, tapi wajib lewat periode paralel.** Sistem lama tetap hidup dan tetap jadi acuan resmi sampai satu siklus GUP penuh cocok bersih antara `ketersediaan()` lama dan pencocokan baru. Batas waktu paralel: **maksimal 2 siklus GUP**, setelah itu salah satu harus dimatikan. | Mematikan kontrol ketersediaan dana di tengah tahun anggaran (Juli 2026) tanpa pembanding = kehilangan rem justru di semester berjalan. Batas waktu tetap ada supaya tidak jadi dua sistem abadi (maksud asli keputusan #2 terjaga). |
| 2b | **Data pagu lama tidak dihapus, diarsipkan.** Sheet pagu lama di-*rename* dengan awalan `ARSIP_` + tanggal, jangan `deleteSheet`. | Data pagu adalah objek audit. Penghapusan tidak bisa dibatalkan dan tidak ada gunanya menghemat sheet. |
| 4a | **Penundaan wewenang tetap, tapi pencatatan pengunggah jalan sejak versi pertama.** Kolom pengunggah di `PAGU_UPLOAD` diisi **otomatis dari sesi login**, bukan diketik. | Pembatasan wewenang bisa menyusul kapan saja; jejak siapa yang mengunggah **tidak bisa dibuat surut**. Ini tidak menambah UI apa pun, jadi tidak melanggar "jangan tambah logika approval". |

### 2.3 Keputusan yang masih terbuka — **tanya pengguna sebelum menyentuh tugas terkait**

| # | Pertanyaan | Kenapa perlu dijawab |
|---|---|---|
| 5 | **Irama unggah GLP039**: setiap pengajuan GUP, akhir bulan, atau ad-hoc? | Menentukan seberapa "wajar" selisih yang muncul dan apakah perlu pengingat. Tanpa ini, layar Selisih akan penuh selisih semu. Blokir tugas 10. |
| 6 | **Perlakuan saat revisi DIPA/POK**: item lama yang hilang di versi baru — disembunyikan, atau tetap tampil sebagai "item yatim" dengan realisasinya? | Menentukan apakah total realisasi bisa "hilang" diam-diam. Blokir tugas 14. Rekomendasi: tetap tampil terpisah. |
| 7 | **Siapa boleh menekan "Tandai wajar"?** (Bendahara saja, atau PPK juga?) | Tombol ini mematikan peringatan pengendalian. Blokir tugas 13. |

---

## 3. Ringkasan desain — Bagian II: Desktop rail-nav

Sumber: `Kas Tunai Desktop.dc.html` dalam paket desain (prototipe `.dc.html`,
markup/ukuran/warna/alur mengikat; sintaks `<x-dc>`/`<sc-if>`/`<sc-for>` diabaikan).
Bahasa visual identik desain mobile 1a (design system **Broadsheet**) — desktop
**memakai token yang sama persis**, jangan menambah warna baru.

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

### Perilaku di bawah 1280px (**baru di rev-2 — wajib diputuskan di tugas 1**)

Desain hanya menetapkan 1440px. Laptop satker banyak yang 1366×768 dan 1280×800.
Aturan yang dipakai, kecuali pengguna memutuskan lain:

| Lebar viewport | Rail kiri | Panel detail kanan |
|---|---|---|
| ≥ 1440px | 236px, penuh | 404px, menetap |
| 1280–1439px | 236px, penuh | 360px, menetap |
| 1024–1279px | 72px, ikon saja (label muncul saat hover) | **drawer**, muncul menimpa konten saat baris dipilih, ada tombol tutup |
| < 1024px | arahkan ke `mobile.html` | — |

Alasan: rail 236 + panel 404 = 640px terpakai; di 1366 hanya sisa 726px untuk tabel
pohon 6 kolom dengan indentasi sampai `8 × 22px = 176px`. Tanpa aturan ini, tabel
pohon akan menggulung mendatar — bentuk paling buruk untuk membaca angka rupiah.

### 6 layar
1. **Papan kerja** (beranda desktop) — 4 kartu statistik, daftar "Menunggu tindakan
   Anda", bar serapan per akun (bar tinggi 8px radius 999px, isi >80% jadi magenta),
   panel kanan: antrean unggah (magenta), kotak masuk scan, catatan batas setor pajak.
2. **Transaksi** — chip filter + tabel 5 kolom (No/Tgl, Uraian & penyedia, Status,
   Bukti, Nilai) dan panel detail kanan (meta, strip foto 68px, blok hitung pajak,
   aksi SPBY/pengembalian/kuitansi). Redesain dari tab "Transaksi" yang sudah ada —
   backend (`server*`) sudah lengkap, ini murni tampilan.
3. **Pagu & realisasi** — lihat bagian 4.
4. **Perjalanan dinas** — form surat tugas (grid 3 kolom, field bergaris bawah),
   tabel pelaksana, panel kanan: kartu accent total uang muka, rincian biaya riil,
   blok "Wajib dikembalikan" (angka magenta). Redesain dari `SuratTugas.gs`.
5. **Rekonsiliasi** — kas tunai vs SAKTI, 4 kartu statistik, tabel dengan baris
   selisih disorot. Redesain visual dari `Rekonsiliasi.gs` — **beda dari pencocokan
   pagu Bagian III**: ini rekonsiliasi rekening koran/SAKTI transaksi-per-transaksi.
6. **Laporan & cetakan** — grid 3×2 kartu keluaran (SPBY, DRPP, BKU, rekap pajak,
   berkas SPD, ekspor CSV) + daftar cetakan terakhir.

Detail ukuran/warna persis ada di README paket desain (Bagian II) dan prototipe
`Kas Tunai Desktop.dc.html` — **tidak disalin ke repo**; minta pengguna mengunggah
ulang paketnya bila dibutuhkan di sesi berikutnya.

---

## 4. Ringkasan desain — Bagian III: Pencocokan Pagu & Realisasi (GLP039)

Mencocokkan pagu DIPA/POK (dari file SAKTI) dengan realisasi tercatat di Kas Tunai,
per level hierarki anggaran. **Perluasan** dari `Anggaran.ketersediaan()` yang sudah
ada (lihat temuan A di bagian 0), bukan sistem yang berdiri sendiri.

### Sumber data & parser
- File **GLP039 — Laporan Ketersediaan Dana Detail** (Excel dari SAKTI). Contoh
  terverifikasi: `contoh-data/glp039-baris-terbaca.txt` (410 baris, Poltek KP Sorong
  Juli 2026) — ada di paket zip pengguna, tidak disalin ke repo.
- Karakteristik wajib ditangani parser:
  - Satu sheet `GLP039_LAPORAN REALISASI SUPER ` (ada spasi di akhir nama sheet).
  - Teks berupa `t="inlineStr"` dengan `<is><r><t>`. **Rev-2:** jangan berasumsi
    `sharedStrings.xml` tidak ada — itu benar untuk satu berkas contoh, belum tentu
    untuk versi SAKTI berikutnya. **Tangani keduanya.**
  - Angka disimpan float notasi ilmiah (`2.037392E10`) — pakai `parseFloat`.
  - Baris 1–6 judul/identitas; baris 7–8 header dua tingkat; data mulai **baris 9**.
    Baris 9 = `JUMLAH SELURUHNYA` (total satker).
  - Baris catatan kaki bisa menyisip di tengah data — abaikan baris tanpa nilai di
    kolom Q.
  - Berkas bisa terpecah banyak segmen halaman; header bisa berulang.
- **Parsing di KLIEN**, bukan Apps Script: `FileReader` → unzip →
  `xl/worksheets/sheet1.xml` → parse `<row>`/`<c>`. Alasan: hindari mengirim xlsx
  ~700 KB ke `google.script.run`. Kirim ke server **hanya hasil ringkas**.
- **Rev-2 — cara unzip tanpa dependency baru:** pakai
  `DecompressionStream('deflate-raw')` bawaan browser + pembacaan *central
  directory* ZIP secara manual (±80 baris). **Jangan tarik JSZip** — melanggar aturan
  "tanpa dependency baru" di `CLAUDE.md`.
- **Rev-2 — parser wajib fungsi murni tanpa DOM**, mis.
  `parseGlp039(arrayBuffer) → {rows, ringkasan, peringatan[]}`. Ini satu-satunya
  bagian dengan logika nyata dan **angka acuannya sudah diketahui** — jadi bisa
  benar-benar diuji (lihat bagian 7). Kegagalan baca harus **melempar pesan jelas**
  ("kolom Q tidak terbaca di 37 baris"), bukan menghasilkan nol diam-diam. Angka nol
  yang salah lebih berbahaya daripada error.

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
| Y atau Z | Realisasi s.d. periode | realisasi SAKTI (Y di baris total, Z di baris rincian — ambil yang terisi) |
| AC | Persentase | **diabaikan**, hitung ulang |
| AD/AE | Sisa anggaran | **diabaikan**, hitung ulang |

**Angka acuan berkas contoh** (dipakai sebagai uji parser): pagu `20.373.920.000` ·
realisasi s.d. Juli `12.223.943.202` · serapan `60,00%` · sisa `8.149.976.798` ·
410 baris · 2 program (DL `4.443.868.000` / WA `15.930.052.000`) · 6 KRO · 38 akun.

### Rumus — SUMBER KEBENARAN
```
realisasiSakti   = Y ?? Z                      // s.d. periode
realisasiKas     = SUM(transaksi kas tunai pada item, tidak termasuk soft-deleted,
                       tidak termasuk REF_TRANSFER berawalan 'TF-')
selisih          = realisasiKas - realisasiSakti
sisaTersedia     = pagu - lockPagu - MAX(realisasiSakti, realisasiKas)
serapan          = MAX(realisasiSakti, realisasiKas) / pagu
```
`MAX` dipakai supaya transaksi tunai yang belum masuk GUP tetap mengurangi dana
tersedia — inti gunanya: **mencegah pembebanan melebihi pagu**. Semua perbandingan
uang **rupiah bulat** (`Math.round`); jangan bandingkan float mentah.

> **Rev-2 — hubungan dengan kode yang ada.** Rumus di atas **sama** dengan
> `Anggaran.ketersediaan()` (`Anggaran.gs:113-146`) kecuali penambahan `lockPagu`.
> Pengecualian `TF-` (pindah dana, bukan belanja) sudah ada di kode lama dan **wajib
> dipertahankan** — kalau hilang, mutasi antar-kas akan terhitung sebagai belanja dan
> sisa pagu jadi terlalu kecil. Saat tugas 8, **perluas fungsi yang ada**, jangan
> tulis fungsi kedua yang mirip.

### Klasifikasi selisih — **direvisi di rev-2**
| Jenis | Aturan | Warna | Tampil di layar Selisih? |
|---|---|---|---|
| Cocok | `selisih == 0` | netral | tidak |
| Di luar lingkup kas tunai | `realisasiKas == 0` (item tidak pernah dibebani kas tunai — dibayar LS/kontraktual/gaji) | ink | **tidak** — ini normal, bukan temuan |
| Belum di-DRPP | `selisih > 0` dan transaksi penyebab **tidak punya** `NO_DRPP` | magenta | ya — tindakan: masukkan ke DRPP |
| Sudah DRPP, belum SPM/SP2D | `selisih > 0`, ada `NO_DRPP`, `NO_SPP` kosong | magenta | ya — tindakan: pantau pengajuan |
| Sudah SP2D, nilai beda | `selisih != 0`, ada `NO_SPP`, keduanya > 0 | magenta | ya — tindakan: periksa akun/nilai |
| Realisasi SAKTI > kas tunai | `selisih < 0` dan `realisasiKas > 0` | magenta | ya — kemungkinan salah pembebanan akun |
| Pagu terkunci | `lockPagu > 0` | magenta | ya — **blokir pembebanan baru** |

> **Kenapa berubah** (temuan C & D bagian 0): aturan lama memakai awalan akun
> `51xxxx` untuk menandai "wajar". Itu tidak tepat — kas tunai hanya menampung
> UP/GUP, jadi semua item yang dibayar LS (termasuk 52xxxx kontraktual dan 53xxxx
> modal) juga tidak punya realisasi kas tunai. Dengan aturan lama, layar Selisih akan
> penuh temuan palsu dan berhenti dibaca orang. Aturan baru memakai keberadaan
> transaksi kas tunai sebagai penentu lingkup, dan memakai `NO_DRPP`/`NO_SPP` yang
> **sudah ada di sheet** (`_Config.gs` COLS 37/38) untuk menjawab *kenapa*, bukan
> sekadar *bahwa*, ada selisih.

### Tanggal data — **baru di rev-2**
GLP039 adalah **potret satu waktu**; realisasi SAKTI berubah tiap hari. Setiap layar
Pagu & realisasi wajib menampilkan **tanggal berkas sumber** secara menonjol
(mis. "Data SAKTI per 25 Jul 2026 · diunggah 28 Jul 2026 oleh Firdaus") dan memberi
peringatan bila umur data > 14 hari. Tanpa ini, keputusan pembebanan diambil dari
angka basi.

### 3 layar (segmented pil, satu halaman "Pagu & realisasi")
1. **Pencocokan** (tab utama) — 4 kartu statistik (Pagu revisi / Realisasi SAKTI /
   Tercatat kas tunai / Selisih) + **tabel pohon** (Segmen anggaran, Pagu revisi,
   Realisasi SAKTI, Kas tunai, Sisa tersedia, Serapan; indentasi `level×22px`,
   expand/collapse). Panel kanan: kartu "Sisa dana tersedia", rincian 5 baris, daftar
   transaksi kas tunai pada item itu, aksi "Catat pada item ini" / "Tandai wajar" /
   "Riwayat unggahan".
   **Versi pertama = baca-saja** (lihat catatan urutan di bagian 1): tanpa aksi tulis,
   dipakai untuk membuktikan angka cocok dengan `serverKetersediaanDana` lama.
2. **Selisih & tindakan** — tabel 5 kolom (Kode, Temuan, Jenis, Nilai, Tindakan
   disarankan) dengan tautan **nyata** ke layar lain (mis. "Masukkan ke DRPP GUP
   ke-7" → Laporan; "Periksa pengembalian KT-2026-0139" → detail transaksi; "Koreksi
   akun transaksi" → edit transaksi). Tautan ini harus benar-benar berfungsi, bukan
   dekorasi.
3. **Unggah GLP039** — zona jatuh berkas (dashed border, ikon xls), tabel pemetaan
   kolom (status Terdeteksi/Diabaikan), panel kanan hasil pembacaan + banner pagu
   terkunci. **Setiap unggahan disimpan sebagai versi** (tanggal berkas, tanggal
   unggah, pengunggah otomatis dari sesi, hash berkas) supaya selisih periode
   sebelumnya tetap bisa diaudit.

### Rencana backend
- Sheet baru **`PAGU_POK`** (satu baris per item POK per versi unggahan) +
  **`PAGU_UPLOAD`** (metadata versi: tanggal berkas, tanggal unggah, pengunggah,
  hash berkas, jumlah baris, total pagu).
- **Kunci pencocokan transaksi → item POK (revisi rev-2):** **jangan** ubah format
  kolom `KODE_ITEM` (`_Config.gs:69`, index 42). Kolom `AKUN` sudah ada terpisah
  (index 30). Bentuk kunci komposit `AKUN + '|' + KODE_ITEM` **di memori** saat
  pencocokan. Kalau ternyata kunci komposit tetap diperlukan tersimpan, tambahkan
  **kolom baru** di kanan (`KODE_ITEM_FULL`) dan isi lewat backfill idempoten —
  jangan menimpa kolom yang sudah dipakai transaksi lama. Lihat risiko **R-1**.
- Fungsi server: **perluas** `Anggaran.ketersediaan()` alih-alih membuat kembar.
  `serverGetSisaPagu` **tidak dibuat** — pakai/rename `serverKetersediaanDana` yang
  sudah ada (`Code.gs:418`) supaya mobile tidak perlu tahu ada dua jalur.
  Endpoint baru yang benar-benar perlu: `serverSimpanPaguPok(versi, rows)`,
  `serverGetPencocokanPagu(periode)`, `serverTandaiWajar(...)` (lihat R-4 untuk
  tanda tangannya).
- **Mobile**: field "Item POK" saat catat transaksi memanggil pengecekan sisa pagu,
  peringatan magenta bila melebihi sisa (**bukan** blokir keras — kecuali pagu
  terkunci, itu blokir keras). Tugas 8 mobile ("Item POK + cek sisa pagu") **sudah
  ada dan kode selesai** — sambungkan ulang, jangan bangun jalur duplikat.

---

## 5. Risiko & mitigasi (**baru di rev-2**)

Diurut berdasarkan besar kerugian, bukan besar pekerjaan.

| ID | Risiko | Akibat | Mitigasi wajib |
|---|---|---|---|
| **R-1** | Format `KODE_ITEM` diubah tanpa backfill | Transaksi lama tidak cocok → `realisasiKas` = 0 → **sisa pagu tampak lebih besar** → pembebanan melebihi pagu. Gagal diam-diam, tidak ada error. | Jangan ubah kolom yang sudah ada (lihat bagian 4). Bila terpaksa: backup sheet dulu, skrip backfill **idempoten**, dan uji cocok-total sebelum/sesudah (`SUM(realisasiKas)` harus sama persis). |
| **R-2** | Sistem lama dimatikan sebelum yang baru terbukti | Kehilangan kontrol ketersediaan dana di tengah tahun anggaran | Periode paralel 1 siklus GUP (keputusan 2a). Gerbang di papan status urutan 4 tidak boleh dilompati. |
| **R-3** | Revisi DIPA/POK menghapus/mengganti kode item | Transaksi lama menunjuk item yang tidak ada lagi → realisasinya **hilang dari total** tanpa jejak | Tugas 14: item yatim ditampilkan pada kelompok terpisah "Item di luar POK versi ini" dengan nilainya, tidak pernah didiam-diamkan. Ini kejadian **pasti**, bukan kemungkinan. |
| **R-4** | "Tandai wajar" tanpa jejak | Peringatan pengendalian dimatikan tanpa bisa dipertanggungjawabkan saat reviu Itjen/BPK | Tugas 13: simpan `kodeItem, nilaiSelisihSaatDitandai, alasan, olehUser, waktu, dicabutOleh, waktuCabut`. Tanda wajar **kedaluwarsa otomatis** bila nilai selisih berubah. Tanda tangan fungsi jadi `serverTandaiWajar(token, kodeItem, nilaiSelisih, alasan)` — `alasan` wajib, tidak boleh kosong. |
| **R-5** | Parser salah baca versi SAKTI berikutnya | Angka pagu/realisasi salah tapi tampil meyakinkan | Parser mengembalikan `peringatan[]`; layar Unggah menampilkan total hasil baca dan **meminta konfirmasi manusia** ("Total pagu terbaca Rp X — cocok dengan GLP039 Anda?") sebelum disimpan. |
| **R-6** | `index.html` tumbuh ke ±10k baris | Sesi berikutnya sulit mengubah tanpa merusak layar lain | Bagian 7: satu blok `<script>` per layar dengan penanda, satu router, parser terpisah & teruji. |
| **R-7** | `PAGU_POK` menumpuk per unggahan | 410 baris × ~15 kolom × n unggahan; unggah harian → ±2,2 juta sel/tahun | Simpan penuh untuk versi **akhir bulan** + versi terakhir; versi harian di antaranya boleh dipangkas. Putuskan saat tugas 8. |
| **R-8** | Tabel pohon tidak bisa dipakai di layar 1366 | Fitur inti tidak terpakai di laptop yang sebenarnya dipakai | Breakpoint di bagian 3 diputuskan **di tugas 1**, bukan setelah 6 layar jadi. |

---

## 6. Design tokens (Broadsheet — SAMA dengan mobile)

Jangan menambah warna baru. Tabel lengkap ada di `docs/HANDOFF-MOBILE.md`; ringkas:

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

Tipografi: **Source Serif 4** (`--font-heading` 600 / `--font-body`). Radius: kartu
statistik 20px, tombol/pil 999px, panel detail kanan lurus ke tepi layar. Shadow:
tidak dipakai — hierarki dari warna dan ruang kosong.

---

## 7. Aturan main tiap sesi

- Baca dokumen ini dulu — **bagian 0 dan 5** sebelum apa pun — sebelum menyentuh kode
  desktop terkait Bagian II/III.
- Tugas non-trivial: brainstorming → writing-plans → subagent-driven-development.
- Rumus di bagian 4 adalah **satu-satunya sumber kebenaran**. Jangan menaruh varian
  rumus di kode; **perluas `Anggaran.ketersediaan()`**, jangan bikin kembarannya.
- **Berhenti dan tanya** untuk keputusan terbuka di bagian 2.3 sebelum menyentuh tugas
  yang diblokirnya.
- Backend `.gs` tetap ES5 (`var`+`function`); `index.html` tetap satu file vanilla JS
  tanpa build step/dependency baru.
- **Struktur `index.html` (rev-2, karena file sudah 6.009 baris):**
  - satu blok `<script>` per layar, dibuka dengan komentar penanda
    `/* ===== LAYAR: pagu-realisasi ===== */`;
  - satu router `showScreen(nama)` — jangan ada `switchTab` kedua;
  - **parser GLP039 sebagai fungsi murni tanpa DOM**, di bloknya sendiri.
- **Pengujian (rev-2 — klaim "GAS sulit diuji" tidak berlaku untuk parser):**
  - Parser wajib punya **self-test** yang menjalankan `parseGlp039()` terhadap berkas
    contoh dan membandingkan ke angka acuan di bagian 4 (pagu `20.373.920.000`,
    realisasi `12.223.943.202`, 410 baris, 38 akun). Gagal = merah, jangan lanjut.
  - Sisanya: `clasp push` ke deployment uji + **uji manual di browser desktop**.
  - Tabel pohon, expand/collapse, dan drag-drop berkas: uji **klik/interaksi nyata**,
    bukan memanggil fungsi langsung — pelajaran bug onclick di mobile
    (`docs/HANDOFF-MOBILE.md` bagian 1) berlaku sama di desktop.
  - Tabel pohon wajib bisa dioperasikan dari papan ketik (`aria-expanded`, fokus
    terlihat) — baris yang hanya bisa dibuka dengan tetikus akan menyulitkan
    pemeriksaan cepat saat menyusun GUP.
- Kolom sheet baru (`PAGU_POK`/`PAGU_UPLOAD`/kolom tambahan) wajib didaftarkan di
  `_Config.gs` + `ensureHeaders`; file `.gs` baru wajib didaftarkan di `filePushOrder`
  (`.clasp.json`). **Kolom baru selalu ditambahkan di kanan**, tidak pernah menyisip.
- Perbarui papan status (bagian 1) sebelum menutup sesi.
