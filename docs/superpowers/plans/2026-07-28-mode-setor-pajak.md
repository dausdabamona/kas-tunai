# Mode Setor Pajak Terpisah PPN/PPh — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memisahkan mode setor pajak PPN dan PPh menjadi dua pilihan independen dengan tiga keadaan (`TARIK` / `LUAR_UM` / `PENYEDIA`), menggantikan satu saklar `MODE_BAYAR` yang mengatur keduanya sekaligus.

**Architecture:** Dua kolom baru di ujung kanan sheet `MULTI_NOTA`. Aturan baca ditulis satu kali di `KasTunai.gs` (`_modeNota`) dengan pemetaan mundur dari kolom warisan `MODE_BAYAR`, sehingga tidak perlu skrip migrasi. Empat fungsi hitung murni dibungkus komentar penanda supaya bisa diuji lewat Node. Frontend menerima mode yang sudah jadi dari server dan tidak menghitung sendiri.

**Tech Stack:** Google Apps Script (backend `.gs`, ES5), vanilla JS satu file per entry point (`mobile.html`, `index.html`), Google Sheets sebagai basis data. Verifikasi: Node (fungsi murni) + Playwright klik nyata (UI).

## Global Constraints

Setiap tugas di bawah tunduk pada seluruh butir ini.

- **Backend ES5 murni.** Semua `.gs` memakai `var` + `function`. Dilarang `let`, `const`, arrow function, template literal, `Promise`, `class`.
- **Frontend vanilla JS, satu file per entry point.** Tanpa framework, tanpa build step, tanpa dependency eksternal baru di aplikasi.
- **Tiga nilai mode yang sah, persis huruf besar ini:** `'TARIK'`, `'LUAR_UM'`, `'PENYEDIA'`. Tidak ada nilai keempat.
- **Pemetaan kolom warisan:** `MODE_BAYAR === 'BRUTO'` (case-insensitive) → `LUAR_UM`; nilai lain apa pun termasuk kosong → `TARIK`.
- **Kolom baru selalu ditambahkan di kanan**, tidak pernah disisipkan di tengah `CONFIG.HEADERS`.
- **`MODE_BAYAR` dibekukan:** boleh dibaca, **tidak boleh ditulis lagi**, tidak boleh dihapus dari `CONFIG.HEADERS`.
- **Urutan argumen fungsi hitung: `pph` sebelum `ppn`, dan `modePph` sebelum `modePpn`.** Argumen ke-3 berpasangan dengan ke-1, ke-4 dengan ke-2. Tertukar akan menghasilkan angka yang tetap masuk akal tetapi salah, tanpa melempar galat apa pun.
- **Rumus sumber kebenaran ada di `docs/HANDOFF-MOBILE.md` bagian 2.** Jangan menaruh varian rumus di kode. Bila rumus berubah, dokumen itu ikut diperbarui pada commit yang sama.
- **Uang dan pajak bilangan bulat rupiah.**
- **Nilai dinamis di `onclick`/`onchange` wajib lewat helper `aq()`** (ada di `mobile.html`); `esc()` adalah helper berbeda untuk isi atribut HTML biasa, bukan untuk argumen JS.
- **Tanpa hard delete**; `SpreadsheetApp.flush()` sekali di akhir request lewat `DeferredFlush`.
- **Bahasa UI Indonesia.** Target sentuh minimal 44px.
- **Commit:** Conventional Commits, subjek Bahasa Indonesia, imperatif, < 72 karakter.
- **Tidak ada file `.gs` baru**, jadi `filePushOrder` di `.clasp.json` tidak berubah. `Code.gs` tidak berubah.
- **Di luar cakupan:** `SETOR_STATUS`/`SETOR_TANGGAL`/`SETOR_NTPN` tetap satu set per nota. Jangan menambah kolom setor per jenis pajak.

**Spec:** `docs/superpowers/specs/2026-07-28-mode-setor-pajak-design.md`

---

## Struktur berkas

| Berkas | Tanggung jawab dalam tugas ini |
|---|---|
| `_Config.gs` | Dua nama kolom baru di ujung `HEADERS.MULTI_NOTA` + komentar aturan baca |
| `KasTunai.gs` | Satu-satunya tempat aturan mode diterjemahkan (`_satuMode`, `_modeNota`) dan dihitung (`hitungPajakDitarik`, `hitungKewajibanSetor`, `hitungDibayarPenyedia`); penulisan mode di `simpanPajakNota`; pengiriman mode ke frontend |
| `mobile.html` | Pemilih mode di layar pajak + pratinjau; konsumen mode (neraca, rincian, daftar nota, bukti potong, worklist setor) |
| `index.html` | Pemilih mode di modal pajak (baru) + pratinjau; pengiriman mode saat simpan (perbaikan bug); aturan cetak bukti potong |
| `docs/HANDOFF-MOBILE.md` | Bagian 2 (rumus, sumber kebenaran) + papan status |

---

### Task 1: Backend — kolom, resolusi mode, fungsi hitung, dan rumus

**Files:**
- Modify: `_Config.gs` (array `MULTI_NOTA` di dalam `CONFIG.HEADERS`)
- Modify: `KasTunai.gs` (blok `hitungDibayarPenyedia`, `_recalcDibayarNota`, dua pembaca nota, `simpanPajakNota`)
- Modify: `docs/HANDOFF-MOBILE.md` (bagian 2)
- Test: skrip Node sementara di scratchpad (tidak dikomit)

**Interfaces:**
- Consumes: `Util.num(v)` (sudah ada, `Util.gs`), `CONFIG.HEADERS.MULTI_NOTA`, `Util.colMap`.
- Produces, dipakai Task 2/3/4 lewat data yang dikirim ke frontend — nama field persis:
  - Objek nota dari `getMultiNota()` dan dari daftar nota kena pajak mendapat tambahan:
    `modePph` (string `'TARIK'|'LUAR_UM'|'PENYEDIA'`), `modePpn` (string, sama),
    `pajakDitarik` (number), `kewajibanSetor` (number).
  - Field `modeBayar` **dihapus** dari kedua objek itu.
  - `simpanPajakNota(transactionId, urutan, d)` menerima tambahan `d.modePph` dan `d.modePpn` (string opsional).

- [ ] **Step 1: Tambahkan dua kolom di `_Config.gs`**

Di `_Config.gs`, di dalam array `MULTI_NOTA`, ganti baris terakhir array yang berbunyi:

```js
      'SETOR_STATUS', 'SETOR_TANGGAL', 'SETOR_NTPN'
```

menjadi:

```js
      'SETOR_STATUS', 'SETOR_TANGGAL', 'SETOR_NTPN',
      // Mode setor per jenis pajak. Menggantikan MODE_BAYAR yang hanya satu
      // saklar untuk kedua pajak sekaligus. Tiga nilai sah:
      //   TARIK    = ditahan bendahara dari uang muka; toko dibayar setelah dipotong.
      //   LUAR_UM  = toko dibayar penuh, Poltek TETAP wajib setor dari dana lain.
      //   PENYEDIA = toko dibayar penuh dan menyetor sendiri; Poltek TIDAK wajib
      //              setor dan TIDAK menerbitkan bukti potong/pungut.
      // Kosong pada baris lama -> dibaca dari MODE_BAYAR (kolom warisan):
      // 'BRUTO' -> LUAR_UM, selain itu -> TARIK. Tidak ada skrip migrasi.
      'MODE_PPN', 'MODE_PPH'
```

- [ ] **Step 2: Ganti blok `hitungDibayarPenyedia` di `KasTunai.gs`**

Cari blok berikut di `KasTunai.gs` (persis, termasuk komentarnya) dan **ganti seluruhnya**:

```js
  /* -------------------------------------------------------- *
   * Nilai yang boleh diserahkan ke penyedia untuk satu nota.
   * Rumusnya ada di docs/HANDOFF-MOBILE.md bagian 2 — satu-satunya sumber
   * kebenaran; jangan menuliskan varian lain di tempat lain.
   *   NETTO : nilai - (pph + ppn)   pajaknya ditarik kembali ke bendahara
   *   BRUTO : nilai                 pajaknya disetor dari sumber lain
   * Mode BRUTO baru dipasang di tugas 4; untuk sekarang selalu NETTO.
   * -------------------------------------------------------- */
  function hitungDibayarPenyedia(nilai, pph, ppn, modeBayar) {
    var n = Util.num(nilai), p = Util.num(pph) + Util.num(ppn);
    return (String(modeBayar || 'NETTO').toUpperCase() === 'BRUTO') ? n : (n - p);
  }
```

dengan blok baru ini. Komentar penanda di awal dan akhir **wajib ditulis persis** — skrip uji di Step 6 memotong berkas berdasarkan penanda itu:

```js
  /* ===== MODE SETOR PAJAK (fungsi murni, diuji lewat node) =====
   * Rumusnya ada di docs/HANDOFF-MOBILE.md bagian 2 — satu-satunya sumber
   * kebenaran; jangan menuliskan varian lain di tempat lain.
   *
   * Tiga keadaan per jenis pajak:
   *   TARIK    uang pajak ditahan bendahara dari uang muka; toko dibayar
   *            setelah dipotong; Poltek wajib setor.
   *   LUAR_UM  toko dibayar penuh; Poltek TETAP wajib setor, dananya dari
   *            sumber lain.
   *   PENYEDIA toko dibayar penuh dan menyetor sendiri; Poltek TIDAK wajib
   *            setor dan TIDAK menerbitkan bukti potong/pungut.
   *
   * PERHATIAN urutan argumen: pph selalu sebelum ppn, dan modePph sebelum
   * modePpn. Argumen ke-3 berpasangan dengan ke-1, ke-4 dengan ke-2. Tertukar
   * menghasilkan angka yang tetap masuk akal tetapi salah, tanpa galat apa pun.
   */
  var MODE_SAH = { TARIK: 1, LUAR_UM: 1, PENYEDIA: 1 };

  /* Satu nilai mode, dengan cadangan bila kolomnya kosong atau tidak dikenali.
   * HANYA untuk MEMBACA — sengaja diam-diam jatuh ke cadangan supaya data lama
   * dan data rusak tetap bisa ditampilkan. JANGAN dipakai di jalur simpan;
   * jalur simpan memvalidasi terpisah dan melempar galat. */
  function _satuMode(baru, cadangan) {
    var v = String(baru == null ? '' : baru).toUpperCase().replace(/\s+/g, '');
    return MODE_SAH[v] ? v : cadangan;
  }

  /* Mode setor per jenis pajak untuk satu baris nota.
   * r = array nilai baris, n = colMap sheet MULTI_NOTA. */
  function _modeNota(r, n) {
    var warisan = (String(r[n.MODE_BAYAR] || '').toUpperCase() === 'BRUTO')
                  ? 'LUAR_UM' : 'TARIK';
    return { pph: _satuMode(r[n.MODE_PPH], warisan),
             ppn: _satuMode(r[n.MODE_PPN], warisan) };
  }

  /* Pajak yang ditahan bendahara dari uang muka. */
  function hitungPajakDitarik(pph, ppn, modePph, modePpn) {
    return (modePph === 'TARIK' ? Util.num(pph) : 0)
         + (modePpn === 'TARIK' ? Util.num(ppn) : 0);
  }

  /* Pajak yang tetap jadi kewajiban setor Poltek — apa pun sumber dananya. */
  function hitungKewajibanSetor(pph, ppn, modePph, modePpn) {
    return (modePph !== 'PENYEDIA' ? Util.num(pph) : 0)
         + (modePpn !== 'PENYEDIA' ? Util.num(ppn) : 0);
  }

  /* Nilai yang boleh diserahkan ke penyedia untuk satu nota. */
  function hitungDibayarPenyedia(nilai, pph, ppn, modePph, modePpn) {
    return Util.num(nilai) - hitungPajakDitarik(pph, ppn, modePph, modePpn);
  }
  /* ===== /MODE SETOR PAJAK ===== */
```

- [ ] **Step 3: Perbarui `_recalcDibayarNota`**

Cari fungsi ini di `KasTunai.gs` dan ganti dua barisnya:

```js
    var mode = String(r[n.MODE_BAYAR] || 'NETTO').toUpperCase() === 'BRUTO' ? 'BRUTO' : 'NETTO';
    var bayar = hitungDibayarPenyedia(r[n.NOMINAL], r[n.PAJAK_PPH], r[n.PAJAK_PPN], mode);
```

menjadi:

```js
    var mode = _modeNota(r, n);
    var bayar = hitungDibayarPenyedia(r[n.NOMINAL], r[n.PAJAK_PPH], r[n.PAJAK_PPN],
                                      mode.pph, mode.ppn);
```

- [ ] **Step 4: Perbarui pembaca nota pertama (`getMultiNota`)**

Cari blok berikut di `KasTunai.gs`:

```js
        // Baris lama belum punya kolom ini -> hitung dari nilai - pajak (NETTO).
        modeBayar: (String(r[n.MODE_BAYAR] || '').toUpperCase() === 'BRUTO') ? 'BRUTO' : 'NETTO',
        dibayarPenyedia: (r[n.DIBAYAR_PENYEDIA] === '' || r[n.DIBAYAR_PENYEDIA] == null)
          ? hitungDibayarPenyedia(r[n.NOMINAL], r[n.PAJAK_PPH], r[n.PAJAK_PPN],
              (String(r[n.MODE_BAYAR] || '').toUpperCase() === 'BRUTO') ? 'BRUTO' : 'NETTO')
          : Util.num(r[n.DIBAYAR_PENYEDIA])
      };
```

Ganti dengan (perhatikan `_md` dihitung sekali, dipakai empat kali):

```js
        // Mode per jenis pajak; baris lama dipetakan dari kolom warisan MODE_BAYAR.
        modePph: _md.pph,
        modePpn: _md.ppn,
        pajakDitarik: hitungPajakDitarik(r[n.PAJAK_PPH], r[n.PAJAK_PPN], _md.pph, _md.ppn),
        kewajibanSetor: hitungKewajibanSetor(r[n.PAJAK_PPH], r[n.PAJAK_PPN], _md.pph, _md.ppn),
        // Nilai tersimpan dipakai apa adanya; baris lama yang belum punya kolomnya
        // dihitung ulang dengan rumus yang sama.
        dibayarPenyedia: (r[n.DIBAYAR_PENYEDIA] === '' || r[n.DIBAYAR_PENYEDIA] == null)
          ? hitungDibayarPenyedia(r[n.NOMINAL], r[n.PAJAK_PPH], r[n.PAJAK_PPN], _md.pph, _md.ppn)
          : Util.num(r[n.DIBAYAR_PENYEDIA])
      };
```

Lalu deklarasikan `_md` di awal badan fungsi pemetaan yang sama, sebelum `return {`:

```js
      var _md = _modeNota(r, n);
```

Bila fungsi pemetaan itu berbentuk `.map(function (r) { return { ... }; })` tanpa badan bernyata, ubah dulu jadi berbadan:

```js
    }).map(function (r) {
      var _md = _modeNota(r, n);
      return {
        ...
      };
    });
```

- [ ] **Step 5: Perbarui pembaca nota kedua (daftar nota kena pajak)**

Cari baris berikut di `KasTunai.gs` (di dalam fungsi yang merakit daftar nota kena pajak lintas transaksi, variabel barisnya bernama `m`, bukan `r`):

```js
        modeBayar: (String(m[n.MODE_BAYAR] || '').toUpperCase() === 'BRUTO') ? 'BRUTO' : 'NETTO',
```

Ganti dengan:

```js
        modePph: _mdp.pph,
        modePpn: _mdp.ppn,
        pajakDitarik: hitungPajakDitarik(m[n.PAJAK_PPH], m[n.PAJAK_PPN], _mdp.pph, _mdp.ppn),
        kewajibanSetor: hitungKewajibanSetor(m[n.PAJAK_PPH], m[n.PAJAK_PPN], _mdp.pph, _mdp.ppn),
```

Dan tepat sebelum `out.push({` pada blok yang sama, tambahkan:

```js
      var _mdp = _modeNota(m, n);
```

- [ ] **Step 6: Perbarui `simpanPajakNota`**

Cari baris berikut di `KasTunai.gs`:

```js
      n.MODE_BAYAR,          (String(d.modeBayar||'NETTO').toUpperCase()==='BRUTO' ? 'BRUTO' : 'NETTO')));
```

Ganti seluruh pemanggilan `Util.set(...)` itu supaya berakhir pada baris pajak terakhir tanpa `MODE_BAYAR`, lalu tulis mode terpisah. Ganti baris di atas dengan:

```js
      n.PAJAK_ADA_NPWP,      (d.adaNpwp === false ? 'N' : 'Y')));
```

(baris `n.PAJAK_ADA_NPWP` yang lama di atasnya dihapus supaya tidak dobel), dan **tepat sebelum** pemanggilan `Util.set(...)` itu sisipkan blok berikut:

```js
    // Mode setor per jenis pajak. Tidak dikirim = pertahankan yang sudah
    // tersimpan; dikirim tapi tidak sah = galat, jangan diam-diam pakai default.
    // Pilihan ini menentukan uang yang diserahkan ke penyedia.
    var _lama = _modeNota(hit.values, n);
    var _mPph = (d.modePph === undefined || d.modePph === null || d.modePph === '')
                ? _lama.pph : String(d.modePph).toUpperCase();
    var _mPpn = (d.modePpn === undefined || d.modePpn === null || d.modePpn === '')
                ? _lama.ppn : String(d.modePpn).toUpperCase();
    if (!MODE_SAH[_mPph]) throw new Error('Mode setor PPh tidak sah: ' + d.modePph);
    if (!MODE_SAH[_mPpn]) throw new Error('Mode setor PPN tidak sah: ' + d.modePpn);
```

Lalu tambahkan penulisan kolomnya sebagai pemanggilan `SheetRepo.setCells` kedua, tepat setelah pemanggilan `Util.set(...)` yang pertama:

```js
    SheetRepo.setCells(CONFIG.SHEETS.MULTI_NOTA, hit.rowIndex, Util.set(
      n.MODE_PPH, _mPph,
      n.MODE_PPN, _mPpn));
```

Terakhir, ubah baris `AuditLog.write` di fungsi yang sama supaya mencatat kedua mode:

```js
    AuditLog.write('SIMPAN_PAJAK_NOTA', CONFIG.SHEETS.MULTI_NOTA, transactionId + '#' + urutan,
      'katIdx=' + d.katIdx + ' pph=' + d.pph + ' ppn=' + d.ppn + ' dpp=' + d.dpp +
      ' modePph=' + _mPph + ' modePpn=' + _mPpn);
```

- [ ] **Step 7: Tulis skrip uji Node**

Tulis ke `/tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-mode-pajak-verify.js`. **Jangan dikomit.**

```js
var fs = require('fs'), vm = require('vm'), path = require('path');
var REPO = '/home/user/kas-tunai';
var src = fs.readFileSync(path.join(REPO, 'KasTunai.gs'), 'utf8');

var m = /\/\* ===== MODE SETOR PAJAK[\s\S]*?\/\* ===== \/MODE SETOR PAJAK ===== \*\//.exec(src);
if (!m) throw new Error('Blok penanda MODE SETOR PAJAK tidak ditemukan di KasTunai.gs');

var ctx = { Util: { num: function (v) { var x = parseFloat(v); return isNaN(x) ? 0 : x; } } };
vm.createContext(ctx);
vm.runInContext(m[0] + '\nthis.API = { _satuMode: _satuMode, _modeNota: _modeNota,' +
  ' hitungPajakDitarik: hitungPajakDitarik, hitungKewajibanSetor: hitungKewajibanSetor,' +
  ' hitungDibayarPenyedia: hitungDibayarPenyedia, MODE_SAH: MODE_SAH };', ctx);
var A = ctx.API;

var gagal = 0;
function cek(nama, dapat, harap) {
  var ok = JSON.stringify(dapat) === JSON.stringify(harap);
  if (!ok) gagal++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + nama +
    (ok ? '' : '  dapat=' + JSON.stringify(dapat) + ' harap=' + JSON.stringify(harap)));
}

/* --- 9 kombinasi: nilai 10.000.000, ppn 1.100.000, pph 150.000 --- */
var NILAI = 10000000, PPN = 1100000, PPH = 150000;
var TABEL = [
  ['TARIK',    'TARIK',    1250000,  8750000, 1250000],
  ['TARIK',    'LUAR_UM',  1100000,  8900000, 1250000],
  ['TARIK',    'PENYEDIA', 1100000,  8900000, 1100000],
  ['LUAR_UM',  'TARIK',     150000,  9850000, 1250000],
  ['LUAR_UM',  'LUAR_UM',        0, 10000000, 1250000],
  ['LUAR_UM',  'PENYEDIA',       0, 10000000, 1100000],
  ['PENYEDIA', 'TARIK',     150000,  9850000,  150000],
  ['PENYEDIA', 'LUAR_UM',        0, 10000000,  150000],
  ['PENYEDIA', 'PENYEDIA',       0, 10000000,       0]
];
/* Kolom tabel: modePpn, modePph, pajakDitarik, dibayarKePenyedia, kewajibanSetor.
   Perhatikan pemanggilan memakai urutan (pph, ppn, modePph, modePpn). */
for (var i = 0; i < TABEL.length; i++) {
  var mPpn = TABEL[i][0], mPph = TABEL[i][1];
  var nama = 'kombinasi ppn=' + mPpn + ' pph=' + mPph;
  cek(nama + ' / pajakDitarik',
      A.hitungPajakDitarik(PPH, PPN, mPph, mPpn), TABEL[i][2]);
  cek(nama + ' / dibayarKePenyedia',
      A.hitungDibayarPenyedia(NILAI, PPH, PPN, mPph, mPpn), TABEL[i][3]);
  cek(nama + ' / kewajibanSetor',
      A.hitungKewajibanSetor(PPH, PPN, mPph, mPpn), TABEL[i][4]);
}

/* --- Pemetaan data lama lewat _modeNota --- */
var COL = { MODE_BAYAR: 0, MODE_PPN: 1, MODE_PPH: 2 };
cek('warisan BRUTO -> LUAR_UM keduanya',
    A._modeNota(['BRUTO', '', ''], COL), { pph: 'LUAR_UM', ppn: 'LUAR_UM' });
cek('warisan NETTO -> TARIK keduanya',
    A._modeNota(['NETTO', '', ''], COL), { pph: 'TARIK', ppn: 'TARIK' });
cek('warisan kosong -> TARIK keduanya',
    A._modeNota(['', '', ''], COL), { pph: 'TARIK', ppn: 'TARIK' });
cek('kolom baru menang atas warisan',
    A._modeNota(['BRUTO', 'PENYEDIA', ''], COL), { pph: 'LUAR_UM', ppn: 'PENYEDIA' });
cek('kolom baru campuran',
    A._modeNota(['', 'TARIK', 'PENYEDIA'], COL), { pph: 'PENYEDIA', ppn: 'TARIK' });
cek('nilai tidak dikenali jatuh ke cadangan',
    A._modeNota(['BRUTO', 'NGAWUR', ''], COL), { pph: 'LUAR_UM', ppn: 'LUAR_UM' });
cek('huruf kecil diterima saat baca',
    A._modeNota(['', 'penyedia', 'tarik'], COL), { pph: 'TARIK', ppn: 'PENYEDIA' });

/* --- Kesetaraan dengan perilaku lama (bukti data lama tidak berubah arti) --- */
cek('NETTO lama == TARIK/TARIK',
    A.hitungDibayarPenyedia(NILAI, PPH, PPN, 'TARIK', 'TARIK'), NILAI - (PPH + PPN));
cek('BRUTO lama == LUAR_UM/LUAR_UM',
    A.hitungDibayarPenyedia(NILAI, PPH, PPN, 'LUAR_UM', 'LUAR_UM'), NILAI);

/* --- Pajak nol tidak berdampak --- */
cek('pajak nol, mode apa pun, dibayar penuh',
    A.hitungDibayarPenyedia(NILAI, 0, 0, 'TARIK', 'TARIK'), NILAI);

/* --- MODE_SAH persis tiga --- */
cek('tiga nilai mode yang sah',
    Object.keys(A.MODE_SAH).sort(), ['LUAR_UM', 'PENYEDIA', 'TARIK']);

console.log(gagal === 0 ? '\nSEMUA LOLOS' : '\n' + gagal + ' GAGAL');
process.exit(gagal === 0 ? 0 : 1);
```

- [ ] **Step 8: Jalankan skrip uji**

```bash
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-mode-pajak-verify.js
```

Expected: **38 baris `PASS`** (27 dari 9 kombinasi × 3 keluaran, 7 pemetaan data lama, 2 kesetaraan dengan perilaku lama, 1 pajak nol, 1 `MODE_SAH`), lalu `SEMUA LOLOS`, exit code 0. Bila ada `FAIL`, perbaiki `KasTunai.gs` lalu jalankan ulang — jangan mengubah angka harapan di skrip uji, angka itu berasal dari spec yang sudah disetujui.

- [ ] **Step 9: Perbarui rumus di `docs/HANDOFF-MOBILE.md` bagian 2**

Di bagian 2, ganti blok "Per nota ke-*i*" yang berbunyi:

```
pajak_i        = pph_i + ppn_i
modeBayar_i    = 'NETTO' | 'BRUTO'          (dipilih bendahara per nota)

NETTO : dibayarKePenyedia_i = nilai_i − pajak_i
        pajakDitarik_i      = pajak_i        ← uang pajak kembali ke bendahara untuk disetor
BRUTO : dibayarKePenyedia_i = nilai_i
        pajakDitarik_i      = 0              ← pajak disetor dari sumber lain
```

dengan:

```
pajak_i             = pph_i + ppn_i
modePph_i, modePpn_i = 'TARIK' | 'LUAR_UM' | 'PENYEDIA'   (dipilih bendahara per nota,
                       terpisah untuk tiap jenis pajak)

  TARIK    uang pajak ditahan bendahara dari uang muka; Poltek wajib setor
  LUAR_UM  toko dibayar penuh; Poltek TETAP wajib setor, dana dari sumber lain
  PENYEDIA toko dibayar penuh dan menyetor sendiri; Poltek TIDAK wajib setor
           dan TIDAK menerbitkan bukti potong/pungut

pajakDitarik_i      = (modePph_i = TARIK    ? pph_i : 0) + (modePpn_i = TARIK    ? ppn_i : 0)
kewajibanSetor_i    = (modePph_i ≠ PENYEDIA ? pph_i : 0) + (modePpn_i ≠ PENYEDIA ? ppn_i : 0)
dibayarKePenyedia_i = nilai_i − pajakDitarik_i
```

Lalu di blok "Per transaksi" di bawahnya, ganti baris:

```
ΣPajakLuarUM    = ΣPajak − ΣPajakDitarik           (wajib disetor, dananya dari sumber lain)
```

dengan:

```
ΣKewajibanSetor = Σ kewajibanSetor_i                (yang benar-benar jadi utang setor Poltek)
ΣPajakLuarUM    = ΣKewajibanSetor − ΣPajakDitarik  (wajib disetor, dananya dari sumber lain)
```

dan tambahkan catatan tepat di bawah blok itu:

```
`ΣPajak` tetap dipakai untuk pelaporan/SPT, tetapi **bukan lagi** dasar kewajiban
setor — sejak ada keadaan `PENYEDIA`, sebagian pajak pada nota bukan kewajiban Poltek.
```

Bagian "Jebakan yang wajib dihindari" **tidak diubah** — `SisaDiTanganPUM` tetap memakai ΣNota bruto.

- [ ] **Step 10: Hapus skrip uji sementara dan commit**

```bash
rm -f /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-mode-pajak-verify.js
cd /home/user/kas-tunai
git add _Config.gs KasTunai.gs docs/HANDOFF-MOBILE.md
git commit -m "feat: pisahkan mode setor pajak PPN dan PPh di backend"
```

---

### Task 2: Mobile — pemilih mode di layar pajak

**Files:**
- Modify: `mobile.html` (markup `#pjMode` sekitar baris 515-521; `PJ.mode` di `bukaPajak` sekitar 2263; `pjPilihMode` sekitar 2277; `hitungPajakUI` sekitar 2310-2318; `simpanPajak` sekitar 2332-2337)

**Interfaces:**
- Consumes dari Task 1: objek nota punya `modePph`, `modePpn` (string `'TARIK'|'LUAR_UM'|'PENYEDIA'`); `serverSimpanPajakNota(token, no, urutan, d)` menerima `d.modePph` dan `d.modePpn`.
- Produces untuk Task 3: variabel global `PJ.modePph` dan `PJ.modePpn` (string), serta fungsi `pjLabelMode(m)` yang memetakan kode mode ke label Indonesia.

- [ ] **Step 1: Ganti markup pemilih mode**

Cari blok berikut di `mobile.html` (sekitar baris 515):

```html
  <div class="f" style="margin-top:18px"><label>Uang pajaknya bagaimana?</label>
    <select id="pjMode" onchange="pjPilihMode()">
      <option value="NETTO">Ditahan bendahara — toko dibayar setelah dipotong</option>
      <option value="BRUTO">Toko dibayar penuh — pajak disetor dari uang lain</option>
    </select>
    <div class="hint" id="pjModeHint">—</div>
  </div>
```

Ganti dengan:

```html
  <div class="f" style="margin-top:18px" id="pjBlokMode">
    <label>Uang pajaknya bagaimana?</label>
    <div id="pjBarisPph" style="margin-bottom:10px">
      <div class="sub" style="margin-bottom:4px">PPh <span id="pjModePphNilai">—</span></div>
      <select id="pjModePph" onchange="pjPilihMode()">
        <option value="TARIK">Ditahan bendahara — toko dibayar setelah dipotong</option>
        <option value="LUAR_UM">Toko dibayar penuh — Poltek setor dari uang lain</option>
        <option value="PENYEDIA">Toko dibayar penuh — penyedia menyetor sendiri</option>
      </select>
    </div>
    <div id="pjBarisPpn">
      <div class="sub" style="margin-bottom:4px">PPN <span id="pjModePpnNilai">—</span></div>
      <select id="pjModePpn" onchange="pjPilihMode()">
        <option value="TARIK">Ditahan bendahara — toko dibayar setelah dipotong</option>
        <option value="LUAR_UM">Toko dibayar penuh — Poltek setor dari uang lain</option>
        <option value="PENYEDIA">Toko dibayar penuh — penyedia menyetor sendiri</option>
      </select>
    </div>
    <div class="hint" id="pjModeHint">—</div>
  </div>
```

- [ ] **Step 2: Ganti pengisian mode saat layar pajak dibuka**

Cari dua baris berikut di `mobile.html` (di dalam fungsi yang membuka layar pajak, sekitar baris 2263):

```js
  PJ.mode = (String(n.modeBayar||'NETTO').toUpperCase()==='BRUTO') ? 'BRUTO' : 'NETTO';
  $('pjMode').value = PJ.mode;
```

Ganti dengan:

```js
  PJ.modePph = pjModeSah(n.modePph);
  PJ.modePpn = pjModeSah(n.modePpn);
  $('pjModePph').value = PJ.modePph;
  $('pjModePpn').value = PJ.modePpn;
```

- [ ] **Step 3: Ganti handler pemilihan mode dan tambahkan dua helper**

Cari baris berikut di `mobile.html` (sekitar 2277):

```js
function pjPilihMode(){ PJ.mode = ($('pjMode').value==='BRUTO') ? 'BRUTO' : 'NETTO'; hitungPajakUI(); }
```

Ganti dengan:

```js
/* Tiga keadaan mode setor; lihat docs/HANDOFF-MOBILE.md bagian 2. */
function pjModeSah(v){
  var s = String(v==null?'':v).toUpperCase();
  return (s==='LUAR_UM'||s==='PENYEDIA') ? s : 'TARIK';
}
function pjLabelMode(m){
  if (m==='PENYEDIA') return 'disetor penyedia';
  if (m==='LUAR_UM')  return 'disetor Poltek dari dana lain';
  return 'ditahan bendahara';
}
function pjPilihMode(){
  PJ.modePph = pjModeSah($('pjModePph').value);
  PJ.modePpn = pjModeSah($('pjModePpn').value);
  hitungPajakUI();
}
```

- [ ] **Step 4: Ganti pratinjau angka di `hitungPajakUI`**

Cari blok berikut di `mobile.html` (sekitar baris 2310-2318):

```js
  var bruto = (PJ.mode === 'BRUTO');
  var diserahkan = bruto ? nilai : (nilai - total);
  $('pjNetto').textContent = rp(diserahkan);
  $('pjTahan').textContent = rp(total);
  $('pjLbl1').textContent = 'Serahkan ke toko';
  $('pjLbl2').textContent = bruto ? 'Setor dari sumber lain' : 'Tahan untuk disetor';
  $('pjModeHint').textContent = bruto
    ? 'Toko menerima nilai nota utuh. Uang pajaknya tidak diambil dari uang muka ini.'
    : 'Toko menerima nilai nota dikurangi pajak. Uang pajaknya kembali ke bendahara untuk disetor.';
  PJ._hasil = { dpp:r.dpp, ppn:r.ppn, pph:r.pph, diserahkan:diserahkan };
```

Ganti dengan (rumus mengikuti `docs/HANDOFF-MOBILE.md` bagian 2, urutan argumen pph dulu):

```js
  // Rumus persis handoff bagian 2. Jangan menuliskan varian lain.
  var ditarik = (PJ.modePph==='TARIK' ? r.pph : 0) + (PJ.modePpn==='TARIK' ? r.ppn : 0);
  var wajibSetor = (PJ.modePph!=='PENYEDIA' ? r.pph : 0) + (PJ.modePpn!=='PENYEDIA' ? r.ppn : 0);
  var diserahkan = nilai - ditarik;
  var luarUm = wajibSetor - ditarik;

  $('pjModePphNilai').textContent = rp(r.pph);
  $('pjModePpnNilai').textContent = rp(r.ppn);
  $('pjBarisPph').style.display = (r.pph > 0) ? '' : 'none';
  $('pjBarisPpn').style.display = (r.ppn > 0) ? '' : 'none';
  $('pjBlokMode').style.display = (total > 0) ? '' : 'none';

  $('pjNetto').textContent = rp(diserahkan);
  $('pjTahan').textContent = rp(ditarik);
  $('pjLbl1').textContent = 'Serahkan ke toko';
  $('pjLbl2').textContent = 'Tahan untuk disetor';

  var pesan = 'Penyedia menerima ' + rp(diserahkan) + '.';
  if (ditarik > 0) pesan += ' Titipan pajak ke bendahara ' + rp(ditarik) + '.';
  if (luarUm > 0)  pesan += ' Masih wajib disetor Poltek ' + rp(luarUm) + ' dari dana lain.';
  if (PJ.modePph==='PENYEDIA' && r.pph > 0)
    pesan += ' PPh ' + rp(r.pph) + ' disetor penyedia — Poltek tidak menerbitkan bukti potong.';
  if (PJ.modePpn==='PENYEDIA' && r.ppn > 0)
    pesan += ' PPN ' + rp(r.ppn) + ' disetor penyedia — Poltek tidak menerbitkan bukti pungut.';
  $('pjModeHint').textContent = pesan;

  PJ._hasil = { dpp:r.dpp, ppn:r.ppn, pph:r.pph, diserahkan:diserahkan,
                ditarik:ditarik, wajibSetor:wajibSetor };
```

- [ ] **Step 5: Kirim kedua mode saat simpan**

Cari blok berikut di `mobile.html` (sekitar baris 2332):

```js
    .serverSimpanPajakNota(_tok, PJ.no, PJ.urutan, {
      katIdx: PJ.kat,               // kategori asli — sama dengan yang dipakai desktop
      dpp: h.dpp, pph: h.pph, ppn: h.ppn,
      termasukPPN: PJ.inc, adaNpwp: PJ.npwp,
      modeBayar: PJ.mode
    });
```

Ganti dengan:

```js
    .serverSimpanPajakNota(_tok, PJ.no, PJ.urutan, {
      katIdx: PJ.kat,               // kategori asli — sama dengan yang dipakai desktop
      dpp: h.dpp, pph: h.pph, ppn: h.ppn,
      termasukPPN: PJ.inc, adaNpwp: PJ.npwp,
      modePph: PJ.modePph, modePpn: PJ.modePpn
    });
```

- [ ] **Step 6: Periksa tidak ada sisa `PJ.mode` atau `pjMode`**

```bash
cd /home/user/kas-tunai
grep -n "PJ\.mode\b\|'pjMode'\|\"pjMode\"\|getElementById('pjMode')" mobile.html
```

Expected: tidak ada keluaran sama sekali. Bila ada, ganti sesuai pola Step 2-5.

- [ ] **Step 7: Periksa sintaks**

```bash
cd /home/user/kas-tunai
node -e "
var fs=require('fs'), s=fs.readFileSync('mobile.html','utf8');
var m=/<script>([\s\S]*)<\/script>/.exec(s);
if(!m) throw new Error('blok script tidak ditemukan');
require('fs').writeFileSync('/tmp/mh.js', m[1]);
" && node --check /tmp/mh.js && echo "SINTAKS OK" && rm -f /tmp/mh.js
```

Expected: `SINTAKS OK`.

- [ ] **Step 8: Commit**

```bash
cd /home/user/kas-tunai
git add mobile.html
git commit -m "feat(mobile): pemilih mode setor terpisah PPN dan PPh"
```

---

### Task 3: Mobile — konsumen mode (neraca, rincian, daftar, bukti potong, worklist)

**Files:**
- Modify: `mobile.html` (`hitungNeraca` sekitar 1275-1288; rincian pajak sekitar 1355-1365; daftar nota sekitar 1398-1404; `cetakBuktiPotong` sekitar 2144 dan 2190-2196; `renderWorklistPajak` sekitar 2501-2515)

**Interfaces:**
- Consumes dari Task 1: objek nota punya `modePph`, `modePpn`, `pajakDitarik`, `kewajibanSetor`, `dibayarPenyedia`.
- Consumes dari Task 2: fungsi `pjModeSah(v)` dan `pjLabelMode(m)` sudah ada di `mobile.html`.
- Produces: tidak ada antarmuka baru untuk tugas lain.

- [ ] **Step 1: Perbaiki `hitungNeraca`**

Cari blok berikut di `mobile.html` (sekitar baris 1279-1288):

```js
    var pajak = (+n.pajakPph || 0) + (+n.pajakPpn || 0);
    var bruto = (String(n.modeBayar||'NETTO').toUpperCase() === 'BRUTO');
    // Nilai tersimpan dipakai apa adanya; baris lama yang belum punya kolomnya
    // dihitung dari nilai - pajak, sama dengan rumus di server.
    var dibayar = (n.dibayarPenyedia === undefined || n.dibayarPenyedia === null || n.dibayarPenyedia === '')
      ? (bruto ? nilai : nilai - pajak)
      : (+n.dibayarPenyedia || 0);
    sNota += nilai; sPajak += pajak; sDibayar += dibayar;
    sDitarik += bruto ? 0 : pajak;
```

Ganti dengan:

```js
    var pajak = (+n.pajakPph || 0) + (+n.pajakPpn || 0);
    var mPph = pjModeSah(n.modePph), mPpn = pjModeSah(n.modePpn);
    // Rumus persis docs/HANDOFF-MOBILE.md bagian 2.
    var ditarik = (n.pajakDitarik === undefined || n.pajakDitarik === null)
      ? ((mPph==='TARIK' ? (+n.pajakPph||0) : 0) + (mPpn==='TARIK' ? (+n.pajakPpn||0) : 0))
      : (+n.pajakDitarik || 0);
    var setor = (n.kewajibanSetor === undefined || n.kewajibanSetor === null)
      ? ((mPph!=='PENYEDIA' ? (+n.pajakPph||0) : 0) + (mPpn!=='PENYEDIA' ? (+n.pajakPpn||0) : 0))
      : (+n.kewajibanSetor || 0);
    // Nilai tersimpan dipakai apa adanya; baris lama dihitung dengan rumus yang sama.
    var dibayar = (n.dibayarPenyedia === undefined || n.dibayarPenyedia === null || n.dibayarPenyedia === '')
      ? (nilai - ditarik)
      : (+n.dibayarPenyedia || 0);
    sNota += nilai; sPajak += pajak; sDibayar += dibayar;
    sDitarik += ditarik; sWajibSetor += setor;
```

Lalu pada baris deklarasi akumulator di atasnya, ubah:

```js
  var sNota = ringkas ? (+t.notaTotal || 0) : 0, sPajak = 0, sDibayar = 0, sDitarik = 0, i;
```

menjadi:

```js
  var sNota = ringkas ? (+t.notaTotal || 0) : 0, sPajak = 0, sDibayar = 0, sDitarik = 0,
      sWajibSetor = 0, i;
```

- [ ] **Step 2: Perbaiki `ΣPajakLuarUM` pada nilai kembalian `hitungNeraca`**

Cari baris berikut di objek yang dikembalikan `hitungNeraca` (sekitar baris 1303):

```js
    sPajakDitarik: sDitarik, sPajakLuarUM: sPajak - sDitarik,
```

Ganti dengan:

```js
    sPajakDitarik: sDitarik, sWajibSetor: sWajibSetor,
    // Sejak ada keadaan PENYEDIA, ΣPajak memuat pajak yang BUKAN kewajiban
    // Poltek. Dasar kewajiban setor adalah ΣKewajibanSetor, bukan ΣPajak.
    sPajakLuarUM: sWajibSetor - sDitarik,
```

Lalu pastikan tidak ada rumus lama yang tersisa:

```bash
cd /home/user/kas-tunai
grep -n "sPajak - sDitarik\|sPajak-sDitarik" mobile.html
```

Expected: tidak ada keluaran sama sekali.

- [ ] **Step 3: Perbaiki rincian pajak per nota**

Cari dua baris berikut di `mobile.html` (sekitar 1358 dan 1362):

```js
    var brt = (String(n.modeBayar||'NETTO').toUpperCase()==='BRUTO');
```

dan

```js
      + ' · ' + (brt ? 'disetor dari sumber lain' : 'uangnya sudah ditahan') + '</div></div>'
```

Ganti baris pertama dengan:

```js
    var mPphR = pjModeSah(n.modePph);
```

dan baris kedua dengan:

```js
      + ' · ' + esc(pjLabelMode(mPphR)) + '</div></div>'
```

Lalu bungkus tombol bukti potong supaya tidak muncul saat PPh disetor penyedia. Cari:

```js
      + '<button class="lnk" style="font-size:12.5px" onclick="cetakBuktiPotong('
      + aq(t.no) + ',' + aq(n.urutan) + ')">Bukti potong</button></div></div>';
```

Ganti dengan:

```js
      + (mPphR === 'PENYEDIA'
          ? '<span class="sub">Disetor penyedia — tanpa bukti potong</span>'
          : ('<button class="lnk" style="font-size:12.5px" onclick="cetakBuktiPotong('
             + aq(t.no) + ',' + aq(n.urutan) + ')">Bukti potong</button>'))
      + '</div></div>';
```

- [ ] **Step 4: Perbaiki label pajak di daftar nota**

Cari blok berikut di `mobile.html` (sekitar 1400-1403):

```js
      ? (((+n.pajakPph||0)+(+n.pajakPpn||0))>0
          ? ('Dipotong ' + rp((+n.pajakPph||0)+(+n.pajakPpn||0))
             + (String(n.modeBayar||'NETTO').toUpperCase()==='BRUTO' ? ' · dibayar penuh' : ''))
          : 'Bebas pajak')
```

Ganti dengan:

```js
      ? (((+n.pajakPph||0)+(+n.pajakPpn||0))>0
          ? ('Dipotong ' + rp((+n.pajakPph||0)+(+n.pajakPpn||0))
             + ((+n.pajakDitarik||0) === 0 ? ' · dibayar penuh' : ''))
          : 'Bebas pajak')
```

- [ ] **Step 5: Perbaiki `cetakBuktiPotong`**

Cari baris berikut di `mobile.html` (sekitar 2144):

```js
  var bruto = (String(n.modeBayar||'NETTO').toUpperCase()==='BRUTO');
```

Ganti dengan:

```js
  var mPph = pjModeSah(n.modePph), mPpn = pjModeSah(n.modePpn);
  // Bukti potong/pungut hanya sah untuk pajak yang benar-benar dipungut Poltek.
  if (mPph === 'PENYEDIA' && mPpn === 'PENYEDIA'){
    toast('Kedua pajak disetor penyedia — Poltek tidak menerbitkan bukti potong', true);
    return '';
  }
  var ditarik = (mPph==='TARIK' ? pph : 0) + (mPpn==='TARIK' ? ppn : 0);
```

Perhatikan: baris ini berada **setelah** `pph`/`ppn` dideklarasikan (baris `var pph = +n.pajakPph||0, ppn = +n.pajakPpn||0, dpp = +n.pajakDpp||0;`). Bila urutannya berbeda, pindahkan blok ini ke bawah deklarasi itu.

- [ ] **Step 6: Perbaiki isi cetakan bukti potong**

Cari blok berikut di `mobile.html` (sekitar 2185-2196):

```js
  + (pph ? br(esc(ref.jenisPPh||'PPh'), rp(pph),
      'Kode MAP ' + (ref.mapPPh||'-') + ' / KJS ' + (ref.kjsPPh||'-')) : '')
  + (ppn ? br('PPN 11%', rp(ppn), 'Kode MAP 411211 / KJS 900') : '')
  +'<tr><td class="tot" colspan="2">Jumlah dipotong</td><td class="tot">'+rp(pph+ppn)+'</td></tr>'
  +'</table>'
  +'<div class="cat">'
  + (bruto
      ? 'Penyedia menerima pembayaran <b>penuh</b> sebesar ' + rp(n.nilai)
        + '. Pajak sebesar ' + rp(pph+ppn) + ' disetor ke kas negara dari sumber dana lain.'
      : 'Penyedia menerima <b>' + rp(n.dibayarPenyedia) + '</b> (nilai nota dikurangi pajak). '
        + 'Pajak sebesar ' + rp(pph+ppn) + ' ditahan Bendahara Pengeluaran dan disetor ke kas negara.')
  +'</div>'
```

Ganti dengan (baris pajak yang disetor penyedia tidak dicetak sama sekali):

```js
  + ((pph && mPph !== 'PENYEDIA') ? br(esc(ref.jenisPPh||'PPh'), rp(pph),
      'Kode MAP ' + (ref.mapPPh||'-') + ' / KJS ' + (ref.kjsPPh||'-')
      + ' · ' + pjLabelMode(mPph)) : '')
  + ((ppn && mPpn !== 'PENYEDIA') ? br('PPN 11%', rp(ppn),
      'Kode MAP 411211 / KJS 900 · ' + pjLabelMode(mPpn)) : '')
  +'<tr><td class="tot" colspan="2">Jumlah dipungut Poltek</td><td class="tot">'
  + rp((mPph!=='PENYEDIA'?pph:0) + (mPpn!=='PENYEDIA'?ppn:0)) + '</td></tr>'
  +'</table>'
  +'<div class="cat">'
  + 'Penyedia menerima <b>' + rp(n.dibayarPenyedia) + '</b>'
  + (ditarik > 0
      ? (' (nilai nota dikurangi pajak). Pajak sebesar ' + rp(ditarik)
         + ' ditahan Bendahara Pengeluaran dan disetor ke kas negara.')
      : ' — pembayaran penuh, tidak ada pajak yang ditahan dari nota ini.')
  + ((mPph==='LUAR_UM' && pph) ? (' PPh sebesar ' + rp(pph)
      + ' disetor ke kas negara dari sumber dana lain.') : '')
  + ((mPpn==='LUAR_UM' && ppn) ? (' PPN sebesar ' + rp(ppn)
      + ' disetor ke kas negara dari sumber dana lain.') : '')
  + ((mPph==='PENYEDIA' && pph) ? (' PPh sebesar ' + rp(pph)
      + ' disetor sendiri oleh penyedia dan tidak dipungut Poltek.') : '')
  + ((mPpn==='PENYEDIA' && ppn) ? (' PPN sebesar ' + rp(ppn)
      + ' disetor sendiri oleh penyedia dan tidak dipungut Poltek.') : '')
  +'</div>'
```

- [ ] **Step 7: Perbaiki ringkasan worklist setor**

Cari blok berikut di `mobile.html` (sekitar 2501-2515):

```js
  var netto = g.belumSetor.filter(function(n){ return n.modeBayar!=='BRUTO'; });
  var bruto = g.belumSetor.filter(function(n){ return n.modeBayar==='BRUTO'; });
  var sPph=0, sPpn=0, i;
  for (i=0;i<g.belumSetor.length;i++){ sPph += (+g.belumSetor[i].pajakPph||0); sPpn += (+g.belumSetor[i].pajakPpn||0); }

  var h = '<div class="neraca"><div class="kick" style="margin-bottom:6px">Ringkasan belum disetor</div>'
    + _dtBaris('Total PPh', sPph)
    + _dtBaris('Total PPN', sPpn)
    + _dtBaris('Uangnya sudah di tangan (NETTO)', netto.reduce(function(a,n){return a+(+n.pajakPph||0)+(+n.pajakPpn||0);},0),
        netto.length + ' nota — ditahan saat pembayaran')
    + _dtBaris('Harus disetor dari sumber lain (BRUTO)', bruto.reduce(function(a,n){return a+(+n.pajakPph||0)+(+n.pajakPpn||0);},0),
        bruto.length + ' nota — belum ditarik dari mana pun')
    + '</div>';
```

Ganti dengan (pemilahan pindah dari per-nota ke per komponen pajak):

```js
  // Satu nota bisa berutang PPN tetapi tidak PPh, jadi pemilahan per KOMPONEN
  // pajak, bukan per nota. Komponen bermode PENYEDIA bukan kewajiban Poltek dan
  // tidak dihitung sama sekali. Rumus: docs/HANDOFF-MOBILE.md bagian 2.
  var sPph=0, sPpn=0, sDitarik=0, sLuarUm=0, nDitarik=0, nLuarUm=0, i;
  for (i=0;i<g.belumSetor.length;i++){
    var n0 = g.belumSetor[i];
    var mPph0 = pjModeSah(n0.modePph), mPpn0 = pjModeSah(n0.modePpn);
    var pph0 = +n0.pajakPph||0, ppn0 = +n0.pajakPpn||0;
    if (mPph0!=='PENYEDIA') sPph += pph0;
    if (mPpn0!=='PENYEDIA') sPpn += ppn0;
    var d0 = (mPph0==='TARIK'?pph0:0) + (mPpn0==='TARIK'?ppn0:0);
    var l0 = (mPph0==='LUAR_UM'?pph0:0) + (mPpn0==='LUAR_UM'?ppn0:0);
    sDitarik += d0; sLuarUm += l0;
    if (d0>0) nDitarik++;
    if (l0>0) nLuarUm++;
  }

  var h = '<div class="neraca"><div class="kick" style="margin-bottom:6px">Ringkasan belum disetor</div>'
    + _dtBaris('Total PPh', sPph, 'Yang jadi kewajiban Poltek')
    + _dtBaris('Total PPN', sPpn, 'Yang jadi kewajiban Poltek')
    + _dtBaris('Uangnya sudah di tangan', sDitarik,
        nDitarik + ' nota — ditahan saat pembayaran')
    + _dtBaris('Harus disetor dari sumber lain', sLuarUm,
        nLuarUm + ' nota — belum ditarik dari mana pun')
    + '</div>';
```

- [ ] **Step 8: Keluarkan nota yang seluruh pajaknya disetor penyedia dari daftar belum-setor**

Cari fungsi `_wpKelompokkan` di `mobile.html` dan temukan tempat nota dimasukkan ke array `b` (kelompok "belum setor"). Tambahkan penjagaan tepat sebelum `b.push(...)`:

```js
      // Kedua pajak disetor penyedia -> bukan kewajiban Poltek, jangan ditagih.
      if (pjModeSah(n.modePph)==='PENYEDIA' && pjModeSah(n.modePpn)==='PENYEDIA') continue;
```

Bila konteksnya bukan perulangan `for` melainkan `filter`/`forEach`, gunakan bentuk yang setara (`return;` untuk `forEach`, atau kondisi negatif untuk `filter`).

- [ ] **Step 9: Periksa tidak ada sisa `modeBayar` di `mobile.html`**

```bash
cd /home/user/kas-tunai
grep -n "modeBayar" mobile.html
```

Expected: tidak ada keluaran sama sekali.

- [ ] **Step 10: Periksa sintaks**

```bash
cd /home/user/kas-tunai
node -e "
var fs=require('fs'), s=fs.readFileSync('mobile.html','utf8');
var m=/<script>([\s\S]*)<\/script>/.exec(s);
if(!m) throw new Error('blok script tidak ditemukan');
fs.writeFileSync('/tmp/mh.js', m[1]);
" && node --check /tmp/mh.js && echo "SINTAKS OK" && rm -f /tmp/mh.js
```

Expected: `SINTAKS OK`.

- [ ] **Step 11: Commit**

```bash
cd /home/user/kas-tunai
git add mobile.html
git commit -m "feat(mobile): konsumen mode setor pajak per jenis"
```

---

### Task 4: Desktop — pemilih mode, perbaikan bug reset, dan aturan cetak

**Files:**
- Modify: `index.html` — markup `#modalPajak` (sekitar baris 866-871); `openModalPajak` reset (sekitar 4517-4519); `siapkan(n)` (sekitar 4564-4575); `recalcPajak` (sekitar 4645-4658); `simpanPajakModal` (sekitar 4678-4680); `cetakKuitansiPajakNota` (sekitar 3986); `cetakKuitansiPajak` (sekitar 4698); `_renderKuitansiPajakHtml`

**Interfaces:**
- Consumes dari Task 1: objek nota punya `modePph`, `modePpn`, `pajakDitarik`, `kewajibanSetor`; `serverSimpanPajakNota` menerima `d.modePph`/`d.modePpn`.
- Produces: tidak ada antarmuka baru untuk tugas lain.

**Catatan penting:** ini tugas yang memperbaiki bug Bagian 7 spec — desktop selama ini menyimpan pajak nota **tanpa** mengirim mode, sehingga mode ter-reset diam-diam. Perbaikannya ada di Step 5.

- [ ] **Step 1: Tambahkan markup pemilih mode**

Cari blok berikut di `index.html` (sekitar baris 866-871):

```html
    <label style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-size:14px">
      <input type="checkbox" id="pjAdaNpwp" checked onchange="recalcPajak()"> Rekanan ber-NPWP
    </label>
```

Tambahkan **sesudahnya**:

```html
    <div class="card" id="pjBlokMode" style="margin:0 0 12px">
      <div class="field" style="margin-bottom:8px"><label>Uang PPh-nya bagaimana? <span id="pjModePphNilai" class="tgl"></span></label>
        <select id="pjModePph" onchange="recalcPajak()">
          <option value="TARIK">Ditahan bendahara — rekanan dibayar setelah dipotong</option>
          <option value="LUAR_UM">Rekanan dibayar penuh — Poltek setor dari dana lain</option>
          <option value="PENYEDIA">Rekanan dibayar penuh — penyedia menyetor sendiri</option>
        </select>
      </div>
      <div class="field" style="margin-bottom:4px"><label>Uang PPN-nya bagaimana? <span id="pjModePpnNilai" class="tgl"></span></label>
        <select id="pjModePpn" onchange="recalcPajak()">
          <option value="TARIK">Ditahan bendahara — rekanan dibayar setelah dipotong</option>
          <option value="LUAR_UM">Rekanan dibayar penuh — Poltek setor dari dana lain</option>
          <option value="PENYEDIA">Rekanan dibayar penuh — penyedia menyetor sendiri</option>
        </select>
      </div>
      <div class="tgl" id="pjModeHint">—</div>
    </div>
```

- [ ] **Step 2: Tambahkan dua helper mode**

Tambahkan tepat sebelum `function recalcPajak(){` di `index.html`:

```js
/* Tiga keadaan mode setor pajak; rumus di docs/HANDOFF-MOBILE.md bagian 2. */
function pjModeSah(v){
  var s=String(v==null?'':v).toUpperCase();
  return (s==='LUAR_UM'||s==='PENYEDIA') ? s : 'TARIK';
}
function pjLabelMode(m){
  if(m==='PENYEDIA') return 'disetor penyedia';
  if(m==='LUAR_UM')  return 'disetor Poltek dari dana lain';
  return 'ditahan bendahara';
}
```

- [ ] **Step 3: Isi pemilih mode saat modal dibuka**

Di `openModalPajak`, cari dua baris reset ini (sekitar 4517-4519):

```js
  document.getElementById('pjTermasukPPN').checked=true;
  document.getElementById('pjAdaNpwp').checked=true;
```

Tambahkan **sesudahnya**:

```js
  // Default nota baru / mode transaksi: kedua pajak ditahan bendahara.
  document.getElementById('pjModePph').value='TARIK';
  document.getElementById('pjModePpn').value='TARIK';
```

Lalu di dalam `siapkan(n)` (mode per nota), cari:

```js
    _pjNota=n;
```

Tambahkan **sesudahnya**:

```js
    document.getElementById('pjModePph').value=pjModeSah(n.modePph);
    document.getElementById('pjModePpn').value=pjModeSah(n.modePpn);
```

- [ ] **Step 4: Tampilkan pratinjau angka di `recalcPajak`**

Di `recalcPajak`, cari baris ini:

```js
    +baris('Dibayar ke rekanan', rupiah(pj.nettoRekanan))
```

Ganti dengan:

```js
    +baris('Dibayar ke rekanan', rupiah(_pjNilaiDasarSekarang() - _pjHitungDitarik(pj).ditarik))
```

Lalu tambahkan di akhir badan `recalcPajak`, sebelum kurung tutupnya, blok pratinjau:

```js
  // Konsekuensi uangnya per jenis pajak. Rumus: docs/HANDOFF-MOBILE.md bagian 2.
  var _m=_pjHitungDitarik(pj);
  document.getElementById('pjModePphNilai').textContent=rupiah(pj.pph);
  document.getElementById('pjModePpnNilai').textContent=rupiah(pj.ppn);
  document.getElementById('pjBlokMode').style.display=(pj.totalPajak>0)?'':'none';
  var _nilai=_pjNilaiDasarSekarang();
  var _pesan='Penyedia menerima '+rupiah(_nilai-_m.ditarik)+'.';
  if(_m.ditarik>0) _pesan+=' Titipan pajak ke bendahara '+rupiah(_m.ditarik)+'.';
  if(_m.luarUm>0)  _pesan+=' Masih wajib disetor Poltek '+rupiah(_m.luarUm)+' dari dana lain.';
  if(_m.mPph==='PENYEDIA'&&pj.pph>0)
    _pesan+=' PPh '+rupiah(pj.pph)+' disetor penyedia — Poltek tidak menerbitkan bukti potong.';
  if(_m.mPpn==='PENYEDIA'&&pj.ppn>0)
    _pesan+=' PPN '+rupiah(pj.ppn)+' disetor penyedia — Poltek tidak menerbitkan bukti pungut.';
  document.getElementById('pjModeHint').textContent=_pesan;
```

Dan tambahkan dua helper ini tepat sesudah `function pjLabelMode(...)` dari Step 2:

```js
/* Nilai dasar (bruto) yang sedang dipakai modal pajak. */
function _pjNilaiDasarSekarang(){
  return unfmt((document.getElementById('pjNilaiDasar')||{}).value||'0');
}
/* Pajak yang ditahan & yang masih wajib disetor dari dana lain. */
function _pjHitungDitarik(pj){
  var mPph=pjModeSah((document.getElementById('pjModePph')||{}).value);
  var mPpn=pjModeSah((document.getElementById('pjModePpn')||{}).value);
  var ditarik=(mPph==='TARIK'?pj.pph:0)+(mPpn==='TARIK'?pj.ppn:0);
  var setor=(mPph!=='PENYEDIA'?pj.pph:0)+(mPpn!=='PENYEDIA'?pj.ppn:0);
  return { mPph:mPph, mPpn:mPpn, ditarik:ditarik, luarUm:setor-ditarik, wajibSetor:setor };
}
```

- [ ] **Step 5: Kirim kedua mode saat simpan — INI PERBAIKAN BUG-NYA**

Cari blok berikut di `index.html` (sekitar baris 4678):

```js
  var d={ katIdx:katIdx, pph:pj.pph, ppn:pj.ppn, dpp:pj.dpp,
          termasukPPN:document.getElementById('pjTermasukPPN').checked,
          adaNpwp:document.getElementById('pjAdaNpwp').checked };
```

Ganti dengan:

```js
  // Mode WAJIB ikut dikirim. Sebelum perbaikan ini, desktop mengirim d tanpa
  // mode sehingga nota bermode non-default ter-reset diam-diam dan nilai yang
  // boleh diserahkan ke penyedia ikut berubah tanpa peringatan.
  var d={ katIdx:katIdx, pph:pj.pph, ppn:pj.ppn, dpp:pj.dpp,
          termasukPPN:document.getElementById('pjTermasukPPN').checked,
          adaNpwp:document.getElementById('pjAdaNpwp').checked,
          modePph:pjModeSah(document.getElementById('pjModePph').value),
          modePpn:pjModeSah(document.getElementById('pjModePpn').value) };
```

- [ ] **Step 6: Cegah cetak bukti potong untuk pajak yang tidak dipungut Poltek**

Di `index.html`, cari fungsi `cetakKuitansiPajakNota(no, urutan)` (di bawah komentar `/* Cetak bukti potong untuk satu nota (diserahkan ke rekanan nota itu). */`). Cari baris:

```js
  if(pj.totalPajak<=0){ toast('Nota ini tidak dipotong pajak','info'); return; }
```

Tambahkan **sesudahnya**:

```js
  // Bukti potong/pungut hanya sah untuk pajak yang benar-benar dipungut Poltek.
  if(pjModeSah(n.modePph)==='PENYEDIA'&&pjModeSah(n.modePpn)==='PENYEDIA'){
    toast('Kedua pajak disetor penyedia — Poltek tidak menerbitkan bukti potong','error'); return;
  }
```

Lalu cari fungsi `cetakKuitansiPajak(no)` (cetak massal dari kartu transaksi) dan baris penyaringnya:

```js
        if(n.pajakKatIdx!==null && n.pajakKatIdx!==undefined && ((+n.pajakPph||0)+(+n.pajakPpn||0))>0) kena.push(n);
```

Ganti dengan:

```js
        if(pjModeSah(n.modePph)==='PENYEDIA'&&pjModeSah(n.modePpn)==='PENYEDIA') continue;
        if(n.pajakKatIdx!==null && n.pajakKatIdx!==undefined && ((+n.pajakPph||0)+(+n.pajakPpn||0))>0) kena.push(n);
```

- [ ] **Step 7: Cantumkan mode tiap komponen di cetakan pajak per nota**

Fungsi `_renderKuitansiPajakHtml(t, pj, n)` di `index.html` merakit lembar pajak per nota (dipakai kedua fungsi cetak di Step 6). Di awal badan fungsinya, tambahkan:

```js
  var _mPph=pjModeSah(n&&n.modePph), _mPpn=pjModeSah(n&&n.modePpn);
  var _ditarik=(_mPph==='TARIK'?(+pj.pph||0):0)+(_mPpn==='TARIK'?(+pj.ppn||0):0);
```

Lalu cari baris yang mencetak total potongan di dalam fungsi itu (baris yang memuat teks `Jumlah dipotong` atau `Total potongan`, bergantung susunan berkasnya) dan tambahkan **tepat sesudah tabel angkanya** blok keterangan berikut:

```js
  +'<div class="cat" style="margin-top:8px">'
  + 'Penyedia menerima <b>'+rupiah((+pj.nilaiBruto||+pj.dpp||0)-_ditarik)+'</b>'
  + (_ditarik>0
      ? (' — pajak sebesar '+rupiah(_ditarik)+' ditahan Bendahara Pengeluaran dan disetor ke kas negara.')
      : ' — pembayaran penuh, tidak ada pajak yang ditahan dari nota ini.')
  + ((_mPph==='LUAR_UM'&&pj.pph>0)?(' PPh '+rupiah(pj.pph)+' disetor Poltek dari dana lain.'):'')
  + ((_mPpn==='LUAR_UM'&&pj.ppn>0)?(' PPN '+rupiah(pj.ppn)+' disetor Poltek dari dana lain.'):'')
  + ((_mPph==='PENYEDIA'&&pj.pph>0)?(' PPh '+rupiah(pj.pph)+' disetor sendiri oleh penyedia dan tidak dipungut Poltek.'):'')
  + ((_mPpn==='PENYEDIA'&&pj.ppn>0)?(' PPN '+rupiah(pj.ppn)+' disetor sendiri oleh penyedia dan tidak dipungut Poltek.'):'')
  +'</div>'
```

Bila nama field nilai bruto di objek `pj` bukan `nilaiBruto` maupun `dpp`, pakai nama yang memang ada di `_notaPajakObj(n)` — periksa fungsi itu dulu, jangan menebak.

- [ ] **Step 8: Periksa tidak ada sisa `modeBayar` di `index.html`**

```bash
cd /home/user/kas-tunai
grep -n "modeBayar" index.html
```

Expected: tidak ada keluaran sama sekali.

- [ ] **Step 9: Periksa sintaks**

```bash
cd /home/user/kas-tunai
node -e "
var fs=require('fs'), s=fs.readFileSync('index.html','utf8');
var m=/<script>([\s\S]*)<\/script>/.exec(s);
if(!m) throw new Error('blok script tidak ditemukan');
fs.writeFileSync('/tmp/ih.js', m[1]);
" && node --check /tmp/ih.js && echo "SINTAKS OK" && rm -f /tmp/ih.js
```

Expected: `SINTAKS OK`.

- [ ] **Step 10: Commit**

```bash
cd /home/user/kas-tunai
git add index.html
git commit -m "fix(desktop): kirim mode setor pajak, cegah reset diam-diam"
```

---

### Task 5: Verifikasi klik nyata + papan status

**Files:**
- Modify: `docs/HANDOFF-MOBILE.md` (papan status, bagian 1)
- Test: skrip Playwright sementara di scratchpad (tidak dikomit)

**Interfaces:**
- Consumes: seluruh hasil Task 1-4.
- Produces: tidak ada kode baru.

**Kenapa klik nyata:** `page.evaluate(function(){ fn(); })` membuktikan logika, **bukan** markup. Bug `onclick` yang pernah terjadi di proyek ini (`docs/HANDOFF-MOBILE.md` bagian 1) lolos dari uji semacam itu. Semua interaksi di bawah wajib `page.selectOption()` / `page.click()` sungguhan.

- [ ] **Step 1: Pasang Playwright bila belum ada**

```bash
cd /home/user/kas-tunai
node -e "require.resolve('playwright')" 2>/dev/null || \
  PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm i --no-save playwright
node -e "console.log(require.resolve('playwright'))"
```

Expected: sebuah path ke `playwright` tercetak. Peramban **tidak** diunduh — sudah tersedia di `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

- [ ] **Step 2: Tulis skrip verifikasi**

Tulis ke `/tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-mode-pajak-ui.js`. **Jangan dikomit.**

```js
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const REPO = '/home/user/kas-tunai';
const EXE = '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';

/* mobile.html memuat dua scriptlet GAS (<?= ... ?>) yang tidak sah di peramban
   biasa; diganti nilai palsu supaya halaman bisa dimuat apa adanya. */
function muat(nama) {
  return fs.readFileSync(path.join(REPO, nama), 'utf8')
    .replace(/<\?=\s*iconUrl\s*\?>/g, '')
    .replace(/<\?=\s*webAppUrl\s*\?>/g, 'http://localhost/')
    .replace(/<\?!?=?[\s\S]*?\?>/g, '');
}

let gagal = 0;
function cek(nama, dapat, harap) {
  const ok = String(dapat) === String(harap);
  if (!ok) gagal++;
  console.log((ok ? 'PASS  ' : 'FAIL  ') + nama +
    (ok ? '' : `  dapat=${JSON.stringify(dapat)} harap=${JSON.stringify(harap)}`));
}

(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  page.on('pageerror', e => { console.log('GALAT HALAMAN: ' + e.message); gagal++; });

  await page.setContent(muat('mobile.html'), { waitUntil: 'domcontentloaded' });

  /* Siapkan keadaan minimal: satu transaksi, satu nota bernilai 10 juta. */
  await page.evaluate(() => {
    window._tok = 'uji';
    window.google = { script: { run: new Proxy({}, { get: () => function () { return window.google.script.run; } }) } };
    window.google.script.run.withSuccessHandler = function () { return window.google.script.run; };
    window.google.script.run.withFailureHandler = function () { return window.google.script.run; };
  });

  /* Buka layar pajak untuk nota uji lewat jalur yang sesungguhnya dipakai. */
  await page.evaluate(() => {
    window.__nota = { urutan: 1, namaPenyedia: 'CV Uji', nilai: 10000000, npwp: '',
      pajakKatIdx: 0, pajakDpp: 9009009, pajakPph: 150000, pajakPpn: 1100000,
      pajakTermasukPPN: true, pajakAdaNpwp: true,
      modePph: 'TARIK', modePpn: 'TARIK', pajakDitarik: 1250000,
      kewajibanSetor: 1250000, dibayarPenyedia: 8750000 };
    window.__tx = { no: 1, tanggal: '2026-07-28', kegiatan: 'Belanja uji', kredit: 10000000 };
  });

  /* --- Skenario 1: kedua selektor ada dan terisi dari data nota --- */
  await page.evaluate(() => {
    PJ.no = 1; PJ.urutan = 1; PJ.nota = window.__nota;
    PJ.modePph = pjModeSah(window.__nota.modePph);
    PJ.modePpn = pjModeSah(window.__nota.modePpn);
    document.getElementById('pjModePph').value = PJ.modePph;
    document.getElementById('pjModePpn').value = PJ.modePpn;
  });
  cek('selektor PPh ada', await page.locator('#pjModePph').count(), 1);
  cek('selektor PPN ada', await page.locator('#pjModePpn').count(), 1);
  cek('PPh awal TARIK', await page.locator('#pjModePph').inputValue(), 'TARIK');
  cek('PPN awal TARIK', await page.locator('#pjModePpn').inputValue(), 'TARIK');

  /* --- Skenario 2: KLIK NYATA mengubah PPh jadi PENYEDIA --- */
  await page.selectOption('#pjModePph', 'PENYEDIA');
  cek('PJ.modePph ikut berubah setelah klik nyata',
      await page.evaluate(() => PJ.modePph), 'PENYEDIA');
  cek('PJ.modePpn tidak ikut berubah',
      await page.evaluate(() => PJ.modePpn), 'TARIK');

  /* --- Skenario 3: KLIK NYATA mengubah PPN jadi LUAR_UM --- */
  await page.selectOption('#pjModePpn', 'LUAR_UM');
  cek('PJ.modePpn jadi LUAR_UM', await page.evaluate(() => PJ.modePpn), 'LUAR_UM');
  cek('PJ.modePph tetap PENYEDIA', await page.evaluate(() => PJ.modePph), 'PENYEDIA');

  /* --- Skenario 4: helper mode menolak nilai ngawur, tiga nilai sah lolos --- */
  cek('pjModeSah("NGAWUR") -> TARIK', await page.evaluate(() => pjModeSah('NGAWUR')), 'TARIK');
  cek('pjModeSah("") -> TARIK', await page.evaluate(() => pjModeSah('')), 'TARIK');
  cek('pjModeSah("luar_um") -> LUAR_UM', await page.evaluate(() => pjModeSah('luar_um')), 'LUAR_UM');
  cek('pjModeSah("PENYEDIA") -> PENYEDIA', await page.evaluate(() => pjModeSah('PENYEDIA')), 'PENYEDIA');

  /* --- Skenario 5: label mode --- */
  cek('label PENYEDIA', await page.evaluate(() => pjLabelMode('PENYEDIA')), 'disetor penyedia');
  cek('label LUAR_UM', await page.evaluate(() => pjLabelMode('LUAR_UM')), 'disetor Poltek dari dana lain');
  cek('label TARIK', await page.evaluate(() => pjLabelMode('TARIK')), 'ditahan bendahara');

  /* --- Skenario 6: desktop punya kedua selektor dan mengirim mode --- */
  const page2 = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  page2.on('pageerror', e => { console.log('GALAT HALAMAN (desktop): ' + e.message); gagal++; });
  await page2.setContent(muat('index.html'), { waitUntil: 'domcontentloaded' });
  cek('desktop selektor PPh ada', await page2.locator('#pjModePph').count(), 1);
  cek('desktop selektor PPN ada', await page2.locator('#pjModePpn').count(), 1);
  cek('desktop pjModeSah tersedia',
      await page2.evaluate(() => typeof pjModeSah), 'function');

  /* --- Skenario 7: BUKTI PERBAIKAN BUG — objek d yang dikirim memuat mode --- */
  await page2.selectOption('#pjModePph', 'LUAR_UM');
  await page2.selectOption('#pjModePpn', 'PENYEDIA');
  const d = await page2.evaluate(() => ({
    modePph: pjModeSah(document.getElementById('pjModePph').value),
    modePpn: pjModeSah(document.getElementById('pjModePpn').value)
  }));
  cek('desktop kirim modePph', d.modePph, 'LUAR_UM');
  cek('desktop kirim modePpn', d.modePpn, 'PENYEDIA');

  /* --- Skenario 8: tidak ada sisa markup lama --- */
  cek('markup #pjMode lama sudah hilang (mobile)',
      await page.locator('#pjMode').count(), 0);

  await browser.close();
  console.log(gagal === 0 ? '\nSEMUA LOLOS' : '\n' + gagal + ' GAGAL');
  process.exit(gagal === 0 ? 0 : 1);
})();
```

- [ ] **Step 3: Jalankan verifikasi**

```bash
cd /home/user/kas-tunai
node /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-mode-pajak-ui.js
```

Expected: seluruh baris `PASS`, lalu `SEMUA LOLOS`, exit code 0. Bila ada `FAIL` atau `GALAT HALAMAN`, perbaiki `mobile.html`/`index.html` — **jangan** melonggarkan skrip ujinya.

Bila sebuah skenario ternyata tidak bisa dijalankan karena keadaan halaman yang belum siap (mis. fungsi bergantung data yang belum dimuat), **laporkan skenario itu sebagai tidak terverifikasi** di laporan tugas; jangan menghapusnya diam-diam.

- [ ] **Step 4: Hapus skrip sementara**

```bash
rm -f /tmp/claude-0/-home-user-kas-tunai/718d324c-66ed-582a-92de-6e6c4c133f0b/scratchpad/kt-mode-pajak-ui.js
cd /home/user/kas-tunai && rm -rf node_modules package-lock.json 2>/dev/null; true
```

- [ ] **Step 5: Perbarui papan status `docs/HANDOFF-MOBILE.md`**

Di tabel papan status bagian 1, tambahkan baris baru di bawah baris tugas 12:

```
| 13 | Mode setor pajak terpisah PPN & PPh (3 keadaan: ditahan / setor dari dana lain / penyedia menyetor sendiri) | *(belum ada perintah)* | 🟡 kode selesai → lihat commit terakhir; uji fungsi murni 38/38 lolos, uji klik nyata lolos; **belum diuji di HP sungguhan** — perlu deploy.bat + tes simpan/buka ulang sebelum ✅ |
```

Tambahkan juga catatan singkat di bawah tabel:

```
**Tugas 13 sekaligus memperbaiki bug lama:** desktop menyimpan pajak nota tanpa
mengirim mode, sehingga nota bermode non-default ter-reset diam-diam dan nilai
yang boleh diserahkan ke penyedia ikut berubah. Rumus lengkapnya ada di bagian 2.
```

- [ ] **Step 6: Commit**

```bash
cd /home/user/kas-tunai
git add docs/HANDOFF-MOBILE.md
git commit -m "docs: catat mode setor pajak terpisah di papan status"
```

---

## Catatan untuk pelaksana

- **Nomor baris di plan ini adalah petunjuk, bukan jaminan.** Setiap langkah menyebut potongan kode yang dicari; cari berdasarkan isinya, bukan nomornya — nomor bergeser setelah langkah sebelumnya.
- **Bila potongan kode yang dicari tidak ditemukan persis**, jangan menebak. Laporkan sebagai `NEEDS_CONTEXT` dengan potongan yang sebenarnya ada di berkas.
- **Jangan menambah kolom sheet lain**, jangan memecah `SETOR_STATUS` per jenis pajak, jangan menyentuh `Code.gs` atau `.clasp.json`.
- **Verifikasi akhir aplikasi ini tetap manual di HP/desktop sungguhan** setelah `deploy.bat` — uji otomatis di plan ini membuktikan rumus dan markup, bukan perilaku di Google Apps Script sungguhan.
