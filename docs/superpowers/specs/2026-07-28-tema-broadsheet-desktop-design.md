# Desain: Tema Broadsheet menyeluruh + kerangka v2 (desktop)

## Konteks

Pengguna mengirim dua tangkapan layar (28 Jul 2026): prototipe v2 layar "Pagu &
realisasi" dengan keterangan *"saya mengharapkan tampilan seperti ini"*, lalu
aplikasi yang sedang berjalan dengan keterangan *"sementara tampilan saat ini
masih"*. Dokumen ini mengurus jarak antara keduanya pada lapisan **bahasa
visual dan kerangka**, bukan susunan isi layar.

Jarak itu terdiri dari tiga pekerjaan terpisah. Pengguna memilih yang pertama:

| | Pekerjaan | Status |
|---|---|---|
| **A** | Tema Broadsheet menyeluruh + bar atas + penamaan/urutan menu | **dokumen ini** |
| B | Layar "Pagu & realisasi" (tab Pencocokan) | brainstorm terparkir di Bagian 1 |
| C | Layar "Papan kerja" | spec ada, disesuaikan v2, belum dibangun |

Acuan visual: `docs/HANDOFF-DESKTOP.md` bagian 3b (paket desain v2) dan bagian 6
(token). Kerangka rail sudah dibangun sebelumnya (`f89dd42`) dan **sudah** memakai
token `--bs-*`; pekerjaan ini melanjutkannya ke seluruh aplikasi.

## Keadaan terukur saat ini

Dihitung dari `index.html`, bukan diperkirakan:

| Di mana | Warna hardcoded | Nasib |
|---|---|---|
| 13 blok `<style>` aplikasi | 218 | dikonversi |
| `style="..."` inline pada markup aplikasi | 45 | dikonversi |
| String HTML dokumen cetak (SPJ, kuitansi, bukti potong, SSP) | 74 | **tidak disentuh** |
| Lewat `var(--c-*)` | 125 pemakaian | dikonversi |

Ada seam yang sudah bersih: komentar di `:root` menyatakan `--bs-*` dipakai
**hanya** oleh `.rail`/`.app-main`, dan `--c-*` oleh layar lama. Pekerjaan ini
memindahkan seam itu sampai `--c-*` habis.

**Source Serif 4 sudah dimuat** (`index.html:10`, bobot 400 & 600). Tidak ada
pekerjaan font.

## Keputusan yang sudah disetujui pengguna (28 Jul 2026)

| Topik | Keputusan |
|---|---|
| Kosakata warna status | **Ikut Broadsheet sepenuhnya** — tiga warna saja (accent teal, magenta, netral). Hijau/oranye/merah/ungu dilepas. |
| Layar "Nota Kena Pajak" | **Tetap menu tersendiri** (rail jadi tujuh butir, menyimpang dari paket desain yang menyebut enam). Alasan: layar itu dipakai harian; menyembunyikannya di bawah Laporan menjadikan setor pajak dua klik. |
| Cara konversi | **Per layar secara utuh**; nilai `--c-*` tidak disentuh sampai commit terakhir. Sebuah layar selalu utuh-lama atau utuh-baru, tidak pernah separuh. |

## Bagian 1 — Aturan konversi

### 1a. Seam dijaga, bukan digeser

Nilai `--c-*` **tidak diubah** sampai langkah terakhir. Yang bertambah hanya
pemakaian `--bs-*`. Alternatif yang ditolak: memetakan ulang nilai `--c-*` ke
warna Broadsheet akan menggeser 125 pemakaian sekaligus tetapi meninggalkan 263
warna hardcoded pada nilai lama — hasilnya latar `#f3f2f2` bertabrakan dengan
judul `#0f766e`, pada aplikasi yang dipakai harian memegang saldo puluhan juta.

### 1b. Token yang perlu ditambahkan

Sudah ada 12: `--bs-bg --bs-ink --bs-paper --bs-ac --bs-ac7 --bs-ac1 --bs-a2
--bs-n200 --bs-n400 --bs-n600 --bs-n700 --bs-fh`.

Ditambahkan tujuh:

```css
--bs-ac3:#99e0ff;   /* aksen lembut: strip data segar, border */
--bs-ac6:#0077a0;   /* hover/pressed tombol accent */
--bs-a21:#fff1f4;   /* latar baris/kartu yang perlu tindakan */
--bs-a29:#4b1528;   /* teks di atas latar magenta lembut */
--bs-n300:#d7d3d3;  /* garis, tile foto */
--bs-n800:#444141;  /* pil ink */
--bs-fb:'Source Serif 4',Georgia,serif;  /* font body, terpisah dari --bs-fh */
```

Penamaan mengikuti pola singkat yang **sudah dipakai** di berkas (`--bs-ac7`,
`--bs-n200`), bukan nama panjang dari paket desain. Konsisten dengan berkas lebih
penting daripada sama persis dengan dokumen.

### 1c. Urutan pengerjaan

Tiap langkah satu commit yang bisa dibatalkan sendiri:

```
1. Kerangka        token dilengkapi, bar atas, penamaan & urutan menu,
                   latar body, breakpoint rail <1366px
2. Transaksi       layar tersibuk; sekaligus penguji apakah pendekatannya benar
3. Nota Kena Pajak
4. Pagu & realisasi (layar "Ketersediaan Dana" yang sudah ada)
5. Rekonsiliasi
6. Perjalanan Dinas
7. Laporan
8. Hapus --c-* dari :root
```

Urutan kerja ini **sengaja berbeda** dari urutan menu di Bagian 2a: layar diurutkan
menurut seberapa sering dipakai, supaya kesalahan pendekatan ketahuan pada layar
yang paling banyak memberi sinyal, sedini mungkin.

Langkah 8 bukan sekadar bersih-bersih — ia **bukti objektif**. Bila masih ada
aturan CSS yang memakai `--c-*`, layar itu langsung terlihat rusak saat diuji,
bukan diam-diam tertinggal dengan warna lama yang kebetulan mirip.

### 1d. Batas yang tidak dilewati

- **Dokumen cetak tidak disentuh.** 74 warna di string HTML `_render*Html` /
  `cetak*` adalah dokumen kertas resmi — tinta hitam di atas putih. Menyeragamkan
  dengan aplikasi justru salah. (Dokumen itu bahkan sudah memakai Source Serif 4
  dan `#201e1d`, jadi memang sudah selaras.)
- **Struktur layar tidak diubah.** Pekerjaan ini mengganti bahasa visual, bukan
  susunan isi. Lihat Bagian 3d.
- **Modal ikut layar pemanggilnya**, bukan langkah tersendiri — supaya tidak ada
  layar "sudah baru" yang modalnya masih lama.

## Bagian 2 — Kerangka

### 2a. Menu

Enam sekarang, tujuh saat "Papan kerja" lahir. Urutan mengikuti v2 dengan Nota
Kena Pajak disisipkan setelah Transaksi (keduanya pekerjaan harian):

```
Transaksi · Nota Kena Pajak · Pagu & realisasi · Perjalanan dinas ·
Rekonsiliasi · Laporan
```

- **"Ketersediaan Dana" berganti nama jadi "Pagu & realisasi"** sekarang juga.
  Nama itu jujur menggambarkan layar lama (memang menyandingkan pagu dengan
  realisasi), jadi bukan janji palsu, dan saat layar v2 menggantikannya nanti
  namanya sudah benar.
- **"Papan kerja" tidak ditambahkan.** Layarnya belum ada; menu yang membuka
  halaman kosong lebih buruk daripada menu yang belum ada.

Pil radius 999px, min-height 42px, gap 3px. Aktif = isi `--bs-ac`, teks putih,
bobot 600.

### 2b. Lencana angka

Hanya muncul bila angkanya **nyata dan > 0**. Pil magenta 11px/600; pada menu
aktif jadi `rgba(255,255,255,.25)`.

| Menu | Sumber angka |
|---|---|
| Transaksi | jumlah transaksi yang cocok dengan penyaring chip **"Belum SPJ"** yang sudah ada. **Pakai ulang predikat penyaring itu**, jangan menulis kriteria kedua — dua definisi "perlu tindakan" yang menyimpang diam-diam adalah cara klasik angka di rail berbeda dari isi layarnya |
| Rekonsiliasi | jumlah selisih dari `_refreshRingkasanRekon` yang sudah ada |
| Pagu & realisasi | **tidak diberi lencana** |

Angka "4 titik perlu ditinjau" di prototipe berasal dari layar v2 yang belum
dibangun. Lencana berangka palsu lebih buruk daripada tanpa lencana.

### 2c. Kaki rail

Paket desain v2 menaruh banner antrean HP + avatar di sana, tetapi **tidak
menyebut** ke mana "Kelola User", "Pengaturan", dan "Keluar" pergi — ketiganya
ada di rail yang berjalan sekarang. Keputusan:

- **Saldo tetap di kaki rail**, digayakan Broadsheet.
- **Kelola User · Pengaturan · Keluar masuk ke avatar** di paling bawah: klik
  avatar → menu kecil. "Kelola User" hanya untuk admin, seperti sekarang.

**Pagar wajib:** elemen saldo harus tetap membawa kelas `saldo-pill`.
`_applyRoleUI()` menyembunyikan saldo untuk peran `viewer` lewat selektor itu —
kontrol akses, bukan hiasan. Kalau hilang tidak ada error apa pun; saldo cuma
diam-diam terlihat oleh yang tidak berhak. Ini pernah nyaris terjadi saat rail-nav
dibangun.

### 2d. Bar atas

Dibangun di langkah 1 dengan isi minimal: tombol "Catat transaksi" (pil accent)
dan garis bawah `1px --bs-n300`, padding `14px 24px`.

Kolom cari dan pemilih periode **baru dipindahkan ke sana saat layar Transaksi
dikonversi di langkah 2** — memindahkannya di langkah 1 berarti menyentuh dua
layar dalam satu langkah dan melanggar aturan 1a.

### 2e. Breakpoint

Ikut dikerjakan di langkah 1 karena ini pekerjaan kerangka dan aturannya sudah
pasti di `docs/HANDOFF-DESKTOP.md` bagian 3:

- **< 1366px**: rail menyusut jadi **76px ikon saja**, label lewat atribut
  `title`, lencana jadi titik 8px di pojok.
- **< 1024px**: arahkan ke `mobile.html` (perilaku yang sudah ada).

**Belum** dikerjakan: drawer panel detail dan penyingkatan rupiah di tabel —
keduanya butuh panel dan tabel yang belum ada.

## Bagian 3 — Kosakata visual

### 3a. Prinsip: keadaan "beres" tidak diberi warna

Sekarang hijau "Lunas" berteriak sekeras oranye "Belum SPJ" — dua-duanya menarik
mata, padahal hanya satu yang butuh tindakan. Bila yang beres jadi diam, magenta
tinggal satu-satunya yang nyaring. Meski warna berkurang dari tujuh jadi tiga,
memindai daftar justru **lebih mudah**, bukan lebih sulit.

### 3b. Pemetaan

| Sekarang | Jadi |
|---|---|
| Hijau: "Lunas", "SPJ Lengkap", "Nota 100%", "tersimpan", "Bebas PPh & PPN" | tanpa pil, atau pil netral tipis bila memang perlu disebut |
| Oranye/merah: "Belum SPJ", "Nota Belum Lunas", "Cek pajak manual" | **pil magenta** — satu-satunya warna yang berarti "perlu tindakan Anda" |
| Hijau "Tunai" / biru "Bank" | pil ink `--bs-n800` — informasi, bukan status |
| Nominal keluar merah / masuk hijau | teks ink, rata kanan, `--bs-fh` 600, `tabular-nums`. Tanda minus dan posisi kolom sudah membawa arahnya |
| Tujuh chip filter berwarna-warni | aktif = isi accent teks putih; sisanya border `1px --bs-n400`. Hanya satu aktif pada satu waktu, jadi warna pada chip nonaktif tidak membawa informasi |
| Tombol ungu "Catat Kembali", "Pajak" gelap | tombol netral. Mewarnai aksi menghabiskan warna yang seharusnya untuk masalah |

### 3c. Kompensasi hilangnya warna

- **Latar kartu bermasalah** `--bs-a21` (#fff1f4) radius 14px — seluruh kartunya
  bernada merah muda, bukan cuma pil kecil di sudut. Terbaca dari jarak jauh;
  sesuatu yang pil berwarna tidak pernah bisa.
- **Posisi tetap** — pil status selalu di tempat yang sama pada kartu/baris.
- **Tipografi seragam** — 11px/600, huruf besar, `letter-spacing .06em`.

### 3d. Batas: bahasa visual, bukan struktur

Sesudah langkah 2, layar Transaksi bernuansa Broadsheet tetapi **masih dua kolom
kartu** ("Belum Ada Nota" / "Sudah Ada Nota") — bukan tabel dengan panel detail
seperti prototipe. Mengubahnya jadi tabel + panel menyentuh alur kerja, bukan
warna, dan merupakan pekerjaan tersendiri (urutan-12 di papan status
`docs/HANDOFF-DESKTOP.md`).

Disampaikan ke pengguna dan disetujui: sesudah seluruh langkah ini aplikasi akan
**terasa** seperti prototipe — font, warna, kerangka, bar atas, rail — tetapi
susunan isi tiap layar belum.

## Bagian 4 — Pagar keselamatan

Empat hal yang pernah atau bisa rusak diam-diam, dijaga eksplisit **tiap langkah**:

1. **`.saldo-pill` bertahan** — lihat 2c. Kontrol akses peran `viewer`.
2. **`#mobileTip` tidak meremas konten jadi 0px.** Banner "buka di HP" adalah
   saudara flex dari `.app-main` dan pernah membuat seluruh isi aplikasi selebar
   nol. Penjagaannya `flex:0 0 100%` pada banner, `flex-wrap:wrap` pada `body`.
3. **Rail tetap lengket saat halaman digulung**
   (`position:sticky; top:0; align-self:flex-start; max-height:100vh;
   overflow-y:auto`). **Jangan** menjadikan `.app-main` wadah gulir — itu merusak
   `window.scrollTo(0,0)` yang dipakai di banyak tempat.
4. **Dokumen cetak tidak berubah satu byte pun** — dibuktikan dengan memastikan
   tidak ada fungsi `_render*Html` / `cetak*` tersentuh di diff.

## Bagian 5 — Cara verifikasi

### 5a. Bukti sebuah layar tuntas

Dua pemeriksaan objektif, bukan penilaian mata. Cakupan yang diperiksa untuk satu
layar ada tiga tempat:

1. blok `<style>` milik layar itu,
2. markup `#view<Nama>` beserta modal yang dipanggilnya,
3. **fungsi JS yang merakit markup aplikasi** untuk layar itu (mis. `renderList`,
   `renderDana`) — ini ikut diperiksa karena banyak warna ada di string
   `style="..."` yang dirakit di JS, bukan di CSS.

Yang **dikecualikan**: fungsi yang merakit **dokumen cetak** (`_render*Html`,
`cetak*`). Cara membedakannya: dokumen cetak merakit HTML lengkap dengan
`<html>`/`<head>`-nya sendiri dan dibuka lewat `_bukaPopup`; markup aplikasi
disuntikkan ke elemen yang sudah ada lewat `innerHTML`.

Pada ketiga tempat yang diperiksa:

- tidak ada warna hardcoded tersisa (`#rrggbb` / `#rgb`)
- tidak ada `var(--c-*)` tersisa

Layar dinyatakan selesai hanya bila **keduanya kosong**. Ini yang membuat langkah 8
aman: yang tertinggal ketahuan sebelum penghapusan, bukan sesudahnya.

### 5b. Verifikasi tiap langkah

- **Klik nyata** menyusuri keenam menu (`page.click()`, **bukan** `page.evaluate`).
  Memanggil fungsi langsung membuktikan logika, bukan markup — pelajaran bug
  `onclick` di `docs/HANDOFF-MOBILE.md` bagian 1 berlaku sama di desktop.
- **Tangkapan layar tiap layar** sebagai bukti visual yang bisa diperiksa pengguna.
- **Peran `viewer`** diuji setelah tiap langkah: saldo tersembunyi.
- **Lebar 1440px dan 1280px** diuji setelah langkah 1: rail penuh vs ikon saja,
  dan konten tidak selebar nol saat `#mobileTip` tampil.

### 5c. Verifikasi akhir

Manual di browser sungguhan setelah `deploy.bat`. Uji otomatis membuktikan markup
dan warna, bukan bagaimana rasanya dipakai.

## Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `index.html` | seluruh pekerjaan: `:root`, 13 blok `<style>`, markup rail & bar atas, markup 6 layar, inline style |

Tidak ada `.gs` yang berubah. Tidak ada endpoint baru. Tidak ada perubahan skema
sheet. `mobile.html` tidak disentuh.

## Status

Bagian 1-5 disetujui pengguna bertahap (28 Jul 2026). Langkah berikutnya:
`writing-plans`.
