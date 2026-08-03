# Handoff: Papan Kerja v3 — Desain Ulang Desktop

> **Untuk Claude Code.** Dokumen ini adalah spec + rencana implementasi. Ikuti
> `superpowers:subagent-driven-development` atau `superpowers:executing-plans`,
> task-by-task. Simpan salinan dokumen ini di
> `docs/superpowers/specs/2026-08-03-papan-kerja-v3-design.md` sebelum mulai.

**Repo:** `dausdabamona/kas-tunai`, branch `claude/determined-archimedes-od8jtc`
**Berkas utama:** `index.html` (layar `#viewPapan`), `Code.gs`, modul `.gs` terkait
**Menggantikan:** susunan `#viewPapan` hasil `docs/superpowers/plans/2026-07-29-papan-kerja-desktop.md`

---

## 1. Kenapa diubah

Umpan balik pengguna (bendahara/operator input) atas layar yang berjalan sekarang:

| Keluhan | Sumbernya di layar sekarang |
|---|---|
| Ruang terbuang, kepadatan salah | 5 kartu statistik radius 20px + padding 20px 22px memakan seluruh lipatan pertama |
| Daftar "Menunggu tindakan" melelahkan | 273 baris dalam satu daftar, hanya dipisah bulan → DRPP |
| Tidak jelas mana yang dikerjakan lebih dulu | tidak ada pengurutan prioritas, hanya "nilai terbesar" |
| Panel kanan terasa kosong | Antrean HP sering "0 draft", Kotak masuk scan sering kosong |

**Pertanyaan yang harus dijawab layar ini saat dibuka:**
*"Apa lima hal yang harus saya kerjakan hari ini."*

**Nada bahasa:** ramah dan memandu, kalimat penuh Bahasa Indonesia. Bukan label
telegrafis. Contoh yang benar: *"Belanja ini belum punya nomor SPBY, jadi belum
bisa masuk ke berkas GUP berikutnya."*

**Lingkup:** desktop saja. `mobile.html` tidak disentuh.

---

## 2. Susunan layar baru (urut dari atas)

Acuan visual: berkas desain `Papan Kerja (desain ulang).dc.html` (dilampirkan
pengguna). Semua warna WAJIB dari token `--bs-*` yang sudah ada di `:root`
`index.html` — **tidak ada warna baru**.

### 2.1 Sapaan harian (baru)

- Baris kecil huruf kapital: tanggal hari ini dalam Bahasa Indonesia (`Senin, 3 Agustus 2026`),
  12px, `letter-spacing:.14em`, `text-transform:uppercase`, `var(--bs-n600)`.
- Judul `<h1>` 38px `var(--bs-fh)` weight 600 `var(--bs-ink)`:
  **"Selamat pagi. Ada lima hal yang sebaiknya Anda selesaikan hari ini."**
  Jumlahnya ditulis huruf (lima/empat/tiga…) dan mengikuti jumlah item fokus yang
  benar-benar tersisa; bila nol, judulnya berubah (lihat 2.3).
- Paragraf 16px `var(--bs-n700)`, `max-width:62ch`: menjelaskan sisanya menunggu di
  antrean dan tidak akan hilang.
- Tombol "Catat transaksi" tetap ada, pindah ke kanan sapaan (bukan di `.topbar-v2`
  lagi bila memungkinkan tanpa mengganggu tab lain — bila mengganggu, biarkan di
  `.topbar-v2` dan lewati bagian ini).

### 2.2 Empat angka, tanpa kotak (mengganti 5 kartu)

Baris `display:flex;flex-wrap:wrap;gap:56px`. **Tidak ada kotak, tidak ada radius,
tidak ada latar.** Tiap angka: label kapital 12px `var(--bs-n600)`, angka 34px
weight 600 `font-variant-numeric:tabular-nums`, subteks 13px.

| # | Label | Nilai | Subteks | Warna angka |
|---|---|---|---|---|
| 1 | Saldo kas tunai | `saldo.saldoTunai` | "Terhitung sampai hari ini" | `--bs-ink` |
| 2 | Belum di-SPBY | jumlah | "Senilai <rupiah>" | `--bs-ink` |
| 3 | Pajak belum disetor | `pajakBelumSetor` | "Batas setor tanggal N — X hari lagi" / "sudah lewat" | `--bs-a2` bila >0 atau lewat, selain itu `--bs-ink` |
| 4 | Rekonsiliasi | `rekon.counts.belum` | "Belum dicocokkan · N selisih nilai" | `--bs-a2` bila `nilaiBeda>0` |

**Dihapus dari papan:** kartu "Bank / UP", kartu "Pindah dana (bank ↔ tunai)", dan
panel "Sisa pagu paling tipis". Pindah dana tetap dihitung `_pkRenderKartu` sekarang —
hapus perhitungannya bila tidak dipakai lagi (jangan tinggalkan kode mati). Sisa pagu
tetap tersedia di layar **Pagu & realisasi**.

### 2.3 "Lima hal hari ini" (blok baru, inti layar)

Daftar bernomor `01`–`05`, dipisah `border-top:1px solid var(--bs-n300)` per baris —
bukan kartu. Grid `52px 1fr 200px 170px`, gap 20px.

- Kolom 1: nomor urut 30px `var(--bs-n400)` tabular-nums.
- Kolom 2: judul 19px `var(--bs-ink)`; meta 13px `No · penjab · tanggal`;
  **kalimat alasan** 14px `var(--bs-n700)`, `max-width:58ch` — satu kalimat penuh
  yang menjelaskan kenapa item ini perlu dikerjakan (lihat tabel di 2.4).
- Kolom 3: nominal 19px rata kanan tabular-nums; `—` bila tidak bernilai (berkas scan).
- Kolom 4: satu tombol aksi utama pil `--bs-ac`, min-height 40px.

**Cara memilih lima item:** gabungkan seluruh antrean (SPBY, pajak, nota, foto),
urutkan **nilai kredit menurun**, ambil `n` teratas (`n` = 5, bisa dikonfigurasi
konstanta `PK_FOKUS_N`). Item yang baru diselesaikan hilang dan penggantinya naik
tanpa memuat ulang seluruh papan.

**Keadaan kosong:** judul `<h1>` berubah jadi *"Selamat pagi. Tidak ada yang mendesak
hari ini."* dan blok ini menampilkan kalimat miring: *"Lima hal itu sudah beres.
Silakan lanjut ke antrean di bawah, atau tutup layar ini dengan tenang."*

Di sebelah judul blok, teks abu: `"N lainnya menunggu di antrean"` atau
`"Ini semua yang tersisa"`.

### 2.4 Antrean pekerjaan (mengganti satu daftar panjang)

Pemilih antrean: baris pil, min-height 44px, radius 999px. Aktif =
`background:var(--bs-ink);color:var(--bs-paper)`; tidak aktif = `1px solid var(--bs-n400)`
transparan. Tiap pil membawa badge jumlah.

| Kunci | Nama pil | Kriteria (dari `_pkKriteriaTindakan`) | Aksi inline | Kalimat alasan di blok fokus |
|---|---|---|---|---|
| `spby` | Belum di-SPBY | `kredit>0 && !noSpby` | Catat SPBY | "Belanja ini belum punya nomor SPBY, jadi belum bisa masuk ke berkas GUP berikutnya." |
| `pajak` | Pajak belum diisi | `kredit>0 && pajakKatIdx==null` | Isi pajak | "Kategori pajaknya belum diisi, padahal batas setornya tanggal N." |
| `nota` | PUM belum bernota | `sisaPUM>0` | Catat nota | "Uang mukanya belum tertutup nota — nilainya masih dihitung sebagai uang yang Anda pegang." |
| `foto` | Foto belum dikaitkan | berkas `ScanInbox` tanpa `NO_TRANSAKSI` | Kaitkan foto | "Berkas scan ini belum menempel ke transaksi mana pun." |
| `rekon` | Rekon selisih | `statusRekon==='NILAI_BEDA'` | Periksa | — |

Di bawah pil: kalimat keterangan antrean yang sedang dipilih (15px, `max-width:64ch`)
+ pemilih **Urutkan** yang sudah ada (`nilai-desc` / `nilai-asc` / `tgl-desc` / `tgl-asc`),
dipertahankan apa adanya.

Isi antrean tetap **dikelompokkan dua tingkat: bulan → DRPP**, memakai logika
`_pkRenderTindakan` yang sudah ada (`_pkBulanKey`, `_pkNamaBulan`, `pkGrupTutup`,
`_pkPembanding`, aturan `''` = "Belum masuk DRPP" selalu pertama). Yang berubah hanya
gayanya:

- Judul bulan: 20px `var(--bs-fh)`, `border-bottom:2px solid var(--bs-ink)`, ringkasan
  di kanan (`N berkas · Rp …`). Bukan pil `--bs-n200` lagi.
- Sub-judul DRPP: 12px kapital `letter-spacing:.1em` + badge jumlah + total di kanan.
- Baris: grid `1fr 190px 150px 132px`, min-height 44px,
  `border-bottom:1px solid var(--bs-n200)`, hover `#f7f6f6`. Kolom 2 = kalimat status
  pendek (mis. "Belum ada nomor SPBY"), kolom 3 nominal, kolom 4 tombol aksi outline
  `--bs-ac` min-height 36px.
- **Pil chip magenta `.chip.no` dihapus dari baris.** Magenta tetap dipakai HANYA untuk
  angka pajak/selisih di blok 2.2 dan badge rail — kosakata warna yang mengikat
  (lihat `plans/2026-07-29-papan-kerja-desktop.md`) tidak berubah artinya: magenta =
  perlu tindakan Anda. Karena SELURUH antrean ini adalah "perlu tindakan", menandai tiap
  baris dengan magenta membuat penandanya kehilangan arti.
- Di kaki tiap grup bulan: `"Menampilkan N dari M berkas di antrean ini."`

### 2.5 Panel aksi inline (perluasan dari `_pkBukaSpby`)

Panel yang sekarang hanya ada untuk SPBY (`.pk-spby`) diperluas jadi satu komponen
untuk empat jenis. Latar `var(--bs-ac1)`, radius 14px, `max-width:720px`,
indentasi kiri mengikuti baris.

Isi: kalimat panduan 13px `var(--bs-n700)`, lalu field-field, lalu tombol simpan
(`--bs-ac` pil) + tombol "Tutup"/"Nanti saja" (outline `--bs-n400`).

| Antrean | Field | Panduan |
|---|---|---|
| `spby` | No. SPBY (text + `<datalist>` nomor yang sudah dipakai), Tanggal (date, prefill tanggal transaksi) | "Ketik nomor SPBY baru, atau nomor yang sudah pernah dipakai bila belanja ini digabung ke SPBY yang sama." |
| `pajak` | Kategori pajak (select dari daftar kategori yang sudah ada di layar Nota Kena Pajak), Nomor bukti setor (text, opsional) | "Pilih kategori pajak yang sesuai; nilai PPh dan PPN dihitung otomatis dari nilai notanya." |
| `nota` | Total nota (text bernominal), Kembalian (text bernominal) | "Masukkan total nota yang sudah diterima. Bila ada kembalian, catat juga supaya sisa uang mukanya nol." |
| `foto` | Kaitkan ke transaksi No. (text/datalist nomor transaksi), Label berkas (text) | "Pilih transaksi tujuan lalu beri label singkat pada berkasnya. Label ini yang nanti muncul di berkas GUP." |

Setelah simpan berhasil: perbarui salinan `pkData` di memori dan render ulang —
**jangan** panggil ulang `serverGetPapanKerja` (pola ini sudah dipakai `_pkSimpanSpby`,
ikuti persis). Baris hilang dari antrean, dan bila ia salah satu dari lima item fokus,
penggantinya naik.

### 2.6 Kaki halaman: Kartu ketenangan

Turun jadi catatan kaki di bawah `border-top:1px solid var(--bs-n300)`, bukan kotak
`--bs-n200` lagi: label kapital + satu baris `N cocok · N belum dicocokkan · N selisih
nilai` + baris impor terakhir + tautan teks "Buka layar Rekonsiliasi"
(`switchTab('rekon')`).

**Catatan bug yang harus sekalian diperbaiki:** sekarang kartu menampilkan
`Impor terakhir: [object Object]` — `r.lastImport` bukan string. Format jadi tanggal
Indonesia yang terbaca (mis. "Rekening koran terakhir diimpor 31 Juli 2026."); bila
`lastImport` benar-benar kosong, pakai kalimat "Belum ada impor rekening koran."

### 2.7 Yang dihapus dari layar

- **Kartu Antrean HP** (`.pk-antre`, `_pkRenderAntrean`). Hampir selalu "0 draft" dan
  memakan slot paling menonjol di panel kanan.
- **Kotak masuk scan** sebagai panel tersendiri (`_pkRenderScan`) — dilebur jadi antrean
  `foto` yang bisa ditindaklanjuti.
- **Panel kanan `.pk-side`** seluruhnya. Layar jadi satu kolom, `max-width:1320px`,
  padding `34px 44px 72px 40px`.
- **Sisa pagu paling tipis** (`_pkRenderPagu`).

**Jangan hapus backend-nya.** `AntreanStatus.gs`, `serverLaporAntrean`, pelaporan draft
di `mobile.html`, dan `Anggaran.ringkasSerapan()` tetap ada — hanya berhenti dipakai di
layar ini. Bila `serapan`/`antreanSemua` tidak lagi dibaca klien, keluarkan dari
kembalian `serverGetPapanKerja` supaya tidak menarik data percuma tiap muat, tapi
biarkan fungsinya hidup untuk pemakai lain.

---

## 3. Perubahan backend yang dibutuhkan

Sebelum menulis, **verifikasi dulu nama fungsi yang benar-benar ada** — jangan percaya
daftar ini mentah-mentah:

```bash
cd /home/user/kas-tunai
grep -n "^function server" Code.gs
grep -n "^\s*function \|return {" FotoNota.gs KasTunai.gs Rekonsiliasi.gs | head -60
grep -rn "ScanInbox" *.gs | head -20
grep -n "PAJAK_REF\|pajakKatIdx\|kategoriPajak" index.html | head -20
```

### 3.1 `serverGetPapanKerja` — tambah field

Tambahkan ke kembalian (semuanya angka/array kecil, satu round-trip tetap):

| Field baru | Isi | Sumber |
|---|---|---|
| `scanBelumKait` | array berkas scan tanpa `NO_TRANSAKSI` (maks 50: `{id, nama, tanggal, url}`) | `ScanInbox` — perlu fungsi list berfilter, cek dulu apakah sudah ada |
| `jumlahAntrean` | `{spby, pajak, nota, foto, rekon}` — hitungan penuh tiap antrean | dihitung di server dari `getTransaksi()` + `scanBelumKait` |
| `kategoriPajak` | daftar kategori untuk select inline `[{idx, nama}]` | sumber yang sama dengan layar Nota Kena Pajak |

Hapus dari kembalian bila tidak dipakai lagi: `serapan`, `antreanSemua`, `scanTerbaru`
(diganti `scanBelumKait`).

**Catatan:** `jumlahAntrean` dihitung di server supaya badge pil menampilkan angka
sebenarnya (273), bukan panjang array yang sudah dipotong.

### 3.2 Endpoint aksi inline

`serverSimpanSpby` sudah ada dan dipakai. Tiga sisanya: **periksa dulu apakah sudah ada
fungsi setara** yang dipakai layar lain (modal Nota, layar Nota Kena Pajak) —
utamakan memanggil ulang yang sudah ada daripada menulis endpoint baru.

| Aksi | Endpoint | Catatan |
|---|---|---|
| Isi pajak | reuse fungsi simpan pajak dari layar Nota Kena Pajak | jangan tulis logika hitung PPh/PPN baru |
| Catat nota + kembalian | reuse `KasTunai` / `Pengembalian.gs` | ikut `IS_DELETED` dan `DeferredFlush` seperti biasa |
| Kaitkan foto | `FotoNota.gs` sudah memegang relasi `NO_TRANSAKSI` + `NOTA_ID` | kemungkinan besar cukup memanggil fungsi yang ada |

Semua tetap lewat `_run(token, fn)`. **Endpoint tidak boleh memanggil endpoint.**

---

## 4. Batasan proyek yang tetap berlaku

- Backend ES5 (`var`, `function`) — tanpa `let`/`const`/arrow/template literal/`class`.
- Frontend vanilla JS satu berkas, tanpa framework, tanpa build step.
- Tidak ada hard delete (`IS_DELETED='Y'`).
- `SpreadsheetApp.flush()` sekali di akhir request via `DeferredFlush.commitAndInvalidate()`.
- Berkas `.gs` baru wajib didaftarkan di `filePushOrder` `.clasp.json`.
- Bahasa UI Indonesia; target klik minimal 40px.
- Tidak ada warna hardcoded — hanya `var(--bs-*)`.
- Commit: Conventional Commits, subjek Bahasa Indonesia imperatif, < 72 karakter.

---

## 5. Urutan tugas yang disarankan

| # | Tugas | Berkas |
|---|---|---|
| 1 | `scanBelumKait` + `jumlahAntrean` + `kategoriPajak` di `serverGetPapanKerja` | `Code.gs`, `ScanInbox`/`FotoNota.gs` |
| 2 | Verifikasi/siapkan endpoint aksi pajak, nota, kaitkan foto | `Code.gs` + modul terkait |
| 3 | Bongkar markup `#viewPapan`: hapus `.pk-side`, hapus panel pagu, tambah sapaan + baris angka + blok fokus + pemilih antrean | `index.html` |
| 4 | CSS `.pk-*` v3 — hapus `.pk-card`, `.pk-antre`, `.pk-tenang`, `.pk-bar`; tambah gaya baru | `index.html` |
| 5 | JS: `_pkFokusHariIni()`, `_pkRenderSapaan()`, `_pkRenderAngka()`, `_pkRenderFokus()`, pemilih antrean + `_pkRenderAntreanKerja()` (pakai ulang logika grup bulan→DRPP) | `index.html` |
| 6 | Generalisasi `_pkBukaSpby` jadi `_pkBukaAksi(no, jenis)` untuk empat jenis | `index.html` |
| 7 | Perbaiki format `lastImport` di kaki halaman | `index.html` |
| 8 | Verifikasi Playwright klik nyata (lihat 6) | scratchpad |
| 9 | Perbarui `docs/HANDOFF-DESKTOP.md` + tutup spec | `docs/` |

---

## 6. Rencana uji (klik sungguhan, bukan `page.evaluate`)

Data uji wajib memuat minimal satu transaksi per antrean, satu transaksi yang tidak
memenuhi kriteria apa pun, satu berkas scan tanpa `NO_TRANSAKSI`, `saldo:null` (peran
viewer), dan satu keadaan kosong per antrean.

1. Buka aplikasi → `#viewPapan` terlihat, `#tabPapan` ber-`active`.
2. Judul sapaan menyebut jumlah item fokus yang benar dalam huruf ("lima", "tiga"…).
3. Empat angka terisi; angka pajak `rgb(214, 0, 108)` bila > 0; **tidak ada** kartu
   Bank/UP, Pindah dana, Sisa pagu, Antrean HP, atau Kotak masuk scan di mana pun.
4. Blok fokus berisi tepat `PK_FOKUS_N` baris, urut nilai menurun, tiap baris punya
   kalimat alasan yang tidak kosong.
5. Klik tombol aksi baris fokus → panel inline terbuka dengan field yang sesuai jenisnya.
6. Isi + Simpan → baris hilang dari blok fokus, penggantinya naik, **tanpa** panggilan
   `serverGetPapanKerja` kedua (pasang mata-mata pada stub `google.script.run`).
7. Klik tiap pil antrean → isi berganti; badge menampilkan angka penuh dari
   `jumlahAntrean`, bukan panjang array yang ditampilkan.
8. Grup bulan berjalan terbuka, bulan lama tertutup; klik judul membuka/menutupnya;
   "Belum masuk DRPP" selalu pertama.
9. Ganti "Urutkan" → urutan baris berubah, pilihan select tetap tersinkron setelah render.
10. Peran viewer (`saldo:null`) → angka saldo menampilkan `—`, bukan `Rp 0`.
11. Tiap antrean kosong menampilkan kalimatnya sendiri; blok fokus kosong menampilkan
    kalimat "sudah beres"; `page.on('pageerror')` **nol galat baru**.
12. Kaki halaman menampilkan tanggal impor terbaca — **bukan** `[object Object]`.
13. Pindai seluruh `onclick`/`onchange` di `#viewPapan` — tidak ada bug kutip
    (pelajaran `docs/HANDOFF-MOBILE.md` bagian 1).
14. Skrip regresi tema `kt-tema-ui.js` tetap 22 PASS / 0 FAIL.
15. Viewport 1366px → satu kolom tetap terbaca, tidak ada scroll horizontal.

---

## 7. Keputusan yang JANGAN ditawar ulang

- Layar pembuka tetap Papan kerja.
- Pengelompokan bulan → DRPP tetap dipertahankan (bukan diganti daftar datar).
- Rumus `sisaPUM` di `_pkKriteriaTindakan` tetap salinan persis dari mode ringkas
  `hitungNeraca` di `mobile.html` (`docs/HANDOFF-MOBILE.md` bagian 2).
- Pindah dana bank↔tunai tetap **tidak** masuk daftar tindakan.
- Magenta hanya untuk angka yang benar-benar mendesak, bukan penanda tiap baris.
- Tidak ada warna baru di luar token `--bs-*`.
