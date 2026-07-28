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

> **Tambalan 28 Jul 2026 (v2, desain ulang tampilan).** Paket desain kedua
> (`Kas Tunai Desktop v2.dc.html`) **menambal** rev-2, tidak menggantinya — rumus,
> papan status, keputusan pengguna, dan daftar risiko di atas **tetap berlaku**.
> Yang ditambahkan: jawaban visual konkret untuk 4 risiko yang sebelumnya belum
> punya bentuk (R-3 item yatim, R-4 dialog tandai wajar, R-5 kartu konfirmasi
> unggah, R-8 breakpoint 1366/1280). **Bagian §4 (sumber data GLP039) dikonfirmasi
> TIDAK berubah** dari rev-2. Ringkas di bagian **0b**; detail visual di bagian
> **3b**. Paket ini juga memberi desain "Papan kerja" yang **berbeda** dari spec
> `docs/superpowers/specs/2026-07-28-papan-kerja-desktop-design.md` yang sudah
> ditulis sebelumnya — lihat catatan di bagian 0b.

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
| G | Tugas 1 masih 🟡 (belum diuji manual), tapi 5 layar akan menumpang di atasnya. | Tugas 2–6 **diblokir** sampai tugas 1 diverifikasi di browser sungguhan. → **SUDAH TERPENUHI 28 Jul 2026**: rail-nav diuji manual oleh pengguna di browser sungguhan dan berjalan normal. Blokir dibuka. |

**Perubahan urutan eksekusi** (alasan: nilai terbesar ada di tugas 7 & 9; redesain 6
layar adalah pekerjaan terbanyak dengan dampak terkecil):

```
1 (verifikasi dulu) → 7 (parser, murni + self-test) → 9 (BACA-SAJA, berdampingan
dengan sistem lama) → [jalankan paralel 1 siklus GUP penuh] → 8 + 12 (migrasi &
matikan sistem lama) → 10 → 11 → 13 → 2,3,4,5,6 (kosmetik, paling akhir)
```

Urutan **tidak berubah** di v2 (paket v2 §8 menegaskan ini eksplisit) — v2 murni
memberi bentuk visual, bukan mengubah prioritas.

---

## 0b. Paket v2 — desain ulang tampilan (baca sebelum tugas 1, 9, 11, 13, 14)

Sumber: bundel `handoff_desktop_v2/` (README + `Kas Tunai Desktop v2.dc.html` +
`design-system/styles.css`), diunggah pengguna sebagai zip terpisah. **Tidak
disalin ke repo** kecuali cuplikan mengikat di bawah — minta pengguna mengunggah
ulang bila detail lain dibutuhkan di sesi berikutnya.

### Kenapa desain v1 diganti (alasan, bukan cuma "berubah")

| # | v1 | v2 | Alasan |
|---|---|---|---|
| 1 | Tabel pohon berindentasi `level × 22px`, 8 level | **Penelusuran bertingkat**: jejak langkah (breadcrumb) + daftar anak satu tingkat | 8 × 22 = 176px indentasi; di 1366px sisa ≈726px untuk 6 kolom rupiah → menggulung mendatar. Menutup R-8 tanpa mengorbankan kolom angka. |
| 2 | Breakpoint hanya 1440px | **Tiga kerapatan** 1440 / 1366 / 1280 didefinisikan penuh (lihat tabel di bagian 3) | Laptop satker umum 1366×768 dan 1280×800. |
| 3 | Tanggal data hanya di subjudul | **Strip umur data** tetap terlihat, jadi magenta bila >14 hari | GLP039 potret satu waktu; keputusan pembebanan tidak boleh diambil dari angka basi. |
| 4 | Klasifikasi lama (`51xxxx` = wajar) | Klasifikasi rev-2 berbasis `NO_DRPP`/`NO_SPP` + catatan lingkup | Sudah diadopsi di bagian 4 — v2 tidak mengubah ini lagi, hanya memastikan tampilannya konsisten. |
| 5 | Tidak ada | Baris **"Item di luar POK versi ini"** tetap di akar pohon/breadcrumb | R-3: revisi POK pasti terjadi; realisasi tidak boleh hilang diam-diam. |
| 6 | "Tandai wajar" = tombol langsung | **Dialog dengan alasan wajib** + pencatat otomatis + tanda kedaluwarsa otomatis | R-4: tombol ini mematikan peringatan pengendalian, perlu jejak. |
| 7 | Unggah langsung simpan | **Kartu konfirmasi manusia** (7 angka baca-ulang) sebelum apa pun ditulis ke Sheets | R-5: angka nol yang salah lebih berbahaya daripada error. |
| 8 | Merek rail hanya teks | Ikon aplikasi `assets/icon-192.png` 34px radius 9px di rail | Konsisten dengan pintasan HP yang sudah dipakai pengguna. |

### §4 (sumber data GLP039) — dikonfirmasi TIDAK berubah

Paket v2 menyatakan eksplisit: hierarki 8 level, kolom nilai (Q/S/W/X/Y-Z/AC/AD),
rumus `sisaTersedia`/`serapan`, aturan `KODE_ITEM` (R-1), dan angka acuan uji —
semuanya **identik** dengan bagian 4 dokumen ini. Parser GLP039 yang sudah
diimplementasikan dan direview (papan status urutan-2) **tidak perlu dikerjakan
ulang** karena paket ini.

### Spec Papan kerja sudah disesuaikan ke v2

`docs/superpowers/specs/2026-07-28-papan-kerja-desktop-design.md` ditulis sebelum
paket v2 diunggah dan susunannya berbeda dari v2 §3.1. Karena layar itu belum
pernah diimplementasikan, spec **sudah direvisi mengikuti v2** (commit `c466d1e`,
atas persetujuan pengguna): isi 4 kartu statistik diganti, panel serapan jadi
"Sisa pagu paling tipis" (ambang magenta 90%), panel kanan memakai ringkasan
rekonsiliasi. Keputusan arsitektur yang tidak disentuh v2 (satu endpoint agregasi,
kriteria dihitung di klien, modul `AntreanStatus`) dipertahankan. Bagian 0 spec
itu mencatat perbedaan v1→v2 baris per baris.

---

## 1. Papan status

Nomor tugas 1–11 **tidak diubah** (dirujuk oleh perintah `/kt-*` dan sesi lama).
Yang berubah: kolom **Urutan** dan tambahan tugas 12–14.

| # | Urutan | Tugas | Status |
|---|---|-------|--------|
| 1 | **1** | Kerangka rail-nav (menggantikan tab atas) | ✅ **selesai & diuji manual** (28 Jul 2026, browser sungguhan) → `f89dd42` (markup+CSS `2476395`). Gerbang temuan G **terbuka** — tugas lain boleh lanjut. Sisa pekerjaan terpisah: breakpoint 1366/1280 dari paket v2 (bagian 3, tabel kerapatan) belum diimplementasikan; yang ada baru markup + sticky-position dasar. |
| 7 | **2** | Parser GLP039 di klien (`FileReader` + unzip xlsx) | 🟡 kode selesai, review akhir bersih → plan `a53db5f`, implementasi `1f77ec0`, fix wave `d4fc6c5` (3 temuan Important dari review whole-branch: `ringkasan.sisa`→`sisaBerkas`+field `lock` baru, `inlineStr` multi-run tak lagi terpotong, catatan wajib "belum diuji file SAKTI asli" dikembalikan). Verifikasi mandiri 12/12 PASS. **Masih 🟡, bukan ✅** — belum pernah dicoba dengan berkas GLP039 asli (baru data acuan teks + ZIP buatan sendiri), wajib sebelum tugas urutan-8 (layar Unggah) memakainya. |
| 9 | **3** | Layar Pagu & realisasi: tab Pencocokan (tabel pohon) — **baca-saja, berdampingan** | ⬜ belum |
| — | **4** | *Gerbang:* jalankan paralel 1 siklus GUP, cocokkan hasil lama vs baru | ⬜ belum |
| 8 | **5** | Sheet `PAGU_POK` + `PAGU_UPLOAD`, endpoint pencocokan | ⬜ belum |
| 12 | **6** | Migrasi & penghapusan sistem pagu lama (baru, lihat R-1/R-2) | ⬜ belum |
| 10 | **7** | Layar Pagu & realisasi: tab Selisih & tindakan | ⬜ belum |
| 11 | **8** | Layar Pagu & realisasi: tab Unggah GLP039 | ⬜ belum |
| 13 | **9** | Jejak audit "Tandai wajar" (baru, lihat R-4) | ⬜ belum |
| 14 | **10** | Penanganan item yatim akibat revisi DIPA/POK (baru, lihat R-3) | ⬜ belum |
| 2 | 11 | Layar Papan kerja (dashboard) | ⬜ belum |
| 3 | 12 | Layar Transaksi + panel detail kanan (redesain) | ⬜ belum |
| 4 | 13 | Layar Perjalanan dinas (redesain) | ⬜ belum |
| 5 | 14 | Layar Rekonsiliasi (redesain) | ⬜ belum |
| 6 | 15 | Layar Laporan & cetakan (redesain) | ⬜ belum |

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

Paket v2 (§9) menegaskan ulang: ketiga pertanyaan ini **masih terbuka** — desain
v2 memberi *bentuk* visual (mis. item yatim didesain tampil terpisah, bagian 3b)
tapi itu bukan jawaban keputusan #6, hanya opsi yang sudah siap dipakai begitu
pengguna mengonfirmasi.

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

### Tabel kerapatan (**digantikan tabel v2 ini — implementasikan persis**)

Tabel rev-2 di atas (ambang 1280px, rail 72px, panel drawer generik) **digantikan**
oleh tabel paket v2 yang lebih rinci — ambang naik ke 1366px dan mencakup lebih
banyak elemen. Ini yang mengikat untuk tugas urutan-1 (rail-nav, belum
diimplementasikan) dan urutan-3 (tab Pencocokan):

| | ≥ 1440px | 1366–1439px | 1024–1365px | < 1024px |
|---|---|---|---|---|
| Rail | 236px, label penuh | 236px, label penuh | **76px, ikon saja** (label lewat `title`, lencana jadi titik 8px di pojok) | arahkan ke `mobile.html` |
| Panel detail | 404px menetap | 348px menetap | **drawer**: `position:absolute; right:0`, lebar 396px, `box-shadow:-18px 0 40px rgba(32,30,29,.18)` (satu-satunya shadow yang dipakai di seluruh desain), tombol "Tutup" pil di kanan atas | — |
| Kartu statistik | 4 sejajar, angka 31px (accent) / 24px | grid 2×2, angka 26px / 21px, padding `16px 18px` | sama seperti 1366 | — |
| Angka di tabel | penuh (`Rp 4.443.868.000`) | **disingkat** (`Rp 4,44 M`, `Rp 6,8 jt`) — nilai penuh tetap tampil di panel kanan | sama seperti 1366 | — |
| Lebar kolom tabel pohon/anak | `1fr 134 134 134 122 38` | `1fr 118 118 118 104 34` | sama seperti 1366 | — |

Pemendekan rupiah (`rpk`): ≥ 1 miliar → `Rp x,xx M`; ≥ 1 juta → `Rp x,x jt`;
sisanya angka penuh. Desimal pakai koma. **Panel detail dan dialog selalu
memakai angka penuh** — pemendekan hanya untuk kolom tabel. Berpindah menu
menutup drawer yang sedang terbuka.

Alasan tetap sama seperti rev-2: rail + panel menetap menyisakan terlalu sedikit
ruang untuk kolom rupiah di 1366px. Tabel pohon berindentasi juga sudah diganti
pendekatan "penelusuran bertingkat" (breadcrumb + daftar anak satu tingkat, lihat
3b) — itu sendiri bagian dari solusi R-8, bukan cuma breakpoint.

### 6 layar
1. **Papan kerja** (beranda desktop) — 4 kartu statistik, daftar "Menunggu tindakan
   Anda", bar serapan per akun (bar tinggi 8px radius 999px, isi >80% jadi magenta),
   panel kanan: antrean unggah (magenta), kotak masuk scan, catatan batas setor pajak.
   **Digantikan tampilan v2** (bagian 3b.1) — kartu dan panel kanan berbeda dari
   ringkasan di atas; lihat juga catatan konflik-spec di bagian 0b.
2. **Transaksi** — chip filter + tabel 5 kolom (No/Tgl, Uraian & penyedia, Status,
   Bukti, Nilai) dan panel detail kanan (meta, strip foto 68px, blok hitung pajak,
   aksi SPBY/pengembalian/kuitansi). Redesain dari tab "Transaksi" yang sudah ada —
   backend (`server*`) sudah lengkap, ini murni tampilan. Detail chip & panel v2 di
   bagian 3b.2.
3. **Pagu & realisasi** — lihat bagian 4 (rumus/data) dan bagian 3b.3–3b.5 (tampilan
   v2: breadcrumb menggantikan tabel pohon berindentasi, strip umur data, kartu
   konfirmasi unggah).
4. **Perjalanan dinas** — form surat tugas (grid 3 kolom, field bergaris bawah),
   tabel pelaksana, panel kanan: kartu accent total uang muka, rincian biaya riil,
   blok "Wajib dikembalikan" (angka magenta). Redesain dari `SuratTugas.gs`.
5. **Rekonsiliasi** — kas tunai vs SAKTI, 4 kartu statistik, tabel dengan baris
   selisih disorot. Redesain visual dari `Rekonsiliasi.gs` — **beda dari pencocokan
   pagu Bagian III**: ini rekonsiliasi rekening koran/SAKTI transaksi-per-transaksi.
   v2 menambah kartu keempat "Dikecualikan — Pindah dana & non-rekon".
6. **Laporan & cetakan** — grid 3×2 kartu keluaran (SPBY, DRPP, BKU, rekap pajak,
   berkas SPD, ekspor CSV) + daftar cetakan terakhir. v2 menambah kartu "Bundel SPJ
   perjalanan" (ZIP, `BuktiPD.zipBukti`).

Detail ukuran/warna persis (v1) ada di README paket desain (Bagian II) dan prototipe
`Kas Tunai Desktop.dc.html` — **tidak disalin ke repo**; minta pengguna mengunggah
ulang paketnya bila dibutuhkan di sesi berikutnya. Detail v2 yang mengikat ada di
bagian 3b (disalin penuh karena menjawab risiko R-3/R-4/R-5/R-8 yang memblokir tugas).

---

## 3b. Detail visual v2 — per layar (mengikat, menggantikan uraian v1 di atas)

Semua ukuran/warna memakai token Broadsheet di bagian 6 (tidak ada warna baru).
Target sentuh/klik minimal 40px (tombol pil 40px, baris tabel ≈48px).

### 3b.1 Papan kerja
1. 4 kartu statistik: **Saldo kas tunai** (accent) · Bank/UP · Belum di-SPBY ·
   Pajak belum disetor.
2. **Menunggu tindakan Anda** — tabel `1fr 148px 130px`: uraian + `No · penyedia`,
   pil status, nominal. Klik baris → layar Transaksi dengan baris itu terpilih.
3. **Sisa pagu paling tipis** (baru di v2) — tabel `1fr 120px` diurut serapan
   menurun; bar 54×7px (>90% magenta) + persen; baris >90% berlatar
   `--color-accent-2-100` radius 14px. Klik → layar Pagu. Subjudul: "tempat
   pembebanan berikutnya paling mudah melampaui pagu".
4. Panel kanan: kartu antrean HP (magenta radius 20px) · Kotak masuk scan (3 baris,
   pil "Belum dikaitkan" magenta) · **Kartu ketenangan** (kotak netral radius 16px,
   ringkasan rekonsiliasi — pakai `serverRingkasanRekon` yang sudah ada).

### 3b.2 Transaksi
- Chip filter: Semua / Belum DRPP / Pajak belum / Draft dari HP / Perjalanan dinas.
  Aktif = isi accent putih; nonaktif = border `1px --color-neutral-400`.
- Tabel `No/Tgl · Uraian & penyedia · Status · Bukti · Nilai`. Kolom uraian
  menampilkan `penyedia · item <KODE_ITEM>`. Baris `TF-` (pindah dana) diberi pil
  ink **"Bukan belanja"** — wajib tampil, karena pengecualian `TF-` sudah ada di
  `Anggaran.gs` (bagian 4) dan pengguna harus melihat kenapa baris itu tidak
  dihitung sebagai belanja.
- Panel detail: meta (Tanggal, Penyedia, Item POK, Sumber, DRPP/SPP), strip foto
  64px radius 14px + tile "+" `2px dashed accent`, blok hitung pajak (DPP = nilai
  ÷ 1,11; PPN 11% 411211/900; PPh 22 1,5% 411122/900; total magenta 20px), aksi:
  Terbitkan SPBY (accent) · Pecah transaksi · Cetak kuitansi.

### 3b.3 Pagu & realisasi — tab Pencocokan (menggantikan tabel pohon v1)

> **Acuan tampilan:** pengguna mengirim tangkapan layar prototipe (28 Jul 2026)
> dan menyatakan "saya mengharapkan tampilan seperti ini". Detail di bawah yang
> berasal dari tangkapan itu ditandai **[gbr]** — teks salinannya mengikat, bukan
> perkiraan.

**[gbr] Kepala halaman.** Judul "Pagu & realisasi"; subjudul satu baris
`GLP039 Ketersediaan Dana Detail · 8 tingkat anggaran · versi 3 (25 Jul 2026)`.
Aksi kanan atas dua pil: **"Ekspor selisih"** (ghost, berikon unduh) dan
**"Unggah GLP039"** (accent, berikon unggah). Tombol Ekspor selisih belum
tercatat di mana pun sebelumnya — ia mengekspor daftar selisih, bukan seluruh
pagu; perilaku persisnya belum ditetapkan dan **wajib ditanyakan** saat tugas
Selisih (urutan-7) dikerjakan.

**[gbr] Subteks empat kartu statistik**, kalimatnya mengikat:
Pagu revisi → `Lock pagu Rp 0` · Realisasi SAKTI → `66,67% dari pagu` ·
Tercatat kas tunai → `Termasuk yang belum GUP` · Selisih → `4 titik perlu ditinjau`.
Judul kartu pertama memuat kode simpul aktif (`PAGU REVISI — 521211`).

**[gbr] Baris transaksi di panel kanan** memakai nomor transaksi bergaya
`KT-2026-0142`, baris kedua `22 Jul · CV Mitra Bahari`, nilai disingkat
(`Rp 2,5 jt`), dan pil status di kanan (`BELUM DRPP` / `DRPP 06` / `DRAFT HP`).
Transaksi bermode draft HP boleh bernilai **`—`** (belum ada nominal) — jangan
dirender `Rp 0`, karena nol dan belum-diisi bukan hal yang sama.

Segmented pil 3 tab (kontainer `--color-neutral-200` padding 4px, opsi aktif
accent putih): Pencocokan · Selisih & tindakan · Unggah GLP039.

1. **Strip umur data** (radius 16px, marginBottom 18px):
   - segar: isi `--color-accent-100`, border `1px --color-accent-300`, ikon jam,
     teks "**Data SAKTI per 25 Jul 2026** · diunggah oleh &lt;nama dari sesi&gt; ·
     umur 3 hari.", kanan tautan "Riwayat unggahan →".
   - basi (>14 hari): isi `--color-accent-2` teks putih, ikon peringatan, kalimat
     ditutup "— angka ini sudah kedaluwarsa, unggah GLP039 terbaru sebelum
     membebani pagu.", kanan tombol putih "Unggah GLP039".
2. **4 kartu statistik**, judul kartu pertama mengikuti simpul aktif (mis. "Pagu
   revisi — DL", subteks "Lock pagu Rp …"). Kartu berubah nilainya saat menelusuri
   (nilai simpul aktif, bukan total satker) — di akar memakai total satker
   berlabel `DIPA 2026`.
3. **Jejak langkah** (breadcrumb) — **menggantikan indentasi tabel pohon**: "Satker"
   lalu `kode · uraian` per tingkat, dipisah `›`. Segmen bukan-terakhir = teks
   accent-700 dapat diklik (kembali ke tingkat itu); segmen terakhir = pil
   `--color-accent-100` 600. Uraian >26 karakter dipotong elipsis.
4. **Tabel anak satu tingkat** (bukan pohon penuh), kolom: Segmen anggaran · Pagu
   revisi · Realisasi SAKTI · Kas tunai · Serapan · (chevron).
   - Sel pertama: uraian 15px; baris kedua `<tingkat> <kode>` 12px neutral-600 +
     pil temuan bila ada. **Nama tingkat ditulis eksplisit** (Program / Kegiatan /
     KRO / RO / Komponen / SubKomponen / Akun / Item POK) — ini yang menggantikan
     informasi yang tadinya dibawa oleh indentasi.
   - Kolom Kas tunai magenta 600 bila ≠ SAKTI.
   - Serapan: bar 44px (34px saat dense §3 tabel kerapatan) + persen 13px/600.
   - Kolom terakhir: chevron accent-700 bila punya anak, titik neutral-400 bila
     item POK terdalam (tidak punya anak).
   - Klik baris **punya anak** → menelusuri masuk (breadcrumb bertambah satu
     segmen, anak pertama otomatis terpilih untuk panel kanan). Klik baris
     **terdalam** → hanya memilih (tidak menelusuri). Pada mode drawer (<1366px),
     klik juga membuka drawer.
   - Baris bermasalah (flag temuan ≠ "di luar lingkup") berlatar
     `--color-accent-2-100` radius 14px; baris terpilih `--color-accent-100`.
   - Bila simpul tidak punya anak: teks "Item POK terdalam — rinciannya ada di
     panel kanan." (bukan tabel kosong).
5. **Panel kanan**:
   - kicker `<tingkat> <kode>`, uraian 20px/600, pil temuan.
   - **Kartu accent** "Sisa dana tersedia" 28px/600 + catatan rumus
     `pagu − lock − MAX(SAKTI, kas tunai)` (rumus persis bagian 4, ditulis ulang
     sebagai teks bantu, bukan dihitung ulang di tampilan).
   - **Bila pagu terkunci** (`lockPagu > 0`), kartu accent **diganti** kartu
     magenta "Pembebanan diblokir" (ikon gembok) — ini blokir keras, bukan
     sekadar peringatan (konsisten dengan R-4/klasifikasi "Pagu terkunci" bagian 4).
   - Rincian 5 baris: Pagu revisi · Lock pagu · Realisasi SAKTI · Tercatat kas
     tunai · Selisih (magenta bila ≠ 0).
   - Daftar transaksi kas tunai pada item itu: nomor, `tanggal · penyedia`, nilai,
     pil status (Belum DRPP / DRPP 06 / Draft HP). Untuk baris **item yatim**
     (R-3): tampil `tanggal · kode item <yang hilang>` — bukan dihilangkan.
   - Aksi: "Catat pada item ini" (accent; berubah jadi "Pantau status revisi" bila
     terkunci) · "Tandai wajar" (buka dialog 3b.7) · "Riwayat".
   - **Versi pertama tetap baca-saja** (papan status bagian 1) — kartu/aksi di
     atas adalah desain akhir; implementasi tugas urutan-3 hanya membangun bagian
     baca (tabel + panel tanpa tombol aksi tulis).

### 3b.4 Tab Selisih & tindakan
- 3 kartu: Perlu tindakan (accent) · Sudah ditandai wajar (subteks "Kedaluwarsa
  bila nilai berubah") · Di luar lingkup kas tunai (subteks "Dibayar LS — tidak
  dihitung temuan").
- **Catatan lingkup** (kotak netral radius 16px) wajib ada, teks: "Item yang tidak
  pernah dibebani kas tunai tidak muncul di sini. Kas tunai hanya menampung
  UP/GUP, jadi belanja LS — kontraktual, modal, gaji — memang nol di sisi kas dan
  bukan temuan."
- Tabel `Kode · Temuan · Jenis · Nilai · Tindakan`: kolom Temuan = uraian 15px +
  penjelasan 13px neutral-700 yang menyebut **bukti** (No DRPP/SPP/SP2D atau
  tanggal revisi POK). Kolom Tindakan = 13px/600 accent-700 + panah, **tautan
  nyata** ke layar tujuan (lihat bagian 4, "harus benar-benar berfungsi").
- Lima jenis yang harus bisa tampil (semua pil magenta): Belum di-DRPP · Menunggu
  SPM/SP2D · Sudah SP2D nilai beda · Item yatim · Pagu terkunci — cocok dengan
  tabel klasifikasi bagian 4.

### 3b.5 Tab Unggah GLP039
- Zona jatuh berkas: radius 20px, `2px dashed --color-accent`, isi
  `--color-accent-100`, ikon berkas xls, judul "Tarik berkas GLP039 ke sini",
  instruksi jalur SAKTI + kalimat "Berkas dibaca di peramban ini; hanya hasil
  ringkasnya dikirim ke Sheets.", tombol "Pilih berkas" (accent).
- **Tabel pemetaan kolom** `128px 1fr 1.2fr 108px` — 12 baris, pil "Terdeteksi"
  cyan / "Diabaikan" outline, isinya sesuai tabel kolom nilai di bagian 4.
- Panel kanan:
  1. **Kartu konfirmasi hasil baca** (R-5) — teks "Bandingkan dengan cetakan
     GLP039 Anda. Belum ada yang disimpan sampai Anda menekan Simpan." + 7 baris
     baca-ulang (Tanggal data, Baris terbaca, Item POK, Akun belanja, Total pagu
     revisi, Realisasi s.d. periode, Serapan) + tombol "Angka cocok — simpan
     versi" (accent) dan "Batalkan". **Tanpa penekanan tombol ini, tidak ada
     tulisan ke Sheets** — ini syarat keras, bukan UX opsional.
  2. **Kartu peringatan magenta** — satu baris per elemen `peringatan[]` dari
     `parseGlp039()`. Contoh yang wajib bisa muncul: pagu terkunci; kode item
     transaksi lama yang hilang di versi ini ("akan tampil sebagai item yatim,
     bukan dihilangkan").
  3. Catatan versioning: "Versi lama tidak ditimpa… tanggal berkas, tanggal
     unggah, pengunggah, dan sidik berkas." (sesuai `PAGU_UPLOAD`, bagian 4).

### 3b.6 Perjalanan dinas / Rekonsiliasi / Laporan
Sama seperti uraian v1 di atas, dengan penyesuaian kerapatan (tabel §3) dan
tambahan: SPD → kartu uang muka accent menyebut PUM (mis. "2 pelaksana · 4 hari ·
PUM R. Latumahina", sambungkan ke `MasterPUM.gs`); Rekonsiliasi → kartu keempat
"Dikecualikan"; Laporan → kartu "Bundel SPJ perjalanan" (ZIP).

### 3b.7 Dialog "Tandai wajar" (R-4)
Backdrop `rgba(32,30,29,.42)`; kotak 520px, `--color-bg`, radius 22px, padding
`26px 28px`.
- kicker "Item &lt;kode&gt; · selisih Rp …" — **nilai selisih ikut tercatat di
  kicker**, bukan cuma di form.
- judul "Tandai selisih ini wajar" 23px/600.
- paragraf penjelasan: tanda mematikan peringatan pengendalian; alasan dicatat
  bersama nama dan nilai selisih; **bila nilai selisih berubah, tanda gugur
  otomatis** (konsisten dengan R-4).
- field **Alasan — wajib**: area teks 84px radius 14px isi `--color-neutral-200`;
  placeholder contoh kalimat nyata. Tombol simpan **nonaktif selagi kosong**.
- meta baca-saja: Ditandai oleh (dari sesi login, bukan diketik) · Waktu ·
  "Berlaku sampai nilai selisih berubah".
- aksi: Batal · "Simpan tanda wajar" (accent).

Tanda tangan mengikat: `serverTandaiWajar(token, kodeItem, nilaiSelisih, alasan)`
— `alasan` wajib, tolak di server bila kosong/whitespace. Simpan
`kodeItem, nilaiSelisihSaatDitandai, alasan, olehUser, waktu, dicabutOleh, waktuCabut`
(persis seperti R-4 di bagian 5 — dialog ini implementasi visualnya).

### State layar (v2, untuk implementasi router/JS)

| Nama | Isi |
|---|---|
| `tab` | `papan` \| `transaksi` \| `pagu` \| `spd` \| `rekon` \| `laporan` |
| `paguSub` | `cocok` \| `selisih` \| `unggah` |
| `path` | array kode simpul dari akar → tingkat aktif (jejak langkah/breadcrumb) |
| `sel` | kode simpul terpilih untuk panel kanan |
| `row` | indeks transaksi terpilih |
| `filter` | chip aktif daftar transaksi |
| `drawer` | drawer panel terbuka (hanya <1366px) |
| `dialog` | `null` \| `wajar` |

Satu router `showScreen(nama)`; **jangan ada `switchTab` kedua** (sudah jadi
aturan di bagian 7, ditegaskan ulang paket v2). Berpindah menu menutup drawer.
Jejak langkah dan tabel anak wajib bisa dioperasikan dari papan ketik: baris =
elemen fokusabel, `aria-expanded` pada baris yang punya anak, fokus terlihat
(`:focus-visible { outline:2px solid var(--color-accent); outline-offset:2px }`).

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
