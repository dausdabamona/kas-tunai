# Desain: Mode setor pajak terpisah untuk PPN dan PPh

## Konteks

Permintaan pengguna: *"untuk pajak perlu ada menu yang membuat pilihan PPN dan PPh
dibayar Poltek, atau penyedia, bisa juga PPN di Poltek PPh di penyedia, pilihan ini
harus ada beserta hitungan validnya."*

Separuh fitur ini **sudah ada**. Sheet `MULTI_NOTA` punya kolom `MODE_BAYAR` per nota
dengan dua nilai (`_Config.gs:103-108`):

- `NETTO` — pajak ditahan bendahara, toko terima `nilai − pajak`
- `BRUTO` — toko terima nilai penuh, pajak disetor dari sumber lain

Dua kekurangannya, dan keduanya jadi cakupan tugas ini:

1. **Satu saklar untuk PPN dan PPh sekaligus.** Kombinasi "PPN di Poltek, PPh di
   penyedia" tidak bisa dinyatakan.
2. **`BRUTO` bukan "penyedia yang menyetor".** Menurut `_Config.gs` dan rumus di
   `docs/HANDOFF-MOBILE.md` bagian 2, `BRUTO` berarti pajaknya **tetap kewajiban
   Poltek**, hanya dananya bukan dari uang muka (`ΣPajakLuarUM = ΣPajak −
   ΣPajakDitarik`, dibaca "wajib disetor, dananya dari sumber lain"). Keadaan yang
   diminta pengguna — penyedia menyetor sendiri, Poltek tidak berkewajiban apa pun —
   **belum ada**.

Karena itu satu jenis pajak punya **tiga** keadaan, bukan dua.

## Keputusan yang sudah disetujui pengguna (28 Jul 2026)

| Topik | Keputusan |
|---|---|
| Arti "dibayar Poltek" | **Poltek memungut/memotong lalu menyetor** — bukan gross-up (Poltek menanggung pajak di luar harga). Nilai pembebanan anggaran tidak berubah; yang diatur hanya siapa menyetor dan dari dana mana. |
| Jumlah keadaan per jenis pajak | **Tiga**: `TARIK` · `LUAR_UM` · `PENYEDIA`. Opsi dua-keadaan ditolak karena akan mengubah arti seluruh nota `BRUTO` yang sudah ada dan menghilangkannya dari daftar belum-setor. |
| Perlakuan data lama | Dipetakan saat baca, **tanpa skrip migrasi**: `NETTO`/kosong → `TARIK`, `BRUTO` → `LUAR_UM`. Tidak ada baris lama yang berubah arti. |
| Urutan kerja | Fitur ini dikerjakan **sebelum** melanjutkan brainstorm tab Pencocokan (yang diparkir setelah Bagian 1 disetujui). |

## Tiga keadaan

| Nilai | Uang ke penyedia | Yang menyetor | Masuk daftar belum-setor? | Bukti potong/pungut dari Poltek? |
|---|---|---|---|---|
| `TARIK` | `nilai − pajak` | Poltek, uangnya ditahan dari uang muka | ya | ya |
| `LUAR_UM` | nilai penuh | Poltek, dana dari sumber lain | ya | ya |
| `PENYEDIA` | nilai penuh | penyedia sendiri | **tidak** | **tidak** |

`TARIK` = perilaku `NETTO` hari ini. `LUAR_UM` = perilaku `BRUTO` hari ini.
`PENYEDIA` adalah satu-satunya keadaan yang benar-benar baru.

---

## Bagian 1 — Skema

Dua kolom baru **di ujung kanan** `CONFIG.HEADERS.MULTI_NOTA` (aturan proyek: kolom
baru selalu ditambahkan di kanan, tidak pernah disisipkan):

```
MODE_PPN   'TARIK' | 'LUAR_UM' | 'PENYEDIA'
MODE_PPH   'TARIK' | 'LUAR_UM' | 'PENYEDIA'
```

`MODE_BAYAR` **tidak dihapus dan tidak ditulisi lagi** — dibekukan sebagai kolom
warisan, dibaca saja. Aturan baca, satu arah:

```
modePpn = MODE_PPN bila terisi,  selain itu petakan(MODE_BAYAR),  selain itu 'TARIK'
modePph = MODE_PPH bila terisi,  selain itu petakan(MODE_BAYAR),  selain itu 'TARIK'

petakan('BRUTO') = 'LUAR_UM'
petakan(apa pun yang lain, termasuk kosong) = 'TARIK'
```

Konsekuensi yang disengaja: nota lama bermode `BRUTO` tetap terbaca sebagai kewajiban
setor Poltek, dan nota lama tanpa mode tetap `TARIK`. **Tidak ada baris lama yang
berubah arti, dan tidak ada yang hilang dari daftar belum-setor.**

---

## Bagian 2 — Rumus (revisi `docs/HANDOFF-MOBILE.md` bagian 2)

`docs/HANDOFF-MOBILE.md` bagian 2 adalah **satu-satunya sumber kebenaran** rumus
neraca. Tugas ini mengubahnya, jadi dokumen itu wajib ikut diperbarui pada commit
yang sama — bukan menaruh varian rumus di kode.

### Per nota ke-*i*

```
pajakDitarik_i      = (modePpn_i = TARIK    ? ppn_i : 0) + (modePph_i = TARIK    ? pph_i : 0)
kewajibanSetor_i    = (modePpn_i ≠ PENYEDIA ? ppn_i : 0) + (modePph_i ≠ PENYEDIA ? pph_i : 0)
dibayarKePenyedia_i = nilai_i − pajakDitarik_i
```

Yang lama (`modeBayar_i` tunggal dengan cabang NETTO/BRUTO) dihapus dari dokumen,
digantikan tiga baris di atas.

### Per transaksi

```
ΣKewajibanSetor = Σ kewajibanSetor_i
ΣPajakLuarUM    = ΣKewajibanSetor − ΣPajakDitarik
```

Baris kedua adalah **koreksi**. Rumus sekarang berbunyi `ΣPajakLuarUM = ΣPajak −
ΣPajakDitarik`; begitu keadaan `PENYEDIA` ada, `ΣPajak` memuat pajak yang bukan
kewajiban Poltek, sehingga rumus lama akan menagih setoran yang tidak seharusnya.
`ΣPajak` tetap dipakai untuk pelaporan/SPT, tetapi **bukan lagi** dasar kewajiban
setor.

Besaran lain — `UM`, `ΣNota`, `ΣDibayar`, `ΣKembaliSisa`, `SisaDiTanganPUM`, dan
status `Lunas` — **tidak berubah bentuknya**. Khususnya `SisaDiTanganPUM` tetap
memakai `ΣNota` bruto; jebakan yang sudah didokumentasikan di bagian 2 itu tidak
tersentuh tugas ini.

Semua nilai bilangan bulat rupiah.

---

## Bagian 3 — Backend

### 3a. `_Config.gs`

Tambahkan di ujung array `MULTI_NOTA`, dengan komentar aturan baca-mundurnya:

```js
// Mode setor per jenis pajak. TARIK = ditahan bendahara dari uang muka.
// LUAR_UM = penyedia terima penuh, Poltek tetap wajib setor dari dana lain.
// PENYEDIA = penyedia terima penuh dan menyetor sendiri; Poltek TIDAK wajib
// setor dan TIDAK menerbitkan bukti potong/pungut.
// Kosong pada baris lama -> dibaca dari MODE_BAYAR (kolom warisan):
// 'BRUTO' -> LUAR_UM, selain itu -> TARIK.
'MODE_PPN', 'MODE_PPH'
```

### 3b. `KasTunai.gs` — satu titik resolusi

Aturan baca ditulis **sekali**, tidak disebar. Sekarang pola
`String(r[n.MODE_BAYAR] || 'NETTO').toUpperCase() === 'BRUTO'` diulang di empat titik
(`KasTunai.gs:319, 322, 345, 725`) dan enam titik di `mobile.html`; semuanya dialihkan
ke fungsi ini.

```js
var MODE_SAH = { TARIK: 1, LUAR_UM: 1, PENYEDIA: 1 };

/** Satu nilai mode, dengan cadangan dari kolom warisan. */
function _satuMode(baru, cadangan) {
  var v = String(baru == null ? '' : baru).toUpperCase().trim();
  return MODE_SAH[v] ? v : cadangan;
}

/** Mode setor per jenis pajak untuk satu baris nota. */
function _modeNota(r, n) {
  var warisan = (String(r[n.MODE_BAYAR] || '').toUpperCase() === 'BRUTO')
                ? 'LUAR_UM' : 'TARIK';
  return { ppn: _satuMode(r[n.MODE_PPN], warisan),
           pph: _satuMode(r[n.MODE_PPH], warisan) };
}

/** Pajak yang ditahan bendahara dari uang muka. */
function hitungPajakDitarik(pph, ppn, modePph, modePpn) {
  return (modePph === 'TARIK' ? Util.num(pph) : 0)
       + (modePpn === 'TARIK' ? Util.num(ppn) : 0);
}

/** Pajak yang tetap jadi kewajiban setor Poltek. */
function hitungKewajibanSetor(pph, ppn, modePph, modePpn) {
  return (modePph !== 'PENYEDIA' ? Util.num(pph) : 0)
       + (modePpn !== 'PENYEDIA' ? Util.num(ppn) : 0);
}

/** Nilai yang boleh diserahkan ke penyedia. */
function hitungDibayarPenyedia(nilai, pph, ppn, modePph, modePpn) {
  return Util.num(nilai) - hitungPajakDitarik(pph, ppn, modePph, modePpn);
}
```

**Urutan argumen wajib konsisten `pph` dulu, baru `ppn`** — mengikuti tanda tangan
`hitungDibayarPenyedia(nilai, pph, ppn, …)` yang sudah ada, dan mode mengikuti urutan
yang sama (`modePph, modePpn`). Argumen ke-3 berpasangan dengan ke-1, ke-4 dengan
ke-2. Menukar urutannya menghasilkan angka yang tetap masuk akal tapi salah, dan
tidak akan melempar galat apa pun — jadi ini titik yang wajib diperiksa saat reviu.

`hitungDibayarPenyedia` berubah tanda tangan (dari `(nilai, pph, ppn, modeBayar)`).
Pemanggilnya hanya dua, keduanya di dalam `KasTunai.gs` (baris 321 dan 346), plus
ekspor modul di baris 791.

**`_satuMode` hanya untuk MEMBACA.** Ia sengaja diam-diam jatuh ke cadangan supaya
data lama dan data rusak tetap bisa ditampilkan. Ia **tidak boleh** dipakai saat
menyimpan — jalur simpan memvalidasi terpisah dan melempar galat (Bagian 3d).

### 3c. Pembacaan nota

Fungsi pembaca nota (`getMultiNota` dan saudaranya di baris ~318-322 dan ~725)
mengirim ke frontend, sudah jadi, tidak dihitung ulang di klien:

```
modePpn, modePph, pajakDitarik, kewajibanSetor, dibayarPenyedia
```

Field `modeBayar` **berhenti dikirim** supaya tidak ada dua sumber kebenaran di
frontend. Enam titik di `mobile.html` yang membacanya dialihkan.

`DIBAYAR_PENYEDIA` tetap **disimpan** (bukan dihitung ulang saat tampil), sesuai
alasan yang sudah tercatat di `_Config.gs`: angka historisnya tidak boleh ikut
berubah bila pajaknya disunting belakangan. `_recalcDibayarNota` memakai `_modeNota`
alih-alih membaca `MODE_BAYAR` langsung.

### 3d. `simpanPajakNota`

- Menulis `MODE_PPN` dan `MODE_PPH`; **berhenti menulis** `MODE_BAYAR`.
- **Menolak nilai di luar tiga yang sah** dengan melempar galat — bukan diam-diam
  jatuh ke default. Pilihan ini menentukan uang yang diserahkan ke penyedia; salah
  diam-diam lebih berbahaya daripada galat.
- Bila `d.modePpn`/`d.modePph` tidak dikirim sama sekali (pemanggil versi lama),
  **pertahankan nilai yang sudah tersimpan di baris itu**, jangan tulis default.
  Ini yang memperbaiki bug di Bagian 7.
- `AuditLog.write` menyertakan kedua mode.

### 3e. `Code.gs`

Tidak berubah. `serverSimpanPajakNota` sudah meneruskan objek `d` apa adanya.

---

## Bagian 4 — Tampilan

Blok baru di modal pajak, di **kedua** entry point: `mobile.html` dan `index.html`.
Desktop sekarang tidak punya kendali mode sama sekali — itulah sumber bug di Bagian 7.

Blok muncul hanya bila nota kena pajak. Per jenis pajak, selektornya muncul hanya
bila nilai pajak itu > 0.

```
PPN Rp 1.100.000     [ Ditarik ] [ Luar UM ] [ Penyedia ]
PPh Rp   150.000     [ Ditarik ] [ Luar UM ] [ Penyedia ]
```

Pil tersegmentasi, pilihan aktif isi accent putih; target sentuh minimal 44px
(`CLAUDE.md`). Token Broadsheet yang sudah ada, tanpa warna baru.

Di bawahnya **satu baris pratinjau yang berubah mengikuti pilihan** — ini "hitungan
valid" yang diminta pengguna, terlihat **sebelum** disimpan:

> Penyedia menerima **Rp 8.900.000** · titipan pajak ke bendahara **Rp 1.100.000** ·
> masih wajib disetor Poltek **Rp 150.000** (dana dari luar UM)

Bila sebuah komponen dipilih `PENYEDIA`, kalimatnya menyebut konsekuensinya eksplisit:

> PPh **Rp 150.000** disetor penyedia — Poltek tidak menerbitkan bukti potong.

Default nota baru: `TARIK` untuk keduanya — sama dengan perilaku sekarang.

Nilai dinamis di `onclick`/`onchange` wajib lewat helper `aq()` (`mobile.html`) —
pelajaran bug kutip di `docs/HANDOFF-MOBILE.md` bagian 1.

---

## Bagian 5 — Cetak & daftar setor

### 5a. Daftar belum-setor

`mobile.html` sekarang memilah `g.belumSetor` jadi netto/bruto **per nota**
(baris ~2502-2503). Satu nota kini bisa berutang PPN tapi tidak PPh, jadi pemilahan
pindah ke **per komponen pajak**:

- *Uangnya sudah di bendahara* → Σ komponen bermode `TARIK`
- *Wajib disetor, dana dari luar UM* → Σ komponen bermode `LUAR_UM`
- Komponen bermode `PENYEDIA` **tidak muncul sama sekali** — bukan ditampilkan nol,
  karena memang bukan kewajiban Poltek.

Nota yang kedua komponennya `PENYEDIA` hilang seluruhnya dari daftar.

**Di luar cakupan:** `SETOR_STATUS`/`SETOR_TANGGAL`/`SETOR_NTPN` tetap **satu set per
nota**, tidak dipecah per jenis pajak. Keterbatasan ini sudah ada sekarang (nota
`NETTO` dengan PPN dan PPh juga hanya punya satu NTPN) dan tugas ini tidak
memperburuknya. Jangan menambah kolom setor per jenis pajak tanpa diminta — kalau
nanti terasa perlu, itu tugas tersendiri.

### 5b. Bukti potong dan bukti pungut

- **Bukti potong PPh** hanya dicetak bila `modePph ≠ PENYEDIA`.
- **Bukti pungut PPN** hanya dicetak bila `modePpn ≠ PENYEDIA`.
- Bila keduanya `PENYEDIA`, tombol cetak **menjelaskan alasannya** dan tidak
  menghasilkan lembar apa pun. Menerbitkan bukti potong atas pajak yang tidak pernah
  dipotong adalah cacat dokumen yang bisa jadi temuan saat reviu Itjen/BPK.

Berlaku di kedua entry point (`index.html:3985`, `index.html:4695`,
`index.html:5926`, `mobile.html:2130`).

### 5c. SPJ pajak per nota

Mencantumkan mode tiap komponen, supaya pembaca SPJ bisa melihat **kenapa** penyedia
menerima nilai penuh pada nota tertentu.

---

## Bagian 6 — Kasus tepi & rencana uji

### 6a. Sembilan kombinasi

Diuji satu per satu dengan angka bulat eksplisit. Nota contoh: `nilai = 10.000.000`,
`ppn = 1.100.000`, `pph = 150.000`.

| # | modePpn | modePph | pajakDitarik | dibayarKePenyedia | kewajibanSetor |
|---|---|---|---|---|---|
| 1 | TARIK | TARIK | 1.250.000 | 8.750.000 | 1.250.000 |
| 2 | TARIK | LUAR_UM | 1.100.000 | 8.900.000 | 1.250.000 |
| 3 | TARIK | PENYEDIA | 1.100.000 | 8.900.000 | 1.100.000 |
| 4 | LUAR_UM | TARIK | 150.000 | 9.850.000 | 1.250.000 |
| 5 | LUAR_UM | LUAR_UM | 0 | 10.000.000 | 1.250.000 |
| 6 | LUAR_UM | PENYEDIA | 0 | 10.000.000 | 1.100.000 |
| 7 | PENYEDIA | TARIK | 150.000 | 9.850.000 | 150.000 |
| 8 | PENYEDIA | LUAR_UM | 0 | 10.000.000 | 150.000 |
| 9 | PENYEDIA | PENYEDIA | 0 | 10.000.000 | 0 |

Baris 1 = perilaku `NETTO` hari ini. Baris 5 = perilaku `BRUTO` hari ini. Keduanya
wajib menghasilkan angka yang **persis sama** dengan sebelum perubahan — itu bukti
bahwa data lama tidak berubah arti.

### 6b. Kasus tepi lain

- **Pajak bernilai 0** → selektornya disembunyikan, tersimpan `TARIK`, tidak
  berdampak pada angka mana pun.
- **Nota lama `BRUTO`** → terbaca `LUAR_UM` di kedua komponen, tetap muncul di daftar
  belum-setor. Diuji **lebih dulu** sebelum skenario lain.
- **Nota lama tanpa mode** → `TARIK` di kedua komponen.
- **Menyunting pajak dari desktop** pada nota bermode campuran → mode **tidak
  berubah** (Bagian 7).
- **Mode tidak sah dikirim ke server** → melempar galat, tidak menyimpan.
- **Pembulatan**: uang dan pajak bilangan bulat; `DPP = nilai ÷ 1,11` diuji eksplisit
  pada nilai yang menghasilkan pecahan.

### 6c. Cara verifikasi

Interaksi **nyata**: klik pilihan mode sungguhan → simpan → tutup → buka ulang modal
dan pastikan pilihannya bertahan. Bukan memanggil fungsi langsung — `page.evaluate`
membuktikan logika, bukan markup (pelajaran bug `onclick`,
`docs/HANDOFF-MOBILE.md` bagian 1).

---

## Bagian 7 — Bug yang ikut diperbaiki

**Menyunting pajak nota dari desktop diam-diam mengembalikan modenya ke NETTO.**

`index.html:4678` menyusun objek `d` untuk `serverSimpanPajakNota` **tanpa**
menyertakan `modeBayar`. Backend membacanya `String(d.modeBayar||'NETTO')`
(`KasTunai.gs:638`), lalu `_recalcDibayarNota` menghitung ulang `DIBAYAR_PENYEDIA`
dari mode yang sudah teracak itu.

Akibatnya: nota yang di HP ditandai `BRUTO` (penyedia menerima nilai penuh), begitu
pajaknya disunting dari desktop, berubah jadi `NETTO` — **nilai yang boleh diserahkan
ke penyedia ikut berubah** tanpa peringatan apa pun.

Diperbaiki dua lapis:

1. Desktop mengirimkan kedua mode (Bagian 4).
2. Server mempertahankan nilai tersimpan bila mode tidak dikirim (Bagian 3d) —
   supaya pemanggil mana pun yang lupa mengirim tidak bisa merusak data.

Bug ini bukan bagian dari permintaan pengguna, tetapi fitur ini menggandakan jumlah
kolom yang rentan pola sama, jadi perbaikannya masuk cakupan.

---

## Berkas yang disentuh

| Berkas | Perubahan |
|---|---|
| `_Config.gs` | 2 nama kolom di ujung `MULTI_NOTA` + komentar aturan baca |
| `KasTunai.gs` | `_satuMode`, `_modeNota`, `hitungPajakDitarik`, `hitungKewajibanSetor`; `hitungDibayarPenyedia` ganti tanda tangan; `_recalcDibayarNota`; pembaca nota; `simpanPajakNota` |
| `mobile.html` | Blok mode di modal pajak + pratinjau; 6 titik pembaca `modeBayar`; daftar belum-setor; cetak bukti potong |
| `index.html` | Blok mode di modal pajak (baru) + pratinjau; kirim mode saat simpan (bug Bagian 7); cetak bukti potong & rekap |
| `docs/HANDOFF-MOBILE.md` | Bagian 2 (rumus — sumber kebenaran) + papan status |

Tidak ada file `.gs` baru, jadi `filePushOrder` di `.clasp.json` tidak berubah.
`Code.gs` tidak berubah.

## Status

Bagian 1-6 disetujui pengguna bertahap (28 Jul 2026), termasuk revisi Bagian 1-2
setelah keputusan tiga-keadaan. Langkah berikutnya: `writing-plans`.
