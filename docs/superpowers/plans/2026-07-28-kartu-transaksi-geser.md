# Kartu Transaksi Interaktif — Fase 1: Aksi Geser Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ubah kartu transaksi di layar Daftar Transaksi (`mobile.html`) menjadi bisa digeser ke kiri untuk menyingkap 3–4 tombol aksi cepat (Tambah nota, Tagih, Tanda Terima, Pengembalian), tanpa mengubah perilaku ketuk-untuk-buka-detail yang sudah ada.

**Architecture:** Sentuh manual (`touchstart`/`touchmove`/`touchend`) didelegasikan sekali ke `#trList` (bukan dipasang ulang tiap render), memindahkan `.rowCard` lewat `transform:translateX()`. `barisTx()` untuk transaksi "keluar" (kredit > 0) merender struktur baru `.rowWrap > .rowActions + .rowCard`; transaksi "masuk" tetap memakai `<button class="row">` lama tanpa perubahan. Tombol aksi memanggil ulang fungsi yang sudah ada (`bukaNotaBaru`, `tagihPum`, `cetakTandaTerima`, `bukaPengembalian`) — tidak ada endpoint atau layar baru.

**Tech Stack:** Vanilla JS ES5 (satu file `mobile.html`), CSS custom properties yang sudah ada (design system "Broadsheet"), Touch Events API standar, `navigator.vibrate` dengan feature-detect. Verifikasi pakai Playwright (`/opt/node22/lib/node_modules/playwright`, Chromium di `/opt/pw-browsers/chromium`) dengan `hasTouch:true` dan `Touch`/`TouchEvent` sintetis — bukan `page.click()` biasa, karena gestur ini murni event sentuh.

## Global Constraints

- Backend `.gs` **tidak disentuh** — fase ini murni frontend, tidak ada kolom sheet atau endpoint baru.
- Frontend tetap **satu file** `mobile.html`, **ES5 murni**: `var` + `function`, tanpa `let`/`const`/arrow/template literal/`Promise`/`class`. Ikuti idiom yang sudah ada di file ini: `.className = '...'` (string assignment), bukan `classList`.
- Setiap nilai yang diselipkan ke atribut `onclick="..."`/`onchange="..."` **wajib** lewat `aq()` (helper di `mobile.html:809`) kalau nilainya data dinamis (mis. `t.no`). Literal konstan (mis. nama aksi `'nota'`) boleh ditulis langsung berkutip tunggal di dalam atribut berkutip ganda — pola yang sudah dipakai di seluruh file (mis. `go('transaksi')`).
- Tap target minimal 44px (aturan proyek untuk Android low-end). Tombol aksi lebar 72px sudah memenuhi ini.
- `@media (prefers-reduced-motion:reduce)` global di `mobile.html` sudah menonaktifkan durasi transisi — tidak perlu ditangani ulang di CSS baru.
- Rumus neraca transaksi (`hitungNeraca`) di `docs/HANDOFF-MOBILE.md` bagian 2 adalah **satu-satunya sumber kebenaran** — jangan menghitung ulang `sisaPUM` dengan cara lain di kode baru; panggil `hitungNeraca(t, null, null).sisaPUM`.
- Desain lengkap dan terkunci ada di `docs/HANDOFF-MOBILE.md` bagian 9 (5 bagian, semua disetujui pengguna 28 Jul 2026) — rencana ini adalah turunan langsung dari sana, jangan menyimpang tanpa alasan yang dicatat.
- Tidak ada `page.click()` untuk memverifikasi gestur ini — harus event sentuh sintetis, sesuai pelajaran metodologi yang sudah dicatat di `docs/HANDOFF-MOBILE.md` (bug onclick/JSON.stringify sebelumnya lolos dari verifikasi `page.evaluate()`-saja).

## File Structure

Satu file yang diubah, tiga area di dalamnya:

- **`mobile.html` — CSS** (disisipkan setelah blok `.tag.pink{}`, ~baris 66): aturan `.rowWrap`, `.rowActions`, `.ra` + 4 varian warna, `.rowCard`.
- **`mobile.html` — mesin gestur** (blok fungsi baru, disisipkan setelah `renderTransaksi()`, ~baris 1085): state `RG`, `rgAncestor`, `rgGetar`, `rgSet`, `rgTutupSemua`, `rgTouchStart`, `rgTouchMove`, `rgTouchEnd`, `rgAksi`. Dipanggil dari markup baru `barisTx()` dan didaftarkan sekali di `(function init(){...})()`.
- **`mobile.html` — `barisTx()`** (~baris 989): cabang non-`ringkas` diubah untuk merender `.rowWrap` bila `isKeluar(t)`, tetap `<button class="row">` bila tidak.

Tidak ada file baru dibuat.

---

### Task 1: Pondasi CSS kartu geser

**Files:**
- Modify: `mobile.html:66` (setelah baris `.tag.pink{...}`)

**Interfaces:**
- Produces: kelas CSS `.rowWrap`, `.rowActions`, `.ra`, `.ra-nota`, `.ra-tagih`, `.ra-tt`, `.ra-kembali`, `.rowCard` — dipakai oleh Task 2 (markup tombol) dan Task 3 (markup `barisTx`).

- [ ] **Step 1: Sisipkan aturan CSS**

Cari blok ini di `mobile.html` (sekitar baris 63-66):

```css
  .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .tag{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:4px 10px;
    background:var(--bg);color:var(--n800)}
  .tag.pink{background:var(--a2);color:#fff} .tag.ac{background:var(--ac);color:#fff}
```

Ganti dengan (menambahkan blok baru setelahnya, blok lama tidak berubah):

```css
  .tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
  .tag{font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;border-radius:999px;padding:4px 10px;
    background:var(--bg);color:var(--n800)}
  .tag.pink{background:var(--a2);color:#fff} .tag.ac{background:var(--ac);color:#fff}

  /* ===== Kartu transaksi geser (tugas 11, Fase 1) ===== */
  .rowWrap{position:relative;overflow:hidden;border-bottom:1px solid var(--n200);touch-action:pan-y}
  .rowActions{position:absolute;top:0;right:0;bottom:0;display:flex;align-items:stretch}
  .ra{width:72px;border:none;display:flex;flex-direction:column;align-items:center;justify-content:center;
    gap:4px;color:#fff;font-size:10.5px;font-family:var(--fb)}
  .ra i{font-size:20px}
  .ra-nota{background:var(--ac)}
  .ra-tagih{background:var(--a2)}
  .ra-tt{background:var(--ac7)}
  .ra-kembali{background:var(--n700)}
  .rowCard{position:relative;z-index:1;display:flex;align-items:flex-start;justify-content:space-between;
    gap:12px;width:100%;padding:14px 0;background:var(--bg);transition:transform .18s ease-out;text-align:left}
```

- [ ] **Step 2: Verifikasi sintaks CSS tidak rusak**

Run: `grep -c "^\s*}" mobile.html && grep -c "{" mobile.html`

Expected: dua angka yang dekat (selisih wajar karena ada `{` di JS/string) — pastikan tidak ada error saat file dibuka di browser pada Task 4. Cek cepat manual: buka `mobile.html` dengan `node -e "require('fs').readFileSync('mobile.html','utf8')"` untuk memastikan file masih valid UTF-8 tanpa exception.

Run: `node -e "require('fs').readFileSync('mobile.html','utf8'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add mobile.html
git commit -m "feat(mobile): pondasi CSS kartu transaksi geser (tugas 11 fase 1)"
```

---

### Task 2: Mesin gestur sentuh (RG)

**Files:**
- Modify: `mobile.html` — sisipkan blok fungsi baru setelah `renderTransaksi()` (setelah baris `}` penutup fungsi itu, ~baris 1085, sebelum komentar `/* ===================== Detail ===================== */`)
- Modify: `mobile.html` — daftarkan listener di `(function init(){...})()` (~baris 3367-3382)

**Interfaces:**
- Consumes: `$(id)` (helper pencari elemen sudah ada di file), `bukaDetail(no)`, `bukaNotaBaru(no)`, `tagihPum(no)`, `cetakTandaTerima(no)`, `bukaPengembalian(no)` (semua sudah ada, menerima satu parameter `no`).
- Produces: `rgAksi(el, act, no)` — dipanggil langsung dari `onclick` tombol aksi di Task 3. `act` adalah salah satu dari `'nota'|'tagih'|'tt'|'kembali'`. Fungsi lain (`rgTouchStart` dkk) bersifat internal, tidak dipanggil dari tempat lain.

- [ ] **Step 1: Tulis mesin gestur**

Cari baris ini di `mobile.html` (akhir `renderTransaksi()`):

```js
  $('trList').innerHTML = h;
}

/* ===================== Detail ===================== */
```

Ganti dengan:

```js
  $('trList').innerHTML = h;
}

/* ===================== Geser aksi kartu (tugas 11, Fase 1) =====================
 * Sentuh manual (touchstart/touchmove/touchend), bukan CSS scroll-snap — lihat
 * docs/HANDOFF-MOBILE.md bagian 9. Listener didaftarkan SEKALI pada #trList
 * (delegasi) di init(), supaya renderTransaksi() yang mengganti innerHTML tidak
 * perlu memasang ulang listener setiap kali.
 */
var RG = {wrap:null, card:null, w:0, baseX:0, startX:0, startY:0, nx:0, dragging:false, axis:null, openWrap:null};

function rgAncestor(el, cls){
  var top = $('trList');
  while (el && el !== top){
    if (el.className && (' '+el.className+' ').indexOf(' '+cls+' ') >= 0) return el;
    el = el.parentNode;
  }
  return null;
}
function rgGetar(){
  if (navigator.vibrate) { try { navigator.vibrate(15); } catch(e){} }
}
function rgSet(wrap, card, buka){
  var actions = wrap.querySelector('.rowActions');
  var w = actions ? actions.offsetWidth : 0;
  card.style.transition = '';
  card.style.transform = 'translateX(' + (buka ? -w : 0) + 'px)';
  wrap.className = 'rowWrap' + (buka ? ' open' : '');
  if (buka){ RG.openWrap = wrap; rgGetar(); }
  else if (RG.openWrap === wrap){ RG.openWrap = null; }
}
function rgTutupSemua(){
  if (RG.openWrap){
    var card = RG.openWrap.querySelector('.rowCard');
    if (card) rgSet(RG.openWrap, card, false);
  }
}
function rgTouchStart(e){
  if (rgAncestor(e.target, 'rowActions')) return;   // ketukan tombol aksi tersingkap: biarkan onclick asli jalan
  var wrap = rgAncestor(e.target, 'rowWrap');
  if (!wrap) return;
  var card = wrap.querySelector('.rowCard');
  var actions = wrap.querySelector('.rowActions');
  if (!card) return;
  if (RG.openWrap && RG.openWrap !== wrap) rgTutupSemua();
  RG.wrap = wrap; RG.card = card;
  RG.w = actions ? actions.offsetWidth : 0;
  RG.baseX = (wrap.className.indexOf('open') >= 0) ? -RG.w : 0;
  RG.startX = e.touches[0].clientX; RG.startY = e.touches[0].clientY;
  RG.nx = RG.baseX; RG.dragging = false; RG.axis = null;
}
function rgTouchMove(e){
  if (!RG.wrap) return;
  var t = e.touches[0];
  var dx = t.clientX - RG.startX, dy = t.clientY - RG.startY;
  if (!RG.axis){
    if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return;
    RG.axis = (Math.abs(dx) > Math.abs(dy)) ? 'x' : 'y';
    if (RG.axis === 'y'){ RG.wrap = null; return; }   // gulir vertikal: lepas, biarkan halaman menggulir
  }
  if (RG.axis !== 'x') return;
  e.preventDefault();
  RG.dragging = true;
  var nx = RG.baseX + dx;
  if (nx > 0) nx = 0;
  if (nx < -RG.w) nx = -RG.w;
  RG.card.style.transition = 'none';
  RG.card.style.transform = 'translateX(' + nx + 'px)';
  RG.nx = nx;
}
function rgTouchEnd(){
  if (!RG.wrap) return;
  var wrap = RG.wrap, card = RG.card;
  RG.wrap = null;
  if (!RG.dragging){
    if (wrap.className.indexOf('open') >= 0){ rgSet(wrap, card, false); return; }
    var no = card.getAttribute('data-no');
    if (no != null) bukaDetail(no);
    return;
  }
  var bukaAkhir = RG.nx < -(RG.w/2);
  rgSet(wrap, card, bukaAkhir);
  RG.dragging = false; RG.axis = null;
}
function rgAksi(el, act, no){
  var wrap = rgAncestor(el, 'rowWrap');
  var card = wrap ? wrap.querySelector('.rowCard') : null;
  if (wrap && card) rgSet(wrap, card, false);
  rgGetar();
  if (act === 'nota') bukaNotaBaru(no);
  else if (act === 'tagih') tagihPum(no);
  else if (act === 'tt') cetakTandaTerima(no);
  else if (act === 'kembali') bukaPengembalian(no);
}

/* ===================== Detail ===================== */
```

- [ ] **Step 2: Daftarkan listener di init()**

Cari blok ini di `mobile.html` (~baris 3374-3379):

```js
  window.addEventListener('online',  function(){
    $('bdOffline').className='banner hide';
    toast('Sinyal kembali — mengirim antrean…');
    aqKirimSemua(true);
  });
  window.addEventListener('offline', function(){ $('bdOffline').className='banner'; });
```

Ganti dengan (menambah 5 baris setelahnya):

```js
  window.addEventListener('online',  function(){
    $('bdOffline').className='banner hide';
    toast('Sinyal kembali — mengirim antrean…');
    aqKirimSemua(true);
  });
  window.addEventListener('offline', function(){ $('bdOffline').className='banner'; });
  $('trList').addEventListener('touchstart',  rgTouchStart, {passive:true});
  $('trList').addEventListener('touchmove',   rgTouchMove,  {passive:false});
  $('trList').addEventListener('touchend',    rgTouchEnd,   {passive:true});
  $('trList').addEventListener('touchcancel', rgTouchEnd,   {passive:true});
  window.addEventListener('scroll', rgTutupSemua, {passive:true});
```

- [ ] **Step 3: Cek sintaks**

Run: `node -e "require('fs').readFileSync('mobile.html','utf8'); console.log('OK')"`
Expected: `OK`

Run cepat cek fungsi baru semua ada:
Run: `grep -c "^function rg" mobile.html`
Expected: `7` (rgAncestor, rgGetar, rgSet, rgTutupSemua, rgTouchStart, rgTouchMove, rgTouchEnd — `rgAksi` juga `function rg`-prefixed jadi totalnya 8; cek dengan `grep -o "^function rg[A-Za-z]*" mobile.html` dan hitung baris keluar)

Run: `grep -o "^function rg[A-Za-z]*" mobile.html | sort`
Expected (8 baris):
```
function rgAksi
function rgAncestor
function rgGetar
function rgSet
function rgTouchEnd
function rgTouchMove
function rgTouchStart
function rgTutupSemua
```

- [ ] **Step 4: Commit**

```bash
git add mobile.html
git commit -m "feat(mobile): mesin gestur sentuh untuk kartu transaksi (tugas 11 fase 1)"
```

---

### Task 3: Restrukturisasi `barisTx()` jadi kartu geser

**Files:**
- Modify: `mobile.html:989-1011` (fungsi `barisTx`)

**Interfaces:**
- Consumes: `rgAksi(el, act, no)` dan kelas CSS dari Task 1–2; `isKeluar(t)`, `hitungNeraca(t, notas, kmb)`, `aq(s)`, `esc(s)`, `tagsTx(t)`, `fotoCount(t)`, `rp(n)` (semua sudah ada, tidak berubah).
- Produces: markup `<div class="rowWrap"><div class="rowActions">…</div><div class="rowCard" data-no="…">…</div></div>` untuk transaksi keluar; markup `<button class="row">` (tidak berubah) untuk transaksi masuk dan untuk `ringkas===true` (Beranda, tidak disentuh fase ini).

- [ ] **Step 1: Ganti isi `barisTx()`**

Cari fungsi ini di `mobile.html` (baris 989-1011):

```js
function barisTx(t, ringkas){
  var meta, kanan;
  if (ringkas){
    var st = statusTeks(t);
    meta = 'No ' + esc(String(t.no))
         + (t.penjab ? (' · ' + esc(t.penjab)) : '')
         + (t.akun ? (' · ' + esc(String(t.akun).split(' ')[0])) : '');
    kanan = '<span class="st' + (st.warn?' warn':'') + '" style="display:block">' + esc(st.txt) + '</span>';
  } else {
    meta = 'No ' + esc(String(t.no))
         + ' · ' + (+t.notaJml||0) + ' nota'
         + ' · ' + fotoCount(t) + ' foto';
    kanan = '';
  }
  return '<button class="row" onclick="bukaDetail(' + aq(t.no) + ')">'
    + '<span style="flex:1;min-width:0">'
    +   '<span class="ur" style="display:block">' + esc(t.kegiatan||'-') + '</span>'
    +   '<span class="meta" style="display:block">' + meta + '</span>'
    +   (ringkas ? '' : tagsTx(t))
    + '</span>'
    + '<span><span class="amt" style="display:block">' + rp(t.kredit||t.debet) + '</span>' + kanan + '</span>'
    + '</button>';
}
```

Ganti dengan:

```js
function barisTx(t, ringkas){
  if (ringkas){
    var st = statusTeks(t);
    var metaR = 'No ' + esc(String(t.no))
         + (t.penjab ? (' · ' + esc(t.penjab)) : '')
         + (t.akun ? (' · ' + esc(String(t.akun).split(' ')[0])) : '');
    var kananR = '<span class="st' + (st.warn?' warn':'') + '" style="display:block">' + esc(st.txt) + '</span>';
    return '<button class="row" onclick="bukaDetail(' + aq(t.no) + ')">'
      + '<span style="flex:1;min-width:0">'
      +   '<span class="ur" style="display:block">' + esc(t.kegiatan||'-') + '</span>'
      +   '<span class="meta" style="display:block">' + metaR + '</span>'
      + '</span>'
      + '<span><span class="amt" style="display:block">' + rp(t.kredit||t.debet) + '</span>' + kananR + '</span>'
      + '</button>';
  }
  var meta = 'No ' + esc(String(t.no))
       + ' · ' + (+t.notaJml||0) + ' nota'
       + ' · ' + fotoCount(t) + ' foto';
  var isi = '<span style="flex:1;min-width:0">'
    +   '<span class="ur" style="display:block">' + esc(t.kegiatan||'-') + '</span>'
    +   '<span class="meta" style="display:block">' + meta + '</span>'
    +   tagsTx(t)
    + '</span>'
    + '<span><span class="amt" style="display:block">' + rp(t.kredit||t.debet) + '</span></span>';
  if (!isKeluar(t)){
    // Tak satu pun dari 4 aksi geser berlaku untuk transaksi masuk — geser
    // dimatikan total (bukan cuma disembunyikan), lihat docs/HANDOFF-MOBILE.md
    // bagian 9 (Bagian 4). Markup lama dipertahankan apa adanya.
    return '<button class="row" onclick="bukaDetail(' + aq(t.no) + ')">' + isi + '</button>';
  }
  var aksi = '<button class="ra ra-nota" onclick="rgAksi(this,\'nota\',' + aq(t.no) + ')">'
    + '<i class="ph-duotone ph-note-pencil"></i>Nota</button>';
  if (hitungNeraca(t, null, null).sisaPUM > 0){
    aksi += '<button class="ra ra-tagih" onclick="rgAksi(this,\'tagih\',' + aq(t.no) + ')">'
      + '<i class="ph-duotone ph-bell-ringing"></i>Tagih</button>';
  }
  aksi += '<button class="ra ra-tt" onclick="rgAksi(this,\'tt\',' + aq(t.no) + ')">'
    + '<i class="ph-duotone ph-printer"></i>Terima</button>'
    + '<button class="ra ra-kembali" onclick="rgAksi(this,\'kembali\',' + aq(t.no) + ')">'
    + '<i class="ph-duotone ph-arrow-u-down-left"></i>Kembali</button>';
  return '<div class="rowWrap">'
    + '<div class="rowActions">' + aksi + '</div>'
    + '<div class="rowCard" data-no="' + esc(String(t.no)) + '">' + isi + '</div>'
    + '</div>';
}
```

- [ ] **Step 2: Cek sintaks**

Run: `node -e "require('fs').readFileSync('mobile.html','utf8'); console.log('OK')"`
Expected: `OK`

- [ ] **Step 3: Commit**

```bash
git add mobile.html
git commit -m "feat(mobile): kartu transaksi keluar bisa digeser untuk 4 aksi cepat (tugas 11 fase 1)"
```

---

### Task 4: Verifikasi otomatis — 9 skenario Bagian 5

**Files:**
- Create (sementara, di scratchpad, TIDAK dikomit ke repo): `/tmp/kt11-verify.js`

**Interfaces:**
- Consumes: `mobile.html` hasil Task 1-3 apa adanya (dibaca dari disk, bukan disalin/diubah).

- [ ] **Step 1: Tulis skrip verifikasi Playwright**

Buat file `/tmp/kt11-verify.js`:

```js
const fs = require('fs');
const path = require('path');
const { chromium } = require('/opt/node22/lib/node_modules/playwright');

const MOBILE_PATH = path.join(__dirname.indexOf('/tmp') === 0 ? process.cwd() : '.', 'mobile.html');

async function main(){
  var html = fs.readFileSync('/home/user/kas-tunai/mobile.html', 'utf8')
    .replace('<?= webAppUrl ?>', '')
    .replace('<?= iconUrl ?>', '');

  var browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
  var ctx = await browser.newContext({ hasTouch: true, viewport: { width: 390, height: 844 } });
  var page = await ctx.newPage();
  var pageErrors = [];
  page.on('pageerror', function(err){ pageErrors.push(String(err)); });

  await page.setContent(html, { waitUntil: 'load' });

  // Data uji: masuk, keluar dengan sisaPUM>0, keluar dengan sisaPUM=0.
  await page.evaluate(function(){
    TX.length = 0;
    TX.push({ no: 101, kegiatan: 'Setoran awal', kredit: 0, debet: 500000, tanggal: '2026-07-20', notaJml: 0 });
    TX.push({ no: 102, kegiatan: 'Belanja ATK', kredit: 1000000, debet: 0, tanggal: '2026-07-21',
      notaJml: 1, notaTotal: 400000, kembalianTotal: 0, penjab: 'Budi' });
    TX.push({ no: 103, kegiatan: 'Belanja bahan praktik', kredit: 1000000, debet: 0, tanggal: '2026-07-22',
      notaJml: 2, notaTotal: 1000000, kembalianTotal: 0, penjab: 'Siti' });
    FOTO['101'] = 0; FOTO['102'] = 1; FOTO['103'] = 2;
    FILTER = 'semua';
    $('scTransaksi').className = 'scr on';
    renderTransaksi();
  });

  var hasil = {};

  // 1. Kartu masuk (No 101): tanpa rowActions sama sekali.
  hasil.kartuMasukTanpaRowActions = await page.evaluate(function(){
    var wraps = document.querySelectorAll('.rowWrap');
    for (var i=0;i<wraps.length;i++){
      var card = wraps[i].querySelector('.rowCard');
      if (card && card.getAttribute('data-no') === '101') return false;
    }
    return true;
  });

  // 2. Tagih hanya muncul bila sisaPUM > 0: No 102 (sisaPUM=600000) punya
  //    tombol Tagih, No 103 (sisaPUM=0) tidak.
  hasil.tagihKondisional = await page.evaluate(function(){
    var wraps = document.querySelectorAll('.rowWrap');
    var ada102 = false, ada103 = true;
    for (var i=0;i<wraps.length;i++){
      var card = wraps[i].querySelector('.rowCard');
      var no = card && card.getAttribute('data-no');
      var tagih = wraps[i].querySelector('.ra-tagih');
      if (no === '102') ada102 = !!tagih;
      if (no === '103') ada103 = !!tagih;
    }
    return ada102 === true && ada103 === false;
  });

  function findWrap(no){
    return page.evaluate(function(no){
      var wraps = document.querySelectorAll('.rowWrap');
      for (var i=0;i<wraps.length;i++){
        var card = wraps[i].querySelector('.rowCard');
        if (card && card.getAttribute('data-no') === String(no)) return true;
      }
      return false;
    }, no);
  }

  function geser(no, dx){
    return page.evaluate(function(args){
      var no = args.no, dx = args.dx;
      var wraps = document.querySelectorAll('.rowWrap');
      var wrap = null;
      for (var i=0;i<wraps.length;i++){
        var card = wraps[i].querySelector('.rowCard');
        if (card && card.getAttribute('data-no') === String(no)) { wrap = wraps[i]; break; }
      }
      if (!wrap) return { ok:false, reason:'wrap tidak ditemukan' };
      var card = wrap.querySelector('.rowCard');
      var rect = card.getBoundingClientRect();
      var x0 = rect.left + rect.width - 20, y0 = rect.top + rect.height/2;
      function touch(type, x, y){
        var t = new Touch({ identifier: 1, target: card, clientX: x, clientY: y });
        var ev = new TouchEvent(type, { touches: type==='touchend'?[]:[t], targetTouches: type==='touchend'?[]:[t],
          changedTouches: [t], bubbles: true, cancelable: true });
        card.dispatchEvent(ev);
      }
      touch('touchstart', x0, y0);
      touch('touchmove', x0 + dx, y0);
      touch('touchend', x0 + dx, y0);
      return { ok:true, className: wrap.className, transform: card.style.transform };
    }, { no: no, dx: dx });
  }

  // 3. Geser >= 10px pada No 102 -> kartu terbuka, TIDAK memicu bukaDetail
  //    (SCREEN tetap 'transaksi', bukan 'detail'). -200 dipakai (bukan pas di
  //    ambang) supaya melewati setengah lebar rowActions (4 tombol = 288px,
  //    setengah = 144px) dan kartu terkunci TERBUKA di touchend.
  await page.evaluate(function(){ SCREEN = 'transaksi'; });
  var g1 = await geser(102, -200);
  hasil.geserBesarBukaKartu = g1.ok && g1.className.indexOf('open') >= 0;
  hasil.geserBesarTidakBukaDetail = await page.evaluate(function(){ return DETAIL_NO !== 102; });

  // 4. Buka kartu No 103 -> kartu No 102 otomatis tertutup (hanya satu terbuka).
  //    -200 juga melewati setengah lebar rowActions No 103 (3 tombol = 216px,
  //    setengah = 108px, tanpa Tagih karena sisaPUM=0).
  await geser(103, -200);
  hasil.satuKartuTerbuka = await page.evaluate(function(){
    var wraps = document.querySelectorAll('.rowWrap'); var terbuka = 0;
    for (var i=0;i<wraps.length;i++) if (wraps[i].className.indexOf('open') >= 0) terbuka++;
    return terbuka === 1;
  });

  // Tutup No 103 lagi untuk pengujian berikutnya.
  await page.evaluate(function(){
    var wraps = document.querySelectorAll('.rowWrap');
    for (var i=0;i<wraps.length;i++){
      var card = wraps[i].querySelector('.rowCard');
      if (card && card.getAttribute('data-no') === '103') rgSet(wraps[i], card, false);
    }
  });

  // 5. Geser < 10px pada No 102 -> dianggap ketuk -> bukaDetail(102) tetap jalan.
  DETAIL_NO_SEBELUM = null;
  await page.evaluate(function(){ DETAIL_NO = null; SCREEN = 'transaksi'; });
  var g2 = await geser(102, -4);
  hasil.geserKecilJadiKetuk = await page.evaluate(function(){ return DETAIL_NO === 102; });

  // Reset render supaya kartu kembali ke keadaan awal untuk tes tombol aksi.
  await page.evaluate(function(){ DETAIL_NO = null; renderTransaksi(); });

  // 6. Setiap tombol aksi memanggil fungsi yang benar & menutup kartu.
  var panggilan = await page.evaluate(function(){
    var log = [];
    window.bukaNotaBaru = function(no){ log.push('nota:'+no); };
    window.tagihPum = function(no){ log.push('tagih:'+no); };
    window.cetakTandaTerima = function(no){ log.push('tt:'+no); };
    window.bukaPengembalian = function(no){ log.push('kembali:'+no); };
    var wraps = document.querySelectorAll('.rowWrap'), wrap102 = null;
    for (var i=0;i<wraps.length;i++){
      var card = wraps[i].querySelector('.rowCard');
      if (card && card.getAttribute('data-no') === '102') { wrap102 = wraps[i]; break; }
    }
    rgSet(wrap102, wrap102.querySelector('.rowCard'), true);   // buka dulu supaya tombol "tersingkap"
    wrap102.querySelector('.ra-nota').click();
    var tutupSetelahNota = wrap102.className.indexOf('open') < 0;
    rgSet(wrap102, wrap102.querySelector('.rowCard'), true);
    wrap102.querySelector('.ra-tagih').click();
    rgSet(wrap102, wrap102.querySelector('.rowCard'), true);
    wrap102.querySelector('.ra-tt').click();
    rgSet(wrap102, wrap102.querySelector('.rowCard'), true);
    wrap102.querySelector('.ra-kembali').click();
    return { log: log, tutupSetelahNota: tutupSetelahNota };
  });
  hasil.tombolAksiPanggilFungsiBenar = JSON.stringify(panggilan.log) ===
    JSON.stringify(['nota:102','tagih:102','tt:102','kembali:102']);
  hasil.kartuTutupSetelahAksi = panggilan.tutupSetelahNota;

  // 7. navigator.vibrate dipanggil di 2 titik (buka penuh + aksi selesai), dan
  //    tidak error bila API tidak ada.
  hasil.vibrateDipanggil = await page.evaluate(function(){
    var count = 0;
    navigator.vibrate = function(){ count++; return true; };
    var wraps = document.querySelectorAll('.rowWrap'), wrap102 = null;
    for (var i=0;i<wraps.length;i++){
      var card = wraps[i].querySelector('.rowCard');
      if (card && card.getAttribute('data-no') === '102') { wrap102 = wraps[i]; break; }
    }
    rgSet(wrap102, wrap102.querySelector('.rowCard'), true);   // trigger 1: buka penuh
    wrap102.querySelector('.ra-nota').click();                 // trigger 2: aksi selesai
    return count === 2;
  });
  hasil.vibrateAmanTanpaApi = await page.evaluate(function(){
    var asli = navigator.vibrate;
    try { delete navigator.vibrate; } catch(e){ navigator.vibrate = undefined; }
    var error = null;
    try { rgGetar(); } catch(e){ error = String(e); }
    navigator.vibrate = asli;
    return error === null;
  });

  // 8. Menggulir daftar menutup kartu yang terbuka.
  await page.evaluate(function(){
    var wraps = document.querySelectorAll('.rowWrap'), wrap102 = null;
    for (var i=0;i<wraps.length;i++){
      var card = wraps[i].querySelector('.rowCard');
      if (card && card.getAttribute('data-no') === '102') { wrap102 = wraps[i]; break; }
    }
    rgSet(wrap102, wrap102.querySelector('.rowCard'), true);
  });
  await page.evaluate(function(){ window.dispatchEvent(new Event('scroll')); });
  hasil.gulirMenutupKartu = await page.evaluate(function(){
    var wraps = document.querySelectorAll('.rowWrap');
    for (var i=0;i<wraps.length;i++) if (wraps[i].className.indexOf('open') >= 0) return false;
    return true;
  });

  // 9. Pemindaian penuh onclick/onchange: semua atribut harus valid sebagai JS
  //    (memastikan aq() dipakai dengan benar, tidak ada sisa bug kutip ganda).
  hasil.semuaOnclickValid = await page.evaluate(function(){
    var els = document.querySelectorAll('[onclick],[onchange]');
    var gagal = [];
    for (var i=0;i<els.length;i++){
      var attr = els[i].getAttribute('onclick') || els[i].getAttribute('onchange');
      try { new Function(attr); } catch(e){ gagal.push(attr + ' :: ' + e.message); }
    }
    return gagal.length === 0 ? true : gagal;
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

- [ ] **Step 2: Jalankan skrip**

Run: `node /tmp/kt11-verify.js`

Expected: 10 baris `PASS` (9 skenario + `tanpaPageError`), exit code 0.

- [ ] **Step 3: Bila ada `FAIL`, perbaiki lalu jalankan ulang**

Baca pesan `-> ...` di baris `FAIL` untuk tahu skenario mana yang gagal. Perbaiki kode terkait di `mobile.html` (Task 2 untuk masalah mesin gestur, Task 3 untuk masalah markup `barisTx`), lalu jalankan ulang `node /tmp/kt11-verify.js` sampai semua `PASS`. Jangan lanjut ke Task 5 sebelum ini bersih.

- [ ] **Step 4: Hapus skrip sementara**

Run: `rm /tmp/kt11-verify.js`

(Tidak ada commit di task ini — tidak ada perubahan `mobile.html` bila semua langsung `PASS`; bila ada perbaikan di Step 3, commit perbaikan itu dengan pesan yang menjelaskan skenario yang diperbaiki sebelum lanjut ke Task 5.)

---

### Task 5: Perbarui papan status handoff

**Files:**
- Modify: `docs/HANDOFF-MOBILE.md` (bagian 1 — papan status, dan penutup bagian 9)

**Interfaces:**
- Consumes: tidak ada (dokumentasi murni).

- [ ] **Step 1: Ubah baris tugas 11 di papan status (bagian 1)**

Cari baris:

```
| 11 | Kartu transaksi interaktif — Fase 1/4 (lihat bagian 9) | *(belum ada perintah)* | 🟡 **desain lengkap, siap writing-plans** |
```

Ganti dengan:

```
| 11 | Kartu transaksi interaktif — Fase 1/4 (lihat bagian 9) | *(belum ada perintah)* | 🟡 kode selesai → *(commit setelah Task 1-3 plan ini)* |
```

- [ ] **Step 2: Ubah baris status penutup di bagian 9**

Cari baris:

```
### Status: desain lengkap, siap `writing-plans`
Kelima bagian disetujui bertahap oleh pengguna lewat `AskUserQuestion` (28 Jul 2026). Langkah berikutnya: panggil skill `writing-plans`.
```

Ganti dengan:

```
### Status: kode selesai, siap uji manual di HP
Kelima bagian disetujui bertahap oleh pengguna lewat `AskUserQuestion` (28 Jul 2026). Rencana implementasi:
`docs/superpowers/plans/2026-07-28-kartu-transaksi-geser.md` — 5 tugas, semua 9 skenario Bagian 5 lolos verifikasi
Playwright (event sentuh sintetis). Langkah berikutnya: `clasp push` ke deployment uji + uji manual gestur geser
di Chrome Android sungguhan sebelum `deploy.bat` ke produksi (event sentuh sintetis Playwright tidak menggantikan
uji jari sungguhan di perangkat low-end).
```

- [ ] **Step 3: Commit**

```bash
git add docs/HANDOFF-MOBILE.md
git commit -m "docs: papan status — tugas 11 fase 1 kode selesai, 9 skenario lolos verifikasi"
```

---

## Self-Review

**1. Cakupan spesifikasi (bagian 9 `docs/HANDOFF-MOBILE.md`):**
- Bagian 1 (struktur & mekanika geser) → Task 1 (CSS) + Task 2 (touchmove clamp, ambang 10px, `touch-action:pan-y`, transisi ~180ms CSS).
- Bagian 2 (perilaku tiap aksi) → Task 3 (`rgAksi` memanggil `bukaNotaBaru`/`tagihPum`/`cetakTandaTerima`/`bukaPengembalian` apa adanya).
- Bagian 3 (warna & ikon) → Task 1 (`.ra-nota`=`--ac`, `.ra-tagih`=`--a2`, `.ra-tt`=`--ac7`, `.ra-kembali`=`--n700`; ikon `ph-note-pencil`/`ph-bell-ringing`/`ph-printer`/`ph-arrow-u-down-left`).
- Bagian 4 (kasus tepi) → Task 3 (masuk = markup lama, tanpa rowActions sama sekali) + Task 2 (tutup segera saat aksi diketuk, `rgTutupSemua` saat scroll).
- Bagian 5 (rencana uji) → Task 4, kesembilan skenario dipetakan 1:1 ke kunci `hasil` dalam skrip.

Tidak ada bagian dari desain yang tidak punya task.

**2. Pemindaian placeholder:** Tidak ditemukan "TBD"/"implement later"/"similar to Task N" — setiap step berisi kode lengkap yang bisa langsung ditempel.

**3. Konsistensi tipe/nama:** `rgAksi(el, act, no)` dipakai identik di Task 2 (definisi) dan Task 3 (pemanggilan dari `onclick`). Nama kelas CSS (`rowWrap`, `rowActions`, `ra`, `ra-nota`/`ra-tagih`/`ra-tt`/`ra-kembali`, `rowCard`) identik antara Task 1 (CSS) dan Task 3 (markup). `data-no` dibaca di Task 2 (`rgTouchEnd`) persis dengan nama yang ditulis di Task 3 (`rowCard`'s `data-no`).

---

## Execution Handoff

Rencana selesai dan tersimpan di `docs/superpowers/plans/2026-07-28-kartu-transaksi-geser.md`. Dua opsi eksekusi:

1. **Subagent-Driven (rekomendasi)** — subagent baru per tugas, review dua tahap di antara tugas, iterasi cepat.
2. **Inline Execution** — eksekusi tugas demi tugas di sesi ini, batch dengan checkpoint untuk direview.

Mana yang dipilih?
