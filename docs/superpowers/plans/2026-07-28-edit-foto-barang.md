# Edit Foto Barang (Bukti B) — Mobile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Biarkan pengguna mengganti gambar dan mengetik/mengubah keterangan pada foto barang (Bukti B) yang sudah tersimpan di server, langsung dari layar "Ubah nota" di mobile — saat ini foto Bukti B yang sudah tersimpan hanya bisa dihapus, tidak bisa diganti atau diberi keterangan.

**Architecture:** Satu endpoint backend baru (`updateFotoNota`/`serverUpdateFotoNota`) mengikuti pola `updateNota` yang sudah ada untuk Bukti A (ganti file = upload baru + buang file lama via `DriveHelper`). Di frontend, tiap tile Bukti B di layar Ubah nota mendapat tombol "ganti" (memicu `<input type="file">` tersembunyi, kompres+upload langsung) dan kotak keterangan (tersimpan saat blur) — semuanya tersimpan seketika, tidak menunggu tombol "Simpan perubahan" nota.

**Tech Stack:** Backend ES5 (`.gs`, `var`+`function`), frontend `mobile.html` vanilla ES5 satu file. Verifikasi lewat Playwright (`/opt/node22/lib/node_modules/playwright`, Chromium `/opt/pw-browsers/chromium`) dengan interaksi nyata (`click()`/`dispatchEvent('blur')`), bukan cuma panggil fungsi langsung.

## Global Constraints

- Backend `.gs` tetap ES5 murni: `var`+`function`, tanpa `let`/`const`/arrow/template literal/`Promise`/`class`.
- Frontend tetap satu file `mobile.html`, ES5 murni, idiom `.className = '...'` (bukan `classList`) — konsisten dengan kode sekitar.
- Nilai dinamis yang diselipkan ke atribut `onclick`/`onchange` HTML wajib lewat `aq()` (helper `mobile.html:822`) — KECUALI indeks array integer murni (`i`), yang sudah menjadi pola aman terpakai di fungsi tetangga (`ntHapusFotoServer(i)`, `ntHapusFoto(jenis,i)`).
- Tidak ada kolom sheet baru — `KETERANGAN` sudah ada di skema `FOTO_NOTA` sejak awal.
- Ganti gambar TANPA dialog konfirmasi (meniru tombol ganti Bukti A yang sudah ada). Keterangan dan ganti gambar TIDAK menunggu `navigator.onLine` check (meniru `ntHapusFotoServer`/`hapusNota` yang sudah ada) — kegagalan koneksi ditangani lewat `gagal()` yang sudah ada.
- Foto Bukti B yang BARU diambil dan belum disimpan (`NT.fotoBarang`) TIDAK disentuh rencana ini — tetap pakai keterangan baku seperti sekarang.
- Spec sumber: `docs/superpowers/specs/2026-07-28-edit-foto-barang-design.md` (5 bagian, semua disetujui pengguna 28 Jul 2026).

---

## File Structure

- **`FotoNota.gs`** — tambah fungsi `updateFotoNota(noTransaksi, notaId, urutan, data)`, diekspos lewat object `return` module ini.
- **`Code.gs`** — tambah endpoint `serverUpdateFotoNota(token, noTransaksi, notaId, urutan, data)`, dekat endpoint foto lain yang sudah ada.
- **`mobile.html`**:
  - JS baru: `ntGantiFotoB(i)`, `_ntGantiFotoBFile(el)`, `ntSimpanKeteranganB(i, teks)` — disisipkan di antara `_ntHapusFotoServerLanjut` dan `simpanNotaBaru` (kelompok fungsi foto-nota yang sudah ada).
  - Markup baru: `<input type="file" id="ntGantiBFile">` tersembunyi (statis, sekali, di layar `scNota`).
  - Markup diubah: blok Bukti B di `ntRenderFoto()` — tambah tombol "ganti" + kotak keterangan per tile, dibungkus `.phWrap` baru (perlu wrapper karena tombol `.tukar`/`.del` sudah memenuhi ruang absolut di dalam `.ph`, kotak keterangan harus jadi elemen normal DI LUAR `.ph`, bukan di dalamnya).
  - CSS baru: `.phWrap`, `.ketFoto`.

Tidak ada file baru dibuat.

---

### Task 1: Backend — endpoint ganti gambar & keterangan foto

**Files:**
- Modify: `FotoNota.gs` (tambah fungsi + daftarkan di `return` module, ~baris 86-99 dan ~158-166)
- Modify: `Code.gs:551-553` (tambah endpoint setelah `serverHapusFotoNota`)

**Interfaces:**
- Produces: `FotoNota.updateFotoNota(noTransaksi, notaId, urutan, data)` — `data = {keterangan: string, file: {base64, mimeType} | null}`, return `{success:true}`, throw `Error('Foto nota tidak ditemukan')` bila baris tak ketemu. `serverUpdateFotoNota(token, noTransaksi, notaId, urutan, data)` — dipakai Task 2 (frontend JS).

- [ ] **Step 1: Tambah `updateFotoNota` di `FotoNota.gs`**

Cari fungsi ini di `FotoNota.gs` (baris 86-99):

```js
  /** Soft delete satu foto nota berdasarkan urutan. */
  function hapusFotoNota(noTransaksi, notaId, urutan) {
    var c = FC();
    var rows = findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
      return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
             String(r[c.NOTA_ID]) === String(notaId) &&
             String(r[c.URUTAN]) === String(urutan) && !isDeleted(r[c.IS_DELETED]);
    });
    if (!rows.length) throw new Error('Foto nota tidak ditemukan');
    var hit = rows[0];
    var fileId = hit.values[c.FILE_ID];
    softDelete(CONFIG.SHEETS.FOTO_NOTA, hit.rowIndex, noTransaksi + '#' + notaId + '#' + urutan);
    if (fileId) DriveHelper.trash(fileId);
    return { success: true };
  }
```

Tambahkan fungsi baru persis setelahnya (fungsi `hapusFotoNota` di atas tidak berubah):

```js
  /** Ganti gambar dan/atau keterangan satu foto nota yang sudah tersimpan. */
  function updateFotoNota(noTransaksi, notaId, urutan, data) {
    var c = FC();
    var rows = findRows(CONFIG.SHEETS.FOTO_NOTA, function (r) {
      return String(r[c.NO_TRANSAKSI]) === String(noTransaksi) &&
             String(r[c.NOTA_ID]) === String(notaId) &&
             String(r[c.URUTAN]) === String(urutan) && !isDeleted(r[c.IS_DELETED]);
    });
    if (!rows.length) throw new Error('Foto nota tidak ditemukan');
    var hit = rows[0];
    var upd = Util.set(c.KETERANGAN, (data && data.keterangan) || '');
    if (data && data.file && data.file.base64) {
      var oldFileId = hit.values[c.FILE_ID];
      var up = DriveHelper.upload(data.file, {noTransaksi: noTransaksi});
      upd[c.FILE_ID] = up.fileId; upd[c.NAMA_FILE] = up.namaFile; upd[c.URL_FILE] = up.url;
      if (oldFileId) DriveHelper.trash(oldFileId);
    }
    SheetRepo.setCells(CONFIG.SHEETS.FOTO_NOTA, hit.rowIndex, upd);
    DeferredFlush.mark();
    return { success: true };
  }
```

- [ ] **Step 2: Daftarkan di `return` module `FotoNota.gs`**

Cari blok ini (akhir file, ~baris 158-166):

```js
  return {
    getJmlFotoPerTransaksi: getJmlFotoPerTransaksi,
    getFotoNota: getFotoNota,
    uploadFotoNota: uploadFotoNota,
    hapusFotoNota: hapusFotoNota,
    getNotaDanFoto: getNotaDanFoto,
    getSpjData: getSpjData
  };
})();
```

Ganti dengan:

```js
  return {
    getJmlFotoPerTransaksi: getJmlFotoPerTransaksi,
    getFotoNota: getFotoNota,
    uploadFotoNota: uploadFotoNota,
    hapusFotoNota: hapusFotoNota,
    updateFotoNota: updateFotoNota,
    getNotaDanFoto: getNotaDanFoto,
    getSpjData: getSpjData
  };
})();
```

- [ ] **Step 3: Tambah endpoint di `Code.gs`**

Cari blok ini (baris 545-556):

```js
function serverGetFotoNota(token, noTransaksi, notaId) {
  return _run(token, function (auth) { return FotoNota.getFotoNota(noTransaksi, notaId); });
}
function serverUploadFotoNota(token, noTransaksi, notaId, fotoArr) {
  return _run(token, function (auth) { return FotoNota.uploadFotoNota(noTransaksi, notaId, fotoArr); });
}
function serverHapusFotoNota(token, noTransaksi, notaId, urutan) {
  return _run(token, function (auth) { return FotoNota.hapusFotoNota(noTransaksi, notaId, urutan); });
}
function serverGetNotaDanFoto(token, noTransaksi) {
  return _run(token, function (auth) { return FotoNota.getNotaDanFoto(noTransaksi); });
}
```

Ganti dengan (menambah satu fungsi baru setelah `serverHapusFotoNota`, sisanya tidak berubah):

```js
function serverGetFotoNota(token, noTransaksi, notaId) {
  return _run(token, function (auth) { return FotoNota.getFotoNota(noTransaksi, notaId); });
}
function serverUploadFotoNota(token, noTransaksi, notaId, fotoArr) {
  return _run(token, function (auth) { return FotoNota.uploadFotoNota(noTransaksi, notaId, fotoArr); });
}
function serverHapusFotoNota(token, noTransaksi, notaId, urutan) {
  return _run(token, function (auth) { return FotoNota.hapusFotoNota(noTransaksi, notaId, urutan); });
}
function serverUpdateFotoNota(token, noTransaksi, notaId, urutan, data) {
  return _run(token, function (auth) { return FotoNota.updateFotoNota(noTransaksi, notaId, urutan, data); });
}
function serverGetNotaDanFoto(token, noTransaksi) {
  return _run(token, function (auth) { return FotoNota.getNotaDanFoto(noTransaksi); });
}
```

- [ ] **Step 4: Cek sintaks kedua file**

Run: `node -e "require('fs').readFileSync('FotoNota.gs','utf8'); require('fs').readFileSync('Code.gs','utf8'); console.log('OK')"`
Expected: `OK` (ini hanya mengecek file terbaca sebagai teks — GAS tidak bisa dijalankan langsung dengan Node, sintaks sesungguhnya diverifikasi lewat `clasp push` saat deploy).

Run: `grep -c "function updateFotoNota\|function serverUpdateFotoNota" FotoNota.gs Code.gs`
Expected: `FotoNota.gs:1` dan `Code.gs:1` (grep akan menampilkan `FotoNota.gs:1` untuk baris yang cocok di file itu dan `Code.gs:1` untuk file itu — jalankan terpisah bila outputnya campur: `grep -c "function updateFotoNota" FotoNota.gs` → `1`, `grep -c "function serverUpdateFotoNota" Code.gs` → `1`)

- [ ] **Step 5: Commit**

```bash
git add FotoNota.gs Code.gs
git commit -m "feat(foto-nota): endpoint ganti gambar & keterangan foto Bukti B"
```

---

### Task 2: Frontend JS — ganti gambar & simpan keterangan

**Files:**
- Modify: `mobile.html` — sisipkan 3 fungsi baru setelah `_ntHapusFotoServerLanjut` (sebelum `simpanNotaBaru`)
- Modify: `mobile.html:711` — tambah `<input type="file" id="ntGantiBFile">` tersembunyi setelah `<div id="ntFotoBarang">`

**Interfaces:**
- Consumes: `kompres(file, cb)` — `cb` dipanggil dengan **satu** argumen objek `{base64, mimeType, namaFile, _prev}` (bukan `(dataUrl, mime)` — signature asli dikonfirmasi dari kode, beda dari draf awal spec), atau `cb(null)` bila file bukan gambar/gagal dibaca. `loading(bool, pesan)`, `toast(msg, isErr)`, `gagal(e)`, `google.script.run`, `_tok`, `NT` (state global: `NT.no`, `NT.urutan`, `NT.lamaB[]` — tiap elemen `{fileId, urutan, keterangan, ...}`), `serverUpdateFotoNota`, `serverGetFotoNota` (dari Task 1 — mengembalikan **array langsung**, bukan `{list:...}`).
- Produces: `ntGantiFotoB(i)`, `ntSimpanKeteranganB(i, teks)` — dipanggil dari `onclick`/`onblur` markup di Task 3.

- [ ] **Step 1: Sisipkan input file tersembunyi**

Cari baris ini di `mobile.html` (baris 711):

```html
  <div class="grid2 mini" id="ntFotoBarang" style="margin-top:8px"></div>
```

Ganti dengan:

```html
  <div class="grid2 mini" id="ntFotoBarang" style="margin-top:8px"></div>
  <input type="file" id="ntGantiBFile" accept="image/*" capture="environment" style="display:none" onchange="_ntGantiFotoBFile(this)">
```

- [ ] **Step 2: Sisipkan 3 fungsi JS**

Cari fungsi ini di `mobile.html` (fungsi `_ntHapusFotoServerLanjut`, tepat sebelum `simpanNotaBaru`):

```js
function _ntHapusFotoServerLanjut(i){
  var f = NT.lamaB[i]; if (!f) return;
  if (!confirm('Hapus foto ini? Berkasnya ikut dibuang dari Drive.')) return;
  loading(true,'Menghapus foto…');
  google.script.run
    .withSuccessHandler(function(){
      loading(false);
      NT.lamaB.splice(i,1);
      // Layar detail membaca FOTO_NOTA; kalau tidak ikut dibuang, foto yang
      // sudah terhapus masih tampil di sana sampai data dimuat ulang.
      var arr = FOTO_NOTA[String(NT.urutan)] || [];
      for (var k=0;k<arr.length;k++)
        if (String(arr[k].urutan) === String(f.urutan)) { arr.splice(k,1); break; }
      ntRenderFoto(); toast('Foto dihapus');
    })
    .withFailureHandler(gagal)
    .serverHapusFotoNota(_tok, NT.no, NT.urutan, f.urutan);
}
function simpanNotaBaru(){
```

Ganti dengan (fungsi `_ntHapusFotoServerLanjut` tidak berubah, tiga fungsi baru disisipkan sebelum `simpanNotaBaru`):

```js
function _ntHapusFotoServerLanjut(i){
  var f = NT.lamaB[i]; if (!f) return;
  if (!confirm('Hapus foto ini? Berkasnya ikut dibuang dari Drive.')) return;
  loading(true,'Menghapus foto…');
  google.script.run
    .withSuccessHandler(function(){
      loading(false);
      NT.lamaB.splice(i,1);
      // Layar detail membaca FOTO_NOTA; kalau tidak ikut dibuang, foto yang
      // sudah terhapus masih tampil di sana sampai data dimuat ulang.
      var arr = FOTO_NOTA[String(NT.urutan)] || [];
      for (var k=0;k<arr.length;k++)
        if (String(arr[k].urutan) === String(f.urutan)) { arr.splice(k,1); break; }
      ntRenderFoto(); toast('Foto dihapus');
    })
    .withFailureHandler(gagal)
    .serverHapusFotoNota(_tok, NT.no, NT.urutan, f.urutan);
}
/* Ganti gambar foto barang (Bukti B) yang sudah tersimpan — langsung upload,
   tanpa konfirmasi (meniru tombol ganti Bukti A), tanpa menunggu "Simpan". */
var _NT_GANTI_B_IDX = null;
function ntGantiFotoB(i){ _NT_GANTI_B_IDX = i; $('ntGantiBFile').click(); }
function _ntGantiFotoBFile(el){
  var file = el.files && el.files[0];
  el.value = '';                          // supaya bisa pilih file yang sama lagi lain kali
  if (!file || _NT_GANTI_B_IDX === null) return;
  var i = _NT_GANTI_B_IDX; _NT_GANTI_B_IDX = null;
  var f = NT.lamaB[i]; if (!f) return;
  var urutanLama = f.urutan;
  kompres(file, function(foto){
    if (!foto){ toast('Foto tidak valid', true); return; }
    loading(true, 'Mengganti foto…');
    google.script.run
      .withSuccessHandler(function(){
        google.script.run
          .withSuccessHandler(function(res){
            loading(false);
            // serverGetFotoNota mengembalikan ARRAY langsung — cocokkan lewat
            // field urutan milik foto itu sendiri, bukan indeks posisi array.
            var baru = null, k;
            for (k=0; res && k<res.length; k++)
              if (String(res[k].urutan) === String(urutanLama)) { baru = res[k]; break; }
            if (baru) NT.lamaB[i] = baru;
            ntRenderFoto(); toast('Foto diganti');
          })
          .withFailureHandler(function(e){ loading(false); gagal(e); })
          .serverGetFotoNota(_tok, NT.no, NT.urutan);
      })
      .withFailureHandler(function(e){ loading(false); gagal(e); })
      .serverUpdateFotoNota(_tok, NT.no, NT.urutan, urutanLama,
        { keterangan: f.keterangan||'', file: { base64: foto.base64, mimeType: foto.mimeType } });
  });
}
/* Keterangan foto barang — tersimpan saat kotak teks kehilangan fokus. */
function ntSimpanKeteranganB(i, teks){
  var f = NT.lamaB[i]; if (!f) return;
  teks = (teks||'').trim();
  if (teks === (f.keterangan||'')) return;   // tak berubah, jangan panggil server percuma
  f.keterangan = teks;
  google.script.run.withFailureHandler(gagal)
    .serverUpdateFotoNota(_tok, NT.no, NT.urutan, f.urutan, { keterangan: teks, file: null });
}
function simpanNotaBaru(){
```

- [ ] **Step 3: Cek sintaks**

Run: `node -e "require('fs').readFileSync('mobile.html','utf8'); console.log('OK')"`
Expected: `OK`

Run: `grep -o "^function ntGantiFotoB\|^function _ntGantiFotoBFile\|^function ntSimpanKeteranganB" mobile.html`
Expected (3 baris, urutan bisa beda):
```
function ntGantiFotoB
function _ntGantiFotoBFile
function ntSimpanKeteranganB
```

- [ ] **Step 4: Commit**

```bash
git add mobile.html
git commit -m "feat(mobile): fungsi ganti gambar & simpan keterangan foto barang"
```

---

### Task 3: Frontend markup & CSS — tombol ganti + kotak keterangan per tile

**Files:**
- Modify: `mobile.html` — CSS baru `.phWrap`/`.ketFoto` (sisipkan setelah blok `.grid2.mini` yang sudah ada)
- Modify: `mobile.html` — blok Bukti B di `ntRenderFoto()`

**Interfaces:**
- Consumes: `ntGantiFotoB(i)`, `ntSimpanKeteranganB(i, teks)` (Task 2), `esc(s)`, `_ntImgDrive(fileId)`, `ntHapusFotoServer(i)` (sudah ada, tidak berubah).
- Produces: markup `.phWrap` per foto Bukti B tersimpan, dikonsumsi Task 4 (verifikasi).

- [ ] **Step 1: Tambah CSS `.phWrap` dan `.ketFoto`**

Cari blok ini di `mobile.html`:

```css
  .grid2.mini{grid-template-columns:repeat(3,1fr);gap:8px}
  .grid2.mini .ph{aspect-ratio:1;border-radius:12px;font-size:12px}
  .grid2.mini .ph .del{width:28px;height:28px;top:5px;right:5px;font-size:13px}
```

Ganti dengan (menambah 2 aturan baru setelahnya):

```css
  .grid2.mini{grid-template-columns:repeat(3,1fr);gap:8px}
  .grid2.mini .ph{aspect-ratio:1;border-radius:12px;font-size:12px}
  .grid2.mini .ph .del{width:28px;height:28px;top:5px;right:5px;font-size:13px}
  .phWrap{display:flex;flex-direction:column}
  .ketFoto{width:100%;margin-top:4px;border:none;border-bottom:1px solid var(--n400);background:none;
    font-family:var(--fb);font-size:11px;color:var(--ink);padding:3px 0}
```

- [ ] **Step 2: Ubah blok Bukti B di `ntRenderFoto()`**

Cari fungsi ini di `mobile.html`:

```js
function ntRenderFoto(){
  var a = '', b = '', i;
  // --- Bukti A: berkas nota yang sudah tersimpan (bila ada) ---
  if (NT.lamaA && !NT.fotoNota.length)
    a += '<div class="ph">' + _ntImgDrive(NT.lamaA.fileId)
       + '<button class="tukar" onclick="ntAmbil(\'nota\')">&#8646; ganti</button></div>';
  a += _ntPetakBaru(NT.fotoNota, 'nota');
  // --- Bukti B: foto bertag yang sudah terunggah, bisa dihapus satu per satu ---
  for (i=0;i<NT.lamaB.length;i++)
    b += '<div class="ph">' + _ntImgDrive(NT.lamaB[i].fileId)
       + '<button class="del" onclick="ntHapusFotoServer('+i+')" aria-label="Hapus">'
       + '<i class="ph-duotone ph-trash"></i></button></div>';
  b += _ntPetakBaru(NT.fotoBarang, 'barang');
  $('ntFotoNota').innerHTML = a;
  $('ntFotoBarang').innerHTML = b;
}
```

Ganti dengan (hanya blok Bukti B yang berubah — Bukti A dan `_ntPetakBaru` tidak berubah):

```js
function ntRenderFoto(){
  var a = '', b = '', i;
  // --- Bukti A: berkas nota yang sudah tersimpan (bila ada) ---
  if (NT.lamaA && !NT.fotoNota.length)
    a += '<div class="ph">' + _ntImgDrive(NT.lamaA.fileId)
       + '<button class="tukar" onclick="ntAmbil(\'nota\')">&#8646; ganti</button></div>';
  a += _ntPetakBaru(NT.fotoNota, 'nota');
  // --- Bukti B: foto bertag yang sudah terunggah — bisa diganti, diberi
  // keterangan, atau dihapus. Kotak keterangan HARUS di luar .ph (bukan di
  // dalamnya): .ph sudah dipenuhi tombol posisi absolut (.tukar di bawah,
  // .del di pojok), jadi kotak teks butuh .phWrap sebagai elemen normal
  // terpisah di bawah foto supaya tidak tertindih/terpotong overflow:hidden.
  for (i=0;i<NT.lamaB.length;i++)
    b += '<div class="phWrap"><div class="ph">' + _ntImgDrive(NT.lamaB[i].fileId)
       + '<button class="tukar" onclick="ntGantiFotoB('+i+')">&#8646; ganti</button>'
       + '<button class="del" onclick="ntHapusFotoServer('+i+')" aria-label="Hapus">'
       + '<i class="ph-duotone ph-trash"></i></button></div>'
       + '<input class="ketFoto" placeholder="Keterangan foto" '
       +   'value="' + esc(NT.lamaB[i].keterangan||'') + '" '
       +   'onblur="ntSimpanKeteranganB('+i+',this.value)"></div>';
  b += _ntPetakBaru(NT.fotoBarang, 'barang');
  $('ntFotoNota').innerHTML = a;
  $('ntFotoBarang').innerHTML = b;
}
```

- [ ] **Step 3: Cek sintaks**

Run: `node -e "require('fs').readFileSync('mobile.html','utf8'); console.log('OK')"`
Expected: `OK`

Run: `grep -c "class=\"phWrap\"" mobile.html`
Expected: `1` (satu situs template — dirender berkali-kali saat runtime, tapi cuma 1 kemunculan di kode sumber)

- [ ] **Step 4: Commit**

```bash
git add mobile.html
git commit -m "feat(mobile): tombol ganti & kotak keterangan pada tile foto barang"
```

---

### Task 4: Verifikasi otomatis — interaksi nyata

**Files:**
- Create (sementara, di scratchpad, TIDAK dikomit ke repo): `/tmp/kt-editfoto-verify.js`

**Interfaces:**
- Consumes: `mobile.html` hasil Task 1-3 apa adanya (dibaca dari disk).

- [ ] **Step 1: Tulis skrip verifikasi Playwright**

Buat file `/tmp/kt-editfoto-verify.js`:

```js
const fs = require('fs');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

async function main(){
  var html = fs.readFileSync('/home/user/kas-tunai/mobile.html', 'utf8')
    .replace('<?= webAppUrl ?>', '')
    .replace('<?= iconUrl ?>', '');

  var browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  var page = await (await browser.newContext({ viewport: { width: 390, height: 844 } })).newPage();
  var pageErrors = [];
  page.on('pageerror', function(err){ pageErrors.push(String(err)); });

  await page.setContent(html, { waitUntil: 'load' });

  // Stub google.script.run: mock serverUpdateFotoNota supaya kita bisa
  // memeriksa argumen yang dikirim tanpa server GAS sungguhan.
  await page.evaluate(function(){
    window._calls = [];
    var api = {};
    api.withSuccessHandler = function(fn){ api._ok = fn; return api; };
    api.withFailureHandler = function(fn){ api._fail = fn; return api; };
    window.google = { script: { run: new Proxy(api, { get: function(target, prop){
      if (prop in target) return target[prop];
      return function(){
        var args = Array.prototype.slice.call(arguments);
        window._calls.push({ fn: prop, args: args });
        if (prop === 'serverUpdateFotoNota' && api._ok) api._ok({ success:true });
        else if (prop === 'serverGetFotoNota' && api._ok) api._ok(window._fotoNotaServerState || []);
        return api;
      };
    }}) } };
  });

  // Data uji: satu transaksi keluar, satu nota, satu foto Bukti B tersimpan.
  await page.evaluate(function(){
    TX.length = 0;
    TX.push({ no: 201, kegiatan: 'Belanja ATK', kredit: 500000, debet: 0, tanggal: '2026-07-25',
      notaJml: 1, notaTotal: 200000, kembalianTotal: 0, penjab: 'Budi' });
    NOTAS = [{ urutan: 1, namaPenyedia: 'Toko Jaya', nilai: 200000 }];
    FOTO_NOTA = {};
    window._fotoNotaServerState = [
      { noTransaksi:201, notaId:1, urutan:1, fileId:'fid1', keterangan:'Lama' }
    ];
    _ntSiap(201, TX[0]);
    NT.mode = 'ubah'; NT.urutan = '1'; NT.nota = NOTAS[0];
    NT.lamaA = null;
    NT.lamaB = [ { fileId:'fid1', urutan:1, keterangan:'Lama' } ];
    ntRenderFoto();
  });

  var hasil = {};

  // 1. Tile Bukti B tampil dengan tombol ganti, tombol hapus, kotak keterangan berisi nilai lama.
  hasil.tileTampilLengkap = await page.evaluate(function(){
    var wrap = document.querySelector('#ntFotoBarang .phWrap');
    if (!wrap) return false;
    var tukar = wrap.querySelector('.ph .tukar'), del = wrap.querySelector('.ph .del'), ket = wrap.querySelector('.ketFoto');
    return !!tukar && !!del && !!ket && ket.value === 'Lama';
  });

  // 2. Klik nyata tombol "ganti" -> memicu klik pada #ntGantiBFile.
  hasil.klikGantiMemicuInputFile = await page.evaluate(function(){
    var terpicu = false;
    $('ntGantiBFile').addEventListener('click', function(){ terpicu = true; });
    document.querySelector('#ntFotoBarang .phWrap .tukar').click();
    return terpicu;
  });

  // 3. Ubah teks keterangan lalu blur sungguhan -> serverUpdateFotoNota terpanggil dengan teks baru.
  await page.evaluate(function(){ window._calls.length = 0; });
  var ket = await page.$('#ntFotoBarang .ketFoto');
  await ket.click();
  await ket.fill('Paracetamol 40 strip');
  await page.evaluate(function(){ document.querySelector('#ntFotoBarang .ketFoto').blur(); });
  hasil.blurUbahMemanggilServer = await page.evaluate(function(){
    var c = window._calls.filter(function(x){ return x.fn === 'serverUpdateFotoNota'; });
    if (!c.length) return false;
    var data = c[c.length-1].args[4];
    return data.keterangan === 'Paracetamol 40 strip' && data.file === null;
  });

  // 4. Blur TANPA perubahan teks -> serverUpdateFotoNota TIDAK terpanggil lagi.
  await page.evaluate(function(){ window._calls.length = 0; });
  await ket.click();
  await page.evaluate(function(){ document.querySelector('#ntFotoBarang .ketFoto').blur(); });
  hasil.blurTanpaUbahTidakMemanggil = await page.evaluate(function(){
    return window._calls.filter(function(x){ return x.fn === 'serverUpdateFotoNota'; }).length === 0;
  });

  // 5. Pemindaian onclick/onchange menyeluruh di layar Ubah nota.
  hasil.semuaOnclickValid = await page.evaluate(function(){
    var els = document.querySelectorAll('#scNota [onclick],#scNota [onchange]');
    var gagal = [];
    for (var i=0;i<els.length;i++){
      var attr = els[i].getAttribute('onclick') || els[i].getAttribute('onchange');
      try { new Function(attr); } catch(e){ gagal.push(attr + ' :: ' + e.message); }
    }
    return gagal.length === 0 ? true : gagal;
  });

  // 6. Tombol hapus yang sudah ada tetap ada dan tidak error saat diklik (dialog
  // konfirmasi asli akan mem-block headless -- override window.confirm dulu).
  hasil.tombolHapusTakRegresi = await page.evaluate(function(){
    window.confirm = function(){ return false; };  // batalkan supaya tak lanjut ke server sungguhan
    try {
      document.querySelector('#ntFotoBarang .phWrap .del').click();
      return true;
    } catch(e){ return 'ERROR: ' + e.message; }
  });

  hasil.tanpaPageError = pageErrors.length === 0 ? true : pageErrors;

  await browser.close();

  var semuaLolos = true;
  Object.keys(hasil).forEach(function(k){
    var v = hasil[k];
    var lolos = (v === true);
    if (!lolos) semuaLolos = false;
    console.log((lolos ? 'PASS' : 'FAIL') + '  ' + k + (lolos ? '' : ('  -> ' + JSON.stringify(v))));
  });
  process.exit(semuaLolos ? 0 : 1);
}

main().catch(function(e){ console.error(e); process.exit(1); });
```

(Playwright `Locator` tidak punya method `.blur()` bawaan — memicu blur harus lewat `page.evaluate`
memanggil `.blur()` DOM asli, seperti yang dipakai skenario 4 juga.)

- [ ] **Step 2: Jalankan skrip**

Run: `node /tmp/kt-editfoto-verify.js`

Expected: 7 baris `PASS` (6 skenario + `tanpaPageError`), exit code 0.

- [ ] **Step 3: Bila ada `FAIL`, perbaiki lalu jalankan ulang**

Baca pesan `-> ...` untuk tahu skenario mana yang gagal. Perbaiki kode terkait di `mobile.html` (Task 2
untuk masalah fungsi JS, Task 3 untuk masalah markup) atau `FotoNota.gs`/`Code.gs` (Task 1 untuk
masalah endpoint), lalu jalankan ulang `node /tmp/kt-editfoto-verify.js` sampai semua `PASS`. Bila
perbaikan menyentuh kode produksi, commit perbaikan itu dengan pesan yang menjelaskan skenario yang
diperbaiki.

- [ ] **Step 4: Hapus skrip sementara**

Run: `rm /tmp/kt-editfoto-verify.js`

---

## Self-Review

**1. Cakupan spesifikasi** (`docs/superpowers/specs/2026-07-28-edit-foto-barang-design.md`):
- Bagian 1 (backend) → Task 1.
- Bagian 2 (markup) → Task 3 (plus koreksi nyata: kotak keterangan dipindah ke `.phWrap` di luar `.ph`,
  bukan di dalamnya seperti draf awal spec — `.ph` sudah penuh tombol posisi absolut, ditemukan saat
  membaca CSS `.ph .tukar`/`.ph .del` yang sesungguhnya).
- Bagian 3 (alur JS) → Task 2 (plus koreksi nyata: signature `kompres(file, cb)` memanggil `cb` dengan
  **satu** objek `{base64, mimeType, ...}`, bukan `cb(dataUrl, mime)` seperti draf awal spec — dan
  `cb(null)` pada kegagalan, sekarang ditangani).
- Bagian 4 (kasus tepi: tanpa konfirmasi, tanpa cek online, foto belum tersimpan di luar cakupan) →
  tercermin di kode Task 2 (tak ada `confirm()`, tak ada cek `navigator.onLine`) dan di catatan Task 3
  (`_ntPetakBaru` untuk foto baru tidak disentuh).
- Bagian 5 (rencana uji, 6 skenario) → Task 4, satu-satu dipetakan ke kunci `hasil`.

Tidak ada bagian spec yang tanpa task.

**2. Pemindaian placeholder**: tidak ada "TBD"/"implement later"/"similar to Task N" tersisa di kode
manapun. (Draf pertama sempat menyisakan satu baris salah ketik di skrip Task 4 dengan instruksi
"perbaiki sendiri" terpisah — itu sendiri sebuah pelanggaran aturan No Placeholders; sudah diperbaiki
langsung di kode skripnya, bukan didokumentasikan sebagai catatan perbaikan.)

**3. Konsistensi tipe/nama**: `ntGantiFotoB(i)`/`ntSimpanKeteranganB(i,teks)` dipakai identik di Task 2
(definisi) dan Task 3 (pemanggilan `onclick`/`onblur`). `NT.lamaB[i]` (field `fileId`/`urutan`/
`keterangan`) dipakai konsisten Task 2 dan Task 3. `serverUpdateFotoNota(token, noTransaksi, notaId,
urutan, data)` — urutan parameter sama persis di Task 1 (definisi) dan Task 2 (pemanggilan). Kelas CSS
`.phWrap`/`.ketFoto` sama persis antara Task 3 (CSS) dan Task 3 (markup, satu task yang sama — jadi
otomatis konsisten).

---

## Execution Handoff

Rencana selesai dan tersimpan di `docs/superpowers/plans/2026-07-28-edit-foto-barang.md`. Dua opsi eksekusi:

1. **Subagent-Driven (rekomendasi)** — subagent baru per tugas, review dua tahap di antara tugas, iterasi cepat.
2. **Inline Execution** — eksekusi tugas demi tugas di sesi ini, batch dengan checkpoint untuk direview.

Mana yang dipilih?
